import { IPreferenceRepository } from '../repositories/preference.repository';
import { NotificationPreference, UpdatePreferencesDTO } from '../types';

export class PreferenceService {
  constructor(private readonly preferenceRepository: IPreferenceRepository) {}

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.preferenceRepository.findByUserId(userId);
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDTO
  ): Promise<NotificationPreference> {
    return this.preferenceRepository.upsert(userId, dto);
  }
}
