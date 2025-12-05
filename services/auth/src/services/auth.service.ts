import { IUserRepository } from '../repositories/user.repository';
import { IPasswordService } from './password.service';
import { ITokenService } from './token.service';
import { ICacheService } from './cache.service';
import { RegisterDTO, LoginDTO, AuthTokens, User, TokenPayload } from '../types';

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
      throw new Error('User already exists');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.userRepository.create(dto.email, passwordHash, dto.role);

    return this.generateTokensForUser(user);
  }

  async login(dto: LoginDTO): Promise<AuthTokens> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    return this.generateTokensForUser(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.generateTokensForUser(user);
  }

  async logout(userId: string): Promise<void> {
    await this.cacheService.delete(`user:${userId}:session`);
  }

  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  private generateTokensForUser(user: User): AuthTokens {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return this.tokenService.generateTokens(payload);
  }
}
