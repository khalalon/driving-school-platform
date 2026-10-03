/**
 * Availability Service — §6b du contrat (I1, I2) : la semaine type de l'instructeur connecté.
 */

import { apiClient } from './ApiClient';
import { API_CONFIG } from '../../config/api.config';
import { AvailabilitySlot } from '../../models/Availability';

export class AvailabilityService {
  /** I1 : sa semaine type, triée par jour puis heure de début. */
  async getMine(): Promise<AvailabilitySlot[]> {
    const response = await apiClient.get<AvailabilitySlot[]>(
      API_CONFIG.ENDPOINTS.INSTRUCTORS.MY_AVAILABILITY
    );
    return response.data;
  }

  /** I2 : remplace toute la semaine type d'un bloc ; renvoie les plages enregistrées. */
  async replaceMine(slots: AvailabilitySlot[]): Promise<AvailabilitySlot[]> {
    const response = await apiClient.put<AvailabilitySlot[]>(
      API_CONFIG.ENDPOINTS.INSTRUCTORS.MY_AVAILABILITY,
      { slots }
    );
    return response.data;
  }
}

export const availabilityService = new AvailabilityService();
