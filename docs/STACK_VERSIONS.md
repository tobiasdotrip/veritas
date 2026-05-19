# 📦 Stack Technique — Versions validées et corrigées

**Date de validation** : 2026-05-19
**Statut** : ✅ Toutes les versions ont été vérifiées et auditées pour vulnérabilités

---

## Backend

| Dépendance | Version proposée initialement | **Version corrigée 2026** | Raison du changement |
|------------|------------------------------|---------------------------|---------------------|
| **Node.js** | — | **24.x LTS** | LTS active, support jusqu'avril 2028 |
| **Fastify** | 4.x | **5.8.x** | 🔴 v4 EOL juin 2025 + CVE HIGH |
| **Drizzle ORM** | 0.30.x | **0.45.2** | 🔴 CVE SQL injection |
| **Zod** | 3.x | **4.4.x** | Dernière stable, breaking changes documentés |
| **PostgreSQL** | 15.x | **17.x** | 🔴 10 CVEs 2026, support long terme |
| **Redis** | 7.x | **8.0.x** | 🔴 CVE CRITICAL RCE, modules intégrés |
| **Meilisearch (serveur)** | 1.6 | **1.41.x** | 🔴 Path traversal + obsolète |
| **Meilisearch (JS client)** | 0.40.x | **0.58.x** | Compatibilité serveur |
| **BullMQ** | 4.x | **5.76.x** | Dernière stable active |
| **ioredis** | 5.3.x | **5.10.x** | Support nouvelles commandes |

## Frontend

| Dépendance | Version proposée initialement | **Version corrigée 2026** | Raison du changement |
|------------|------------------------------|---------------------------|---------------------|
| **React** | 18.x | **19.2.x** | Stable active, React Compiler v1.0 |
| **React DOM** | 18.x | **19.2.x** | Sync avec React |
| **TanStack Start** | latest | **1.168.x (RC)** | Feature-complete, verrouiller version |
| **TanStack Router** | — | **1.170.x** | Stable, mature |
| **TanStack Query** | 5.x | **5.100.x** | Dernière stable |
| **Tailwind CSS** | 3.4 | **4.3.x** | Réécriture Rust, CSS-first config |
| **Radix UI** | latest | **1.4.x** | Primitives accessibles stables |
| **Zustand** | 4.x | **5.0.x** | Dernière stable |
| **TypeScript** | 5.x | **6.0.x** | Dernière version JS compiler |
| **Satori** | — | **0.26.x** | OG images (risque 0.x accepté) |
| **@resvg/resvg-js** | — | **2.6.2** | SVG→PNG (alpha 2.7 en cours) |

---

## Breaking changes à anticiper

### Fastify 4 → 5
- Schémas JSON complets obligatoires (`querystring`, `params`, `body`, `response`)
- `logger` → `loggerInstance`
- `useSemicolonDelimiter` → `false` par défaut
- Node.js ≥ 20 requis

### Tailwind CSS 3 → 4
- Plus de `tailwind.config.js` auto-détecté (CSS-first config)
- Classes renommées (`shadow-sm` → `shadow-xs`)
- `border-*` passe à `currentColor`
- Migration via `npx @tailwindcss/upgrade`

### Zod 3 → 4
- API erreurs unifiée (`error` au lieu de `errorMap`)
- `z.number()` n'accepte plus `NaN`
- Formats string : `z.uuid()` au lieu de `z.string().uuid()`
- `.merge()`, `.strict()` dépréciés

### TypeScript 5 → 6
- Min target ES2015 (plus de ES5/ES3)
- `moduleResolution: classic` supprimé
- `--downlevelIteration` supprimé
- `--baseUrl` / `outFile` dépréciés

---

## Notes de vigilance

| Composant | Note |
|-----------|------|
| **TanStack Start** | En RC — verrouiller la version exacte en production. Attendre 1.0 stable si conservateur. |
| **Satori** | En 0.x — API peut évoluer. Risque acceptable pour les OG images. |
| **@resvg/resvg-js** | Stable 2.6.2 ancienne (mars 2024). Alpha 2.7 corrige fuites mémoire. Attendre stable 2.7. |
| **Drizzle ORM v1** | En RC — préparer migration depuis 0.45.x quand v1.0 stable sortira. |
| **Redis 8** | Nouvelle licence RSALv2/SSPLv1/AGPLv3 — vérifier compatibilité usage. |

---

*Document généré après audit complet des versions — 2026-05-19*
