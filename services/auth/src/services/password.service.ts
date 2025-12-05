import bcrypt from 'bcryptjs';

export interface IPasswordService {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export class PasswordService implements IPasswordService {
  private readonly saltRounds: number;

  constructor() {
    this.saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
