import { validate } from '../../../../http/validation';
import { UUID } from '../../../../test-utils/http';
import {
  approveLessonSchema,
  bookForStudentSchema,
  cancelLessonSchema,
  lessonFiltersSchema,
  agendaQuerySchema,
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

  it('L9 agendaQuerySchema : from < to, plage ≤ 31 jours, instructorId facultatif (15.1)', () => {
    const week = validate(agendaQuerySchema, {
      from: '2026-10-05T00:00:00.000Z',
      to: '2026-10-12T00:00:00.000Z',
    });
    expect(week.ok && week.value.from).toEqual(new Date('2026-10-05T00:00:00.000Z'));

    expect(
      validate(agendaQuerySchema, {
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-11-01T00:00:00.000Z',
      }).ok
    ).toBe(true);
    const tooLong = validate(agendaQuerySchema, {
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-11-02T00:00:00.000Z',
    });
    expect(tooLong.ok).toBe(false);
    expect(!tooLong.ok && tooLong.detail).toMatch(/31 jours/);

    expect(validate(agendaQuerySchema, { from: '2026-10-12', to: '2026-10-05' }).ok).toBe(false);
    expect(validate(agendaQuerySchema, { from: '2026-10-05' }).ok).toBe(false);
    expect(
      validate(agendaQuerySchema, { from: '2026-10-05', to: '2026-10-06', instructorId: 'x' }).ok
    ).toBe(false);
  });

  it('L4 / L5 acceptent force (booléen) pour passer outre un chevauchement (15.2, D-58)', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const approve = validate(approveLessonSchema, {
      scheduledDate: future,
      durationMinutes: 60,
      force: true,
    });
    expect(approve.ok && approve.value.force).toBe(true);
    expect(
      validate(approveLessonSchema, { scheduledDate: future, durationMinutes: 60, force: 'oui' }).ok
    ).toBe(false);
    const book = validate(bookForStudentSchema, {
      studentId: '11111111-1111-4111-8111-111111111111',
      type: 'CODE',
      scheduledDate: future,
      durationMinutes: 60,
      force: false,
    });
    expect(book.ok && book.value.force).toBe(false);
  });
});
