/**
 * Libellés d'examen selon le type (D-42) : théorie planifiée par l'école, pratique convoquée
 * par la session ATTT ; mêmes statuts, seuls les mots changent.
 */
import { examProcedure, ExamStatus, ExamType, examStatusLabel, examTypeLabel } from '../Exam';
import { applyLanguage } from '../../i18n';

afterEach(() => applyLanguage('fr'));

describe('examProcedure (D-42)', () => {
  it('théorie : l’école choisit la date (Schedule / Reject)', () => {
    expect(examProcedure(ExamType.THEORY)).toMatchObject({
      scheduleAction: 'Planifier',
      rejectAction: 'Refuser',
      scheduledStatus: 'Planifié',
      rejectedStatus: 'Refusé',
    });
  });

  it('pratique : date imposée par la session ATTT (Record convocation / File not ready)', () => {
    expect(examProcedure(ExamType.PRACTICAL)).toMatchObject({
      scheduleAction: 'Enregistrer la convocation',
      rejectAction: 'Dossier incomplet',
      scheduledStatus: 'Convocation reçue',
      rejectedStatus: 'Dossier incomplet',
    });
  });

  it('examStatusLabel : statuts scheduled / rejected traduits selon le type, les autres inchangés', () => {
    expect(examStatusLabel(ExamType.THEORY, ExamStatus.SCHEDULED)).toBe('Planifié');
    expect(examStatusLabel(ExamType.PRACTICAL, ExamStatus.SCHEDULED)).toBe('Convocation reçue');
    expect(examStatusLabel(ExamType.PRACTICAL, ExamStatus.REJECTED)).toBe('Dossier incomplet');
    expect(examStatusLabel(ExamType.PRACTICAL, ExamStatus.COMPLETED)).toBe('Passé');
    expect(examStatusLabel(ExamType.THEORY, ExamStatus.PENDING)).toBe('En attente');
  });

  it('en arabe : types et procédures traduits, la répartition D-42 ne change pas', () => {
    applyLanguage('ar');
    expect(examTypeLabel(ExamType.PRACTICAL)).toBe('السياقة');
    expect(examProcedure(ExamType.THEORY).scheduleAction).toBe('برمجة');
    expect(examProcedure(ExamType.PRACTICAL).scheduleAction).toBe('تسجيل الاستدعاء');
    expect(examStatusLabel(ExamType.PRACTICAL, ExamStatus.SCHEDULED)).toBe('تمّ استلام الاستدعاء');
  });
});
