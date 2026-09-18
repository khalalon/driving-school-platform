import { validate } from '../../../../http/validation';
import { UUID } from '../../../../test-utils/http';
import {
  approveLessonSchema,
  bookForStudentSchema,
  cancelLessonSchema,
  lessonFiltersSchema,
  rejectLessonSchema,
  requestLessonSchema,
} from '../lesson.validator';

const future = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();

describe('Validateurs du module lesson (contrat L1–L7, schéma 007)', () => {
  it('L2 requestLessonSchema : type D-18, date future, préférence et notes facultatives', () => {
    const ok = validate(requestLessonSchema, { type: 'Parc', requestedDate: future });
    expect(ok.ok).toBe(true);

    const badType = validate(requestLessonSchema, { type: 'PRACTICAL', requestedDate: future });
    expect(badType.ok).toBe(false);

    const pastDate = validate(requestLessonSchema, {
      type: 'CODE',
      requestedDate: '2020-01-01T10:00:00.000Z',
    });
    expect(pastDate.ok).toBe(false);
  });

  it('L5 approveLessonSchema : scheduledDate + durationMinutes requis, price facultatif (D-30)', () => {
    expect(validate(approveLessonSchema, { scheduledDate: future, durationMinutes: 60 }).ok).toBe(
      true
    );
    expect(validate(approveLessonSchema, { scheduledDate: future }).ok).toBe(false);
    expect(
      validate(approveLessonSchema, { scheduledDate: future, durationMinutes: 60, price: -1 }).ok
    ).toBe(false);
  });

  it('L6 rejectLessonSchema : motif de 10 à 500 caractères (D-29) ; L3 cancel : motif facultatif', () => {
    expect(validate(rejectLessonSchema, { reason: 'trop court' }).ok).toBe(true);
    expect(validate(rejectLessonSchema, { reason: 'court' }).ok).toBe(false);
    expect(validate(cancelLessonSchema, {}).ok).toBe(true);
  });

  it('L4 bookForStudentSchema : studentId uuid, type, scheduledDate, durationMinutes', () => {
    const body = {
      studentId: UUID.student,
      type: 'Manœuvre',
      scheduledDate: future,
      durationMinutes: 45,
    };
    expect(validate(bookForStudentSchema, body).ok).toBe(true);
    expect(validate(bookForStudentSchema, { ...body, studentId: 'x' }).ok).toBe(false);
  });

  it('L1 lessonFiltersSchema : status simple ou liste séparée par des virgules, scope, date', () => {
    const one = validate(lessonFiltersSchema, { status: 'pending' });
    expect(one).toEqual({ ok: true, value: { status: ['pending'] } });

    const many = validate(lessonFiltersSchema, {
      status: 'pending, scheduled',
      scope: 'mine',
      date: '2026-10-01',
    });
    expect(many).toEqual({
      ok: true,
      value: { status: ['pending', 'scheduled'], scope: 'mine', date: '2026-10-01' },
    });

    const unknownStatus = validate(lessonFiltersSchema, { status: 'pending,booked' });
    expect(unknownStatus.ok).toBe(false);
    if (!unknownStatus.ok) {
      expect(unknownStatus.detail).toContain('booked');
    }

    expect(validate(lessonFiltersSchema, { scope: 'all' }).ok).toBe(false);
    expect(validate(lessonFiltersSchema, { date: '01/10/2026' }).ok).toBe(false);
  });
});
