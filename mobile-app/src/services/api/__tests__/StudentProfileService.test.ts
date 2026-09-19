/**
 * StudentProfileService (P1–P7, vue instructeur) et StudentSelfProfileService (P8–P11, vue
 * élève) : URL (`:studentId` = users.id, D-28), verbe, payload, `response.data`.
 */
import { mockApiClientModule, mockedApiClient, respond } from './mockApiClient';

jest.mock('../ApiClient', () => mockApiClientModule());

import { studentProfileService } from '../StudentProfileService';
import { studentSelfProfileService } from '../StudentSelfProfileService';

const api = mockedApiClient();
const studentId = '0a9e75a7-aaa1-475d-83eb-5facf8c02b06';
const schoolId = '11111111-1111-4111-8111-111111111111';
const lessonId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const examId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const base = `/api/profiles/${studentId}/schools/${schoolId}`;
const selfBase = `/api/student-profiles/me/schools/${schoolId}`;

describe('StudentProfileService (instructeur)', () => {
  it('getCompleteProfile (P1) : GET …/complete', async () => {
    const profile = { id: studentId, firstName: 'Lina', lastName: 'Test', totalLessons: 0 };
    api.get.mockResolvedValue(respond(profile));

    const result = await studentProfileService.getCompleteProfile(studentId, schoolId);

    expect(api.get).toHaveBeenCalledWith(`${base}/complete`);
    expect(result).toEqual(profile);
  });

  it('getStudentLessons (P2) : GET …/lessons', async () => {
    api.get.mockResolvedValue(respond([{ id: lessonId, type: 'Parc' }]));

    const result = await studentProfileService.getStudentLessons(studentId, schoolId);

    expect(api.get).toHaveBeenCalledWith(`${base}/lessons`);
    expect(result).toEqual([{ id: lessonId, type: 'Parc' }]);
  });

  it('getStudentExams (P3) : GET …/exams', async () => {
    api.get.mockResolvedValue(respond([{ id: examId, type: 'theory' }]));

    await studentProfileService.getStudentExams(studentId, schoolId);

    expect(api.get).toHaveBeenCalledWith(`${base}/exams`);
  });

  it('getFinancialSummary (P4) : GET …/financial', async () => {
    const summary = { totalRevenue: 40, totalPending: 0, totalDue: 35 };
    api.get.mockResolvedValue(respond(summary));

    const result = await studentProfileService.getFinancialSummary(studentId, schoolId);

    expect(api.get).toHaveBeenCalledWith(`${base}/financial`);
    expect(result).toEqual(summary);
  });

  it('updateNotes (P5) : PUT /api/profiles/:studentId/notes { notes } → void (204)', async () => {
    api.put.mockResolvedValue(respond(undefined, 204));

    await expect(
      studentProfileService.updateNotes(studentId, 'Progresse bien en créneau')
    ).resolves.toBeUndefined();

    expect(api.put).toHaveBeenCalledWith(`/api/profiles/${studentId}/notes`, {
      notes: 'Progresse bien en créneau',
    });
  });

  it('markLessonPaid (P6) : PUT /api/profiles/lessons/:lessonId/mark-paid { amount, paymentMethod }', async () => {
    api.put.mockResolvedValue(respond(undefined, 204));

    await studentProfileService.markLessonPaid(lessonId, 40, 'cash');

    expect(api.put).toHaveBeenCalledWith(`/api/profiles/lessons/${lessonId}/mark-paid`, {
      amount: 40,
      paymentMethod: 'cash',
    });
  });

  it('markExamPaid (P7) : PUT /api/profiles/exams/:examId/mark-paid { amount, paymentMethod }', async () => {
    api.put.mockResolvedValue(respond(undefined, 204));

    await studentProfileService.markExamPaid(examId, 60, 'bank_transfer');

    expect(api.put).toHaveBeenCalledWith(`/api/profiles/exams/${examId}/mark-paid`, {
      amount: 60,
      paymentMethod: 'bank_transfer',
    });
  });
});

describe('StudentSelfProfileService (élève)', () => {
  it('getMyProfile (P8) : GET /api/student-profiles/me/schools/:schoolId/profile', async () => {
    const profile = { id: studentId, firstName: 'Lina', lastName: 'Test' };
    api.get.mockResolvedValue(respond(profile));

    const result = await studentSelfProfileService.getMyProfile(schoolId);

    expect(api.get).toHaveBeenCalledWith(`${selfBase}/profile`);
    expect(result).toEqual(profile);
  });

  it('getMyLessons (P9) : GET …/lessons', async () => {
    api.get.mockResolvedValue(respond([]));

    await studentSelfProfileService.getMyLessons(schoolId);

    expect(api.get).toHaveBeenCalledWith(`${selfBase}/lessons`);
  });

  it('getMyExams (P10) : GET …/exams', async () => {
    api.get.mockResolvedValue(respond([]));

    await studentSelfProfileService.getMyExams(schoolId);

    expect(api.get).toHaveBeenCalledWith(`${selfBase}/exams`);
  });

  it('getMyFinancialSummary (P11) : GET …/financial', async () => {
    const summary = { totalRevenue: 0, totalPending: 0, totalDue: 0 };
    api.get.mockResolvedValue(respond(summary));

    const result = await studentSelfProfileService.getMyFinancialSummary(schoolId);

    expect(api.get).toHaveBeenCalledWith(`${selfBase}/financial`);
    expect(result).toEqual(summary);
  });
});
