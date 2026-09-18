import { ITransactionRunner, Queryable } from '../../../../db/transaction';
import { HttpError } from '../../../../http/errors';
import { IUserRepository } from '../../repositories/user.repository';
import {
  InstructorCreator,
  LoginDTO,
  RegisterDTO,
  SchoolCodeConsumer,
  User,
  UserRole,
} from '../../types/auth.types';
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
  let schoolCodes: jest.Mocked<SchoolCodeConsumer>;
  let instructors: jest.Mocked<InstructorCreator>;
  let transactions: jest.Mocked<ITransactionRunner>;
  // Client de transaction factice, transmis par le service à chaque écriture de l'inscription.
  const tx: Queryable = { query: jest.fn() };

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
  // Ce que TokenService émet (4.6) : la paire plus la session et l'identifiant du refresh token.
  const issued = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    sid: 'sid-1',
    jti: 'jti-1',
    refreshTtlSeconds: 2_592_000,
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
    cacheService = { get: jest.fn(), set: jest.fn(), take: jest.fn(), delete: jest.fn() };
    schoolCodes = { consume: jest.fn() };
    instructors = { create: jest.fn() };
    const run = jest.fn((work: (client: Queryable) => Promise<unknown>) => work(tx));
    transactions = { run } as unknown as jest.Mocked<ITransactionRunner>;
    authService = new AuthService(
      userRepository,
      passwordService,
      tokenService,
      cacheService,
      schoolCodes,
      instructors,
      transactions
    );
  });

  describe('register', () => {
    const dto: RegisterDTO = {
      email: 'test@example.com',
      password: 'Password@123',
      firstName: 'Test',
      lastName: 'Élève',
    };

    it('crée un compte student, hache le mot de passe et renvoie une paire de jetons', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashed-password');
      userRepository.create.mockResolvedValue(user);
      tokenService.generateTokens.mockReturnValue(issued);

      const result = await authService.register(dto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(passwordService.hash).toHaveBeenCalledWith(dto.password);
      expect(userRepository.create).toHaveBeenCalledWith(
        dto.email,
        'hashed-password',
        UserRole.STUDENT,
        'Test',
        'Élève'
      );
      expect(tokenService.generateTokens).toHaveBeenCalledWith(
        { userId: user.id, email: user.email, role: user.role },
        undefined
      );
      // Le refresh token émis est enregistré, utilisable une seule fois (4.6).
      expect(cacheService.set).toHaveBeenCalledWith('auth:refresh:jti-1', 'sid-1', 2_592_000);
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

    describe('avec schoolCode (D-17)', () => {
      const withCode: RegisterDTO = {
        ...dto,
        schoolCode: 'INST-SEED',
        phone: '+21600000009',
        licenseNumber: 'LIC-9',
      };

      beforeEach(() => {
        userRepository.findByEmail.mockResolvedValue(null);
        passwordService.hash.mockResolvedValue('hashed-password');
        tokenService.generateTokens.mockReturnValue(issued);
      });

      it('code instructeur : consomme le code, crée le compte et la fiche instructors dans la transaction', async () => {
        schoolCodes.consume.mockResolvedValue({ schoolId: 'school-1', role: UserRole.INSTRUCTOR });
        userRepository.create.mockResolvedValue({ ...user, role: UserRole.INSTRUCTOR });

        await expect(authService.register(withCode)).resolves.toEqual(tokens);

        expect(transactions.run).toHaveBeenCalledTimes(1);
        expect(schoolCodes.consume).toHaveBeenCalledWith('INST-SEED', tx);
        expect(userRepository.create).toHaveBeenCalledWith(
          withCode.email,
          'hashed-password',
          UserRole.INSTRUCTOR,
          'Test',
          'Élève',
          tx
        );
        expect(instructors.create).toHaveBeenCalledWith(
          'school-1',
          { userId: user.id, phone: '+21600000009', licenseNumber: 'LIC-9', specialties: [] },
          tx
        );
        expect(tokenService.generateTokens).toHaveBeenCalledWith(
          { userId: user.id, email: user.email, role: UserRole.INSTRUCTOR },
          undefined
        );
      });

      it('code élève : compte student, pas de fiche instructors', async () => {
        schoolCodes.consume.mockResolvedValue({ schoolId: 'school-1', role: UserRole.STUDENT });
        userRepository.create.mockResolvedValue(user);

        await expect(authService.register(withCode)).resolves.toEqual(tokens);

        expect(userRepository.create).toHaveBeenCalledWith(
          withCode.email,
          'hashed-password',
          UserRole.STUDENT,
          'Test',
          'Élève',
          tx
        );
        expect(instructors.create).not.toHaveBeenCalled();
      });

      it('code inconnu, inactif, expiré ou épuisé : 400 INVALID_SCHOOL_CODE, aucun compte créé', async () => {
        schoolCodes.consume.mockResolvedValue(null);

        await expect(authService.register(withCode)).rejects.toMatchObject({
          status: 400,
          code: 'INVALID_SCHOOL_CODE',
        });
        expect(userRepository.create).not.toHaveBeenCalled();
        expect(instructors.create).not.toHaveBeenCalled();
      });

      it('sans schoolCode : aucune transaction ni consommation de code', async () => {
        userRepository.create.mockResolvedValue(user);

        await authService.register(dto);

        expect(transactions.run).not.toHaveBeenCalled();
        expect(schoolCodes.consume).not.toHaveBeenCalled();
      });
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
      tokenService.generateTokens.mockReturnValue(issued);

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

  describe('refreshToken (rotation et révocation, D-12 / 4.6)', () => {
    const presented = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sid: 'sid-1',
      jti: 'jti-old',
    };

    it('rotation : consomme le refresh token présenté (GETDEL), émet une paire de la même session', async () => {
      tokenService.verifyRefreshToken.mockReturnValue(presented);
      cacheService.get.mockResolvedValue(null); // session non révoquée
      cacheService.take.mockResolvedValue('sid-1'); // jeton encore valide → consommé
      userRepository.findById.mockResolvedValue(user);
      tokenService.generateTokens.mockReturnValue({ ...issued, jti: 'jti-new' });

      const result = await authService.refreshToken('valid-refresh');

      expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith('valid-refresh');
      expect(cacheService.get).toHaveBeenCalledWith('auth:session:sid-1:revoked');
      expect(cacheService.take).toHaveBeenCalledWith('auth:refresh:jti-old');
      expect(userRepository.findById).toHaveBeenCalledWith(user.id);
      expect(tokenService.generateTokens).toHaveBeenCalledWith(
        { userId: user.id, email: user.email, role: user.role },
        'sid-1'
      );
      expect(cacheService.set).toHaveBeenCalledWith('auth:refresh:jti-new', 'sid-1', 2_592_000);
      expect(result).toEqual(tokens);
    });

    it('réutilisation d’un refresh token déjà consommé : 401 et révocation de toute la session', async () => {
      tokenService.verifyRefreshToken.mockReturnValue(presented);
      cacheService.get.mockResolvedValue(null);
      cacheService.take.mockResolvedValue(null); // clé absente : déjà utilisé

      await expect(authService.refreshToken('reused')).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: expect.stringContaining('déjà utilisé') as string,
      });

      expect(cacheService.set).toHaveBeenCalledWith(
        'auth:session:sid-1:revoked',
        '1',
        30 * 24 * 3600
      );
      expect(tokenService.generateTokens).not.toHaveBeenCalled();
    });

    it('session révoquée (logout ou réutilisation antérieure) : 401 sans consommer le jeton', async () => {
      tokenService.verifyRefreshToken.mockReturnValue(presented);
      cacheService.get.mockResolvedValue('1');

      await expect(authService.refreshToken('revoked-session')).rejects.toMatchObject({
        status: 401,
        message: 'Session révoquée, reconnectez-vous',
      });
      expect(cacheService.take).not.toHaveBeenCalled();
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
      tokenService.verifyRefreshToken.mockReturnValue({ ...presented, userId: 'ghost' });
      cacheService.get.mockResolvedValue(null);
      cacheService.take.mockResolvedValue('sid-1');
      userRepository.findById.mockResolvedValue(null);

      await expect(authService.refreshToken('valid-refresh')).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe('logout (A5)', () => {
    it('révoque la session du jeton présenté : ses refresh tokens sont refusés', async () => {
      cacheService.set.mockResolvedValue();

      await authService.logout(user.id, 'sid-1');

      expect(cacheService.set).toHaveBeenCalledWith(
        'auth:session:sid-1:revoked',
        '1',
        30 * 24 * 3600
      );
    });

    it('jeton émis avant 4.6 (sans sid) : rien à révoquer, pas d’erreur', async () => {
      await authService.logout(user.id);

      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('propage une erreur du cache', async () => {
      cacheService.set.mockRejectedValue(new Error('redis indisponible'));

      await expect(authService.logout(user.id, 'sid-1')).rejects.toThrow('redis indisponible');
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
