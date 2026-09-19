/**
 * EnrollmentService — E1 à E6 du contrat : URL (paramètres substitués), verbe, payload, query.
 */
import { mockApiClientModule, mockedApiClient, respond } from './mockApiClient';

jest.mock('../ApiClient', () => mockApiClientModule());

import { enrollmentService } from '../EnrollmentService';
import { EnrollmentStatus } from '../../../models/Enrollment';

const api = mockedApiClient();
const schoolId = '11111111-1111-4111-8111-111111111111';
const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const request = { id: requestId, studentId: 'u1', schoolId, status: EnrollmentStatus.PENDING };

describe('EnrollmentService', () => {
  it('requestEnrollment (E2) : POST /api/enrollment/schools/:schoolId/request { message }', async () => {
    api.post.mockResolvedValue(respond(request, 201));

    const result = await enrollmentService.requestEnrollment({ schoolId, message: 'Bonjour' });

    expect(api.post).toHaveBeenCalledWith(`/api/enrollment/schools/${schoolId}/request`, {
      message: 'Bonjour',
    });
    expect(result).toEqual(request);
  });

  it('getMyRequests (E3) : GET /api/enrollment/my-requests → tableau nu', async () => {
    api.get.mockResolvedValue(respond([request]));

    const result = await enrollmentService.getMyRequests();

    expect(api.get).toHaveBeenCalledWith('/api/enrollment/my-requests');
    expect(result).toEqual([request]);
  });

  it('checkEnrollmentStatus (E1) : GET /api/enrollment/schools/:schoolId/status', async () => {
    const status = { isEnrolled: true, canBook: true };
    api.get.mockResolvedValue(respond(status));

    const result = await enrollmentService.checkEnrollmentStatus(schoolId);

    expect(api.get).toHaveBeenCalledWith(`/api/enrollment/schools/${schoolId}/status`);
    expect(result).toEqual(status);
  });

  it('getSchoolRequests (E4) : GET /api/enrollment/schools/:schoolId/requests, ?status= seulement si fourni', async () => {
    api.get.mockResolvedValue(respond([request]));

    await enrollmentService.getSchoolRequests(schoolId, EnrollmentStatus.PENDING);
    await enrollmentService.getSchoolRequests(schoolId);

    expect(api.get).toHaveBeenNthCalledWith(1, `/api/enrollment/schools/${schoolId}/requests`, {
      params: { status: 'pending' },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, `/api/enrollment/schools/${schoolId}/requests`, {
      params: undefined,
    });
  });

  it('approveRequest (E5) : PUT /api/enrollment/:requestId/approve sans corps', async () => {
    api.put.mockResolvedValue(respond({ ...request, status: EnrollmentStatus.APPROVED }));

    const result = await enrollmentService.approveRequest(requestId);

    expect(api.put).toHaveBeenCalledWith(`/api/enrollment/${requestId}/approve`);
    expect(result.status).toBe('approved');
  });

  it('rejectRequest (E6) : PUT /api/enrollment/:requestId/reject { reason }', async () => {
    api.put.mockResolvedValue(respond({ ...request, status: EnrollmentStatus.REJECTED }));

    await enrollmentService.rejectRequest(requestId, 'Dossier incomplet, pièces manquantes');

    expect(api.put).toHaveBeenCalledWith(`/api/enrollment/${requestId}/reject`, {
      reason: 'Dossier incomplet, pièces manquantes',
    });
  });
});
