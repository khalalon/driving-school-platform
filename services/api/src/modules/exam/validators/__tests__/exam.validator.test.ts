import { validate } from '../../../../http/validation';
import {
  examFiltersSchema,
  recordResultSchema,
  rejectExamSchema,
  requestExamSchema,
  scheduleExamSchema,
} from '../exam.validator';

const future = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();

describe('Validateurs du module exam (contrat X1–X5, schéma 008)', () => {
  it('X2 requestExamSchema : examType D-18, preferredDate future, message facultatif', () => {
    expect(validate(requestExamSchema, { examType: 'theory', preferredDate: future }).ok).toBe(
      true
    );
    expect(validate(requestExamSchema, { examType: 'THEORY', preferredDate: future }).ok).toBe(
      false
    );
    expect(
      validate(requestExamSchema, { examType: 'practical', preferredDate: '2020-01-01T09:00:00Z' })
        .ok
    ).toBe(false);
  });

  it('X3 scheduleExamSchema : dateTime future et location requis', () => {
    expect(validate(scheduleExamSchema, { dateTime: future, location: 'Centre ATTT' }).ok).toBe(
      true
    );
    expect(validate(scheduleExamSchema, { dateTime: future }).ok).toBe(false);
  });

  it('X4 rejectExamSchema : motif 10–500 caractères', () => {
    expect(validate(rejectExamSchema, { reason: 'Dossier incomplet' }).ok).toBe(true);
    expect(validate(rejectExamSchema, { reason: 'court' }).ok).toBe(false);
  });

  it('X5 recordResultSchema : passed | failed seulement, score 0–100 facultatif (D-33)', () => {
    expect(validate(recordResultSchema, { result: 'passed' }).ok).toBe(true);
    expect(validate(recordResultSchema, { result: 'failed', score: 8, notes: 'Créneau' }).ok).toBe(
      true
    );
    expect(validate(recordResultSchema, { result: 'pending' }).ok).toBe(false);
    expect(validate(recordResultSchema, { result: 'passed', score: 101 }).ok).toBe(false);
  });

  it('X1 examFiltersSchema : status simple ou liste, statut inconnu refusé', () => {
    expect(validate(examFiltersSchema, { status: 'pending' })).toEqual({
      ok: true,
      value: { status: ['pending'] },
    });
    expect(validate(examFiltersSchema, { status: 'scheduled ,completed' })).toEqual({
      ok: true,
      value: { status: ['scheduled', 'completed'] },
    });
    const bad = validate(examFiltersSchema, { status: 'passed' });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.detail).toContain('passed');
    }
  });
});
