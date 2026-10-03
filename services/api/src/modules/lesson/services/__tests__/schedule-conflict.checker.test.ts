import { Queryable } from '../../../../db/transaction';
import { ScheduleConflictChecker, ScheduleConflictSource } from '../schedule-conflict.checker';

describe('ScheduleConflictChecker (15.2, D-58)', () => {
  const tx: Queryable = { query: jest.fn() };
  const slot = {
    start: new Date('2026-10-05T09:00:00Z'),
    durationMinutes: 60,
    instructorId: 'instr-1',
    studentUserId: 'user-1',
    excludeLessonId: 'lesson-1',
  };
  const conflict = {
    lessonId: 'lesson-2',
    scheduledDate: new Date('2026-10-05T09:30:00Z'),
    durationMinutes: 60,
    instructorId: 'instr-1',
    studentId: 'user-9',
    student: { id: 'user-9', firstName: 'Yasmine', lastName: 'Amri' },
  };
  let source: jest.Mocked<ScheduleConflictSource>;
  let checker: ScheduleConflictChecker;

  beforeEach(() => {
    source = { lockSchedule: jest.fn(), findOverlap: jest.fn().mockResolvedValue(null) };
    checker = new ScheduleConflictChecker(source);
  });

  it('créneau libre : verrouille l’instructeur et l’élève, puis cherche dans la transaction', async () => {
    await expect(checker.assertFree(slot, false, tx)).resolves.toBeUndefined();
    expect(source.lockSchedule).toHaveBeenCalledWith(['instr-1', 'user-1'], tx);
    expect(source.findOverlap).toHaveBeenCalledWith(slot, tx);
    // Le verrou précède la recherche : deux approbations simultanées ne passent pas ensemble
    expect(source.lockSchedule.mock.invocationCallOrder[0]).toBeLessThan(
      source.findOverlap.mock.invocationCallOrder[0]
    );
  });

  it('chevauchement : 409 SCHEDULE_CONFLICT avec la leçon en conflit', async () => {
    source.findOverlap.mockResolvedValue(conflict);
    await expect(checker.assertFree(slot, false, tx)).rejects.toMatchObject({
      status: 409,
      code: 'SCHEDULE_CONFLICT',
      message: "L'instructeur a déjà une leçon sur ce créneau",
      details: { conflict },
    });

    // Conflit venu de l'élève (autre instructeur)
    source.findOverlap.mockResolvedValue({
      ...conflict,
      instructorId: 'instr-2',
      studentId: 'user-1',
    });
    await expect(checker.assertFree(slot, false, tx)).rejects.toMatchObject({
      message: "L'élève a déjà une leçon sur ce créneau",
    });
  });

  it('force : l’instructeur passe outre, le verrou est quand même posé', async () => {
    source.findOverlap.mockResolvedValue(conflict);
    await expect(checker.assertFree(slot, true, tx)).resolves.toBeUndefined();
    expect(source.lockSchedule).toHaveBeenCalledTimes(1);
    expect(source.findOverlap).not.toHaveBeenCalled();
  });
});
