# Veritas — Transparence des Votes Parlementaires

> **"Connaître la vérité sur les votes de nos représentants"**

Veritas est une plateforme web citoyenne et open-source qui rend accessibles, vérifiables et comparables les votes des députés français à l'Assemblée Nationale.

## 🎯 Vision

Les données des votes existent (Open Data de l'Assemblée Nationale), mais elles sont techniques, fragmentées et difficilement utilisables par le grand public. Veritas les restructure en une interface simple, rapide et neutre — pour que chaque citoyen puisse vérifier en quelques clics comment votent ses représentants.

## ✨ Fonctionnalités (MVP)

- 🔍 **Recherche de députés** — Par nom, ville, code postal ou circonscription
- 📊 **Fiche député** — Taux de participation, loyauté au groupe, historique complet des votes
- 🗳️ **Recherche par scrutin** — Consulter un texte de loi et voir qui a voté pour, contre ou s'est abstenu
- ⚖️ **Comparateur de votes** — Comparer 2 députés côte à côte avec un score de concordance
- 📤 **Partage social** — Génération automatique de cards pour les réseaux sociaux

## 🏗️ Architecture

| Couche | Technologie |
|--------|-------------|
| **Frontend** | Tanstack Start (React, SSR/SSG) |
| **Backend API** | Fastify + TypeScript |
| **Base de données** | PostgreSQL 15+ + Drizzle ORM |
| **Recherche** | Meilisearch |
| **Cache** | Redis |
| **ETL** | Node.js Streams |

## 📁 Structure du projet

```
veritas/
├── apps/
│   ├── frontend/          # Tanstack Start — UI & routes
│   └── backend/           # Fastify — API REST
├── packages/
│   ├── etl/               # Pipeline de synchronisation Open Data
│   └── shared/            # Types & utilitaires partagés
├── docs/
│   ├── research/          # Étude des sources de données
│   │   ├── api-officielles.md
│   │   ├── plateformes-tierces.md
│   │   ├── produit-specs.md
│   │   └── ux-design.md
│   └── architecture/      # Conception technique
│       ├── architecture-technique.md
│       ├── backend-design.md
│       └── frontend-design.md
└── README.md
```

## 📚 Documentation

### Recherche & Analyse

| Document | Contenu |
|----------|---------|
| [Étude API officielles](docs/research/api-officielles.md) | data.assemblee-nationale.fr, data.senat.fr — formats, limitations |
| [Plateformes tierces](docs/research/plateformes-tierces.md) | NosDéputés.fr, Datan.fr, Poligraph, CIVIX — comparatif complet |
| [Cahier des charges produit](docs/research/produit-specs.md) | Personas, user stories, KPIs, roadmap |
| [Conception UX](docs/research/ux-design.md) | Wireframes, parcours utilisateurs, design tokens, accessibilité |

### Architecture Technique

| Document | Contenu |
|----------|---------|
| [Architecture globale](docs/architecture/architecture-technique.md) | Vue d'ensemble, flux de données, sécurité, scaling |
| [Design backend](docs/architecture/backend-design.md) | Schéma Drizzle, API REST, requêtes SQL, ETL |
| [Design frontend](docs/architecture/frontend-design.md) | Routes, composants, SEO, OG images, comparateur |

## 🚀 Démarrage rapide

> *À venir — Phase de développement en cours*

## 📜 Licence

Les données proviennent de l'[Open Data de l'Assemblée Nationale](https://data.assemblee-nationale.fr) sous Licence Ouverte 2.0.

Le code source sera publié sous licence AGPL-3.0.

---

*Projet citoyen — France, 2026*
