import { HttpError } from '../../../../http/errors';
import { IUserRepository } from '../../repositories/user.repository';
import { LoginDTO, RegisterDTO, User, UserRole } from '../../types/auth.types';
import { AuthService } from '../auth.service';
import { ICacheService } from '../cache.service';
import { IPasswordService } from '../password.service';
import { ITokenService } from '../token.service';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<IUserRepository>;
  let passwordService: jest.Mocked<IPasswordService>;
  let tokenService: jest.Mocked<ITokenService>;
  let cacheService: jest.Mocked<ICacheService>;

  const user: User = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: UserRole.STUDENT,
    firstName: 'Test',
    lastName: 'Élève',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
  const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updatePassword: jest.fn(),
    };
    passwordService = { hash: jest.fn(), compare: jest.fn() };
    tokenService = {
      generateTokens: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };
    cacheService = { get: jest.fn(), set: jest.fn(), delete: jest.fn() };
    authService = new AuthService(userRepository, passwordService, tokenService, cacheService);
  });

  describe('register', () => {
    const dto: RegisterDTO = {
      email: 'test@example.com',
      password: 'Password@123',
      role: UserRole.STUDENT,
      firstName: 'Test',
      lastName: 'Élève',
    };

    it('crée le compte, hache le mot de passe et renvoie une paire de jetons', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashed-password');
      userRepository.create.mockResolvedValue(user);
      tokenService.generateTokens.mockReturnValue(tokens);

      const result = await authService.register(dto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(passwordService.hash).toHaveBeenCalledWith(dto.password);
      expect(userRepository.create).toHaveBeenCalledWith(
        dto.email,
        'hashed-password',
        dto.role,
        'Test',
        'Élève'
      );
      expect(tokenService.generateTokens).toHaveBeenCalledWith({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      expect(result).toEqual(tokens);
    });

    it('refuse un email déjà utilisé avec 409 CONFLICT', async () => {
      userRepository.findByEmail.mockResolvedValue(user);

      await expect(authService.register(dto)).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
      });
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('propage une erreur de base de données telle quelle (500 côté controller)', async () => {
      userRepository.findByEmail.mockRejectedValue(new Error('connexion perdue'));

      await expect(authService.register(dto)).rejects.toThrow('connexion perdue');
      await expect(authService.register(dto)).rejects.not.toBeInstanceOf(HttpError);
    });
  });

  describe('login', () => {
    const dto: LoginDTO = { email: 'test@example.com', password: 'Password@123' };

    it('renvoie une paire de jetons pour des identifiants valides', async () => {
      userRepository.findByEmail.mockResolvedValue(user);
      passwordService.compare.mockResolvedValue(true);
      tokenService.generateTokens.mockReturnValue(tokens);

      const result = await authService.login(dto);

      expect(passwordService.compare).toHaveBeenCalledWith(dto.password, user.passwordHash);
      expect(result).toEqual(tokens);
    });

    it('répond 401 UNAUTHORIZED pour un email inconnu, sans révéler la cause', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(dto)).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Identifiants invalides',
      });
      expect(passwordService.compare).not.toHaveBeenCalled();
    });

    it('répond 401 UNAUTHORIZED pour un mauvais mot de passe, même message', async () => {
      userRepository.findByEmail.mockResolvedValue(user);
      passwordService.compare.mockResolvedValue(false);

      await expect(authService.login(dto)).rejects.toMatchObject({
        status: 401,
        message: 'Identifiants invalides',
      });
      expect(tokenService.generateTokens).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('émet une nouvelle paire à partir d’un refresh token valide', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
      userRepository.findById.mockResolvedValue(user);
      tokenService.generateTokens.mockReturnValue(tokens);

      const result = await authService.refreshToken('valid-refresh');

      expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh');
      expect(userRepository.findById).toHaveBeenCalledWith(user.id);
      expect(result).toEqual(tokens);
    });

    it('traduit un jeton invalide en 401 UNAUTHORIZED', async () => {
      tokenService.verifyRefreshToken.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(authService.refreshToken('expired')).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
      });
      expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it("répond 401 si l'utilisateur du jeton n'existe plus", async () => {
      tokenService.verifyRefreshToken.mockReturnValue({
        userId: 'ghost',
        email: 'ghost@example.com',
        role: UserRole.STUDENT,
      });
      userRepository.findById.mockResolvedValue(null);

      await expect(authService.refreshToken('valid-refresh')).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe('logout', () => {
    it('supprime la clé de session du cache', async () => {
      cacheService.delete.mockResolvedValue();

      await authService.logout(user.id);

      expect(cacheService.delete).toHaveBeenCalledWith(`user:${user.id}:session`);
    });

    it('propage une erreur du cache', async () => {
      cacheService.delete.mockRejectedValue(new Error('redis indisponible'));

      await expect(authService.logout(user.id)).rejects.toThrow('redis indisponible');
    });
  });

  describe('getCurrentUser', () => {
    it("renvoie l'utilisateur sans son hash de mot de passe", async () => {
      userRepository.findById.mockResolvedValue(user);

      const result = await authService.getCurrentUser(user.id);

      expect(result).toEqual({
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: 'Test',
        lastName: 'Élève',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('répond 404 NOT_FOUND pour un identifiant inconnu', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(authService.getCurrentUser('ghost')).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });
  });
});
