import { ITransactionRunner } from '../../../db/transaction';
import { HttpError } from '../../../http/errors';
import { IUserRepository } from '../repositories/user.repository';
import {
  AuthTokens,
  InstructorCreator,
  LoginDTO,
  PublicUser,
  RegisterDTO,
  SchoolCodeConsumer,
  TokenPayload,
  User,
  UserRole,
} from '../types/auth.types';
import { ICacheService } from './cache.service';
import { IPasswordService } from './password.service';
import { ITokenService } from './token.service';

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: IPasswordService,
    private readonly tokenService: ITokenService,
    private readonly cacheService: ICacheService,
    private readonly schoolCodes: SchoolCodeConsumer,
    private readonly instructors: InstructorCreator,
    private readonly transactions: ITransactionRunner
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
      return this.generateTokensForUser(student);
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

    return this.generateTokensForUser(user);
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

    return this.generateTokensForUser(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    let payload: TokenPayload;
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new HttpError(401, 'UNAUTHORIZED', 'Jeton de rafraîchissement invalide ou expiré');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Utilisateur introuvable');
    }

    return this.generateTokensForUser(user);
  }

  // Révocation réelle des refresh tokens : tâche 4.6. Ici, l'état actuel (clé jamais écrite).
  async logout(userId: string): Promise<void> {
    await this.cacheService.delete(`user:${userId}:session`);
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new HttpError(404, 'NOT_FOUND', 'Utilisateur introuvable');
    }
    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }

  private generateTokensForUser(user: User): AuthTokens {
    return this.tokenService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  }
}
