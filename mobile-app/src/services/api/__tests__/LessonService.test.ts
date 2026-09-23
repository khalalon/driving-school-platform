/**
 * LessonService — L1 à L7 du contrat : URL, verbe, payload, query, et `response.data` renvoyé.
 */
import { mockApiClientModule, mockedApiClient, respond } from './mockApiClient';

jest.mock('../ApiClient', () => mockApiClientModule());

import { lessonService } from '../LessonService';
import { LessonStatus, LessonType } from '../../../models/Lesson';

const api = mockedApiClient();
const lessonId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const lesson = { id: lessonId, type: LessonType.CODE, status: LessonStatus.PENDING };

describe('LessonService', () => {
  it('getMyLessons (L1) sans filtre : GET /api/lessons sans query', async () => {
    api.get.mockResolvedValue(respond([lesson]));

    const result = await lessonService.getMyLessons();

    expect(api.get).toHaveBeenCalledWith('/api/lessons', undefined);
    expect(result).toEqual([lesson]);
  });

  it('getMyLessons (L1) file de l’école : ?status=pending&scope=school', async () => {
    api.get.mockResolvedValue(respond([]));

    await lessonService.getMyLessons({ status: [LessonStatus.PENDING], scope: 'school' });

    expect(api.get).toHaveBeenCalledWith('/api/lessons', {
      params: { status: 'pending', scope: 'school' },
    });
  });

  it('getMyLessons (L1) mes leçons du jour : status multiple, scope=mine, date=YYYY-MM-DD', async () => {
    api.get.mockResolvedValue(respond([]));

    await lessonService.getMyLessons({
      status: [LessonStatus.SCHEDULED, LessonStatus.COMPLETED],
      scope: 'mine',
      date: '2026-09-19',
    });

    expect(api.get).toHaveBeenCalledWith('/api/lessons', {
      params: { status: 'scheduled,completed', scope: 'mine', date: '2026-09-19' },
    });
  });

  it('requestLesson (L2) : POST /api/lessons { type, requestedDate, preferredInstructorId?, notes? }', async () => {
    api.post.mockResolvedValue(respond(lesson, 201));
    const data = {
      type: LessonType.PARC,
      requestedDate: '2026-09-22T09:00:00.000Z',
      preferredInstructorId: 'i1',
      notes: 'Créneau du matin',
    };

    const result = await lessonService.requestLesson(data);

    expect(api.post).toHaveBeenCalledWith('/api/lessons', data);
    expect(result).toEqual(lesson);
  });

  it('cancelLesson (L3) : POST /api/lessons/:id/cancel, { reason } seulement si fourni', async () => {
    api.post.mockResolvedValue(respond({ ...lesson, status: LessonStatus.CANCELLED }));

    await lessonService.cancelLesson(lessonId);
    await lessonService.cancelLesson(lessonId, 'Empêchement');

    expect(api.post).toHaveBeenNthCalledWith(1, `/api/lessons/${lessonId}/cancel`, {});
    expect(api.post).toHaveBeenNthCalledWith(2, `/api/lessons/${lessonId}/cancel`, {
      reason: 'Empêchement',
    });
  });

  it('bookLessonForStudent (L4) : POST /api/lessons/book-for-student', async () => {
    api.post.mockResolvedValue(respond({ ...lesson, status: LessonStatus.SCHEDULED }, 201));
    const data = {
      studentId: 'u1',
      type: LessonType.MANOEUVRE,
      scheduledDate: '2026-09-22T09:00:00.000Z',
      durationMinutes: 60,
    };

    await lessonService.bookLessonForStudent(data);

    expect(api.post).toHaveBeenCalledWith('/api/lessons/book-for-student', data);
  });

  it('approveLesson (L5) : PUT /api/lessons/:id/approve { scheduledDate, durationMinutes, price?, adminNotes? }', async () => {
    api.put.mockResolvedValue(respond({ ...lesson, status: LessonStatus.SCHEDULED }));
    const data = {
      scheduledDate: '2026-09-22T09:00:00.000Z',
      durationMinutes: 60,
      price: 40,
      adminNotes: 'Rendez-vous devant l’école',
    };

    const result = await lessonService.approveLesson(lessonId, data);

    expect(api.put).toHaveBeenCalledWith(`/api/lessons/${lessonId}/approve`, data);
    expect(result.status).toBe('scheduled');
  });

  it('approveLessons (D-34) : un PUT …/approve par demande, en séquence, échecs collectés sans arrêt', async () => {
    const ids = ['id-1', 'id-2', 'id-3'];
    const conflict = {
      response: { status: 409, data: { error: 'CONFLICT', message: 'Déjà traitée' } },
    };
    api.put
      .mockResolvedValueOnce(respond({ id: 'id-1', status: LessonStatus.SCHEDULED }))
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce(respond({ id: 'id-3', status: LessonStatus.SCHEDULED }));
    const data = { scheduledDate: '2026-09-22T09:00:00.000Z', durationMinutes: 60 };

    const result = await lessonService.approveLessons(ids, data);

    expect(api.put.mock.calls.map((c) => c[0])).toEqual([
      '/api/lessons/id-1/approve',
      '/api/lessons/id-2/approve',
      '/api/lessons/id-3/approve',
    ]);
    expect(api.put.mock.calls.every((c) => c[1] === data)).toBe(true);
    expect(result.succeeded.map((l) => l.id)).toEqual(['id-1', 'id-3']);
    expect(result.failed).toEqual([{ lessonId: 'id-2', error: conflict }]);
  });

  it('rejectLesson (L6) : PUT /api/lessons/:id/reject { reason }', async () => {
    api.put.mockResolvedValue(respond({ ...lesson, status: LessonStatus.REJECTED }));

    await lessonService.rejectLesson(lessonId, 'Aucune disponibilité cette semaine');

    expect(api.put).toHaveBeenCalledWith(`/api/lessons/${lessonId}/reject`, {
      reason: 'Aucune disponibilité cette semaine',
    });
  });

  it('markAttendance (L7) : PUT /api/lessons/:id/attendance { attended, feedback?, rating? }', async () => {
    api.put.mockResolvedValue(respond({ ...lesson, status: LessonStatus.COMPLETED }));

    await lessonService.markAttendance(lessonId, { attended: true, feedback: 'Bien', rating: 4 });
    await lessonService.markAttendance(lessonId, { attended: false });

    expect(api.put).toHaveBeenNthCalledWith(1, `/api/lessons/${lessonId}/attendance`, {
      attended: true,
      feedback: 'Bien',
      rating: 4,
    });
    expect(api.put).toHaveBeenNthCalledWith(2, `/api/lessons/${lessonId}/attendance`, {
      attended: false,
    });
  });
});
