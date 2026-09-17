/**
 * Variables d'environnement lues par l'app. Expo remplace `process.env.EXPO_PUBLIC_*`
 * par leur valeur au démarrage (fichier `mobile-app/.env`, voir `.env.example`).
 */
declare namespace NodeJS {
  interface ProcessEnv {
    /** Surcharge locale de `expo.extra.API_BASE_URL` (app.json). */
    EXPO_PUBLIC_API_BASE_URL?: string;
  }
}
