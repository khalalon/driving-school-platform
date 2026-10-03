/**
 * AvailabilityService — I1 / I2 du contrat (§6b) : URL, verbe, payload, `response.data`.
 */
import { mockApiClientModule, mockedApiClient, respond } from './mockApiClient';

jest.mock('../ApiClient', () => mockApiClientModule());

import { availabilityService } from '../AvailabilityService';

const api = mockedApiClient();
const slots = [{ weekday: 2, startTime: '09:00', endTime: '12:00' }];

describe('AvailabilityService', () => {
  it('getMine (I1) : GET /api/instructors/me/availability', async () => {
    api.get.mockResolvedValue(respond(slots));
    await expect(availabilityService.getMine()).resolves.toEqual(slots);
    expect(api.get).toHaveBeenCalledWith('/api/instructors/me/availability');
  });

  it('replaceMine (I2) : PUT { slots } et renvoie les plages enregistrées', async () => {
    api.put.mockResolvedValue(respond(slots));
    await expect(availabilityService.replaceMine(slots)).resolves.toEqual(slots);
    expect(api.put).toHaveBeenCalledWith('/api/instructors/me/availability', { slots });
  });
});
