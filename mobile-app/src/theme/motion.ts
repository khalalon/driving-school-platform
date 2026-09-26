/**
 * Jetons de mouvement « Circuit » (13.4, D-52). Toutes les animations de l'application puisent
 * ici leur durée et leur ressort : un seul rythme, et la sortie plus rapide que l'entrée.
 *
 * Les ressorts sont décrits en `damping` / `stiffness` / `mass`, format commun à
 * `Animated.spring` (React Native) et `withSpring` (Reanimated).
 */

export const motion = {
  duration: {
    /** Retour d'appui, changement d'état d'une pastille. */
    fast: 120,
    /** Apparition d'un toast, d'une carte, d'un contenu remplacé. */
    base: 200,
    /** Transition d'écran, feuille qui monte. */
    slow: 320,
  },
  /** Une sortie dure ~65 % de l'entrée : ce qui s'en va ne doit pas faire attendre. */
  exitRatio: 0.65,
  spring: {
    /** Réponse nette : appui, bascule. */
    snappy: { damping: 20, stiffness: 320, mass: 1 },
    /** Arrivée douce : carte, jauge qui se remplit. */
    gentle: { damping: 18, stiffness: 140, mass: 1 },
  },
  /** Échelle d'un élément pressé (sans décaler la mise en page : transformation seulement). */
  pressScale: 0.97,
  /** Décalage entre deux éléments d'une liste qui apparaissent l'un après l'autre. */
  stagger: 40,
} as const;

/** Durée de sortie correspondant à une durée d'entrée. */
export const exitDuration = (enter: number): number => Math.round(enter * motion.exitRatio);
