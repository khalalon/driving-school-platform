/**
 * Logique de l'agenda (15.3) : la semaine va du lundi au lundi suivant (heure locale), chaque
 * leçon tombe dans son jour, triée par heure ; la fin d'une leçon suit sa durée.
 */
import { addDays, groupByDay, lessonEnd, startOfWeek, weekRange } from '../agenda';
import { Lesson, LessonStatus, LessonType } from '../../models/Lesson';

const lessonAt = (id: string, date: Date, durationMinutes: number | null = 60): Lesson =>
  ({
    id,
    status: LessonStatus.SCHEDULED,
    type: LessonType.CODE,
    scheduledDate: date.toISOString(),
    durationMinutes,
  }) as Lesson;

describe('startOfWeek / weekRange', () => {
  it('le lundi 00:00 local de la semaine, dimanche compris', () => {
    // Mercredi 7 octobre 2026, 15 h → lundi 5 octobre
    expect(startOfWeek(new Date(2026, 9, 7, 15, 0))).toEqual(new Date(2026, 9, 5));
    // Dimanche 11 octobre → toujours le lundi 5 (la semaine finit le dimanche)
    expect(startOfWeek(new Date(2026, 9, 11, 23, 30))).toEqual(new Date(2026, 9, 5));
    // Lundi lui-même
    expect(startOfWeek(new Date(2026, 9, 5, 0, 0))).toEqual(new Date(2026, 9, 5));
  });

  it('plage de L9 : [lundi, lundi suivant[ en ISO', () => {
    const monday = new Date(2026, 9, 5);
    expect(weekRange(monday)).toEqual({
      from: monday.toISOString(),
      to: new Date(2026, 9, 12).toISOString(),
    });
    expect(addDays(monday, -7)).toEqual(new Date(2026, 8, 28));
  });
});

describe('groupByDay', () => {
  const monday = new Date(2026, 9, 5);

  it('sept jours, même vides ; chaque leçon dans son jour, triée par heure', () => {
    const lessons = [
      lessonAt('b', new Date(2026, 9, 7, 14, 0)),
      lessonAt('a', new Date(2026, 9, 7, 9, 0)),
      lessonAt('c', new Date(2026, 9, 11, 18, 0)),
    ];
    const days = groupByDay(lessons, monday);
    expect(days).toHaveLength(7);
    expect(days[0].key).toBe('2026-10-05');
    expect(days[2].lessons.map((lesson) => lesson.id)).toEqual(['a', 'b']);
    expect(days[6].lessons.map((lesson) => lesson.id)).toEqual(['c']);
    expect(days[1].lessons).toEqual([]);
  });

  it('une leçon hors de la semaine ou sans date est ignorée', () => {
    const outside = lessonAt('x', new Date(2026, 9, 12, 9, 0));
    const undated = { ...lessonAt('y', new Date()), scheduledDate: null } as Lesson;
    expect(groupByDay([outside, undated], monday).flatMap((day) => day.lessons)).toEqual([]);
  });
});

describe('lessonEnd', () => {
  it('début + durée, 60 min à défaut, null sans date', () => {
    const start = new Date('2026-10-05T09:00:00.000Z');
    expect(lessonEnd(lessonAt('a', start, 90))).toBe('2026-10-05T10:30:00.000Z');
    expect(lessonEnd(lessonAt('b', start, null))).toBe('2026-10-05T10:00:00.000Z');
    expect(lessonEnd({ ...lessonAt('c', start), scheduledDate: null } as Lesson)).toBeNull();
  });
});
