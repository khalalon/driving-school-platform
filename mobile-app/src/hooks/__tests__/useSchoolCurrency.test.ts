/**
 * Cache de devise par école (D-43) : un seul appel S2 par école, résultat partagé.
 */
jest.mock('../../services/api/SchoolService', () => ({
  schoolService: { getSchoolById: jest.fn() },
}));

import { schoolService } from '../../services/api/SchoolService';
import { getSchoolCurrency, resetSchoolCurrencyCache } from '../useSchoolCurrency';

const getSchoolById = schoolService.getSchoolById as jest.Mock;

describe('getSchoolCurrency', () => {
  beforeEach(() => resetSchoolCurrencyCache());

  it('lit la devise par S2 une seule fois, même pour des appels concurrents', async () => {
    getSchoolById.mockResolvedValue({ id: 's1', currency: 'TND' });

    const [a, b] = await Promise.all([getSchoolCurrency('s1'), getSchoolCurrency('s1')]);
    const c = await getSchoolCurrency('s1');

    expect([a, b, c]).toEqual(['TND', 'TND', 'TND']);
    expect(getSchoolById).toHaveBeenCalledTimes(1);
    expect(getSchoolById).toHaveBeenCalledWith('s1');
  });

  it('une école par entrée de cache', async () => {
    getSchoolById
      .mockResolvedValueOnce({ id: 's1', currency: 'TND' })
      .mockResolvedValueOnce({ id: 's2', currency: 'EUR' });

    expect(await getSchoolCurrency('s1')).toBe('TND');
    expect(await getSchoolCurrency('s2')).toBe('EUR');
    expect(getSchoolById).toHaveBeenCalledTimes(2);
  });

  it('un échec ne reste pas en cache : l’appel suivant retente', async () => {
    getSchoolById.mockRejectedValueOnce(new Error('réseau')).mockResolvedValueOnce({ currency: 'TND' });

    await expect(getSchoolCurrency('s1')).rejects.toThrow('réseau');
    await expect(getSchoolCurrency('s1')).resolves.toBe('TND');
  });
});
