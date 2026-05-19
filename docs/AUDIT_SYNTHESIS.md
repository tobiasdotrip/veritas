# Synthèse des Audits — Veritas

**Date** : 2026-05-20
**Scope** : Backend, Frontend, ETL, Shared, Infrastructure

---

## Résumé exécutif

| Domaine | Score | Verdict |
|---------|-------|---------|
| Code Review (reviewer) | — | 🔴 Changes Required — 11 blockers |
| Sécurité (security-engineer) | — | 🟡 Approuvé avec mitigations — 4 High |
| Architecture (tech-lead) | **6.6/10** | 🔴 Changes Required |
| Qualité & Tests (qa-engineer) | **0/10** | 🔴 Bloquant — 0% couverture |

---

## 🔴 Blockers fonctionnels (11)

| # | Problème | Impact |
|---|----------|--------|
| 1 | Comparateur envoie des slugs au lieu d'IDs PAxxx | Comparateur inutilisable (400 API) |
| 2 | Format réponse API incompatible (frontend attend `meta`, backend retourne flat) | Pagination, recherche, comparateur cassés |
| 3 | Route `/scrutins/:id/groups` inexistante | Page scrutin crash |
| 4 | Pagination cursor cassée (encode/decode mismatch) | "Charger plus" ne fonctionne jamais |
| 5 | Ratio vs pourcentage (0.8234 affiché comme 0.8%) | Stats député fausses |
| 6 | ETL votes : `onConflictDoNothing` → données obsolètes | Intégrité données compromise |
| 7 | `totalMembers` groupe compte les votes pas les députés | Stats groupe fausses |
| 8 | Cursor invalide silencieux (ignore au lieu de 400) | Données dupliquées possibles |
| 9 | Filtres `group`, `legislature`, `theme` ignorés | Fonctionnalités inopérantes |
| 10 | Décode cursor ignore les erreurs | Sécurité + pagination |
| 11 | Meilisearch installé mais jamais utilisé | Dépendance inutile |

## 🟡 Sécurité (4 High)

| # | Problème | CVE |
|---|----------|-----|
| 1 | `h3@1.15.3` vulnérable via vinxi | CVE-2026-23527, CVE-2026-33128 |
| 2 | Fallback DATABASE_URL avec mot de passe en dur | — |
| 3 | Rate limit `req.ip` sans trustProxy | Contournable derrière proxy |
| 4 | Secrets en clair dans docker-compose | — |

## 🔴 Qualité (2 Bloquants)

| # | Problème | Détails |
|---|----------|---------|
| 1 | **0 tests automatisés** | Vitest installé, 0 fichier de test |
| 2 | **0 CI/CD** | Pas de GitHub Actions |

## ✅ Points positifs

- Architecture backend solide (routes → service → repository)
- Validation Zod sur tous les endpoints
- Error handling RFC 7807
- Cache Redis avec invalidation par génération
- Drizzle ORM correctement utilisé (pas d'injection SQL)
- Frontend accessible (WCAG 2.1 AA)
- ETL avec parsing streaming et retry

---

## Plan de correction

### Phase 1 — Blockers fonctionnels (en cours)
- [ ] Unifier le contrat API frontend/backend
- [ ] Corriger la pagination cursor
- [ ] Corriger le comparateur (IDs PAxxx)
- [ ] Corriger le ratio/pourcentage
- [ ] Corriger ETL votes (onConflictDoUpdate)
- [ ] Corriger totalMembers groupe

### Phase 2 — Sécurité
- [ ] Forcer h3 >= 1.15.9
- [ ] Retirer secrets en dur
- [ ] Configurer trustProxy + rate limit

### Phase 3 — Tests
- [ ] Ajouter vitest.config.ts
- [ ] Tests unitaires (pagination, cache, comparateur)
- [ ] Tests d'intégration backend + DB
- [ ] Setup GitHub Actions CI

---

*Rapports détaillés disponibles dans les artifacts des agents reviewer, security-engineer, tech-lead, qa-engineer.*
