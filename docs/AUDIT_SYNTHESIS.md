# Synthèse des audits — Veritas

**Date initiale** : 2026-05-20  
**Mise à jour** : 2026-05-20 (alignement post-corrections)

**Référence implémentation** : [ETAT_PROJET.md](./ETAT_PROJET.md)

---

## Résumé exécutif

| Domaine | Score initial | Verdict actuel |
|---------|---------------|----------------|
| Code Review | — | 🟡 En cours — blockers critiques partiellement levés |
| Sécurité | 4 High | 🟡 Mitigations partielles (h3, ETL, zip slip) |
| Architecture | 6.6/10 | 🟡 Monorepo structuré, docs alignées |
| Qualité & Tests | 0/10 | 🔴 Toujours bloquant — 0 test, 0 CI |

---

## Corrections appliquées (2026-05-20)

| # | Problème | Statut |
|---|----------|--------|
| — | Comparateur `from=legislature` invalide (400) | ✅ Mapping période → `z.iso.date()` |
| — | Bouton retirer référence comparateur (no-op) | ✅ `clearReference()` |
| — | Pagination votes sans `onClick` | ✅ `useInfiniteQuery` + `fetchNextPage` |
| — | ETL double lecture stream (hash) | ✅ Pipeline `Transform` unique |
| — | ETL zip slip (`../` dans entrées ZIP) | ✅ `resolveSafeZipEntryPath` |
| — | ETL URLs non validées (SSRF) | ✅ `validateEtlUrl` |
| — | `h3@1.15.3` via Vinxi | ✅ Override racine + **suppression Vinxi** (Vite) |
| — | Zod 3 en production | ✅ Zod **4.4.3** + `fastify-type-provider-zod` 6 |
| — | Build frontend `callHook` Vinxi | ✅ Migration `vite build` |

---

## Blockers fonctionnels — statut

| # | Problème | Impact | Statut |
|---|----------|--------|--------|
| 1 | Comparateur slugs vs IDs PAxxx | 400 API | ✅ Backend résout slug ou `PA…` |
| 2 | Format réponse `meta` vs flat | Pagination / recherche | 🟡 Vérifier endpoint par endpoint |
| 3 | Route `/scrutins/:id/groups` inexistante | Page scrutin | 🔴 À confirmer dans le code |
| 4 | Pagination cursor encode/decode | « Charger plus » | 🟡 Backend + frontend infinite query |
| 5 | Ratio vs pourcentage affiché | Stats député | 🔴 À vérifier UI |
| 6 | ETL `onConflictDoNothing` votes | Données obsolètes | 🔴 À vérifier loader |
| 7 | `totalMembers` groupe | Stats fausses | 🔴 À vérifier |
| 8–10 | Cursor / filtres / Meilisearch | Divers | 🔴 Partiel — voir code |

---

## Sécurité — statut

| # | Problème | Statut |
|---|----------|--------|
| 1 | CVE `h3` | ✅ Override `^1.15.9` (plus de Vinxi direct) |
| 2 | `DATABASE_URL` en dur | 🔴 `.env.example` dev only — ne pas commiter `.env` |
| 3 | Rate limit sans `trustProxy` | 🔴 Si déploiement derrière proxy |
| 4 | Secrets docker-compose dev | 🟡 Acceptable en local ; prod = secrets manager |

---

## Qualité — inchangé

| # | Problème | Statut |
|---|----------|--------|
| 1 | 0 tests automatisés | 🔴 |
| 2 | 0 CI/CD | 🔴 |

---

## Points positifs (confirmés)

- Architecture backend routes → service → repository
- Validation Zod 4 sur les endpoints Fastify
- Erreurs RFC 7807
- Cache Redis par génération
- Drizzle sans SQL brut non paramétré
- Frontend accessible (composants Radix, SkipLink, etc.)
- ETL streaming + retry téléchargement + anti zip-slip

---

## Prochaines priorités

1. Tests unitaires (pagination, `safe-zip-path`, comparateur API)
2. GitHub Actions : `typecheck`, `build`, `pnpm audit`
3. Fermer les blockers fonctionnels restants (tableau ci-dessus)
4. Brancher ou retirer les stubs OG / Server Functions selon roadmap

---

*Rapports détaillés agents : artifacts reviewer, security-engineer, tech-lead, qa-engineer.*
