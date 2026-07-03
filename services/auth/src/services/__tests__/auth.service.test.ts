import { AuthService } from '../auth.service';
import { IUserRepository } from '../../repositories/user.repository';
import { IPasswordService } from '../password.service';
import { ITokenService } from '../token.service';
import { ICacheService } from '../cache.service';
import { RegisterDTO, LoginDTO, User, UserRole } from '../../types';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordService: jest.Mocked<IPasswordService>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockCacheService: jest.Mocked<ICacheService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: UserRole.STUDENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updatePassword: jest.fn(),
    };

    mockPasswordService = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    mockTokenService = {
      generateTokens: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    authService = new AuthService(
      mockUserRepository,
      mockPasswordService,
      mockTokenService,
      mockCacheService
    );
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto: RegisterDTO = {
        email: 'test@example.com',
        password: 'Password@123',
        role: UserRole.STUDENT,
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('hashed-password');
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockTokenService.generateTokens.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await authService.register(registerDto);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockPasswordService.hash).toHaveBeenCalledWith(registerDto.password);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        registerDto.email,
        'hashed-password',
        registerDto.role
      );
      expect(mockTokenService.generateTokens).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw error if user already exists', async () => {
      const registerDto: RegisterDTO = {
        email: 'test@example.com',
        password: 'Password@123',
        role: UserRole.STUDENT,
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow('User already exists');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should handle database errors during registration', async () => {
      const registerDto: RegisterDTO = {
        email: 'test@example.com',
        password: 'Password@123',
        role: UserRole.STUDENT,
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('hashed-password');
      mockUserRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(authService.register(registerDto)).rejects.toThrow('Database error');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto: LoginDTO = {
        email: 'test@example.com',
        password: 'Password@123',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);
      mockTokenService.generateTokens.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await authService.login(loginDto);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockPasswordService.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash
      );
      expect(mockTokenService.generateTokens).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw error for non-existent user', async () => {
      const loginDto: LoginDTO = {
        email: 'nonexistent@example.com',
        password: 'Password@123',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow('Invalid credentials');
      expect(mockPasswordService.compare).not.toHaveBeenCalled();
    });

    it('should throw error for invalid password', async () => {
      const loginDto: LoginDTO = {
        email: 'test@example.com',
        password: 'WrongPassword@123',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow('Invalid credentials');
      expect(mockTokenService.generateTokens).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { userId: 'user-123', email: 'test@example.com', role: UserRole.STUDENT };

      mockTokenService.verifyRefreshToken.mockReturnValue(payload);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockTokenService.generateTokens.mockReturnValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await authService.refreshToken(refreshToken);

      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(payload.userId);
      expect(mockTokenService.generateTokens).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw error if user not found during refresh', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { userId: 'user-123', email: 'test@example.com', role: UserRole.STUDENT };

      mockTokenService.verifyRefreshToken.mockReturnValue(payload);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('User not found');
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const userId = 'user-123';

      mockCacheService.delete.mockResolvedValue(undefined);

      await authService.logout(userId);

      expect(mockCacheService.delete).toHaveBeenCalledWith(`user:${userId}:session`);
    });

    it('should handle cache errors during logout', async () => {
      const userId = 'user-123';

      mockCacheService.delete.mockRejectedValue(new Error('Cache error'));

      await expect(authService.logout(userId)).rejects.toThrow('Cache error');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      const userId = 'user-123';

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.getCurrentUser(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      const userId = 'non-existent-user';

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.getCurrentUser(userId)).rejects.toThrow('User not found');
    });
  });
});
