# Research: API officielles de l'Assemblée Nationale et du Sénat pour les données de votes

## Summary

L'Assemblée nationale met à disposition des **fichiers bulk XML/JSON** contenant l'intégralité des scrutins publics de la législature courante (17e depuis juillet 2024), avec un décompte nominatif des votes de chaque député. Il n'existe pas de véritable API REST : les données se téléchargent sous forme d'archives ZIP mises à jour quotidiennement. Le Sénat, via `data.senat.fr`, **ne publie pas de jeu de données dédié aux votes** ; les scrutins nominatifs ne sont accessibles que via les pages HTML du site ou des outils tiers (controlesenat.fr, senapy, NosSénateurs.fr). Les votes à main levée ne sont pas enregistrés individuellement dans les deux assemblées.

---

## Findings

### 1. Assemblée Nationale — data.assemblee-nationale.fr

#### 1.1 Endpoints et formats disponibles

L'Assemblée nationale publie les votes sous le jeu de données **« Votes »** (catégorie *Travaux parlementaires*).

| Ressource | URL | Format |
|-----------|-----|--------|
| Votes législature courante (17e) — JSON | `https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip` | ZIP + JSON |
| Votes législature courante (17e) — XML | `https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.xml.zip` | ZIP + XML |
| Archives 16e législature | `https://data.assemblee-nationale.fr/static/openData/repository/16/loi/scrutins/Scrutins.json.zip` | ZIP + JSON |
| Archives 15e législature | `https://data.assemblee-nationale.fr/archives-anterieures/archives-15e/scrutins` | ZIP + JSON/XML |
| Archives 14e législature | `https://data.assemblee-nationale.fr/archives-anterieures/archives-14e/scrutins` | ZIP + JSON/XML |

[Source : data.assemblee-nationale.fr — Votes](https://data.assemblee-nationale.fr/travaux-parlementaires/votes)

**Important** : il n'existe pas d'API REST paginée. L'accès se fait exclusivement par **téléchargement d'archives ZIP complètes** de la législature. La documentation indique que pour les textes, rapports et amendements, un accès unitaire « au fil de l'eau » existe à partir de la 15e législature, mais **les votes ne font pas partie de ce dispositif unitaire** (pas de liste de publication quotidienne spécifique aux scrutins). [Source : FAQ Assemblée nationale](https://data.assemblee-nationale.fr/foire-aux-questions)

#### 1.2 Fréquence de mise à jour

Les métadonnées des fichiers ZIP affichent une date à jour (ex. `2026-05-19 18:24:19` au moment de la recherche), ce qui indique une **mise à jour quotidienne** de l'archive. Cependant, aucune garantie de fraîcheur n'est contractuellement publiée.

#### 1.3 Structure des données (JSON/XML)

Le schéma officiel a pu être extrait du projet communautaire `Asone/assemblee-data-interfaces`. [Source : GitHub — assemblee-data-interfaces/schemas/Scrutins.schema.json](https://github.com/Asone/assemblee-data-interfaces)

**Racine** : `scrutins.scrutin[]` (tableau de scrutins)

Chaque scrutin contient :

| Champ | Description |
|-------|-------------|
| `uid` | Identifiant unique du scrutin |
| `numero` | Numéro de scrutin dans la législature |
| `organeRef` | Référence de l'organe ayant procédé au vote |
| `legislature` | Numéro de la législature (ex. "17") |
| `sessionRef` | Référence de la session parlementaire |
| `seanceRef` | Référence de la séance publique |
| `dateScrutin` | Date du scrutin (ISO) |
| `quantiemeJourSeance` | Quantrième jour de la séance |
| `typeVote` | `codeTypeVote`, `libelleTypeVote`, `typeMajorite` |
| `sort` | `code` (adopté/rejeté) et `libelle` |
| `titre` | Objet du scrutin |
| `demandeur` | Texte décrivant qui a demandé le scrutin |
| `objet` | Libellé détaillé de l'objet |
| `modePublicationDesVotes` | Mode de publication |
| `syntheseVote` | Nombre de votants, suffrages exprimés, seuil requis, décompte global (pour/contre/abstentions/nonVotants/nonVotantsVolontaires) |
| `ventilationVotes` | Répartition par **groupe politique**, avec pour chaque groupe : `organeRef`, `nombreMembresGroupe`, `vote.positionMajoritaire`, `vote.decompteVoix`, `vote.decompteNominatif` |
| `miseAuPoint` | Éventuelles corrections post-scrutin |

**Votes individuels** : se trouvent dans `ventilationVotes.organe.groupes.groupe[].vote.decompteNominatif` :

- `pours.votant[]` : votants "pour" (`acteurRef`, `mandatRef`, `parDelegation`)
- `contres.votant[]` : votants "contre" (même structure)
- `abstentions.votant[]` : abstentions
- `nonVotants.votant[]` : non-votants (`acteurRef`, `mandatRef`, `causePositionVote`)

**Identification des députés** : les votes se réfèrent aux députés via **`acteurRef`** (identifiant de l'acteur dans le référentiel, ex. `PA1234`) et **`mandatRef`** (identifiant du mandat, ex. `PM5678`). Ces identifiants sont joints avec le jeu de données **« Députés en exercice »** ou **« Historique des députés »** disponible sur la même plateforme. [Source : data.assemblee-nationale.fr — Acteurs](https://data.assemblee-nationale.fr/acteurs)

#### 1.4 Exemple de payload (structure simplifiée)

```json
{
  "scrutins": {
    "scrutin": [
      {
        "uid": "VTANR5L17V1",
        "numero": "1",
        "legislature": "17",
        "dateScrutin": "2024-07-18",
        "titre": "Motion de confiance",
        "sort": { "code": "adopté", "libelle": "Adopté" },
        "syntheseVote": {
          "nombreVotants": "289",
          "suffragesExprimes": "289",
          "decompte": {
            "pour": "200",
            "contre": "89",
            "abstentions": "0",
            "nonVotants": "288",
            "nonVotantsVolontaires": "0"
          }
        },
        "ventilationVotes": {
          "organe": {
            "groupes": {
              "groupe": [
                {
                  "organeRef": "PO800000",
                  "nombreMembresGroupe": "142",
                  "vote": {
                    "positionMajoritaire": "pour",
                    "decompteVoix": { "pour": "140", "contre": "0", "abstentions": "0", "nonVotants": "2", "nonVotantsVolontaires": "0" },
                    "decompteNominatif": {
                      "pours": { "votant": [ { "acteurRef": "PA123", "mandatRef": "PM456", "parDelegation": "false" } ] },
                      "nonVotants": { "votant": [ { "acteurRef": "PA789", "mandatRef": "PM012", "causePositionVote": "absence" } ] }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    ]
  }
}
```

#### 1.5 Numérotation des législatures

- **17e législature** : en cours depuis juillet 2024 (élections législatives anticipées).
- **16e législature** : juin 2022 – juillet 2024.
- Archives disponibles jusqu'à la 11e législature (certains jeux).

#### 1.6 Publicité des votes

Selon la fiche de synthèse n°56 de l'Assemblée nationale :

> « Hormis le cas des votes portant sur des nominations personnelles (élection du Président de l'Assemblée nationale en début de législature, par exemple), **tous les scrutins sont publics**. Ils se déroulent soit à main levée, soit par scrutin public ordinaire, soit par scrutin à la tribune ou dans les salles voisines de la salle des séances. »

[Source : Fiche de synthèse n°56 — Les votes à l'Assemblée nationale](https://www.assemblee-nationale.fr/dyn/synthese/fonctionnement-assemblee-nationale/travail-legislatif/les-votes-a-l-assemblee-nationale)

**Attention** : le vote à **main levée** est public dans l'hémicycle mais **n'est pas enregistré nominativement** et n'apparaît donc pas dans les fichiers Open Data. Seuls les **scrutins publics ordinaires, solennels et à la tribune** sont publiés avec le détail du vote de chaque député. Depuis avril 2014 (XIVe législature), tous les scrutins publics indiquent la position de chaque député. Avant cette date, seule la position des groupes était systématiquement publiée. [Source : blog.vnmis.net — Petite analyse des scrutins](https://blog.vnmis.net/petite-analyse-des-scrutins-de-lassemblee-nationale/)

#### 1.7 Limitations techniques (AN)

| Limitation | Détail |
|------------|--------|
| **Pas d'API REST** | Seuls des fichiers ZIP bulk sont disponibles ; pas de pagination, pas de filtres par requête HTTP |
| **Pas de endpoint unitaire pour les votes** | Contrairement aux amendements, il n'existe pas d'URL unitaire `/dyn/opendata/ scrutin.json` |
| **Métadonnées erronées** | Le fichier de la 17e législature porte encore la description "XV législature" dans ses métadonnées |
| **Complétude historique** | Votes individuels par député : systématiques depuis avril 2014 ; avant = principalement agrégats par groupe |
| **Rate limiting** | Non documenté ; usage raisonnable recommandé. Licence Ouverte 2.0 |
| **Latence** | L'archive semble reconstruite quotidiennement, mais sans SLA officiel |

---

### 2. Sénat — data.senat.fr

#### 2.1 Jeux de données disponibles

La plateforme `data.senat.fr` propose les catégories suivantes, **mais aucun jeu dédié aux votes ou scrutins** :

| Base | Contenu | Format |
|------|---------|--------|
| **Comptes rendus** | CR intégraux de séance publique depuis janvier 2003 | PostgreSQL 8.4 dump + XML |
| **Ameli** | Amendements déposés en commission (depuis 2010) et séance (depuis 2001) | PostgreSQL 8.4 dump |
| **Dosleg** | Dossiers législatifs depuis octobre 1977 | PostgreSQL 8.4 dump |
| **Questions** | Questions écrites/orales depuis avril 1978 | PostgreSQL 8.4 dump + CSV |
| **Sénateurs** | Mandats, appartenances, présences | ZIP (XLS/JSON/CSV selon extracts) |
| **Dispositifs des textes** | Textes depuis décembre 2019 | XML (Akoma Ntoso) |
| **Dotation d'action parlementaire** | Dotations | PostgreSQL 8.4 dump |

[Source : data.senat.fr — Données](https://data.senat.fr/donnees/)

#### 2.2 Accès aux votes au Sénat

**data.senat.fr ne publie pas les résultats nominatifs des scrutins publics en Open Data.** Les votes des sénateurs sont accessibles via :

1. **Pages HTML du site officiel** :
   - Session 2025-2026 : `https://www.senat.fr/scrutin-public/scr2025.html`
   - Session 2024-2025 : `https://www.senat.fr/scrutin-public/scr2024.html`
   - Historique : `https://www.senat.fr/scrutin-public/scr{session}.html`

2. **Explorateur des Votes — Contrôle Sénat** (outil tiers) :
   - `https://controlesenat.fr/scrutins`
   - Fournit une interface de recherche par année parlementaire et permet d'explorer les votes par sénateur.

3. **NosSénateurs.fr / Regard Citoyen** :
   - API disponible en ajoutant `/json`, `/xml` ou `/csv` aux URLs de pages (ex. `https://www.nossenateurs.fr/.../votes/xml`).
   - [Source : doc/api.md — NosDéputés.fr & NosSénateurs.fr](https://github.com/regardscitoyens/nosdeputes.fr/blob/master/doc/api.md)

4. **senapy** (client Python) :
   - Permet de parser les pages du Sénat et d'extraire les données en JSON.
   - [Source : GitHub — regardscitoyens/senapy](https://github.com/regardscitoyens/senapy)

#### 2.3 Format des votes au Sénat

Selon la FAQ de l'explorateur de votes du Sénat, les votes sont comptabilisés en quatre catégories :

- **Pour** : sénateurs ayant voté en faveur du texte
- **Contre** : sénateurs ayant voté contre le texte
- **Abstention** : sénateurs présents mais ne se prononçant ni pour ni contre
- **Non-votants** : sénateurs absents ou n'ayant pas pris part au vote

Un **scrutin public** au Sénat est un vote solennel nominatif où chaque sénateur exprime sa position publiquement ; les résultats sont publiés avec le nom de chaque votant. [Source : controlesenat.fr — Aide](https://controlesenat.fr/aide)

#### 2.4 Numérotation des sessions

Au Sénat, les scrutins sont organisés par **année parlementaire** (session). L'année parlementaire commence en octobre et se termine en septembre de l'année suivante :

- Session **2025** = octobre 2025 – septembre 2026
- Session **2024** = octobre 2024 – septembre 2025

#### 2.5 Limitations techniques (Sénat)

| Limitation | Détail |
|------------|--------|
| **Pas de jeu de données votes** | Aucun export Open Data dédié aux scrutins sur `data.senat.fr` |
| **Pas d'API REST officielle** | L'organisation Sénat sur data.gouv.fr indique "API 0" |
| **SQL dumps uniquement** | Les données structurées sont fournies en dumps PostgreSQL 8.4, nécessitant une infrastructure locale |
| **Fréquence** | Copie quotidienne des bases (`pg_dump`) ; données brutes supprimées (brouillons, champs obsolètes) |
| **Votes dans Comptes rendus** | Les CR intégraux (XML) contiennent le verbatim des scrutins mais pas de structure normalisée facilement extractible pour les votes individuels |
| **Licence** | Licence Ouverte (comme l'AN) |

---

### 3. Complétude et comparatif

| Critère | Assemblée Nationale | Sénat |
|---------|---------------------|-------|
| **Format principal** | ZIP JSON/XML | PostgreSQL dump / XML |
| **API REST** | ❌ Non | ❌ Non |
| **Accès unitaire** | ❌ Non (sauf amendements/textes) | ❌ Non |
| **Votes individuels** | ✅ Oui (depuis 2014) | ⚠️ Via HTML / outils tiers |
| **Fréquence MAJ** | Quotidienne (approx.) | Quotidienne (dump SQL) |
| **Rate limit documenté** | ❌ Non | ❌ Non |
| **Licence** | Licence Ouverte 2.0 | Licence Ouverte |
| **Publicité des votes** | Tous publics sauf nominations | Tous publics sauf nominations |
| **Votes à main levée** | ❌ Non enregistrés nominativement | ❌ Non enregistrés nominativement |

---

## Sources

### Kept

1. **Votes — Assemblée nationale** (`https://data.assemblee-nationale.fr/travaux-parlementaires/votes`) — Page principale du jeu de données avec liens de téléchargement ZIP JSON/XML.
2. **Scrutins publics — 17e législature** (`https://www.assemblee-nationale.fr/dyn/17/scrutins`) — Interface web des scrutins, permet de vérifier la numérotation et le volume (ex. >5800 scrutins).
3. **FAQ — Assemblée nationale** (`https://data.assemblee-nationale.fr/foire-aux-questions`) — Décrit le mécanisme « au fil de l'eau » pour les textes/amendements, mais pas les votes.
4. **Schémas — Scrutins (GitHub Asone)** (`https://github.com/Asone/assemblee-data-interfaces/blob/master/schemas/Scrutins.schema.json`) — Schéma JSON officiel dérivé des dumps parlementaires, structure exacte des payloads.
5. **Fiche de synthèse n°56 — Votes à l'AN** (`https://www.assemblee-nationale.fr/dyn/synthese/fonctionnement-assemblee-nationale/travail-legislatif/les-votes-a-l-assemblee-nationale`) — Documentation institutionnelle sur les modalités de vote et la publicité.
6. **Données — data.senat.fr** (`https://data.senat.fr/donnees/`) — Liste exhaustive des jeux de données du Sénat ; confirme l'absence de base « Votes ».
7. **FAQ — data.senat.fr** (`https://data.senat.fr/faq/`) — Explique la génération des dumps SQL quotidiens et leur contenu.
8. **Aide — Explorateur des Votes au Sénat** (`https://controlesenat.fr/aide`) — Définit les catégories de vote (Pour/Contre/Abstention/Non-votants) et le scrutin public.
9. **API NosDéputés.fr & NosSénateurs.fr** (`https://github.com/regardscitoyens/nosdeputes.fr/blob/master/doc/api.md`) — Documentation de l'API tierce qui simplifie l'accès aux votes.
10. **CIVIX / API publique** (`https://www.data.gouv.fr/dataservices/api-publique-civix`) — API read-only sur les données de l'AN, alternative aux fichiers bulk.

### Dropped

- Articles de blogs SEO génériques sur "l'API Sénat open en 2025" : contenu promotionnel sans URLs techniques concrètes ni schémas vérifiables.
- data.gouv.fr (organisation AN) — miroir rarement à jour ; source primaire = data.assemblee-nationale.fr.
- Ouest-France / Les Surligneurs — articles journalistiques utiles pour la compréhension du vote à main levée mais sans détails techniques d'intégration.

---

## Gaps

1. **Schéma XML officiel des scrutins** : la documentation Sphinx de 2016 (`http://www.assemblee-nationale.fr/opendata/Index_pub.html`) ne détaille pas la structure des votes ; le schéma JSON a dû être extrait via un projet communautaire. Il n'existe pas de XSD publié spécifiquement pour les scrutins.
2. **Rate limiting / CGU technique** : ni l'AN ni le Sénat ne documentent de limites de débit, de quotas ou de conditions d'utilisation technique spécifiques aux téléchargements massifs.
3. **Mise à jour "au fil de l'eau" des votes** : il n'a pas été possible de confirmer l'existence d'une liste de publication quotidienne (type `publication_YYYY-MM-DD.csv`) pour les scrutins, contrairement aux amendements.
4. **Votes du Sénat en masse** : aucune méthode officielle n'a été identifiée pour télécharger l'intégralité des scrutins du Sénat en un seul fichier structuré (JSON/XML/CSV) ; seul le scraping ou l'import SQL des comptes rendus permettrait une reconstruction.
5. **Délégations de vote** : le champ `parDelegation` existe dans le schéma AN, mais sa documentation métier (règles de délégation, impact sur les présences) n'est pas formalisée dans l'Open Data.

---

## Recommandations pour l'intégration

### Assemblée Nationale
1. **Téléchargement initial** : récupérer le ZIP JSON de la législature courante (`Scrutins.json.zip`) et le décompresser.
2. **Mise à jour incrémentale** : comparer la date du fichier ou son MD5 (quand publié) pour re-télécharger quotidiennement ; parser l'intégralité du JSON car il n'y a pas de delta.
3. **Jointure** : croiser `acteurRef` et `mandatRef` avec le fichier **« Députés en exercice »** (JSON/XML) pour obtenir les nom, prénom, groupe, circonscription.
4. **Filtrage** : utiliser `modePublicationDesVotes`, `typeVote.codeTypeVote` et `sort.code` pour classifier les scrutins (solennel, motion de censure, etc.).
5. **Alternative API** : si un accès plus simple est nécessaire, utiliser l'**API CIVIX** (`https://www.civix.fr`) ou **NosDéputés.fr** (`/json`, `/xml`) qui restructurent ces données en endpoints REST.

### Sénat
1. **Méthode la plus fiable** : utiliser **senapy** (Python) pour scraper les pages de scrutins et extraire les votes en JSON structuré.
2. **Alternative web** : utiliser l'**API de NosSénateurs.fr** pour obtenir les votes par sénateur ou par scrutin en JSON/XML.
3. **Pour une intégration SQL** : importer le dump **Comptes rendus** PostgreSQL et parser les champs textuels contenant les résultats de vote (approche lourde, non recommandée sauf pour des besoins très spécifiques).
4. **Surveillance** : suivre le RSS de `data.senat.fr` pour détecter d'éventuelles nouvelles publications de données de vote.
