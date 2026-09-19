/**
 * Règles pures du modèle Lesson : fenêtre d'annulation (D-24) et lecture de l'avoir (D-40).
 */
import { Lesson, LessonStatus, LessonType, canStudentCancel, paymentNote } from '../Lesson';

const base: Lesson = {
  id: 'l1',
  schoolId: 's1',
  studentId: 'u1',
  student: { id: 'u1', firstName: 'Lina', lastName: 'Test' },
  instructorId: null,
  instructor: null,
  preferredInstructorId: null,
  type: LessonType.PARC,
  status: LessonStatus.PENDING,
  requestedDate: null,
  scheduledDate: null,
  durationMinutes: null,
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
};

describe('canStudentCancel (D-24)', () => {
  const now = new Date('2026-09-19T12:00:00.000Z');
  const at = (hoursFromNow: number) =>
    new Date(now.getTime() + hoursFromNow * 3600 * 1000).toISOString();

  it('une demande pending est toujours annulable', () => {
    expect(canStudentCancel(base, now)).toBe(true);
  });

  it('une leçon planifiée l’est jusqu’à 24 h avant, plus après', () => {
    const scheduled = { ...base, status: LessonStatus.SCHEDULED };
    expect(canStudentCancel({ ...scheduled, scheduledDate: at(25) }, now)).toBe(true);
    expect(canStudentCancel({ ...scheduled, scheduledDate: at(24) }, now)).toBe(true);
    expect(canStudentCancel({ ...scheduled, scheduledDate: at(23) }, now)).toBe(false);
  });

  it('jamais pour une leçon passée, annulée ou refusée', () => {
    for (const status of [LessonStatus.COMPLETED, LessonStatus.CANCELLED, LessonStatus.REJECTED]) {
      expect(canStudentCancel({ ...base, status, scheduledDate: at(48) }, now)).toBe(false);
    }
  });
});

describe('paymentNote (D-40)', () => {
  it('réglée par l’avoir', () => {
    expect(
      paymentNote({ ...base, status: LessonStatus.SCHEDULED, paid: true, paymentMethod: 'credit', creditApplied: 40 })
    ).toBe('paid-with-credit');
  });

  it('avoir partiel sur une leçon non payée', () => {
    expect(
      paymentNote({ ...base, status: LessonStatus.SCHEDULED, paid: false, creditApplied: 5 })
    ).toBe('credit-applied');
  });

  it('versement rendu en avoir : leçon annulée payée, ou absence prépayée', () => {
    expect(
      paymentNote({ ...base, status: LessonStatus.CANCELLED, paid: true, paymentMethod: 'cash' })
    ).toBe('refunded-as-credit');
    expect(
      paymentNote({ ...base, status: LessonStatus.COMPLETED, attended: false, paid: false, creditApplied: 20 })
    ).toBe('refunded-as-credit');
  });

  it('rien de particulier sinon', () => {
    expect(paymentNote({ ...base, status: LessonStatus.SCHEDULED, paid: true, paymentMethod: 'cash' })).toBeNull();
    expect(paymentNote({ ...base, status: LessonStatus.CANCELLED })).toBeNull();
  });
});
