/**
 * Règles pures du modèle Lesson : fenêtre d'annulation (D-24) et lecture de l'avoir (D-40).
 */
import {
  Lesson,
  LessonStatus,
  LessonType,
  canStudentCancel,
  isLessonInProgress,
  paymentNote,
  pickCurrentLesson,
} from "../Lesson";

const base: Lesson = {
  id: "l1",
  schoolId: "s1",
  studentId: "u1",
  student: { id: "u1", firstName: "Lina", lastName: "Test" },
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
  createdAt: "2026-09-19T00:00:00.000Z",
  updatedAt: "2026-09-19T00:00:00.000Z",
};

describe("canStudentCancel (D-24)", () => {
  const now = new Date("2026-09-19T12:00:00.000Z");
  const at = (hoursFromNow: number) =>
    new Date(now.getTime() + hoursFromNow * 3600 * 1000).toISOString();

  it("une demande pending est toujours annulable", () => {
    expect(canStudentCancel(base, now)).toBe(true);
  });

  it("une leçon planifiée l’est jusqu’à 24 h avant, plus après", () => {
    const scheduled = { ...base, status: LessonStatus.SCHEDULED };
    expect(canStudentCancel({ ...scheduled, scheduledDate: at(25) }, now)).toBe(
      true,
    );
    expect(canStudentCancel({ ...scheduled, scheduledDate: at(24) }, now)).toBe(
      true,
    );
    expect(canStudentCancel({ ...scheduled, scheduledDate: at(23) }, now)).toBe(
      false,
    );
  });

  it("jamais pour une leçon passée, annulée ou refusée", () => {
    for (const status of [
      LessonStatus.COMPLETED,
      LessonStatus.CANCELLED,
      LessonStatus.REJECTED,
    ]) {
      expect(
        canStudentCancel({ ...base, status, scheduledDate: at(48) }, now),
      ).toBe(false);
    }
  });
});

describe("paymentNote (D-40)", () => {
  it("réglée par l’avoir", () => {
    expect(
      paymentNote({
        ...base,
        status: LessonStatus.SCHEDULED,
        paid: true,
        paymentMethod: "credit",
        creditApplied: 40,
      }),
    ).toBe("paid-with-credit");
  });

  it("avoir partiel sur une leçon non payée", () => {
    expect(
      paymentNote({
        ...base,
        status: LessonStatus.SCHEDULED,
        paid: false,
        creditApplied: 5,
      }),
    ).toBe("credit-applied");
  });

  it("versement rendu en avoir : leçon annulée payée, ou absence prépayée", () => {
    expect(
      paymentNote({
        ...base,
        status: LessonStatus.CANCELLED,
        paid: true,
        paymentMethod: "cash",
      }),
    ).toBe("refunded-as-credit");
    expect(
      paymentNote({
        ...base,
        status: LessonStatus.COMPLETED,
        attended: false,
        paid: false,
        creditApplied: 20,
      }),
    ).toBe("refunded-as-credit");
  });

  it("rien de particulier sinon", () => {
    expect(
      paymentNote({
        ...base,
        status: LessonStatus.SCHEDULED,
        paid: true,
        paymentMethod: "cash",
      }),
    ).toBeNull();
    expect(paymentNote({ ...base, status: LessonStatus.CANCELLED })).toBeNull();
  });
});

describe("isLessonInProgress / pickCurrentLesson (D-45)", () => {
  const now = new Date("2026-09-20T10:45:00.000Z");
  const at = (
    id: string,
    iso: string,
    status = LessonStatus.SCHEDULED,
    duration = 60,
  ): Lesson => ({
    ...base,
    id,
    status,
    scheduledDate: iso,
    durationMinutes: duration,
  });

  it("en cours : entre le début et la fin (durée de la leçon), planifiée seulement", () => {
    expect(isLessonInProgress(at("a", "2026-09-20T10:30:00.000Z"), now)).toBe(
      true,
    );
    expect(isLessonInProgress(at("b", "2026-09-20T09:30:00.000Z"), now)).toBe(
      false,
    );
    expect(
      isLessonInProgress(
        at("c", "2026-09-20T09:30:00.000Z", LessonStatus.SCHEDULED, 90),
        now,
      ),
    ).toBe(true);
    expect(isLessonInProgress(at("d", "2026-09-20T11:00:00.000Z"), now)).toBe(
      false,
    );
    expect(
      isLessonInProgress(
        at("e", "2026-09-20T10:30:00.000Z", LessonStatus.COMPLETED),
        now,
      ),
    ).toBe(false);
    expect(
      isLessonInProgress(
        { ...base, status: LessonStatus.SCHEDULED, scheduledDate: null },
        now,
      ),
    ).toBe(false);
  });

  it("en cours d’abord, sinon la prochaine à venir, sinon rien", () => {
    const past = at("past", "2026-09-20T09:00:00.000Z");
    const current = at("current", "2026-09-20T10:30:00.000Z");
    const later = at("later", "2026-09-20T14:00:00.000Z");
    const soon = at("soon", "2026-09-20T12:00:00.000Z");
    expect(pickCurrentLesson([later, past, current, soon], now)?.id).toBe(
      "current",
    );
    expect(pickCurrentLesson([later, past, soon], now)?.id).toBe("soon");
    expect(
      pickCurrentLesson(
        [past, at("done", "2026-09-20T12:00:00.000Z", LessonStatus.COMPLETED)],
        now,
      ),
    ).toBeNull();
    expect(pickCurrentLesson([], now)).toBeNull();
  });
});
