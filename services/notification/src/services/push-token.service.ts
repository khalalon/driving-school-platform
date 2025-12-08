import { IPushTokenRepository } from '../repositories/push-token.repository';
import { PushToken } from '../types';

export class PushTokenService {
  constructor(private readonly pushTokenRepository: IPushTokenRepository) {}

  async registerToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<PushToken> {
    return this.pushTokenRepository.upsert(userId, token, platform);
  }

  async deleteToken(token: string): Promise<void> {
    await this.pushTokenRepository.delete(token);
  }

  async getTokens(userId: string): Promise<PushToken[]> {
    return this.pushTokenRepository.findByUserId(userId);
  }
}
