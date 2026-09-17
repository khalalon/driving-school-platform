# Changelog

Format : une ligne par tâche livrée de `docs/PLAN.md`, sous la forme `- [x.y] description courte (commit)`. Section « Unreleased » tant qu'aucune version n'est taguée.

## Unreleased

- [16/09/2026] Réponses aux 16 questions ouvertes appliquées : D-16 à D-31 dans `docs/DECISIONS.md`, contrat et plan mis à jour. Restent Q-06b et Q-16b.
- [17/09/2026] 15 questions de comportement tranchées : D-32 (demande adressée à l'école, instructeur = préférence), D-33 (examens : `rejected`, score facultatif, pas d'instructeur attitré) ; contrat L1–L7, X1–X5 corrigé (`NOT_ENROLLED` sur L2 et X2, deux chemins d'annulation sur L3, filtres `status` / `scope` / `date` sur L1) ; Q-17, Q-18, Q-19 ouvertes.
- [17/09/2026] Q-06b → D-34 (leçons CODE individuelles, `capacity` forcée à 1, approbation multiple en 6.7) ; Q-16b → D-35 (pas de module notification en v1, tâche 3.3 supprimée, migrations 007–009 renumérotées). Restent Q-17, Q-18, Q-19.
- [0.1] Outillage réparé : migration `004_schema_migrations.sql` (table de suivi) et `scripts/migrate.sh` idempotent derrière `make migrate` (remplace `run-migrations.sh`) ; `student` dans `make install/test/lint/format/coverage`, `health` sur 3007 (student) et 3008 (analytics) ; stub `npm test` racine retiré, `pre-commit` → `lint-staged --config package.json` (Prettier sur les `.ts` des services) ; scopes commitlint `student`, `analytics`, `mobile`, `docs`, `infra`, `e2e`.
