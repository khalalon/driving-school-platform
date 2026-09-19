import { ITransactionRunner } from '../../../db/transaction';
import { HttpError } from '../../../http/errors';
import { IUserRepository } from '../repositories/user.repository';
import {
  AuthTokens,
  CurrentUser,
  InstructorAccess,
  LoginDTO,
  RegisterDTO,
  SchoolCodeConsumer,
  User,
  UserRole,
} from '../types/auth.types';
import { ICacheService } from './cache.service';
import { IPasswordService } from './password.service';
import { IssuedTokens, ITokenService, RefreshTokenPayload } from './token.service';

// Clés Redis (4.6) : un refresh token valide = sa clé présente ; une session révoquée = marqueur.
const refreshKey = (jti: string): string => `auth:refresh:${jti}`;
const revokedSessionKey = (sid: string): string => `auth:session:${sid}:revoked`;

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: IPasswordService,
    private readonly tokenService: ITokenService,
    private readonly cacheService: ICacheService,
    private readonly schoolCodes: SchoolCodeConsumer,
    private readonly instructors: InstructorAccess,
    private readonly transactions: ITransactionRunner,
    /** Durée du marqueur de session révoquée : au moins la durée de vie d'un refresh token. */
    private readonly sessionRevocationTtlSeconds: number = 30 * 24 * 3600
  ) {}

  /**
   * A2 (D-17). Sans `schoolCode` : compte `student`. Avec : le code est consommé, le compte prend
   * son rôle et un instructeur reçoit sa fiche `instructors`, le tout dans une transaction — un
   * code inconnu, inactif, expiré ou épuisé laisse tout intact (400 INVALID_SCHOOL_CODE).
   */
  async register(dto: RegisterDTO): Promise<AuthTokens> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new HttpError(409, 'CONFLICT', 'Un compte existe déjà avec cet email');
    }
    const passwordHash = await this.passwordService.hash(dto.password);

    if (dto.schoolCode === undefined) {
      const student = await this.userRepository.create(
        dto.email,
        passwordHash,
        UserRole.STUDENT,
        dto.firstName,
        dto.lastName
      );
      return this.issueTokens(student);
    }

    const schoolCode = dto.schoolCode;
    const user = await this.transactions.run(async (tx) => {
      const code = await this.schoolCodes.consume(schoolCode, tx);
      if (!code) {
        throw new HttpError(
          400,
          'INVALID_SCHOOL_CODE',
          "Code d'école inconnu, inactif, expiré ou épuisé"
        );
      }
      const created = await this.userRepository.create(
        dto.email,
        passwordHash,
        code.role,
        dto.firstName,
        dto.lastName,
        tx
      );
      if (code.role === UserRole.INSTRUCTOR) {
        // `phone` et `licenseNumber` sont garantis par le validateur quand `schoolCode` est présent.
        await this.instructors.create(
          code.schoolId,
          {
            userId: created.id,
            phone: dto.phone ?? '',
            licenseNumber: dto.licenseNumber ?? '',
            specialties: [],
          },
          tx
        );
      }
      return created;
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDTO): Promise<AuthTokens> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Identifiants invalides');
    }

    const isPasswordValid = await this.passwordService.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Identifiants invalides');
    }

    return this.issueTokens(user);
  }

  /**
   * Rotation (D-12) : le refresh token présenté est consommé (GETDEL) et une nouvelle paire de la
   * même session est émise. Un refresh token valide mais déjà consommé = réutilisation (vol
   * probable) : toute la session est révoquée. Une session révoquée refuse tous ses jetons.
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new HttpError(401, 'UNAUTHORIZED', 'Jeton de rafraîchissement invalide ou expiré');
    }

    if (await this.cacheService.get(revokedSessionKey(payload.sid))) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Session révoquée, reconnectez-vous');
    }
    const stored = await this.cacheService.take(refreshKey(payload.jti));
    if (!stored) {
      await this.revokeSession(payload.sid);
      throw new HttpError(
        401,
        'UNAUTHORIZED',
        'Jeton de rafraîchissement déjà utilisé : session révoquée, reconnectez-vous'
      );
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Utilisateur introuvable');
    }

    return this.issueTokens(user, payload.sid);
  }

  /** A5 : révoque la session du jeton présenté (ses refresh tokens) ; l'access token expire seul. */
  async logout(userId: string, sid?: string): Promise<void> {
    if (sid) {
      await this.revokeSession(sid);
    }
  }

  /** A3 : pour un instructeur, `schoolId` et `instructorId` par jointure `instructors` (D-19). */
  async getCurrentUser(userId: string): Promise<CurrentUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new HttpError(404, 'NOT_FOUND', 'Utilisateur introuvable');
    }
    const current: CurrentUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    };
    if (user.role === UserRole.INSTRUCTOR) {
      const instructor = await this.instructors.findByUserId(user.id);
      if (instructor) {
        current.schoolId = instructor.schoolId;
        current.instructorId = instructor.id;
      }
    }
    return current;
  }

  /** Émet une paire et enregistre le refresh token (clé présente = utilisable une fois). */
  private async issueTokens(user: User, sid?: string): Promise<AuthTokens> {
    const issued: IssuedTokens = this.tokenService.generateTokens(
      { userId: user.id, email: user.email, role: user.role },
      sid
    );
    await this.cacheService.set(refreshKey(issued.jti), issued.sid, issued.refreshTtlSeconds);
    return { accessToken: issued.accessToken, refreshToken: issued.refreshToken };
  }

  private revokeSession(sid: string): Promise<void> {
    return this.cacheService.set(revokedSessionKey(sid), '1', this.sessionRevocationTtlSeconds);
  }
}
