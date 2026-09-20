/**
 * Parcours de l'accueil élève (D-45) : ordre des étapes, étape courante, conclusion par examen,
 * textes. Aucun seuil (D-26).
 */
import { Exam, ExamResult, ExamStatus, ExamType } from '../Exam';
import { buildJourney, currentStep } from '../Journey';
import { Lesson, LessonStatus, LessonType } from '../Lesson';

const lesson = (type: LessonType, status: LessonStatus): Lesson => ({
  id: `l-${type}-${status}`,
  schoolId: 's1',
  studentId: 'u1',
  student: { id: 'u1', firstName: 'Lina', lastName: 'Test' },
  instructorId: null,
  instructor: null,
  preferredInstructorId: null,
  type,
  status,
  requestedDate: null,
  scheduledDate: '2026-09-22T09:00:00.000Z',
  durationMinutes: 60,
  price: null,
  capacity: 1,
  currentBookings: 1,
  notes: null,
  adminNotes: null,
  rejectionReason: null,
  cancellationReason: null,
  cancelledBy: null,
  attended: null,
  feedback: null,
  rating: null,
  paid: false,
  amount: null,
  paymentDate: null,
  paymentMethod: null,
  creditApplied: 0,
  createdAt: '2026-09-19T00:00:00.000Z',
  updatedAt: '2026-09-19T00:00:00.000Z',
});

const exam = (
  type: ExamType,
  status: ExamStatus,
  extra: Partial<Exam> = {}
): Exam => ({
  id: `x-${type}-${status}-${extra.createdAt ?? ''}`,
  schoolId: 's1',
  studentId: 'u1',
  studentFirstName: 'Lina',
  studentLastName: 'Test',
  studentCompletedLessons: 0,
  type,
  status,
  preferredDate: null,
  message: null,
  dateTime: null,
  location: null,
  result: ExamResult.PENDING,
  score: null,
  notes: null,
  rejectionReason: null,
  paid: false,
  amount: null,
  paymentDate: null,
  createdAt: '2026-09-19T00:00:00.000Z',
  updatedAt: '2026-09-19T00:00:00.000Z',
  ...extra,
});

const none = { CODE: 0, Manœuvre: 0, Parc: 0 };

describe('buildJourney — parcours (D-45)', () => {
  it('parcours vide : cinq étapes dans l’ordre, Code courante, le reste à venir', () => {
    const steps = buildJourney(none, [], []);
    expect(steps.map((s) => s.key)).toEqual([
      'code',
      'theory-exam',
      'manoeuvre',
      'parc',
      'practical-exam',
    ]);
    expect(steps.map((s) => s.state)).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    expect(steps[0].detail).toBe('Not started yet');
    expect(steps[1].detail).toBe('Not requested yet');
    expect(currentStep(steps)?.key).toBe('code');
  });

  it('parcours sans fiche (P8 absente) : compteurs à zéro', () => {
    expect(buildJourney(null, [], [])[0].completedLessons).toBe(0);
  });

  it('parcours en cours : la dernière étape active est courante, les précédentes « started »', () => {
    const steps = buildJourney(
      { CODE: 12, Manœuvre: 4, Parc: 0 },
      [exam(ExamType.THEORY, ExamStatus.PENDING)],
      [lesson(LessonType.MANOEUVRE, LessonStatus.SCHEDULED)]
    );
    expect(steps.map((s) => s.state)).toEqual([
      'started',
      'started',
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(steps[0].detail).toBe('12 lessons done');
    expect(steps[1].detail).toBe('Requested — waiting for the school to schedule your exam');
    expect(steps[2]).toMatchObject({ completedLessons: 4, scheduledLessons: 1 });
    expect(steps[2].detail).toBe('4 lessons done · 1 scheduled');
  });

  it('parcours : la théorie réussie conclut Code et l’examen théorique', () => {
    const steps = buildJourney(
      { CODE: 20, Manœuvre: 0, Parc: 0 },
      [
        exam(ExamType.THEORY, ExamStatus.COMPLETED, {
          result: ExamResult.PASSED,
          score: 36,
          createdAt: '2026-09-10T00:00:00.000Z',
        }),
      ],
      []
    );
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming']);
    expect(steps[1].detail).toBe('Passed · score 36');
  });

  it('parcours : un échec garde l’étape ouverte, la demande la plus récente fait foi', () => {
    const steps = buildJourney(
      { CODE: 20, Manœuvre: 0, Parc: 0 },
      [
        exam(ExamType.THEORY, ExamStatus.COMPLETED, {
          result: ExamResult.FAILED,
          createdAt: '2026-09-01T00:00:00.000Z',
        }),
        exam(ExamType.THEORY, ExamStatus.SCHEDULED, {
          dateTime: '2026-10-02T09:00:00.000Z',
          createdAt: '2026-09-15T00:00:00.000Z',
        }),
        exam(ExamType.THEORY, ExamStatus.CANCELLED, { createdAt: '2026-09-18T00:00:00.000Z' }),
      ],
      []
    );
    expect(steps[1].state).toBe('current');
    expect(steps[1].detail).toBe('Scheduled · Oct 2, 2026');
    expect(steps[0].state).toBe('started');
  });

  it('parcours : la pratique réussie conclut tout, plus d’étape courante', () => {
    const steps = buildJourney(
      { CODE: 20, Manœuvre: 10, Parc: 8 },
      [
        exam(ExamType.THEORY, ExamStatus.COMPLETED, { result: ExamResult.PASSED }),
        exam(ExamType.PRACTICAL, ExamStatus.COMPLETED, { result: ExamResult.PASSED }),
      ],
      []
    );
    expect(steps.every((s) => s.state === 'done')).toBe(true);
    expect(currentStep(steps)).toBeNull();
    expect(steps[4].detail).toBe('Passed');
  });

  it('parcours : libellés de la procédure ATTT pour la pratique (D-42)', () => {
    const steps = buildJourney(
      none,
      [
        exam(ExamType.PRACTICAL, ExamStatus.REJECTED, { rejectionReason: 'Dossier incomplet' }),
      ],
      []
    );
    expect(steps[4].detail).toBe('File not ready — you can request again for the next session');
    expect(steps[4].state).toBe('current');
  });
});
