# Revue de sécurité — Tests Vitest Workspace

**Date** : 2026-05-21  
**Scope** : Configuration Vitest workspace + 78 tests sur les modules critiques  
**Testeur** : revue interne (subagent security-engineer indisponible — conflit extension)

---

## ✅ Éléments validés

| Élément | Verdict | Détail |
|---------|---------|--------|
| Config workspace racine | ✅ | `projects` bien structurés, coverage exclusions propres |
| Environnements par package | ✅ | `node` pour ETL/shared/backend, `jsdom` pour frontend |
| Frontend config | ✅ | `mergeConfig(viteConfig, ...)` — réutilise aliases/plugins sans duplication |
| **Zip-slip** (`safe-zip-path`) | ✅ | 12 cas : null bytes, absolu Unix/Windows, traversal simple/nested, `..` safe, types invalides |
| **SSRF** (`validateEtlUrl`) | ✅ | HTTPS, hôte invalide, credentials, format invalide, punycode homograph |
| **Pagination cursor** | ✅ | Base64url, payload malformé, structure manquante, non-object |
| **Schemas Zod** | ✅ | Limites numériques, enums, regexs comparateur, dates ISO |
| **Errors** | ✅ | Codes HTTP, messages, propriétés, stack trace |
| **Comparateur** | ✅ | Validation (2-5 députés), concordance, divergences, pairwise, cache key sorted |
| Isolation tests | ✅ | Pas de `isolate: false`, worker threads par défaut |
| Mock CacheService | ✅ | Mock pass-through correct pour tests unitaires du service |

---

## 🔴 Problèmes identifiés et corrigés

### 1. `config.test.ts` — Test d'env vars était un stub vide
**Problème** : Le test "reads custom env vars" mettait à jour `process.env` mais ne faisait aucune assertion car `defaultConfig` est évalué à l'import.

**Correction** : Remplacé par un test avec `vi.resetModules()` + `await import("./config.js")` (dynamic import re-évalue le module).

### 2. `compare/service.test.ts` — Assertion dans callback de mock
**Problème** : `expect(key).toContain("PA1,PA2")` à l'intérieur du callback `getOrSet`. Si le mock n'est jamais appelé, l'assertion ne s'exécute jamais → faux positif.

**Correction** : Capturer les arguments via `getOrSet.mock.calls[0]!` et vérifier post-appel avec `expect(cacheKey).toContain("PA1,PA2")`.

### 3. `config.test.ts` — Effet de bord filesystem
**Problème** : `ensureTempDir` créait un répertoire `/tmp/etl-test-<Date.now()>` réel sans jamais le nettoyer. `Date.now()` rendait le test non reproductible.

**Correction** : Path déterministe fixe (`/tmp/etl-test-vitest`) + `afterEach` avec `rm(..., { recursive: true, force: true })`.

---

## 🟡 Points de vigilance restants

### 1. `validateEtlUrl` ne vérifie pas le port
`https://data.assemblee-nationale.fr:8080/` passe car `hostname` exclut le port. Un attaquant pourrait rediriger vers un service interne via un port différent si le réseau le permet.

**Recommandation** : Ajouter `if (parsed.port && parsed.port !== "443")` dans `validateEtlUrl`.

### 2. `decodeCursor` ne limite pas la taille du payload
Un cursor base64url de plusieurs Mo provoquerait un `JSON.parse` coûteux (DoS potentiel sur l'API).

**Recommandation** : Limiter la taille du cursor à ~2KB avant décodage.

### 3. Mock CacheService ne teste pas le comportement réel
Le mock est un pass-through (`factory()`). Le vrai `CacheService` utilise des générations Redis — les tests ne valident pas :
- Le TTL est bien respecté
- L'invalidation par génération fonctionne
- Le fallback sur factory en cas d'erreur Redis

**Recommandation** : Ajouter des tests d'intégration avec Redis mocké (Redis Memory Server ou mock ioredis).

### 4. Pas de test de symlink ZIP
Si le parser ZIP extrait des symlinks, `resolveSafeZipEntryPath` ne les détecte pas (il vérifie seulement le nom de l'entrée, pas son type).

**Recommandation** : Vérifier si `node-stream-zip` expose le type d'entrée (fichier vs symlink) et ajouter un garde si nécessaire.

---

## 📊 Résultat final

```
Test Files  6 passed (6)
     Tests  78 passed (78)
  Duration  198ms
```

---

## 📋 Recommandations d'amélioration future

| Priorité | Action | Fichier concerné |
|----------|--------|------------------|
| Haute | Ajouter validation du port dans `validateEtlUrl` | `packages/etl/src/config.ts` |
| Haute | Limiter la taille du cursor dans `decodeCursor` | `apps/backend/src/modules/common/pagination.ts` |
| Moyenne | Tests d'intégration CacheService (Redis mock) | `apps/backend/src/modules/common/cache.test.ts` |
| Moyenne | Test DoS cursor (payload > 1MB) | `apps/backend/src/modules/common/pagination.test.ts` |
| Faible | Vérifier symlinks dans extraction ZIP | `packages/etl/src/parser/zip-extract.ts` |
