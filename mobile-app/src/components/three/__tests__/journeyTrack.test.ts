/**
 * Parcours 3D (13.11, D-52) : l'ovale est continu et fermé, les secteurs se suivent sans se
 * chevaucher, chaque secteur prend l'état de son étape (fait / en cours / à venir) calculé par
 * `buildJourney`, et la voiture se pose sur l'étape en cours.
 */
import { buildJourney } from '../../../models/Journey';
import { Exam, ExamResult, ExamStatus, ExamType } from '../../../models/Exam';
import { LessonType } from '../../../models/Lesson';
import { applyLanguage } from '../../../i18n';
import { themes } from '../../../theme';
import {
  TRACK,
  carSectorIndex,
  journeySectors,
  journeyTrackPalette,
  sectorRange,
  stadiumHeading,
  stadiumPoint,
} from '../journeyTrack';
import { allowedColors } from '../../ui/__tests__/renderInTheme';

const passedExam = (type: ExamType): Exam =>
  ({
    id: `exam-${type}`,
    type,
    status: ExamStatus.COMPLETED,
    result: ExamResult.PASSED,
    score: null,
    createdAt: '2026-09-01T10:00:00.000Z',
  }) as unknown as Exam;

const completed = (code: number, manoeuvre: number, parc: number) => ({
  [LessonType.CODE]: code,
  [LessonType.MANOEUVRE]: manoeuvre,
  [LessonType.PARC]: parc,
});

afterEach(() => applyLanguage('fr'));

describe('géométrie du circuit', () => {
  it('part de la ligne de départ et revient à son point de départ', () => {
    const start = stadiumPoint(0);
    expect(start.x).toBeCloseTo(-TRACK.straight / 2);
    expect(start.z).toBeCloseTo(TRACK.radius);
    const end = stadiumPoint(0.99999);
    expect(end.x).toBeCloseTo(start.x, 2);
    expect(end.z).toBeCloseTo(start.z, 2);
  });

  it('est continu : deux points voisins restent proches', () => {
    for (let i = 0; i < 400; i++) {
      const a = stadiumPoint(i / 400);
      const b = stadiumPoint((i + 1) / 400);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(0.1);
    }
  });

  it('les virages sont des demi-cercles du rayon prévu', () => {
    const p = stadiumPoint(0.3);
    const centre = p.x > 0 ? TRACK.straight / 2 : -TRACK.straight / 2;
    expect(Math.hypot(p.x - centre, p.z)).toBeCloseTo(TRACK.radius, 5);
  });

  it('sur la ligne droite de départ, la voiture roule vers +x', () => {
    expect(stadiumHeading(0.05)).toBeCloseTo(Math.PI / 2, 3);
  });

  it('les cinq secteurs se suivent sans se chevaucher', () => {
    const ranges = [0, 1, 2, 3, 4].map((i) => sectorRange(i, 5));
    ranges.forEach(([from, to], i) => {
      expect(from).toBeLessThan(to);
      if (i > 0) expect(from).toBeGreaterThan(ranges[i - 1][1]);
    });
    expect(ranges[0][0]).toBeGreaterThan(0);
    expect(ranges[4][1]).toBeLessThan(1);
  });
});

describe('secteurs tirés du parcours', () => {
  it('élève au début : le Code est en cours, le reste à venir', () => {
    const steps = buildJourney(completed(3, 0, 0), [], []);
    expect(journeySectors(steps).map((s) => s.state)).toEqual([
      'current',
      'todo',
      'todo',
      'todo',
      'todo',
    ]);
    expect(carSectorIndex(steps)).toBe(0);
  });

  it('code réussi et Manœuvre commencée : Code et examen faits, Manœuvre en cours', () => {
    const steps = buildJourney(completed(12, 4, 0), [passedExam(ExamType.THEORY)], []);
    expect(journeySectors(steps).map((s) => s.state)).toEqual([
      'done',
      'done',
      'current',
      'todo',
      'todo',
    ]);
    expect(carSectorIndex(steps)).toBe(2);
  });

  it('tout conclu : chaque secteur est fait, la voiture rejoint la ligne d’arrivée', () => {
    const steps = buildJourney(
      completed(12, 10, 8),
      [passedExam(ExamType.THEORY), passedExam(ExamType.PRACTICAL)],
      []
    );
    expect(journeySectors(steps).every((s) => s.state === 'done')).toBe(true);
    expect(carSectorIndex(steps)).toBeNull();
  });

  it('chaque secteur s’annonce avec son état et son détail, dans la langue courante', () => {
    const steps = buildJourney(completed(3, 0, 0), [], []);
    expect(journeySectors(steps)[0].accessibilityLabel).toBe(
      `${steps[0].title}, en cours — ${steps[0].detail}`
    );
    applyLanguage('ar');
    const arabic = journeySectors(buildJourney(completed(3, 0, 0), [], []));
    expect(arabic[0].accessibilityLabel).toContain('جارية');
  });
});

describe('journeyTrackPalette', () => {
  it.each(['dark', 'light'] as const)('thème %s : couleurs du thème, fait = jauge, en cours = télémétrie', (name) => {
    const theme = themes[name];
    const palette = journeyTrackPalette(theme);
    expect(palette.done).toBe(theme.colors.gauge);
    expect(palette.current).toBe(theme.colors.telemetry);
    const allowed = allowedColors(theme);
    for (const [key, value] of Object.entries(palette)) {
      if (typeof value === 'string') {
        expect({ key, fromTheme: allowed.has(value.toLowerCase()) }).toEqual({ key, fromTheme: true });
      }
    }
  });
});
