/**
 * Célébrations (13.12, D-52) : à l'ouverture de l'accueil élève, un événement **qui existe déjà**
 * dans les données (aucune route nouvelle) et n'a pas encore été fêté déclenche sa célébration,
 * une seule fois par événement :
 *   - inscription acceptée (E3, demande `approved`)     → `enrolled`
 *   - examen du code réussi (X1, théorie `passed`)      → `theory`
 *   - permis obtenu (X1, examen pratique `passed`)      → `licence`
 * Plusieurs événements en attente se suivent, dans l'ordre du parcours. Les événements déjà fêtés
 * sont mémorisés sur le téléphone.
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnrollmentRequest, EnrollmentStatus } from '../models/Enrollment';
import { Exam, ExamResult, ExamType } from '../models/Exam';

export type CelebrationKind = 'enrolled' | 'theory' | 'licence';

export interface Celebration {
  /** Identifiant stable de l'événement (`enrollment:<id>`, `exam:<id>`). */
  id: string;
  kind: CelebrationKind;
  schoolName?: string;
}

export const CELEBRATED_STORAGE_KEY = '@driving_school/celebrated';

const ORDER: CelebrationKind[] = ['enrolled', 'theory', 'licence'];

/** Événements à fêter, dans l'ordre du parcours, hors ceux déjà fêtés. Fonction pure. */
export const pendingCelebrations = (
  enrollment: EnrollmentRequest | null | undefined,
  exams: Exam[] | null | undefined,
  celebrated: ReadonlySet<string>
): Celebration[] => {
  const events: Celebration[] = [];
  if (enrollment?.status === EnrollmentStatus.APPROVED) {
    events.push({ id: `enrollment:${enrollment.id}`, kind: 'enrolled', schoolName: enrollment.schoolName });
  }
  for (const exam of exams ?? []) {
    if (exam.result !== ExamResult.PASSED) continue;
    events.push({
      id: `exam:${exam.id}`,
      kind: exam.type === ExamType.PRACTICAL ? 'licence' : 'theory',
    });
  }
  return events
    .filter((event) => !celebrated.has(event.id))
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
};

const loadCelebrated = async (): Promise<Set<string>> => {
  try {
    const raw = await AsyncStorage.getItem(CELEBRATED_STORAGE_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
};

/**
 * Célébration à montrer maintenant (ou `null`), et `dismiss` pour passer à la suivante. Tant que
 * les données ne sont pas chargées (`enrollment === undefined`), rien ne s'affiche.
 */
export const useCelebrations = (
  enrollment: EnrollmentRequest | null | undefined,
  exams: Exam[] | null | undefined
): { current: Celebration | null; dismiss: () => void } => {
  const [celebrated, setCelebrated] = useState<Set<string> | null>(null);

  useEffect(() => {
    let active = true;
    loadCelebrated().then((ids) => {
      if (active) setCelebrated(ids);
    });
    return () => {
      active = false;
    };
  }, []);

  const queue =
    celebrated && enrollment !== undefined ? pendingCelebrations(enrollment, exams, celebrated) : [];
  const current = queue[0] ?? null;

  const dismiss = useCallback(() => {
    if (!current || !celebrated) return;
    const next = new Set(celebrated);
    next.add(current.id);
    setCelebrated(next);
    AsyncStorage.setItem(CELEBRATED_STORAGE_KEY, JSON.stringify([...next])).catch(() => undefined);
  }, [current, celebrated]);

  return { current, dismiss };
};
