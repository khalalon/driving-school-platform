/**
 * ExamService — X1 à X5 du contrat : URL, verbe, payload, query, et `response.data` renvoyé.
 */
import { mockApiClientModule, mockedApiClient, respond } from './mockApiClient';

jest.mock('../ApiClient', () => mockApiClientModule());

import { examService } from '../ExamService';
import { ExamResult, ExamStatus, ExamType } from '../../../models/Exam';

const api = mockedApiClient();
const examId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const exam = { id: examId, type: ExamType.THEORY, status: ExamStatus.PENDING, result: ExamResult.PENDING };

describe('ExamService', () => {
  it('getMyExams (X1) sans filtre : GET /api/exams/my-exams sans query', async () => {
    api.get.mockResolvedValue(respond([exam]));

    const result = await examService.getMyExams();

    expect(api.get).toHaveBeenCalledWith('/api/exams/my-exams', undefined);
    expect(result).toEqual([exam]);
  });

  it('getMyExams (X1) avec statuts : ?status=scheduled,completed', async () => {
    api.get.mockResolvedValue(respond([]));

    await examService.getMyExams({ status: [ExamStatus.PENDING] });
    await examService.getMyExams({ status: [ExamStatus.SCHEDULED, ExamStatus.COMPLETED] });

    expect(api.get).toHaveBeenNthCalledWith(1, '/api/exams/my-exams', {
      params: { status: 'pending' },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/exams/my-exams', {
      params: { status: 'scheduled,completed' },
    });
  });

  it('requestExam (X2) : POST /api/exams/request { examType ∈ theory|practical, preferredDate, message? }', async () => {
    api.post.mockResolvedValue(respond(exam, 201));
    const data = {
      examType: ExamType.PRACTICAL,
      preferredDate: '2026-09-29T10:00:00.000Z',
      message: 'Je me sens prêt.',
    };

    const result = await examService.requestExam(data);

    expect(api.post).toHaveBeenCalledWith('/api/exams/request', data);
    expect(result).toEqual(exam);
  });

  it('scheduleExam (X3) : PUT /api/exams/:id/schedule { dateTime, location }', async () => {
    api.put.mockResolvedValue(respond({ ...exam, status: ExamStatus.SCHEDULED }));
    const data = { dateTime: '2026-09-29T10:00:00.000Z', location: 'Centre ATTT Tunis' };

    const result = await examService.scheduleExam(examId, data);

    expect(api.put).toHaveBeenCalledWith(`/api/exams/${examId}/schedule`, data);
    expect(result.status).toBe('scheduled');
  });

  it('rejectExamRequest (X4) : PUT /api/exams/:id/reject { reason }', async () => {
    api.put.mockResolvedValue(respond({ ...exam, status: ExamStatus.REJECTED }));

    await examService.rejectExamRequest(examId, 'Encore quelques leçons de conduite');

    expect(api.put).toHaveBeenCalledWith(`/api/exams/${examId}/reject`, {
      reason: 'Encore quelques leçons de conduite',
    });
  });

  it('recordExamResult (X5) : PUT /api/exams/:id/result { result, score?, notes? } — score facultatif', async () => {
    api.put.mockResolvedValue(respond({ ...exam, status: ExamStatus.COMPLETED }));

    await examService.recordExamResult(examId, { result: ExamResult.PASSED, score: 38, notes: 'Bien' });
    await examService.recordExamResult(examId, { result: ExamResult.FAILED });

    expect(api.put).toHaveBeenNthCalledWith(1, `/api/exams/${examId}/result`, {
      result: 'passed',
      score: 38,
      notes: 'Bien',
    });
    expect(api.put).toHaveBeenNthCalledWith(2, `/api/exams/${examId}/result`, { result: 'failed' });
  });
});
