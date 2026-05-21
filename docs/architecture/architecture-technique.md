# Rapport d'Architecture Technique — Transparence des Votes des Députés Français

**Version** : 1.1  
**Date** : 2026-05-20  
**Statut** : MVP en cours d'implémentation — voir [ETAT_PROJET.md](../ETAT_PROJET.md)  
**Stack cible** : TanStack Start (Vite) · Fastify 5 · PostgreSQL 17 · Redis 8 · Meilisearch  

---

## Table des matières

1. [Executive Summary](#1-executive-summary)
2. [Architecture Globale](#2-architecture-globale)
3. [Schéma de Base de Données](#3-schéma-de-base-de-données)
4. [API Design](#4-api-design)
5. [Stratégie ETL & Synchronisation](#5-stratégie-etl--synchronisation)
6. [Performance & Cache](#6-performance--cache)
7. [Contraintes Techniques et Solutions](#7-contraintes-techniques-et-solutions)
8. [Sécurité & Conformité](#8-sécurité--conformité)
9. [Stratégie de Déploiement et Scaling](#9-stratégie-de-déploiement-et-scaling)
10. [Roadmap Technique](#10-roadmap-technique)
11. [Annexes](#11-annexes)

---

## 1. Executive Summary

Ce document définit l'architecture technique complète d'une plateforme de transparence parlementaire ciblant **l'Assemblée nationale française** (17e législature, puis historique). L'objectif est de servir des fiches députés, des historiques de votes, des comparateurs et des partages viraux avec une latence de recherche inférieure à 500 ms et un uptime supérieur à 99,5 %.

**Décisions architecturales clés :**
- **Données** : ingestion primaire depuis les fichiers ZIP JSON officiels de `data.assemblee-nationale.fr` via un pipeline ETL maison ; API Poligraph comme source de secours (fallback) et enrichissement.
- **Frontend** : TanStack Start (plugin Vite) avec SSR via bundle `dist/server` et hydratation client TanStack Query.
- **Backend** : Fastify (Node.js) exposant une API REST interne et publique (V1).
- **Recherche** : Meilisearch dédié pour l'autocomplétion et la recherche full-text (< 20 ms sur les index en RAM).
- **Persistance** : PostgreSQL 15+ pour le stockage relationnel structuré, Redis pour le cache distribué, les sessions et l'orchestration de jobs.
- **Génération de images sociales** : worker Node.js + Satori/resvg pour les Open Graph cards à la volée (missive en cache S3/CDN).

---

## 2. Architecture Globale

### 2.1. Vue d'ensemble (C4 — Niveau 2 : Conteneurs)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │   Browser    │  │   Bot SEO    │  │  Mobile Web  │                      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
└─────────┼─────────────────┼─────────────────┼───────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE / CDN (Cloudflare)                           │
│  • Cache statique (pages, assets, OG images)                                │
│  • DDoS protection, WAF basique                                             │
│  • Règles de cache : fiches députés 1h, scrutins 6h, OG images 24h        │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND — Tanstack Start                           │
│  (Déployé sur Vercel / Netlify / Node server)                               │
│  • SSR pour la première visite (SEO, partage RS)                            │
│  • Hydratation progressive côté client                                      │
│  • Tanstack Query pour la gestion d'état serveur                            │
│  • React Server Components (RSC) pour les données quasi-statiques           │
└─────────────────────────────────────────────────────────────────────────────┘
          │ API REST (JSON) + Server-Sent Events (alertes V1)
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND — Fastify API                               │
│  (Déployé sur Railway / Render / Hetzner — Docker)                          │
│  • Routes REST (v1)                                                         │
│  • Rate limiting (Redis)                                                    │
│  • Authentification légère V1 (Magic Link / JWT)                            │
│  • Génération OG Images (Satori)                                            │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ├──────────────────┬──────────────────┬──────────────────┐
          ▼                  ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PostgreSQL  │   │    Redis     │   │  Meilisearch │   │  Object Store│
│   (BDD)      │   │   (Cache /   │   │   (Search)   │   │   (S3/R2)    │
│              │   │    Queue)    │   │              │   │              │
│  • Deputies  │   │              │   │  • Deputies  │   │  • ZIP AN    │
│  • Scrutins  │   │  • Sessions  │   │  • Scrutins  │   │  • OG images │
│  • Votes     │   │  • Rate Lim. │   │  • Themes    │   │  • Exports   │
│  • Stats     │   │  • BullMQ    │   │  • Suggests  │   │              │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
          ▲
          │ SQL / COPY
          │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ETL WORKER — Node.js                                │
│  (Process indépendant, scalable à 0-N instances via BullMQ)                 │
│  • Téléchargement ZIP quotidien AN                                          │
│  • Parsing incrémental JSON stream                                          │
│  • Upsert batch PostgreSQL (COPY)                                           │
│  • Recalcul des statistiques (matérialisées)                                │
│  • Synchronisation Meilisearch                                              │
│  • Fallback API Poligraph                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Flux de données principaux

| Flux | Source → Cible | Technologie | Fréquence |
|------|----------------|-------------|-----------|
| **Ingestion primaire** | ZIP AN → ETL Worker → PostgreSQL | Node.js Streams + `COPY` | Quotidienne (6h CET) |
| **Indexation recherche** | PostgreSQL → Meilisearch | SDK Meilisearch (incremental) | Après chaque ETL |
| **Cache chaud** | PostgreSQL → Redis | Fastify cache interceptors | À la volée (TTL 5-60 min) |
| **Images sociales** | Fastify → S3/R2 + CDN | Satori + resvg | À la volée + cache 24h |
| **Fallback données** | Poligraph API → PostgreSQL | Fetch REST | À la demande (alerte) |

### 2.3. Choix technologiques justifiés

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| **Frontend** | Tanstack Start | SSR/SSG natif, routing file-based, server functions (RPC-like) sans friction API, excellent support TypeScript, intégration Tanstack Query. |
| **Backend** | Fastify | Très hautes performances (throughput JSON supérieur à Express), écosystème mature (cors, helmet, swagger), faible overhead mémoire. |
| **Base de données** | PostgreSQL 15+ | ACID, excellente gestion JSONB, `COPY` pour imports massifs, support des trigrammes pour recherche basique, réplication native. |
| **Search Engine** | Meilisearch | Latence < 20 ms, typo-tolerance native, géosearch future-proof, faceting (filtres groupes/thématiques), API REST simple. |
| **Cache & Queue** | Redis 7+ | Structure clé-valeur pour sessions, rate limiter (Sliding Window), Pub/Sub pour invalidations, BullMQ pour jobs ETL fiables. |
| **Stockage objets** | Cloudflare R2 (ou S3) | Pas de frais de sortie (egress), compatible S3, idéal pour stocker les ZIP sources et les OG images générées. |
| **OG Images** | Satori + @resvg/resvg-js | Génération SVG→PNG côté serveur, taille binaire raisonnable, caching agressif au niveau CDN. |

---

## 3. Schéma de Base de Données

### 3.1. Principes de modélisation

1. **Normalisation forte** sur les entités métier (députés, scrutins, votes) pour garantir l'intégrité référentielle.
2. **Dénormalisation contrôlée** via les tables `*_stats` et les vues matérialisées pour servir les requêtes hot-path (fiches députés, comparateur) en < 50 ms.
3. **Partitionnement** potentiel de la table `votes` par `legislature_id` si on intègre > 3 législatures (actuellement non justifié, ~3–5 M lignes par législature).
4. **Slugification** systématique pour les URLs SEO (`/depute/jean-dupont`, `/scrutin/VTANR5L17V1234`).

### 3.2. Diagramme Entité-Relation (Mermaid simplifié)

```
[legislature] 1---* [organe]
[organe] 1---* [deputy]
[legislature] 1---* [scrutin]
[deputy] 1---* [vote]
[scrutin] 1---* [vote]
[scrutin] *---* [theme] via [scrutin_theme]
[deputy] 1---* [deputy_stats]
[organe] 1---* [organe_stats]
```

### 3.3. Détail des tables

#### `legislature`
| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | SERIAL | PK | Identifiant interne |
| `numero` | SMALLINT | UNIQUE, NOT NULL | Numéro de législature (17, 16...) |
| `date_debut` | DATE | NOT NULL | Date de début |
| `date_fin` | DATE | | Date de fin (NULL si en cours) |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

#### `organe` (groupes politiques, commissions, etc.)
| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | SERIAL | PK | |
| `uid_an` | VARCHAR(32) | UNIQUE, NOT NULL | Référence OpenData AN (ex: `PO800000`) |
| `type` | VARCHAR(32) | NOT NULL | `groupe_politique`, `commission`, `gouvernement` |
| `nom` | VARCHAR(255) | NOT NULL | Nom complet |
| `nom_abrege` | VARCHAR(50) | | Sigle (ex: `LFI-NFP`) |
| `couleur` | CHAR(7) | | Couleur neutre d'affichage (pas couleur de parti) |
| `legislature_id` | INT | FK → legislature | |
| `effectif` | SMALLINT | | Nombre de membres (mis à jour quotidiennement) |

#### `deputy`
| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | SERIAL | PK | |
| `uid_an` | VARCHAR(32) | UNIQUE, NOT NULL | `acteurRef` (ex: `PA1234`) |
| `slug` | VARCHAR(255) | UNIQUE, NOT NULL | URL-friendly (`jean-dupont`) |
| `prenom` | VARCHAR(100) | NOT NULL | |
| `nom` | VARCHAR(100) | NOT NULL | |
| `nom_complet` | VARCHAR(201) | GENERATED | `prenom || ' ' || nom` (indexé pour recherche) |
| `circonscription` | VARCHAR(10) | | Numéro de circonscription |
| `departement_code` | VARCHAR(3) | | Code département |
| `departement_nom` | VARCHAR(100) | | Nom du département |
| `groupe_id` | INT | FK → organe | Groupe politique actuel |
| `legislature_id` | INT | FK → legislature | |
| `date_debut_mandat` | DATE | | |
| `date_fin_mandat` | DATE | | NULL si en cours |
| `photo_url` | TEXT | | URL photo officielle (ou NULL) |
| `profession` | VARCHAR(255) | | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**Indexes :**
- `idx_deputy_slug` (UNIQUE)
- `idx_deputy_uid_an` (UNIQUE)
- `idx_deputy_nom_complet` (GIN trigram pour autocomplétion basique de secours)
- `idx_deputy_groupe_legislature` (`groupe_id`, `legislature_id`)
- `idx_deputy_departement` (`departement_code`)

#### `scrutin`
| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | SERIAL | PK | |
| `uid_an` | VARCHAR(64) | UNIQUE, NOT NULL | `VTANR5L17V1` |
| `legislature_id` | INT | FK → legislature | |
| `numero` | VARCHAR(10) | | Numéro du scrutin dans la législature |
| `date_scrutin` | DATE | NOT NULL | |
| `titre` | TEXT | NOT NULL | Objet du scrutin |
| `titre_search` | TSVECTOR | | Vecteur de recherche full-text (PostgreSQL) |
| `objet` | TEXT | | Description détaillée |
| `demandeur` | TEXT | | Qui a demandé le scrutin |
| `type_vote_code` | VARCHAR(32) | | `SO` (solennel), `MOC` (motion censure)... |
| `type_vote_libelle` | VARCHAR(100) | | Libellé lisible |
| `sort_code` | VARCHAR(10) | | `adopté`, `rejeté` |
| `sort_libelle` | VARCHAR(50) | | |
| `mode_publication` | VARCHAR(50) | | Mode de publication des votes |
| `nb_votants` | SMALLINT | | |
| `nb_pour` | SMALLINT | | |
| `nb_contre` | SMALLINT | | |
| `nb_abstentions` | SMALLINT | | |
| `nb_non_votants` | SMALLINT | | |
| `nb_non_votants_volontaires` | SMALLINT | | |
| `seance_ref` | VARCHAR(32) | | Référence séance AN |
| `dossier_ref` | VARCHAR(32) | | Référence dossier législatif AN |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**Indexes :**
- `idx_scrutin_uid_an` (UNIQUE)
- `idx_scrutin_date` (`date_scrutin` DESC)
- `idx_scrutin_legislature_date` (`legislature_id`, `date_scrutin` DESC)
- `idx_scrutin_titre_search` (GIN sur `titre_search`)
- `idx_scrutin_type_sort` (`type_vote_code`, `sort_code`)

#### `vote`
| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | BIGSERIAL | PK | |
| `scrutin_id` | INT | NOT NULL, FK → scrutin | |
| `deputy_id` | INT | NOT NULL, FK → deputy | |
| `position` | VARCHAR(20) | NOT NULL | `pour`, `contre`, `abstention`, `absent`, `non_votant` |
| `par_delegation` | BOOLEAN | DEFAULT false | |
| `cause_absence` | VARCHAR(50) | | `absence`, `mission`, `autre`... |
| `mandat_ref` | VARCHAR(32) | | `PM5678` |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Contraintes :**
- `UNIQUE(scrutin_id, deputy_id)` — un député ne vote qu'une fois par scrutin.

**Indexes :**
- `idx_vote_scrutin` (`scrutin_id`)
- `idx_vote_deputy` (`deputy_id`)
- `idx_vote_deputy_scrutin` (`deputy_id`, `scrutin_id`)
- `idx_vote_position` (`position`)
- `idx_vote_deputy_date` (index couvrant via jointure : `JOIN scrutin` pour filtre date)

#### `theme`
| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | SERIAL | PK | |
| `nom` | VARCHAR(100) | NOT NULL | |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL | |
| `description` | TEXT | | |

#### `scrutin_theme`
| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `scrutin_id` | INT | PK, FK → scrutin | |
| `theme_id` | INT | PK, FK → theme | |

#### `deputy_stats` (table matérialisée / dénormalisée)
> Recalculée quotidiennement après l'ETL. Permet de servir la fiche député en une requête SQL.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL | PK |
| `deputy_id` | INT | FK → deputy |
| `periode_debut` | DATE | Début de période (NULL = législature entière) |
| `periode_fin` | DATE | Fin de période |
| `nb_scrutins` | INT | Nombre de scrutins sur la période |
| `nb_presents` | INT | Votes exprimés (pour/contre/abstention) |
| `nb_pour` | INT | |
| `nb_contre` | INT | |
| `nb_abstentions` | INT | |
| `nb_absents` | INT | |
| `taux_participation` | DECIMAL(5,2) | `nb_presents / nb_scrutins * 100` |
| `taux_loyaute` | DECIMAL(5,2) | `% votes identiques à la position majoritaire du groupe` |
| `nb_votes_contre_groupe` | INT | |
| `created_at` | TIMESTAMPTZ | |

**Index :** `UNIQUE(deputy_id, periode_debut, periode_fin)`

#### `etl_log`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL | PK |
| `source` | VARCHAR(50) | `assemblee_nationale_zip`, `poligraph_api` |
| `started_at` | TIMESTAMPTZ | |
| `ended_at` | TIMESTAMPTZ | |
| `status` | VARCHAR(20) | `success`, `partial`, `failure` |
| `scrutins_processed` | INT | |
| `votes_processed` | INT | |
| `error_message` | TEXT | |

### 3.4. Stratégie d'indexation pour la performance

| Requête métier | Index clé | Type | Objectif |
|----------------|-----------|------|----------|
| Fiche député + stats | `deputy.slug` | B-Tree unique | Lookup par URL |
| Autocomplétion recherche | Meilisearch (pas SQL) | Inverted + Trie | < 20 ms |
| Liste votes d'un député | `vote(deputy_id, scrutin_id)` | B-Tree | Filtrage + jointure |
| Liste votes d'un scrutin | `vote(scrutin_id)` | B-Tree | Agrégation groupe |
| Recherche par texte de loi | `scrutin.titre_search` | GIN (tsvector) | Fallback si Meilisearch down |
| Dashboard thématique V1 | `scrutin_theme(theme_id)` | B-Tree | Agrégation par thème |
| Comparateur de députés | `vote(deputy_id, scrutin_id)` + `scrutin.date` | Composite | Jointure rapide 2 députés |

---

## 4. API Design

### 4.1. Principes

- **REST pur** avec ressources nommées au pluriel.
- **Versionnage** : `/api/v1/...` dans l'URL (le backend expose `v1` dès le MVP pour ne pas casser la V1 publique).
- **Pagination** :
  - *Offset-based* (`?page=1&limit=20`) pour les listes courtes (< 1000 items) : groupes, thématiques.
  - *Cursor-based* (`?cursor=eyJ...&limit=20`) pour les flux chronologiques : historique de votes, scrutins. Assure la stabilité en cas d'insertions concurrentes.
- **Filtrage** via query params : `?groupe=LFI-NFP&departement=75&date_from=2024-07-01`.
- **Tri** via `?sort=-date` (moins = DESC).
- **Format d'erreur** : RFC 7807 (Problem Details).
- **CORS** : origines contrôlées (frontend + API publique V1).

### 4.2. Endpoints

#### Santé & Méta
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/health` | Healthcheck (DB, Redis, Meilisearch) |
| `GET` | `/api/v1/openapi.json` | Spécification OpenAPI 3.1 |

#### Députés
| Méthode | Route | Query Params | Description |
|---------|-------|--------------|-------------|
| `GET` | `/api/v1/deputies` | `page`, `limit`, `search`, `groupe`, `departement`, `legislature`, `sort` | Liste paginée |
| `GET` | `/api/v1/deputies/:slug` | — | Fiche complète (identité + stats agrégées) |
| `GET` | `/api/v1/deputies/:slug/votes` | `cursor`, `limit`, `theme`, `date_from`, `date_to`, `position`, `type_vote` | Historique des votes (cursor) |
| `GET` | `/api/v1/deputies/:slug/stats` | `period` (`7d`, `30d`, `6m`, ` legislature`) | Statistiques calculées |

#### Scrutins
| Méthode | Route | Query Params | Description |
|---------|-------|--------------|-------------|
| `GET` | `/api/v1/scrutins` | `page`, `limit`, `search`, `theme`, `date_from`, `date_to`, `sort`, `sort_code`, `type_vote` | Recherche de scrutins |
| `GET` | `/api/v1/scrutins/:uid` | — | Détail d'un scrutin + résultat global |
| `GET` | `/api/v1/scrutins/:uid/votes` | `page`, `limit`, `groupe`, `position` | Votes individuels paginés |

#### Comparaison
| Méthode | Route | Query Params | Description |
|---------|-------|--------------|-------------|
| `GET` | `/api/v1/compare` | `deputies` (slug1,slug2,... max 5), `date_from`, `date_to` | Résultat comparateur (score + votes divergents) |

#### Groupes politiques
| Méthode | Route | Query Params | Description |
|---------|-------|--------------|-------------|
| `GET` | `/api/v1/groups` | `legislature`, `page`, `limit` | Liste des groupes |
| `GET` | `/api/v1/groups/:uid` | — | Détail groupe + effectif |
| `GET` | `/api/v1/groups/:uid/stats` | `period` | Stats de cohésion et participation du groupe |

#### Recherche (proxy Meilisearch contrôlé)
| Méthode | Route | Query Params | Description |
|---------|-------|--------------|-------------|
| `GET` | `/api/v1/search/suggestions` | `q` (3+ caractères) | Autocomplétion rapide (députés + scrutins) |
| `GET` | `/api/v1/search` | `q`, `types` (`deputy`, `scrutin`), `limit` | Recherche full-text unifiée |

#### Images de partage (Open Graph)
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/og/deputies/:slug.png` | Génération carte fiche député |
| `GET` | `/api/v1/og/scrutins/:uid.png` | Génération carte résultat scrutin |
| `GET` | `/api/v1/og/compare.png` | Génération carte comparateur (query params) |

**Optimisation OG :** La route génère le PNG, le stream vers le client ET l'upload sur R2. Le CDN est configuré pour servir directement depuis R2 en cas de cache-hit (`og.transparence-votes.fr`).

### 4.3. Exemples de réponses

#### Fiche député (`GET /api/v1/deputies/marie-durand`)
```json
{
  "data": {
    "id": 42,
    "uid_an": "PA1234",
    "slug": "marie-durand",
    "prenom": "Marie",
    "nom": "Durand",
    "circonscription": "12",
    "departement": { "code": "75", "nom": "Paris" },
    "groupe": { "uid": "PO800000", "nom": "Groupe A", "nom_abrege": "GA" },
    "legislature": { "numero": 17 },
    "photo_url": "https://...",
    "stats": {
      "taux_participation": 89.40,
      "taux_loyaute": 94.20,
      "nb_votes_contre_groupe": 8,
      "nb_scrutins": 142,
      "periode": { "debut": "2024-07-18", "fin": "2026-05-19" }
    },
    "liens": {
      "self": "/api/v1/deputies/marie-durand",
      "votes": "/api/v1/deputies/marie-durand/votes",
      "compare": "/api/v1/compare?deputies=marie-durand"
    }
  }
}
```

#### Liste votes (`GET /api/v1/deputies/marie-durand/votes?cursor=...&limit=20`)
```json
{
  "data": [
    {
      "scrutin": {
        "uid": "VTANR5L17V1234",
        "numero": "1234",
        "date": "2026-05-15",
        "titre": "Projet de loi renforçant la lutte contre la fraude",
        "sort": "adopté",
        "position_groupe": "pour"
      },
      "position": "pour",
      "par_delegation": false,
      "alignement_groupe": "identique"
    }
  ],
  "pagination": {
    "next_cursor": "eyJkIjoxfQ==",
    "has_more": true
  }
}
```

#### Comparateur (`GET /api/v1/compare?deputies=marie-durand,jean-martin`)
```json
{
  "data": {
    "deputies": [
      { "slug": "marie-durand", "nom": "Marie Durand", "groupe": "GA" },
      { "slug": "jean-martin", "nom": "Jean Martin", "groupe": "GB" }
    ],
    "periode": { "debut": "2024-07-18", "fin": "2026-05-19" },
    "concordance": {
      "pourcentage": 78.5,
      "votes_communs": 67,
      "votes_identiques": 53,
      "votes_divergents": 14
    },
    "divergences": [
      {
        "scrutin": { "uid": "VTANR5L17V1200", "titre": "...", "date": "2026-04-10" },
        "votes": [
          { "deputy_slug": "marie-durand", "position": "pour" },
          { "deputy_slug": "jean-martin", "position": "contre" }
        ]
      }
    ]
  }
}
```

### 4.4. Gestion des erreurs

```json
{
  "type": "https://transparence-votes.fr/errors/not-found",
  "title": "Député non trouvé",
  "status": 404,
  "detail": "Aucun député ne correspond au slug 'inconnu-123'.",
  "instance": "/api/v1/deputies/inconnu-123"
}
```

---

## 5. Stratégie ETL & Synchronisation

### 5.1. Objectifs

- **Latence** : nouveaux scrutins intégrés en moins de 4h après publication officielle.
- **Fiabilité** : tolérance aux pannes (ZIP corrompu, indisponibilité AN) via fallback et retry exponentiel.
- **Idempotence** : re-exécution du pipeline sans création de doublons.
- **Traçabilité** : log complet de chaque exécution (`etl_log`).

### 5.2. Architecture du pipeline

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Scheduler  │────▶│  Download Worker │────▶│  Parse Worker   │
│  (BullMQ)   │     │  (Node.js)       │     │  (Node Streams) │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                           ┌──────────────────────────┼──────────┐
                           ▼                          ▼          ▼
                    ┌─────────────┐            ┌─────────────┐  ┌────────────┐
                    │ PostgreSQL  │            │  Meilisearch│  │   Redis    │
                    │   (COPY)    │            │   (Index)   │  │ (Cache inv)│
                    └─────────────┘            └─────────────┘  └────────────┘
```

### 5.3. Étapes détaillées

#### Étape 1 — Ordonnancement
- BullMQ Repeatable Job : **tous les jours à 06h00 CET** (heure où l'archive AN est généralement reconstruite).
- Job idempotant : clé de lock Redis (`etl:running`) pour éviter les exécutions concurrentes.

#### Étape 2 — Téléchargement
- URL : `https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip`
- Téléchargement streamé vers le disque (ou mémoire si < 200 Mo) pour ne pas saturer la RAM.
- Stockage du ZIP sur R2/S3 (bucket `archives-an`) pour traçabilité et rejeu.
- Vérification : comparaison de la taille du fichier ou du hash SHA-256 avec la veille. Si identique → arrêt du pipeline (pas de nouveaux scrutins).

#### Étape 3 — Décompression & Parsing incrémental
- Décompression streamée via `unzipper` ou `node-stream-zip`.
- Parsing JSON par flux (`JSONStream` / `oboe`) : on ne charge jamais l'intégralité du fichier en mémoire (~500 Mo potentiels).
- Pour chaque objet `scrutin` :
  1. Vérifier si `uid_an` existe déjà et si `updated_at` local est identique → skip.
  2. Sinon, upsert dans `scrutin` (INSERT ... ON CONFLICT UPDATE).
  3. Extraire les votes nominatifs (`ventilationVotes → groupes → vote → decompteNominatif`).
  4. Préparer un batch de votes pour COPY.

#### Étape 4 — Insertion massive (PostgreSQL)
- Utilisation de `COPY FROM STDIN` (via `pg-copy-streams`) pour insérer les votes par lots de 10 000.
- Transaction par lot de scrutins (100 scrutins = 1 transaction) pour équilibrer cohérence et durée de verrou.

#### Étape 5 — Recalcul des statistiques
- Job asynchrone séparé (`stats:recalc`) déclenché après succès de l'ETL.
- Calcul des `deputy_stats` et `organe_stats` sur la législature courante et les fenêtres glissantes (30j, 6m).
- Utilisation de requêtes SQL analytiques (CTE + `GROUP BY`) plutôt que code applicatif pour la performance.

#### Étape 6 — Synchronisation recherche
- Indexation incrémentale Meilisearch : envoi des nouveaux documents (scrutins + députés) via batch de 500.
- Mise à jour des paramètres de typo-tolerance et des synonymes si nécessaire.

#### Étape 7 — Invalidation cache
- Invalidation par pattern Redis : `deputy:*`, `scrutin:*`, `compare:*`, `search:*`.
- Warm-up : pré-chargement des 50 députés les plus consultés (stats Vercel/Analytics) en cache.

### 5.4. Stratégie de fallback (Poligraph API)

Si le ZIP AN est indisponible, corrompu, ou si la latence dépasse 4h :
1. **Alerte** : notification Mattermost/Slack + email tech.
2. **Fallback** : appel à `poligraph.fr/api` pour récupérer les scrutins et votes du jour.
   - Limite : 30 req/min. Utilisation raisonnée : uniquement les scrutins manquants.
   - Stockage temporaire dans `scrutin` avec un flag `source = 'poligraph'`.
3. **Rattrapage** : dès que le ZIP AN est de nouveau disponible, comparaison et remplacement des données Poligraph par les données officielles.

### 5.5. Gestion des changements de format

- **Schema validation** : utilisation de `zod` ou `ajv` avec le schéma JSON communautaire (`Asone/assemblee-data-interfaces`) pour valider chaque scrutin avant insertion.
- **Alerte** : si le taux de validation descend sous 95 %, le job s'arrête et alerte l'équipe.
- **Versioning du parser** : le code ETL est versionné ; en cas de changement de format, on peut déployer un nouveau parser sans toucher la BDD.

---

## 6. Performance & Cache

### 6.1. Objectifs de latence

| Scénario | Objectif | Méthode |
|----------|----------|---------|
| Recherche autocomplétion | < 50 ms | Meilisearch (RAM) + cache Redis 1h |
| Fiche député ( première visite) | < 200 ms | SSR + cache CDN 1h |
| Fiche député (répétée) | < 50 ms | CDN cache-hit |
| Historique votes (20 items) | < 150 ms | SQL index couvrant + Redis 10 min |
| Page scrutin | < 200 ms | SSG ISR (revalidation 1h) + CDN |
| Comparateur 2 députés | < 300 ms | `deputy_stats` matérialisée + SQL optimisé |
| Génération OG image | < 500 ms | Satori + cache immédiat S3/CDN |

### 6.2. Stratégie de cache multi-niveaux

```
Niveau 1 : Browser (Cache-Control: max-age=0, stale-while-revalidate)
Niveau 2 : CDN Edge (Cloudflare) — TTL variable selon ressource
Niveau 3 : Redis — Cache applicatif (objets JSON sérialisés)
Niveau 4 : PostgreSQL — Vues matérialisées + index
```

| Ressource | CDN TTL | Redis TTL | Invalidation |
|-----------|---------|-----------|--------------|
| Fiche député HTML | 1h | 10 min | ETL success |
| API `/deputies/:slug` | — | 5 min | ETL success |
| API `/deputies/:slug/votes` | — | 2 min | ETL success |
| Page scrutin HTML | 6h | — | ETL success |
| OG Image PNG | 24h | — | Jamais (URL versionnée si besoin) |
| Autocomplétion | — | 1h | ETL success |
| Liste groupes | 24h | 1h | ETL success |

### 6.3. Optimisations SQL critiques

- **Partitionnement** : si > 10M votes, partitionner `votes` par `legislature_id` (RANGE).
- **Index couvrant** : `CREATE INDEX idx_vote_deputy_date ON vote(deputy_id, scrutin_id) INCLUDE (position)` si PostgreSQL 11+ (pas nécessaire en dessous de 5M lignes).
- **Vacuum & Analyze** : planifié quotidiennement après l'ETL.
- **Connection Pooling** : `PgBouncer` (mode transaction) entre Fastify et PostgreSQL si > 100 connexions simultanées.

### 6.4. Gestion du trafic viral

- **Pré-rendu statique** : Tanstack Start génère au build les pages des 577 députés et les scrutins des 30 derniers jours. Les pages anciennes sont en ISR (Incremental Static Regeneration) : génération à la première requête puis cache.
- **API Rate Limiting** : Redis Sliding Window, 100 req/min par IP pour les endpoints publics, 1000 req/min pour le frontend (IP interne).
- **Circuit Breaker** : sur les appels à Poligraph API (fallback) pour éviter de surcharger le service tiers en cas de panne en cascade.

---

## 7. Contraintes Techniques et Solutions

### 7.1. Pas d'API REST officielle Assemblée nationale

**Contrainte** : Seuls des fichiers ZIP bulk sont disponibles. Pas de webhook, pas de delta, pas de documentation machine-readable garantie.

**Solution** :
- Pipeline ETL maison robuste (section 5) avec parsing stream pour gérer des fichiers de plusieurs centaines de Mo.
- Stockage des archives ZIP sur S3/R2 pour pouvoir reparser historiquement en cas de bug.
- Fallback Poligraph API pour la fraîcheur en cas d'indisponibilité du ZIP.

### 7.2. Données historiques et multi-législatures

**Contrainte** : Les archives AN remontent à la 11e législature, avec un changement de format probable et une complétude variable (votes individuels systématiques depuis avril 2014 uniquement).

**Solution** :
- Modélisation `legislature_id` sur toutes les tables pour isoler les données.
- MVP concentré sur la 17e législature ; intégration 16e en V1 si demande utilisateur.
- Flag `donnees_completes` sur les scrutins antérieurs à 2014 pour indiquer l'absence de votes nominatifs.

### 7.3. Latence de mise à jour des données officielles

**Contrainte** : L'archive ZIP est reconstruite quotidiennement sans SLA officiel. Aucun mécanisme de push.

**Solution** :
- Polling quotidien à 6h + vérification toutes les 4h en journée si le fichier a changé.
- Dashboard interne (`/admin/etl`) affichant la date de dernière synchro et le delta avec la date du dernier scrutin connu.
- Affichage transparent côté frontend : *"Dernière mise à jour : 19/05/2026 à 06h12 — Source : Assemblée nationale"*.

### 7.4. Volume des données

**Estimation MVP (17e législature seule)** :
- Députés : ~577
- Scrutins/an : ~2 500 (estimation basée sur 16e lég. : 5 800 sur 2 ans)
- Votes : ~1,4 M/an (577 × 2 500)
- Taille BDD PostgreSQL : < 2 Go (hors index)
- Taille ZIP source : ~50–100 Mo

**Verdict** : Le volume est modeste. PostgreSQL standard sur un serveur 2 vCPU / 4 Go RAM est largement suffisant pour le MVP. Le scaling s'envisage en V1 avec read replica.

### 7.5. Fiabilité du service tiers (Poligraph)

**Contrainte** : 97 % de disponibilité annoncée, 30 req/min.

**Solution** :
- Circuit breaker (5 erreurs 5xx → ouverture 5 min).
- Cache Redis des réponses Poligraph (TTL 6h) pour limiter les appels.
- Usage strictement en fallback, jamais en chemin critique du frontend.

### 7.6. Thématisation des scrutins

**Contrainte** : Aucune classification par thème n'est fournie par l'AN. Nécessaire pour les filtres UX (US-V1-07).

**Solution MVP** :
- Pas de thématisation automatique en MVP. Les scrutins sont affichés avec leur titre brut.

**Solution V1** :
- Classification par mots-clés sur le titre (`titre` + `objet`) via une liste de règles (regex/thésaurus) maintenue manuellement.
- Option avancée : modèle de classification léger (scikit-learn / fastText) entraîné sur les données Datan/NosDéputés si volume suffisant.
- Stockage dans `scrutin_theme` (many-to-many) avec possibilité de correction manuelle côté admin.

---

## 8. Sécurité & Conformité

### 8.1. RGPD & données personnelles

- **Données des députés** : données publiques dans l'exercice du mandat. Usage légitime d'information publique.
- **Données des utilisateurs** (V1, alertes email) :
  - Collecte minimale : email uniquement.
  - Base légale : consentement explicite (art. 6.1.a RGPD).
  - Pas de mot de passe stocké : authentification par Magic Link (JWT à durée courte).
  - Hébergement en France/UE (OVH, Scaleway, Hetzner FSNG).
  - Registre des traitements documenté.

### 8.2. Sécurité applicative

| Menace | Mitigation |
|--------|------------|
| Injection SQL | Requêtes paramétrées (Prisma/Drizzle ou `pg` avec placeholders). Jamais de concaténation. |
| XSS | Échappement systématique côté React, CSP stricte (`default-src 'self'`), pas de `dangerouslySetInnerHTML`. |
| CSRF | Tokens CSRF sur les mutations API (POST/PUT/DELETE) si cookies session. |
| Rate Limiting | Redis Sliding Window : 100 req/min public, 1000 req/min frontend. |
| Exposition données | Principe du moindre privilège (rôle DB `app_readonly` pour les requêtes GET). |
| DDoS | Cloudflare (WAF + rate limiting L3/L4). |
| Fuite OG images | Pas de données utilisateur dans les OG images. Uniquement des données publiques de députés. |

### 8.3. Headers de sécurité recommandés

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 8.4. Audit & Monitoring

- **Logs** : structurés (JSON), centralisés (Grafana Loki ou Datadog).
- **Alertes** : seuils sur erreur 5xx (> 1 %), latence p95 API (> 500 ms), ETL en échec > 6h.
- **Access logs** : conservation 1 an pour traçabilité légale.

---

## 9. Stratégie de Déploiement et Scaling

### 9.1. Architecture de déploiement MVP (Mois 1-3)

**Objectif** : Mise en ligne rapide, coûts maîtrisés (< 200 €/mois), zéro DevOps complexe.

```
┌─────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                          │
│              (CDN + DNS + WAF + SSL)                        │
└─────────────────────────────────────────────────────────────┘
          │
          ├──────────────────────────────┐
          ▼                              ▼
┌─────────────────────┐        ┌─────────────────────┐
│   TANSTACK START    │        │      FASTIFY        │
│    (Vercel Pro)     │        │   (Railway Pro)     │
│                     │        │                     │
│  • SSR/SSG          │        │  • API REST         │
│  • Edge Functions   │        │  • OG Images        │
│  • Analytics        │        │  • Rate Limiting    │
└─────────────────────┘        └─────────┬───────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │  PostgreSQL  │    │    Redis     │    │  Meilisearch │
            │  (Railway)   │    │  (Railway)   │    │  (Railway    │
            │              │    │              │    │   or Cloud)  │
            └──────────────┘    └──────────────┘    └──────────────┘
                    ▲
                    │
            ┌──────────────┐
            │  ETL Worker  │
            │  (Railway    │
            │   Cron Job)  │
            └──────────────┘
```

**Coûts estimés MVP :**
- Vercel Pro : 20 €/mois
- Railway (API + PostgreSQL + Redis) : ~80–120 €/mois
- Meilisearch Cloud (10k docs, gratuit) : 0 €/mois
- Cloudflare Pro : 20 €/mois
- R2 (stockage ZIP + OG) : ~5 €/mois
- **Total** : ~150 €/mois

### 9.2. Architecture de déploiement V1 / Scaling (Mois 4-12)

Si le trafic dépasse 300 000 visites mensuelles ou en cas de pic viral :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KUBERNETES (k3s)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Frontend    │  │   Fastify    │  │  OG Worker   │  │  ETL Worker  │   │
│  │  (3 pods)    │  │   (3 pods)   │  │  (2 pods)    │  │  (1 pod)     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  Ingress Controller (Traefik) + Cert-manager + HPA (scaling horizontal)    │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ├──────────────┬──────────────┬──────────────┐
          ▼              ▼              ▼              ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │  PostgreSQL  │ │    Redis     │ │  Meilisearch │ │  Object Store│
   │  Primary     │ │   Cluster    │ │   Cluster    │ │   (R2/S3)    │
   │  + 1 Replica │ │  (3 nodes)   │ │  (3 nodes)   │ │              │
   └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**Infrastructure cible** :
- **Hébergeur** : Hetzner Cloud (CPX31 pour les workers, CX51 pour la DB) ou Scaleway.
- **K8s** : k3s léger (pas de GKE/EKS pour maîtriser les coûts).
- **DB** : PostgreSQL 17 managed (Scaleway/Hetzner) ou self-hosted avec backups WAL-G vers S3.
- **Observabilité** : Grafana + Prometheus + Loki (stack self-hosted) ou Datadog si budget.

**Coûts estimés V1** :
- 3× CPX31 (4 vCPU / 8 Go) : ~60 €/mois
- PostgreSQL managed (2 vCPU / 4 Go) : ~50 €/mois
- Redis + Meilisearch (self-hosted sur les workers) : inclus
- Cloudflare Pro + R2 : ~25 €/mois
- **Total** : ~150–200 €/mois (mais scalable à l'infini horizontalement)

### 9.3. CI/CD

| Environnement | Branche | Déclencheur | Infrastructure |
|---------------|---------|-------------|----------------|
| **Production** | `main` | Merge + tag | Vercel (frontend) + Railway/Hetzner (API) |
| **Staging** | `develop` | Push | Vercel Preview + Railway Staging |
| **Review Apps** | `feat/*` | PR | Vercel Preview (frontend isolé), DB staging partagée |

**Pipeline** :
1. Lint + TypeScript strict (`tsc --noEmit`)
2. Tests unitaires (Vitest)
3. Tests d'intégration API (Node + testcontainers PostgreSQL)
4. Build Docker (backend) + Build Vercel (frontend)
5. Déploiement staging + smoke tests
6. Déploiement production (blue/green pour le backend)

### 9.4. Plan de continuité (Disaster Recovery)

| Scénario | RTO | RPO | Procédure |
|----------|-----|-----|-----------|
| Panne PostgreSQL | 30 min | 24h | Restauration depuis le dernier backup quotidien (WAL-G) + replay WAL. Promotion du read replica si configuré. |
| Panne Redis | 5 min | 0 | Redis n'est pas source de vérité. Redémarrage ou reconstruction du cache. |
| Panne ETL | 6h | 4h | Relance manuelle du job. Si échec persistant, bascule sur Poligraph API pour les données du jour. |
| Panne totale datacenter | 2h | 1h | Restauration sur région secondaire (backup cross-region S3). |

---

## 10. Roadmap Technique

| Jalon | Semaine | Livrables | Validation |
|-------|---------|-----------|------------|
| **J1 — Fondations** | S1 | Setup repo monorepo (pnpm workspaces), Docker Compose local (Postgres, Redis, Meilisearch), CI/CD GitHub Actions | Build vert + tests passent |
| **J2 — ETL & Données** | S1-S2 | Worker ETL, parsing ZIP AN, upsert PostgreSQL, premiers indexes, ingestion 17e législature | 100 % des scrutins intégrés, logs ETL verts |
| **J3 — API Core** | S2-S3 | Fastify + routes députés, scrutins, votes, pagination, validation Zod, OpenAPI | Tests d'intégration passent, latence < 200 ms |
| **J4 — Search** | S3 | Meilisearch configuré, indexation députés/scrutins, endpoint `/search/suggestions` | Autocomplétion < 50 ms |
| **J5 — Frontend MVP** | S3-S5 | Tanstack Start, pages Accueil, Recherche, Fiche député, Page scrutin, Comparateur | Lighthouse > 90, a11y > 90 |
| **J6 — OG & Partage** | S5 | Génération images OG, meta tags dynamiques, Web Share API | Cards Twitter/FB valides |
| **J7 — Cache & Perf** | S6 | Redis cache, CDN Cloudflare, SSG fiches députés, ISR | Charge test 1000 req/s OK |
| **J8 — Polissage** | S6-S7 | Accessibilité WCAG 2.1 AA, responsive, SEO (sitemap, schema.org), monitoring | Audit Lighthouse + a11y passé |
| **Release MVP** | S8 | Mise en production, communication | Uptime > 99.5 % |
| **J9 — V1 Data** | S3-M4 | Alertes email, tableaux de bord thématiques, export CSV/JSON | Tests E2E passent |
| **J10 — V1 API Publique** | M4-M5 | Documentation API publique, rate limiting, clés API | Contrat OpenAPI respecté |

---

## 11. Annexes

### Annexe A — Stack technique détaillée

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| Langage | TypeScript | 5.4+ | Typage strict sur tout le stack |
| Frontend | Tanstack Start | latest | Framework SSR/SSG |
| Frontend | React | 18+ | UI |
| Frontend | Tanstack Query | 5+ | Fetching / cache client |
| Frontend | Tailwind CSS | 3.4+ | Styling utilitaire |
| Frontend | Radix UI | latest | Primitives accessibles |
| Backend | Fastify | 4.x | Serveur HTTP API |
| Backend | Zod | 3.22+ | Validation schémas |
| Backend | Prisma ORM | 5.x | Accès PostgreSQL (option : Drizzle pour perf) |
| Search | Meilisearch | 1.6+ | Moteur de recherche |
| Cache/Queue | Redis | 7.x | BullMQ + cache sessions |
| BDD | PostgreSQL | 15+ | Stockage relationnel |
| ETL | Node.js + Streams | 20 LTS | Parsing ZIP/JSON |
| OG Images | Satori + resvg | latest | SVG → PNG |
| Tests | Vitest + Playwright | latest | Unit + E2E |
| Monitoring | Sentry + UptimeRobot | — | Errors + uptime |
| Infra | Docker + Docker Compose | 24.x | Dev & CI |
| Infra | GitHub Actions | — | CI/CD |

### Annexe B — Sizing estimé

| Ressource | MVP (Mois 1-3) | V1 (Mois 4-12) | Pic viral |
|-----------|----------------|----------------|-----------|
| CPU API | 1 vCPU | 2-4 vCPU | 4-8 vCPU (HPA) |
| RAM API | 1 Go | 2-4 Go | 4-8 Go |
| CPU DB | 1 vCPU | 2 vCPU | 2 vCPU + Read Replica |
| RAM DB | 2 Go | 4 Go | 8 Go |
| Stockage DB | 10 Go | 50 Go | 100 Go |
| Stockage S3/R2 | 5 Go | 20 Go | 50 Go |
| Bande passante | 1 To/mois | 5 To/mois | 20 To/mois |

### Annexe C — Références & Sources

- [data.assemblee-nationale.fr — Votes](https://data.assemblee-nationale.fr/travaux-parlementaires/votes)
- [Asone — assemblee-data-interfaces/schemas](https://github.com/Asone/assemblee-data-interfaces)
- [Poligraph API Docs](https://poligraph.fr/api/docs)
- [Datan — data.gouv.fr](https://www.data.gouv.fr/fr/organizations/datan/)
- [Meilisearch Documentation](https://www.meilisearch.com/docs)
- [Tanstack Start](https://tanstack.com/start/latest)
- [Fastify Documentation](https://fastify.dev/)

---

**Document rédigé par l'Architecte — 2026-05-19**  
**Prochaine étape** : Revue technique avec l'équipe de développement, validation du schéma de base de données, puis démarrage du Jalon 1 (Setup & Fondations).
