# Étude des plateformes tierces agrégeant les votes parlementaires en France

## Résumé exécutif

En France, plusieurs initiatives civiques et commerciales agrègent les votes parlementaires, mais **aucune API unifiée, gratuite et à jour** ne couvre à la fois l’Assemblée nationale et le Sénat avec des indicateurs calculés (loyauté, participation) en temps réel.

- **NosDéputés.fr** dispose d’une API historique riche (XML/JSON/CSV) mais son site est figé sur la 16ème législature ; la 17ème législature (2024) n’y est pas encore intégrée.
- **Datan.fr** est le plus avancé sur les indicateurs de vote (3 scores de participation, loyauté groupe, cohésion), mais ne propose pas d’API REST : ses données calculées sont publiées en CSV hebdomadaire sur data.gouv.fr.
- **CIVIX** et **Poligraph** proposent des APIs REST publiques ouvertes, bien documentées, restructurant les données open data officielles ; elles constituent les points d’entrée les plus fiables pour un projet nécessitant une API directe.
- **Code4code / Tricoteuses** offre l’infrastructure la plus complète (REST, MCP, PostgreSQL, streaming temps réel), mais c’est un service payant (à partir de 200 € HT/mois).
- Le **Sénat** reste en retrait : pas d’API web simple pour les votes nominatifs ; seuls des dumps PostgreSQL/CSV sont disponibles sur data.senat.fr. **ControleSenat.fr** est une visualisation sans API.

**Recommandation générale** : pour un projet d’agrégation de votes, il faut combiner (1) les données brutes de l’Assemblée nationale (data.assemblee-nationale.fr) comme source primaire, (2) les indicateurs calculés de Datan via data.gouv.fr, et (3) une API intermédiaire (CIVIX ou Poligraph) pour faciliter l’accès. Pour le Sénat, il faut parser les dumps SQL ou utiliser un service payant (Code4code).

---

## 1. NosDéputés.fr & NosSénateurs.fr (Regards Citoyens)

### Présentation

Initiative civique historique (2009–) qui synthétise l’activité parlementaire (interventions, amendements, questions, scrutins, présences). Code source open-source (PHP, AGPL-3.0).

### API

- **Format** : XML, JSON, CSV, accessible en ajoutant l’extension à l’URL de la page (`/json`, `/xml`, `/csv`).
- **Documentation** : [github.com/regardscitoyens/nosdeputes.fr/blob/master/doc/api.md](https://github.com/regardscitoyens/nosdeputes.fr/blob/master/doc/api.md)
- **Endpoints clés** :
  - Liste des députés : `https://www.nosdeputes.fr/deputes/json`
  - Détails d’un député : `https://www.nosdeputes.fr/<slug>/json`
  - Scrutins d’un député : `https://2017-2022.nosdeputes.fr/<slug>/votes/xml`
  - Détail d’un scrutin : `https://www.nosdeputes.fr/16/scrutin/<numero>/xml`
  - Liste des scrutins : `https://www.nosdeputes.fr/16/scrutins/xml`
  - Synthèse mensuelle : `https://www.nosdeputes.fr/synthese/AAAAMM/json`
- **Recherche** : le moteur de recherche est exposé via `format=xml|json|csv` avec filtres par date, type d’objet, parlementaire, mots-clés.

### Données complémentaires

- **Dumps SQL** complets mis à disposition (sauf données utilisateurs) : [regardscitoyens.org/telechargement/donnees/](https://www.regardscitoyens.org/telechargement/donnees/)
- Contiennent : présences repérées, séances, dossiers parlementaires.

### Fraîcheur et fiabilité

- **Problème majeur** : le site principal affiche le message suivant : _« Ce site présente les travaux des députés de la précédente législature. NosDéputés.fr reviendra d’ici quelques mois avec une nouvelle version pour les députés élus en 2024. »_ [Source](https://www.nosdeputes.fr/)
- Dernière mise à jour du code source : novembre 2024.
- Les données de la **17ème législature ne sont pas encore intégrées** dans l’API principale.
- Les législatures antérieures restent accessibles via des sous-domaines dédiés (2007-2012, 2012-2017, 2017-2022).

### Forces

- API simple et stable depuis plus de 10 ans.
- Données historiques complètes sur plusieurs législatures.
- Dumps SQL pour une analyse en masse.

### Faiblesses

- **Non à jour** pour la législature en cours (17ème).
- Pas d’indicateurs calculés avancés (loyauté, cohésion) : les données sont brutes ou semi-agrégées.
- Formats XML/JSON parfois inconsistants (casing, champs vides) [issues connues](https://github.com/regardscitoyens/nosdeputes.fr/issues).

---

## 2. Datan.fr

### Présentation

Outil indépendant fondé par Awenig Marié (chercheur en science politique), en ligne depuis juillet 2020. Objectif : vulgariser les votes des députés via des statistiques et des décryptages.

### Données et indicateurs calculés

Datan ne se contente pas de retranscrire les votes ; il calcule des indices politologiques :

1. **Participation aux votes** (3 scores) :
   - **Scrutins solennels** : votes les plus importants, programmés à l’avance. Taux moyen constaté : ~90 %.
   - **Spécialisation** : votes sur des textes précédemment examinés dans la commission du député. Taux moyen : ~37 %.
   - **Tous les votes** : toutes les séances publiques. Taux moyen : ~26 %.
2. **Loyauté au groupe politique** : pourcentage de votes où le député suit la ligne majoritaire de son groupe. Moyenne constatée : ~95 %.
3. **Proximité avec la majorité présidentielle** : score de vote aligné avec le groupe de la majorité.
4. **Cohésion des groupes** (`scoreCohesion`) : mesure du consensus interne (0–1).
5. **Index de représentativité sociale** (`scoreRose`).

### API / Open Data

- **Pas d’API REST publique propre** identifiée sur le site.
- **Publication hebdomadaire** de jeux de données sur [data.gouv.fr (organisation Datan)](https://www.data.gouv.fr/fr/organizations/datan/) :
  - _Députés actifs — Informations et statistiques_
  - _Groupes actifs — Informations et statistiques_
  - _Historique des députés (depuis 2002)_
  - _Historique des groupes politiques (depuis 2012)_
- **Format** : CSV, licence ouverte.
- **Variables clés** dans le dataset députés : `scoreParticipation`, `scoreParticipationSpecialite`, `scoreLoyaute`, `scoreMajorite`, `experienceDepute`, etc.

### Forces

- Indicateurs méthodologiques les plus aboutis du paysage français.
- Données restructurées et enrichies, prêtes à l’analyse.
- Publication proactive et régulière sur data.gouv.fr.

### Faiblesses

- Pas d’API temps réel : mise à jour hebdomadaire via CSV.
- Se limite à l’Assemblée nationale (pas de données sur le Sénat).
- Pas de documentation d’API pour des appels programmatiques directs.

---

## 3. Contrôle Sénat & data.senat.fr

### Contrôle Sénat (controlesenat.fr)

- **Type** : site de visualisation citoyenne (carte des départements, fiches sénateurs, scrutins, lois).
- **API / Export** : aucune API ni export de masse identifié. C’est une interface de lecture seule.
- **Données** : catégories de vote (Pour, Contre, Abstention, Non-votants), scrutins importants filtrables par année parlementaire (de 2006 à 2024).

### data.senat.fr (Open Data officielle du Sénat)

- **Type** : portail des données ouvertes du Sénat.
- **Données disponibles** :
  - Comptes rendus des séances (XML, SQL PostgreSQL depuis 2003)
  - Amendements (Ameli, SQL)
  - Dossiers législatifs (Dosleg, SQL depuis 1977)
  - Questions (SQL depuis 1978)
  - Sénateurs (mandats, groupes, commissions, SQL/CSV/XLS)
- **Votes nominatifs** : les données de vote ne semblent pas être exposées via une API web simple. Les exports SQL contiennent les bases sous-jacentes, mais il faut les parser soi-même.
- **Mise à jour** : copies quotidiennes (`pg_dump`) des bases du Sénat.

### Forces

- Données brutes exhaustives et historiques.
- Mise à jour quotidienne des dumps SQL.

### Faiblesses

- **Absence d’API REST** dédiée aux votes nominatifs : il faut télécharger des bases SQL complètes et les interroger localement.
- **Contrôle Sénat** est une visualisation sans capacité de réutilisation programmatique.
- Très forte friction technique pour extraire les votes par sénateur.

---

## 4. CIVIX

### Présentation

Plateforme civique indépendante (Arnaud de CIVIX) qui restructure les open data de l’Assemblée nationale pour en faciliter la réutilisation.

### API

- **Type** : API publique read-only.
- **Disponibilité annoncée** : 99 %.
- **Documentation** : Swagger disponible via [data.gouv.fr](https://www.data.gouv.fr/dataservices/api-publique-civix).
- **Fonctionnalités** :
  - Recherche de députés
  - Consultation des scrutins publics
  - Accès aux votes individuels
  - Exploration des dossiers législatifs et statistiques parlementaires
- **Philosophie** : ne modifie pas les données sources, ne produit pas d’interprétation politique.

### Datasets

- Jeu de données CSV sur data.gouv.fr : _Données parlementaires françaises (votes, députés, scrutins) – CIVIX_.
- Inclut : liste des députés actifs, groupes politiques, scrutins publics, votes individuels.

### Forces

- API stable et documentée.
- Données restructurées directement exploitables.
- Pas d’interprétation politique = données neutres.

### Faiblesses

- Se limite à l’Assemblée nationale (pas de Sénat).
- Pas d’indicateurs calculés (loyauté, cohésion) : données brutes reformatées.

---

## 5. Poligraph

### Présentation

Observatoire citoyen de la transparence politique (LD Engineering). Centralise mandats, votes, affaires judiciaires, patrimoine, fact-checks.

### API

- **Type** : REST/JSON publique, licence AGPL-3.0.
- **Spécification** : OpenAPI 3.0 sur [poligraph.fr/api/docs](https://poligraph.fr/api/docs).
- **Limites** : 30 requêtes/minute, pas de clé API requise.
- **12 endpoints** avec pagination (`page`, `limit`).
- **Données exposées** :
  - 925+ représentants politiques (députés, sénateurs, ministres, maires)
  - Votes parlementaires (AN et Sénat) avec positions individuelles (pour/contre/abstention)
  - Taux de participation et classements
  - Dossiers législatifs (statut, timeline, amendements)
  - Affaires judiciaires documentées
  - Résumés IA des scrutins et « impact citoyen »
- **Exports CSV** : fichiers dénormalisés UTF-8 avec BOM, jusqu’à 50 000 lignes par requête, avec `poligraphId` stable pour les jointures.

### Forces

- Couvre **Assemblée nationale ET Sénat**.
- Données enrichies (résumés IA, liens croisés).
- API et exports CSV sans authentification.
- Open-source (TypeScript, Next.js) : [github.com/ironlam/poligraph](https://github.com/ironlam/poligraph).

### Faiblesses

- Taux de disponibilité annoncé : 97 % (légèrement inférieur à CIVIX).
- Limite de débit faible (30 req/min), peu adapté à un scraping intensif.
- Les résumés IA sont une valeur ajoutée mais nécessitent une validation critique.

---

## 6. CLAIR.vote

### Présentation

Projet 100 % open-source (AGPL-3.0) et citoyen, lancé récemment (2025–2026). Agrège députés, sénateurs, lobbying et votes.

### Sources de données

- Assemblée nationale Open Data
- Sénat Open Data
- HATVP (lobbying)
- DILA (interventions)

### API

- **Aucune API publique documentée** à ce stade.
- Le projet est principalement un site web + base de données interne.

### Forces

- Code moderne (TypeScript), architecture ouverte.
- Volonté d’agrégation transversale (votes + lobbying).

### Faiblesses

- Très récent (dernier push mars 2026), écosystème immature.
- Pas d’API : il faut déployer soi-même l’application pour accéder aux données structurées.
- Pas d’indicateurs calculés avancés identifiés.

---

## 7. Code4code / Tricoteuses

### Présentation

Infrastructure professionnelle de données parlementaires et juridiques françaises. Contributeur majeur au projet open-source Tricoteuses.

### Services proposés

- **API REST** (PostgREST / Express, OpenAPI 2.0/3.0)
- **Serveur MCP** (Model Context Protocol) pour agents IA
- **Réplication PostgreSQL** complète en temps réel
- **Streaming** d’événements (Webhooks, Kafka, SQS, Redis, RabbitMQ, Kinesis, Pub/Sub, Snowflake)

### Données

- Assemblée nationale : acteurs, amendements, dossiers, documents, organes, réunions, scrutins, votes
- Sénat : acteurs, amendements, dossiers, documents, votes
- Légifrance : articles, textes, JO

### Tarification

- Dumps hebdomadaires PostgreSQL + dépôts Git : **gratuit**
- API REST + MCP (50 000 req/mois) : **200 € HT/mois**
- Réplication PostgreSQL temps réel + API illimitée : **1 200 € HT/mois**

### Open-source

- Logiciels sous licence AGPL-3.0 : `@tricoteuses/api-parlement`, `@tricoteuses/assemblee`, `@tricoteuses/senat`.
- Dépôts Git de données brutes versionnées et nettoyées, mis à jour plusieurs fois par jour.

### Forces

- Infrastructure la plus complète et professionnelle du marché.
- Temps réel, multi-format, couvre AN + Sénat + Légifrance.
- Données versionnées sous Git (traçabilité complète).

### Faiblesses

- Service complet payant (hors dumps et dépôts Git).
- Complexité technique élevée pour l’auto-hébergement.
- Pas d’indicateurs calculés de comportement de vote (loyauté, etc.) : c’est de l’infrastructure de données brutes.

---

## 8. Pappers Politique

### Présentation

Offre commerciale de consolidation des données parlementaires françaises et européennes.

### API

- API payante, actualisation quotidienne.
- Données : projets/propositions de loi, dossiers législatifs, amendements, rapports, questions, députés, sénateurs, eurodéputés, cartographies parlementaires.

### Forces

- Consolidation multi-sources (AN + Sénat + Parlement européen).
- API robuste et documentée pour usage professionnel.

### Faiblesses

- Payante, sans transparence sur les tarifs publics détaillés.
- Pas de licence open-source.

---

## 9. Sources officielles

### Assemblée nationale (data.assemblee-nationale.fr)

- **Votes** : jeu de données « Votes » rassemblant les positions de chaque député pour les scrutins solennels, déclarations du Gouvernement, motions de procédure et autres scrutins publics.
- **Formats** : XML et JSON par législature (fichiers ZIP de dump).
- **Accès unitaire** : à partir de la 15ème législature, possibilité de récupérer les documents « au fil de l’eau » via des URLs dynamiques.
- **Licence** : Licence Ouverte / Open Licence.

### Sénat (data.senat.fr)

- Voir section 3. Pas d’API unitaire pour les votes, mais dumps SQL quotidiens des bases sénatoriales.

---

## 10. Autres initiatives

### Les Décodeurs (Le Monde)

- Publient ponctuellement des datasets open data (élections, nuances politiques), mais **pas de suivi continu des votes parlementaires** ni d’API dédiée.
- Dépôt GitHub : [github.com/decodeurs/data](https://github.com/decodeurs/data) (dernière activité 2017).

### TheyWorkForYou / mySociety (modèle britannique)

- Référence internationale (UK), mais pas de déploiement français actif.

---

## Tableau comparatif synthétique

| Plateforme                      | API                    | AN  | Sénat              | Indicateurs calculés                  | Open Data / CSV | Open-source        | Fraîcheur       | Coût    |
| ------------------------------- | ---------------------- | --- | ------------------ | ------------------------------------- | --------------- | ------------------ | --------------- | ------- |
| **NosDéputés.fr**               | XML/JSON/CSV           | ✅  | ✅ (NosSénateurs)  | ❌ (brutes)                           | SQL dumps       | ✅ (AGPL-3.0)      | Figé 16ème lég. | Gratuit |
| **Datan.fr**                    | ❌ (CSV via data.gouv) | ✅  | ❌                 | ✅ (participation, loyauté, cohésion) | ✅ (hebdo)      | ✅ (GPL-3.0)       | À jour          | Gratuit |
| **CIVIX**                       | ✅ REST                | ✅  | ❌                 | ❌ (restructuré)                      | ✅              | Non identifié      | À jour          | Gratuit |
| **Poligraph**                   | ✅ REST/JSON/CSV       | ✅  | ✅                 | ❌ (brutes enrichies)                 | ✅              | ✅ (AGPL-3.0)      | À jour          | Gratuit |
| **CLAIR.vote**                  | ❌                     | ✅  | ✅                 | ❌                                    | ❌              | ✅ (AGPL-3.0)      | Récent          | Gratuit |
| **Code4code**                   | ✅ REST/MCP/PostgreSQL | ✅  | ✅                 | ❌                                    | ✅ (dumps Git)  | Partiel (AGPL-3.0) | Temps réel      | Payant  |
| **Pappers Politique**           | ✅ REST                | ✅  | ✅                 | ❌                                    | ❌              | ❌                 | Quotidien       | Payant  |
| **data.assemblee-nationale.fr** | Fichiers ZIP           | ✅  | ❌                 | ❌                                    | ✅ JSON/XML     | ❌                 | À jour          | Gratuit |
| **data.senat.fr**               | Dumps SQL              | ❌  | ✅                 | ❌                                    | ✅ SQL/CSV      | ❌                 | Quotidien       | Gratuit |
| **Contrôle Sénat**              | ❌                     | ❌  | ✅ (visualisation) | ❌                                    | ❌              | ❌                 | À jour          | Gratuit |

---

## APIs agrégées : existe-t-il une solution clé en main ?

### Réponse : non, pas de manière gratuite et complète.

- **Aucune API unifiée couvrant AN + Sénat + indicateurs calculés** n’est disponible gratuitement en temps réel.
- **Poligraph** est le plus proche d’une API agrégée unifiée (AN + Sénat, votes individuels, dossiers législatifs), mais il ne fournit pas les indicateurs politologiques (loyauté, cohésion) et a une limite de débit de 30 req/min.
- **Code4code** offre une vraie unification temps réel, mais c’est un service commercial.
- **Datan** fournit les meilleurs indicateurs calculés, mais sans API et sans Sénat.

**Conclusion** : il faut reconstruire (ou croiser) plusieurs sources pour obtenir une base complète.

---

## Projets open-source à explorer sur GitHub

| Projet                          | Langage       | Licence  | Focus                          | URL                                                                                                                      |
| ------------------------------- | ------------- | -------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **nosdeputes.fr**               | PHP           | AGPL-3.0 | Site + API historique          | [github.com/regardscitoyens/nosdeputes.fr](https://github.com/regardscitoyens/nosdeputes.fr)                             |
| **datan**                       | PHP           | GPL-3.0  | Indicateurs de vote            | [github.com/datanFR/datan](https://github.com/datanFR/datan)                                                             |
| **poligraph**                   | TypeScript    | AGPL-3.0 | Transparence politique + votes | [github.com/ironlam/poligraph](https://github.com/ironlam/poligraph)                                                     |
| **CLAIR**                       | TypeScript    | AGPL-3.0 | Agrégateur votes + lobbying    | [github.com/accelaire/CLAIR](https://github.com/accelaire/CLAIR)                                                         |
| **the-law-factory**             | JavaScript    | AGPL-3.0 | Processus législatif           | [github.com/regardscitoyens/the-law-factory](https://github.com/regardscitoyens/the-law-factory)                         |
| **anpy**                        | Python        | MIT      | Scraper AN                     | [github.com/regardscitoyens/anpy](https://github.com/regardscitoyens/anpy)                                               |
| **senapy**                      | Python        | —        | Scraper Sénat                  | [github.com/regardscitoyens/senapy](https://github.com/regardscitoyens/senapy)                                           |
| **FranceData**                  | Python        | GPL-3.0  | Crawler votes AN (inactif)     | [github.com/LaboratoireCitoyen/FranceData](https://github.com/LaboratoireCitoyen/FranceData)                             |
| **cpc-api**                     | Python        | MIT      | Client Python NosDéputés       | [github.com/regardscitoyens/cpc-api](https://github.com/regardscitoyens/cpc-api)                                         |
| **api-parlement (Tricoteuses)** | TypeScript/JS | AGPL-3.0 | API REST + loader SQL          | [git.tricoteuses.fr/logiciels/tricoteuses-api-parlement](https://git.tricoteuses.fr/logiciels/tricoteuses-api-parlement) |

---

## Recommandations

### 1. Stratégie de croisement des sources

Pour obtenir une base de votes parlementaires la plus complète possible, il est recommandé de croiser :

| Objectif                                          | Source principale                        | Source secondaire           |
| ------------------------------------------------- | ---------------------------------------- | --------------------------- |
| **Votes bruts AN (temps réel)**                   | `data.assemblee-nationale.fr` (JSON/XML) | CIVIX API ou Poligraph API  |
| **Votes bruts Sénat**                             | `data.senat.fr` (dumps SQL)              | Poligraph API               |
| **Indicateurs calculés (loyauté, participation)** | Datan (CSV sur data.gouv.fr)             | Re-calcul interne si besoin |
| **Profils des parlementaires**                    | NosDéputés.fr API (historique)           | Poligraph API / CIVIX API   |
| **Dossiers législatifs liés**                     | NosDéputés.fr / Code4code                | data.assemblee-nationale.fr |

### 2. Architecture suggérée pour un projet d’agrégation

1. **Collecte brute** :
   - Assemblée : utiliser les fichiers JSON/XML officiels ou l’API CIVIX pour les votes.
   - Sénat : télécharger les dumps PostgreSQL de data.senat.fr et extraire les tables de scrutins, ou utiliser l’API Poligraph pour éviter le parsing SQL.
2. **Enrichissement** :
   - Importer les scores Datan (CSV hebdomadaire) pour enrichir les profils de députés avec participation et loyauté.
   - Croiser avec les données biographiques de NosDéputés.fr ou Wikidata.
3. **Stockage interne** :
   - Construire une base PostgreSQL interne unifiée.
   - Option alternative : souscrire à Code4code (200 €/mois) pour obtenir une réplication temps réel et se concentrer sur l’analyse plutôt que l’ETL.
4. **API propre** :
   - Si l’objectif est de fournir une API agrégée, il n’existe pas de solution gratuite clé en main. Il faut donc construire une API par-dessus les sources ci-dessus.
   - S’inspirer du modèle **Poligraph** (Next.js + API REST maison) ou **Datan** (PHP + dataset CSV).

### 3. Ordre de priorité des sources

1. **data.assemblee-nationale.fr** : source primaire incontournable, officielle, toujours à jour.
2. **Datan** : source secondaire privilégiée pour les indicateurs calculés (téléchargement CSV hebdomadaire).
3. **CIVIX** ou **Poligraph** : API intermédiaire pour prototyper rapidement sans parser les XML/ZIP de l’AN.
4. **data.senat.fr** : obligatoire pour le Sénat, mais nécessite un travail d’ingénierie (parsing SQL).
5. **NosDéputés.fr** : utile pour l’historique et la méthodologie, mais à éviter pour la législature en cours tant que le site n’est pas réactivé.

---

## Lacunes et points de vigilance

| Lacune                                   | Détail                                                                                      | Impact                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **NosDéputés.fr non à jour**             | Figé sur la 16ème législature ; la 17ème n’est pas intégrée.                                | Impossible d’utiliser cette API pour la législature en cours.                           |
| **Pas d’API Sénat pour les votes**       | Seuls des dumps SQL sont disponibles.                                                       | Friction technique élevée pour analyser les votes sénatoriaux.                          |
| **Datan sans API**                       | Données calculées uniquement via CSV hebdomadaire.                                          | Pas d’accès temps réel aux indicateurs ; besoin de télécharger et parser régulièrement. |
| **Pas d’indicateurs calculés sur Sénat** | Ni Datan ni NosDéputés ne fournissent de scores de loyauté/cohesion pour le Sénat.          | Il faut reconstruire ces indicateurs soi-même.                                          |
| **Limite de débit Poligraph**            | 30 req/minute.                                                                              | Insuffisant pour un scraping massif ; préférer les exports CSV pour les gros volumes.   |
| **Fragmentation des sources**            | AN, Sénat, indicateurs, profils, dossiers législatifs sont sur des plateformes différentes. | Nécessite un travail d’intégration et de modélisation de données conséquent.            |

---

_Document rédigé le 2026-05-19 à partir d’une recherche multi-sources (sites officiels, documentation API, GitHub, data.gouv.fr)._
