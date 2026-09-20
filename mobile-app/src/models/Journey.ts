/**
 * Journey — le parcours affiché sur l'accueil élève (D-45, 8.2) : Code → examen théorique →
 * Manœuvre → Parc → examen pratique. Purement informatif (D-26 : aucun objectif, aucun seuil,
 * rien n'est bloqué). Fonction pure, sans appel réseau : P8 (`completedLessonsByType`), X1 et L1.
 */

import { EXAM_PROCEDURES, Exam, ExamResult, ExamStatus, ExamType } from './Exam';
import { LESSON_TYPE_LABELS, Lesson, LessonStatus, LessonType } from './Lesson';
import { CompletedLessonsByType } from './Profile';
import { formatDate } from '../utils/format';

export type JourneyStepKey = 'code' | 'theory-exam' | 'manoeuvre' | 'parc' | 'practical-exam';

/**
 * `done` : conclue par un examen réussi ; `current` : l'étape mise en avant ; `started` : une
 * activité sans être l'étape courante ni conclue ; `upcoming` : rien encore.
 */
export type JourneyStepState = 'done' | 'current' | 'started' | 'upcoming';

export interface JourneyStep {
  key: JourneyStepKey;
  title: string;
  kind: 'lessons' | 'exam';
  lessonType?: LessonType;
  examType?: ExamType;
  state: JourneyStepState;
  /** Étape leçon : leçons effectuées (présence marquée, D-33) et planifiées. */
  completedLessons?: number;
  scheduledLessons?: number;
  /** Étape examen : la demande la plus récente non annulée, s'il y en a une. */
  exam?: Exam | null;
  /** Texte court sous le titre. */
  detail: string;
}

const ORDER: readonly { key: JourneyStepKey; lessonType?: LessonType; examType?: ExamType }[] = [
  { key: 'code', lessonType: LessonType.CODE },
  { key: 'theory-exam', examType: ExamType.THEORY },
  { key: 'manoeuvre', lessonType: LessonType.MANOEUVRE },
  { key: 'parc', lessonType: LessonType.PARC },
  { key: 'practical-exam', examType: ExamType.PRACTICAL },
];

const EXAM_TITLES: Record<ExamType, string> = {
  [ExamType.THEORY]: 'Theory exam',
  [ExamType.PRACTICAL]: 'Practical exam',
};

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Demande la plus récente (par `createdAt`) de ce type, hors annulées. */
const latestExam = (exams: Exam[], type: ExamType): Exam | null =>
  exams
    .filter((e) => e.type === type && e.status !== ExamStatus.CANCELLED)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

const examDetail = (exam: Exam | null): string => {
  if (!exam) return 'Not requested yet';
  const procedure = EXAM_PROCEDURES[exam.type];
  switch (exam.status) {
    case ExamStatus.PENDING:
      return `Requested — ${procedure.pendingHint.toLowerCase()}`;
    case ExamStatus.SCHEDULED:
      return `${procedure.scheduledStatus} · ${formatDate(exam.dateTime)}`;
    case ExamStatus.REJECTED:
      return `${procedure.rejectedStatus} — ${procedure.rejectedHint.toLowerCase()}`;
    case ExamStatus.COMPLETED:
      if (exam.result === ExamResult.PASSED) {
        return exam.score !== null ? `Passed · score ${exam.score}` : 'Passed';
      }
      return 'Failed — you can request again';
    default:
      return exam.status;
  }
};

const lessonsDetail = (completed: number, scheduled: number): string => {
  if (completed === 0 && scheduled === 0) return 'Not started yet';
  const parts = [plural(completed, 'lesson') + ' done'];
  if (scheduled > 0) parts.push(`${scheduled} scheduled`);
  return parts.join(' · ');
};

/**
 * Construit les cinq étapes (D-45). Une étape examen est conclue par un examen réussi de ce
 * type ; la théorie réussie conclut aussi Code, la pratique réussie conclut Manœuvre et Parc.
 * L'étape courante = la dernière étape non conclue portant une activité (leçon effectuée ou
 * planifiée, demande d'examen), sinon la première non conclue.
 */
export const buildJourney = (
  completedByType: CompletedLessonsByType | null | undefined,
  exams: Exam[],
  lessons: Lesson[]
): JourneyStep[] => {
  const passed = (type: ExamType): boolean =>
    exams.some((e) => e.type === type && e.result === ExamResult.PASSED);
  const theoryPassed = passed(ExamType.THEORY);
  const practicalPassed = passed(ExamType.PRACTICAL);

  const steps = ORDER.map((item): JourneyStep => {
    if (item.lessonType) {
      const type = item.lessonType;
      const completed = completedByType?.[type] ?? 0;
      const scheduled = lessons.filter(
        (l) => l.type === type && l.status === LessonStatus.SCHEDULED
      ).length;
      const concluded = type === LessonType.CODE ? theoryPassed : practicalPassed;
      return {
        key: item.key,
        title: LESSON_TYPE_LABELS[type],
        kind: 'lessons',
        lessonType: type,
        completedLessons: completed,
        scheduledLessons: scheduled,
        state: concluded ? 'done' : completed + scheduled > 0 ? 'started' : 'upcoming',
        detail: lessonsDetail(completed, scheduled),
      };
    }
    const examType = item.examType as ExamType;
    const exam = latestExam(exams, examType);
    const concluded = examType === ExamType.THEORY ? theoryPassed : practicalPassed;
    return {
      key: item.key,
      title: EXAM_TITLES[examType],
      kind: 'exam',
      examType,
      exam,
      state: concluded ? 'done' : exam ? 'started' : 'upcoming',
      detail: examDetail(exam),
    };
  });

  const open = steps.filter((s) => s.state !== 'done');
  const current = [...open].reverse().find((s) => s.state === 'started') ?? open[0];
  if (current) current.state = 'current';
  return steps;
};

/** L'étape courante, ou `null` quand tout est conclu. */
export const currentStep = (steps: JourneyStep[]): JourneyStep | null =>
  steps.find((s) => s.state === 'current') ?? null;
