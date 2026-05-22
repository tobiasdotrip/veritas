# Rapport — PostgreSQL comme solution de Cache et de Recherche

**Date** : 2026-05-22  
**Contexte** : Évaluation de la faisabilité de remplacer Redis (cache) et tout service externe de recherche (Meilisearch déjà retiré) par PostgreSQL seul.  
**Auteur** : Analyse du code existant et de la documentation projet.

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Recherche full-text — PostgreSQL, c'est déjà fait](#2-recherche-full-text--postgresql-cest-déjà-fait)
3. [Cache — PostgreSQL peut-il remplacer Redis ?](#3-cache--postgresql-peut-il-remplacer-redis-)
4. [Comparaison détaillée PostgreSQL cache vs Redis](#4-comparaison-détaillée-postgresql-cache-vs-redis)
5. [Scénarios et seuils de bascule](#5-scénarios-et-seuils-de-bascule)
6. [Recommandations finales](#6-recommandations-finales)

---

## 1. Résumé exécutif

**Pour la recherche, ta conviction est juste et déjà prouvée** : PostgreSQL 17 gère 100 % des besoins de recherche du projet Veritas (MVP et V1) avec `to_tsvector` + GIN + `pg_trgm` + `unaccent`. Meilisearch a été retiré avec raison. Aucun service externe n'est nécessaire jusqu'à ~100 000 documents indexés.

**Pour le cache, la réponse est plus nuancée.** PostgreSQL *peut* techniquement servir de cache (table UNLOGGED, vues matérialisées), mais Redis reste supérieur pour ce cas d'usage spécifique. Cependant, si l'objectif est de réduire la complexité opérationnelle au maximum, remplacer Redis par un cache PostgreSQL est **faisable et défendable** pour le volume de Veritas.

| Fonction                    | PostgreSQL actuel | Redis actuel | Verdict                                 |
| --------------------------- | ----------------- | ------------ | --------------------------------------- |
| **Recherche full-text**     | ✅ Déjà en place  | —            | PostgreSQL parfait                      |
| **Typo-tolerance**          | ✅ `pg_trgm` dispo | —            | À activer si besoin utilisateur         |
| **Cache applicatif**        | Faisable          | ✅ En place   | Redis meilleur, mais PG suffisant au MVP |
| **Rate limiting**           | Faisable          | ✅ En place   | Redis meilleur (sliding window native)  |
| **Invalidation de cache**   | Faisable          | ✅ En place   | Redis plus simple (génération counter)  |

---

## 2. Recherche full-text — PostgreSQL, c'est déjà fait

### 2.1. Ce qui est déjà implémenté

Le projet utilise déjà PostgreSQL pour **toute** la recherche, sans aucun service externe :

**Extensions activées** (`apps/backend/src/db/seed.ts`) :
```sql
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
```

**Index GIN full-text** (`packages/shared/src/db/schema.ts`) :
```sql
-- Députés : recherche sur nom + prénom
CREATE INDEX idx_deputies_search ON deputies
  USING gin(to_tsvector('french', coalesce(last_name, '') || ' ' || coalesce(first_name, '')));

-- Scrutins : recherche sur titre + objet
CREATE INDEX idx_scrutins_search ON scrutins
  USING gin(to_tsvector('french', coalesce(titre, '') || ' ' || coalesce(objet, '')));
```

**Requêtes de recherche** (`apps/backend/src/modules/search/routes.ts`) :
- **Autocomplétion** (`/search/suggestions`) : `to_tsquery('french', 'jean:*')` + `ts_rank()` → < 5 ms
- **Recherche full-text** (`/search`) : `plainto_tsquery('french', ...)` + `ts_rank()` avec jointures groupe

### 2.2. Fonctionnalités déjà couvertes

| Capacité                       | Implémentation PostgreSQL                    | Statut |
| ------------------------------ | -------------------------------------------- | ------ |
| Recherche full-text français   | `to_tsvector('french', ...)` + GIN           | ✅     |
| Recherche par préfixe          | `to_tsquery('french', 'mot:*')`              | ✅     |
| Ranking par pertinence         | `ts_rank()`                                  | ✅     |
| Insensibilité aux accents      | Extension `unaccent`                         | ✅     |
| Stemming français              | Dictionnaire français intégré                | ✅     |
| Stop words français            | Intégré (le, la, les, de, du, des...)        | ✅     |
| Recherche combinée députés+scrutins | Deux requêtes parallèles                  | ✅     |
| Filtrage par groupe/département | Index B-Tree + `WHERE`                      | ✅     |

### 2.3. Fonctionnalités disponibles mais non activées

| Capacité                  | Comment l'activer                                        | Coût           |
| ------------------------- | -------------------------------------------------------- | -------------- |
| **Typo-tolerance**        | Index GIN trigramme + `similarity()` + opérateur `%`     | 1 migration    |
| **Recherche floue (2+ fautes)** | `pg_trgm` + `similarity()` avec seuil              | 1 index        |
| **Pondération avancée**   | `setweight()` sur `tsvector` (titre > objet > nom)       | Modification requête |
| **Synonymes**             | Dictionnaire de synonymes PostgreSQL (`thesaurus`)       | Configuration  |
| **Faceting temps réel**   | `COUNT(*) GROUP BY` + index                              | Déjà possible  |
| **Highlighting**          | `ts_headline()`                                          | 1 colonne SELECT |

### 2.4. Ce que PostgreSQL NE fait PAS (et pourquoi c'est acceptable)

| Fonctionnalité absente     | Impact sur Veritas              | Alternative si besoin         |
| -------------------------- | ------------------------------- | ----------------------------- |
| Recherche géospatiale      | Non prévue dans le MVP/V1       | `earthdistance` + lat/lng     |
| Faceting avec counts       | Faisable avec `GROUP BY` + index | Déjà assez rapide sur 3k docs |
| Ranking ML/vectoriel       | Non nécessaire pour noms propres| `pgvector` si besoin un jour  |
| UI d'administration search | Pas critique                    | `pg_stat_user_indexes` + DBeaver |

### 2.5. Performance mesurée / estimée

| Requête                              | Volume | Temps estimé (PostgreSQL 17, VPS 2 vCPU) |
| ------------------------------------ | ------ | ---------------------------------------- |
| Autocomplétion député (3 caractères) | 577    | < 2 ms                                   |
| Autocomplétion scrutin               | 2 500  | < 3 ms                                   |
| Recherche full-text combinée         | 3 100  | < 5 ms                                   |
| Recherche avec typo (via `pg_trgm`)  | 577    | < 5 ms                                   |
| Faceting par groupe                  | 3 100  | < 10 ms                                  |

> **Référence** : un index GIN sur 100 000 documents renvoie des résultats en 2-5 ms. Veritas indexe ~3 100 documents en MVP, ~11 500 en V1.

### 2.6. Bugs actuels (corrigeables, pas des limitations PostgreSQL)

1. **Biais suggestions** (`search/routes.ts:141`) : le tri aléatoire `.sort(() => 0)` favorise les députés si `maxResults` est atteint avant les scrutins. **Correction** : intercaler les deux types proportionnellement ou utiliser un ranking normalisé.
2. **Filtre thématique non croisé** avec la recherche textuelle (`recherche.tsx`). **Correction** : passer le paramètre `theme` dans la requête SQL.

---

## 3. Cache — PostgreSQL peut-il remplacer Redis ?

### 3.1. Ce que fait Redis aujourd'hui

Le `CacheService` (`apps/backend/src/modules/common/cache.ts`) utilise Redis pour :

1. **Cache applicatif** : `getOrSet(key, ttl, factory)` — stocke des objets JSON sérialisés avec TTL
2. **Invalidation par génération** : un compteur `gen:{namespace}` incrémenté après chaque ETL ; les clés incluent ce numéro de génération, les anciennes expirent par TTL
3. **Rate limiting** : via `@fastify/rate-limit` (store Redis) — sliding window

**Clients actuels du cache :**
- Fiches députés (TTL 15 min)
- Votes d'un député (TTL 10 min)
- Détail scrutin (TTL 30 min)
- Comparaisons (TTL 15 min)
- Groupes & stats (TTL 1h)
- Page d'accueil / derniers scrutins (TTL 5 min)

### 3.2. Comment PostgreSQL pourrait remplacer chaque fonction

#### 3.2.1. Cache applicatif → Table UNLOGGED

```sql
-- Table de cache clé-valeur, sans WAL (performante, perdue au crash)
CREATE UNLOGGED TABLE app_cache (
  key       TEXT PRIMARY KEY,
  value     JSONB NOT NULL,
  expires   TIMESTAMPTZ NOT NULL,
  created   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cache_expires ON app_cache(expires)
  WHERE expires < now(); -- index partiel pour purge

-- Insertion avec TTL
INSERT INTO app_cache (key, value, expires)
VALUES ('deputy:PA1234', '{"id":"PA1234",...}', now() + INTERVAL '15 minutes')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, expires = EXCLUDED.expires;

-- Lecture avec vérification TTL
SELECT value FROM app_cache
WHERE key = 'deputy:PA1234' AND expires > now();

-- Purge périodique (planifiée ou au fil de l'eau)
DELETE FROM app_cache WHERE expires < now();
```

**Avantages par rapport à Redis :**
- ✅ Une seule BDD à gérer
- ✅ Pas de service supplémentaire
- ✅ Persistance native (survivable aux crashs si table LOGGED, mais plus lent)
- ✅ Transactions ACID (mise à jour atomique cache + données)

**Inconvénients :**
- ❌ ~10-50× plus lent que Redis (0.5-2 ms vs 0.02 ms)
- ❌ Pas de TTL automatique natif (nécessite un cron de purge)
- ❌ Pas de Pub/Sub pour l'invalidation temps réel
- ❌ Charge la BDD principale avec des requêtes cache

#### 3.2.2. Invalidation par génération → Compteur SQL

```sql
-- Une table de génération par namespace
CREATE TABLE cache_generations (
  namespace TEXT PRIMARY KEY,
  generation BIGINT NOT NULL DEFAULT 0
);

-- Bump après ETL
UPDATE cache_generations
SET generation = generation + 1
WHERE namespace = 'deputies';

-- Lecture
SELECT generation FROM cache_generations WHERE namespace = 'deputies';
```

**Avantage :** l'invalidation par génération fonctionne aussi bien en SQL qu'en Redis.

**Inconvénient :** une requête supplémentaire à chaque lecture de cache pour obtenir la génération. En Redis c'est une commande `GET` quasi-gratuite.

#### 3.2.3. Rate limiting → Table avec expiration

```sql
CREATE TABLE rate_limits (
  ip         INET NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_start)
);

-- Sliding window : incrémenter ou créer
INSERT INTO rate_limits (ip, window_start, count)
VALUES ('192.168.1.1', date_trunc('minute', now()), 1)
ON CONFLICT (ip, window_start) DO UPDATE
SET count = rate_limits.count + 1
RETURNING count;
```

**Problèmes :**
- ❌ **Très lent** comparé à Redis (écritures fréquentes, contention sur la PK)
- ❌ Beaucoup de dead tuples (nécessite `VACUUM` agressif)
- ❌ Le `@fastify/rate-limit` n'a pas de store PostgreSQL natif → code custom nécessaire

C'est le **plus gros point de friction** : le rate limiting est un mauvais candidat pour PostgreSQL.

### 3.3. Alternatives hybrides

| Approche                              | Cache           | Rate Limiting | Complexité |
| ------------------------------------- | --------------- | ------------- | ---------- |
| **Redis seul** (actuel)               | Redis           | Redis         | 2 services |
| **PostgreSQL seul** (puriste)         | UNLOGGED table  | Table PG      | 1 service  |
| **Hybride léger** (recommandé)        | PostgreSQL      | Rate limit mémoire | 1 service |
| **Cache L1 mémoire + L2 PG**         | `Map` mémoire   | `Map` mémoire | 1 service  |

---

## 4. Comparaison détaillée PostgreSQL cache vs Redis

### 4.1. Performance

| Métrique                   | Redis 8              | PostgreSQL UNLOGGED    | PostgreSQL LOGGED     |
| -------------------------- | -------------------- | ---------------------- | --------------------- |
| Latence `GET`              | 0.02-0.1 ms          | 0.5-2 ms               | 1-5 ms                |
| Latence `SET` (avec TTL)   | 0.03-0.1 ms          | 0.5-3 ms               | 2-10 ms               |
| Débit (req/s, 1 thread)    | 100 000+             | 5 000-20 000           | 2 000-10 000          |
| Coût mémoire par entrée    | ~200 octets          | ~500 octets            | ~1 000 octets         |
| TTL natif                  | ✅ Oui               | ❌ Manuel (cron purge) | ❌ Manuel             |
| Persistance crash           | ❌ (ou RDB/AOF lent) | ❌ (UNLOGGED perdu)    | ✅                    |
| Pas de service séparé      | ❌                   | ✅                     | ✅                    |

### 4.2. Fonctionnalités

| Fonctionnalité                | Redis                         | PostgreSQL                     |
| ----------------------------- | ----------------------------- | ------------------------------ |
| Cache clé-valeur              | ✅ Natif (but premier)        | ✅ Faisable (table)            |
| TTL automatique               | ✅ `EXPIRE` natif             | ⚠️ `expires` colonne + cron    |
| Invalidation pattern          | ✅ `SCAN` ou génération       | ⚠️ Génération uniquement       |
| Pub/Sub (invalidation temps réel) | ✅ `PUBLISH/SUBSCRIBE`    | ✅ `LISTEN/NOTIFY`             |
| Rate limiting (sliding window) | ✅ Modèles connus             | ⚠️ Lent, contention            |
| Transactions                  | ⚠️ `MULTI/EXEC` limité        | ✅ ACID complet                 |
| Jointure avec données BDD     | ❌ Non                        | ✅ Oui (cache + données)        |
| Atomicité cache+données       | ❌ Deux systèmes               | ✅ Même transaction             |

### 4.3. Opérationnel

| Critère                  | Redis                    | PostgreSQL                |
| ------------------------ | ------------------------ | ------------------------- |
| Services à maintenir     | 2                        | 1                         |
| Mémoire nécessaire       | 50-200 Mo (cache seul)   | Incluse dans PG           |
| Backup                   | RDB/AOF séparé           | Inclus dans backup PG     |
| Monitoring               | `redis-cli INFO`         | `pg_stat_user_tables`     |
| Réplication              | Redis Sentinel/Cluster   | Streaming replication PG  |
| Montée en charge          | Verticale + Cluster      | Verticale + read replicas |
| Risque divergence cache  | Oui (2 systèmes)         | Non (même BDD)            |

---

## 5. Scénarios et seuils de bascule

### 5.1. Scénario A : Garder Redis (statut quo)

```yaml
Services: PostgreSQL + Redis
Complexité: 2 services
Avantages:
  - Cache sub-milliseconde
  - Rate limiting performant
  - Stack éprouvée, code déjà écrit
  - Redis 8 très stable, peu de maintenance
Inconvénients:
  - 1 service de plus à déployer/monitorer
  - ~50-100 Mo RAM supplémentaire
  - Deux backups à gérer
```

**Recommandé si** : la simplicité ops n'est pas la priorité absolue, ou si le projet prévoit des alertes email / jobs asynchrones en V1 qui utiliseraient Redis Pub/Sub.

### 5.2. Scénario B : Remplacer Redis par PostgreSQL (tout sur PG)

```yaml
Services: PostgreSQL seul
Complexité: 1 service
Modifications:
  - Créer table UNLOGGED app_cache
  - Créer table cache_generations
  - Adapter CacheService (remplacer ioredis par pg)
  - Rate limiting : mémoire (Map) ou table PG avec cron vacuum
  - Cron purge cache (toutes les 5 min)
Avantages:
  - Un seul service
  - Un seul backup
  - Atomicité cache + données (transactions)
  - Zéro risque de divergence cache/BDD
Inconvénients:
  - Cache 10-50× plus lent (mais 1-2 ms reste acceptable)
  - Rate limiting moins performant
  - Charge supplémentaire sur PostgreSQL
  - Code à réécrire (CacheService, rate limiter)
```

**Recommandé si** : la simplicité opérationnelle est la priorité absolue, et 1-2 ms de latence cache est acceptable.

### 5.3. Scénario C : Hybride — PostgreSQL pour cache, mémoire pour rate limiting

```yaml
Services: PostgreSQL seul (+ rate limiting in-process)
Modifications:
  - Cache applicatif → table UNLOGGED PostgreSQL
  - Rate limiting → Map en mémoire Node.js (pas besoin de Redis)
  - Invalidation → table cache_generations
Avantages:
  - Un seul service (PostgreSQL)
  - Rate limiting en mémoire = aussi rapide que Redis
  - Pas de code Redis à maintenir
  - Cache 1-2 ms (très acceptable)
Inconvénients:
  - Rate limiting non partagé entre instances (OK en MVP avec 1 instance)
  - Perte du compteur rate limit au redémarrage (acceptable)
  - Code à réécrire
```

**Recommandé si** : tu veux 1 seul service mais le rate limiting hors PostgreSQL. Parfait pour un MVP avec 1 instance backend.

### 5.4. Quand Redis redevient nécessaire

| Seuil                             | Pourquoi Redis redevient pertinent             |
| --------------------------------- | ---------------------------------------------- |
| > 100 req/s de cache              | `app_cache` PostgreSQL devient un bottleneck   |
| > 3 instances backend             | Rate limiting doit être partagé                |
| Jobs asynchrones (V1)             | Besoin de file d'attente persistante           |
| Pub/Sub temps réel (alertes V1)   | `LISTEN/NOTIFY` moins pratique que Redis       |
| TTL très courts (< 5 secondes)    | PostgreSQL purge trop lourde                   |
| Cache > 100 000 entrées           | PostgreSQL stockage moins efficace que Redis   |

---

## 6. Recommandations finales

### 6.1. Recherche : ✅ PostgreSQL seul, pour toujours (jusqu'à 100k docs)

**Action immédiate :** Corriger les deux bugs identifiés (biais suggestions, filtre thématique).

**Action court terme (si besoin utilisateur) :** Activer la typo-tolerance `pg_trgm` :
```sql
-- Index trigramme pour recherche floue
CREATE INDEX idx_deputies_name_trgm ON deputies
  USING gin (unaccent(last_name || ' ' || first_name) gin_trgm_ops);

-- Requête avec tolérance 1-2 fautes de frappe
SELECT *, similarity(unaccent(last_name || ' ' || first_name), unaccent('jean dupon')) AS sim
FROM deputies
WHERE unaccent(last_name || ' ' || first_name) % unaccent('jean dupon')
ORDER BY sim DESC
LIMIT 5;
```

**Pas d'action long terme :** Meilisearch ne se justifierait qu'à partir de ~100 000 documents indexés (V2+), ou en cas de besoin de synonymes complexes ou de géosearch. Pour 3 100 documents en MVP et 11 500 en V1, PostgreSQL est largement suffisant.

### 6.2. Cache : ⚠️ Garder Redis pour l'instant, réévaluer plus tard

**Ma recommandation :** Garder Redis pour le MVP. C'est stable, le code est écrit, et ça évite de la réécriture. Redis n'est pas un service complexe à opérer — il ne tombe pratiquement jamais en panne, et même s'il tombe, le site continue de fonctionner (cache vide = requêtes directes PostgreSQL, aucune perte de données).

**Si tu veux vraiment tout sur PostgreSQL, le scénario C (hybride) est le meilleur compromis :**
- Cache applicatif → table UNLOGGED PostgreSQL (1-2 ms, acceptable)
- Rate limiting → `Map` en mémoire Node.js
- Suppression de Redis du `docker-compose.yml`
- ~100 lignes de code à modifier dans `CacheService`

### 6.3. Résumé visuel

```
┌─────────────────────────────────────────────────────────────────┐
│                     VERITAS — MVP ACTUEL                         │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│  │ Fastify  │    │   ETL    │    │  TanStack│                   │
│  │  (API)   │    │ (cron)   │    │  Start   │                   │
│  └────┬─────┘    └────┬─────┘    └──────────┘                   │
│       │               │                                          │
│       ├───────────────┤                                          │
│       │               │                                          │
│       ▼               ▼                                          │
│  ┌──────────────────────────────┐    ┌──────────┐               │
│  │        PostgreSQL 17         │    │ Redis 8  │               │
│  │                              │    │          │               │
│  │  ✅ Recherche full-text     │    │ Cache    │               │
│  │  ✅ Typo-tolerance dispo   │    │ Rate Lim.│               │
│  │  ✅ Données structurées    │    │ Sessions │               │
│  │  ⚠️ Cache (faisable)      │    └──────────┘               │
│  │  ⚠️ Rate limit (faisable) │                                 │
│  └──────────────────────────────┘                                │
│                                                                  │
│  Services : 2  │  Complexité : faible  │  Opérationnel : simple  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               CIBLE "TOUT POSTGRESQL" (OPTIONNEL)                │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│  │ Fastify  │    │   ETL    │    │  TanStack│                   │
│  │  (API)   │    │ (cron)   │    │  Start   │                   │
│  └────┬─────┘    └────┬─────┘    └──────────┘                   │
│       │               │                                          │
│       └───────┬───────┘                                          │
│               ▼                                                   │
│  ┌──────────────────────────────┐                                │
│  │        PostgreSQL 17         │                                │
│  │                              │                                │
│  │  ✅ Recherche full-text     │                                │
│  │  ✅ Typo-tolerance          │                                │
│  │  ✅ Données structurées    │                                │
│  │  ✅ Cache (UNLOGGED table)  │                                │
│  │  ✅ Rate limit (in-memory)  │                                │
│  └──────────────────────────────┘                                │
│                                                                  │
│  Services : 1  │  Complexité : minimale  │  Ops : trivial       │
│  Coût : -1 conteneur, -1 backup, +1 requête PG par cache read   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4. Ton intuition est confirmée

Tu avais raison sur le principe :

- **Recherche** : PostgreSQL est la bonne solution, et vous l'avez déjà prouvé en production. Meilisearch était de la sur-ingénierie pour ce volume de données, et l'étude `meilisearch-bullmq-analysis.md` le confirme chiffres à l'appui.
- **Cache** : PostgreSQL *peut* techniquement remplacer Redis, et pour le volume de Veritas (~577 députés, ~2 500 scrutins), un cache PostgreSQL (table UNLOGGED) avec 1-2 ms de latence est parfaitement viable. La vraie question est : vaut-il mieux investir 1-2h à supprimer Redis pour gagner en simplicité opérationnelle, ou garder Redis qui fonctionne déjà très bien ?

C'est un choix de philosophie d'architecture plus que de capacité technique. PostgreSQL peut tout faire dans ton cas.
