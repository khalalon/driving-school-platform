/**
 * Libellés d'examen selon le type (D-42) : théorie planifiée par l'école, pratique convoquée
 * par la session ATTT ; mêmes statuts, seuls les mots changent.
 */
import { EXAM_PROCEDURES, ExamStatus, ExamType, examStatusLabel } from '../Exam';

describe('EXAM_PROCEDURES (D-42)', () => {
  it('théorie : l’école choisit la date (Schedule / Reject)', () => {
    expect(EXAM_PROCEDURES[ExamType.THEORY]).toMatchObject({
      scheduleAction: 'Schedule',
      rejectAction: 'Reject',
      scheduledStatus: 'Scheduled',
      rejectedStatus: 'Rejected',
    });
  });

  it('pratique : date imposée par la session ATTT (Record convocation / File not ready)', () => {
    expect(EXAM_PROCEDURES[ExamType.PRACTICAL]).toMatchObject({
      scheduleAction: 'Record convocation',
      rejectAction: 'File not ready',
      scheduledStatus: 'Convocation received',
      rejectedStatus: 'File not ready',
    });
  });

  it('examStatusLabel : statuts scheduled / rejected traduits selon le type, les autres inchangés', () => {
    expect(examStatusLabel(ExamType.THEORY, ExamStatus.SCHEDULED)).toBe('Scheduled');
    expect(examStatusLabel(ExamType.PRACTICAL, ExamStatus.SCHEDULED)).toBe('Convocation received');
    expect(examStatusLabel(ExamType.PRACTICAL, ExamStatus.REJECTED)).toBe('File not ready');
    expect(examStatusLabel(ExamType.PRACTICAL, ExamStatus.COMPLETED)).toBe('Completed');
    expect(examStatusLabel(ExamType.THEORY, ExamStatus.PENDING)).toBe('Pending');
  });
});
