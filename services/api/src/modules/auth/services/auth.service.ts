import { HttpError } from '../../../http/errors';
import { IUserRepository } from '../repositories/user.repository';
import {
  AuthTokens,
  LoginDTO,
  PublicUser,
  RegisterDTO,
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
    private readonly cacheService: ICacheService
  ) {}

  async register(dto: RegisterDTO): Promise<AuthTokens> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new HttpError(409, 'CONFLICT', 'Un compte existe déjà avec cet email');
    }

    // Sans code d'école, le compte est un élève (4.1) ; le rôle n'est jamais choisi par l'appelant.
    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.userRepository.create(
      dto.email,
      passwordHash,
      UserRole.STUDENT,
      dto.firstName,
      dto.lastName
    );

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
