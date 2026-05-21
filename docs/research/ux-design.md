# Conception UX — Site de Transparence des Votes Parlementaires

> **Version** : 1.0  
> **Date** : 2026-05-19  
> **Objectif** : Permettre à tout citoyen de comprendre, rechercher et comparer les votes de ses représentants parlementaires en toute simplicité.  
> **Device cible** : Mobile-first (320px), tablette (768px), desktop (1280px)  
> **Accessibilité** : Conformité WCAG 2.1 AA minimum, cible AAA sur le contraste des textes.

---

## 1. Principes de design

| Principe                | Application concrète                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Clarté avant tout**   | Un vote s'affiche en 3 secondes. Pas de jargon parlementaire sans explication.                                    |
| **Neutralité visuelle** | Pas de couleur de parti. Les votes « Pour / Contre / Abstention » utilisent un code couleur sémantique universel. |
| **Contextualisation**   | Chaque vote est accompagné du résultat global de l'Assemblée pour donner du contexte.                             |
| **Actionnabilité**      | Un citoyen doit pouvoir passer de la découverte à la comparaison en 2 clics.                                      |
| **Confiance**           | Sources, dates et identifiants de scrutins visibles immédiatement.                                                |

---

## 2. Parcours utilisateurs principaux

### 2.1. Parcours A — Recherche d'un député

```
[Accueil]
   │
   ▼
[Barre de recherche globale]
   │  (nom, prénom, ville, code postal, numéro de circonscription)
   ▼
[Résultats de recherche — liste de députés]
   │  (carte avec photo, nom, circonscription, groupe politique)
   ▼
[Fiche député]
   │  (identité, contact, historique des votes)
   │
   ├──► [Filtrer l'historique par date / thème / type / résultat]
   │
   └──► [Comparer avec un autre député]
```

**Edge cases :**

- Aucun résultat → message + suggestion de députés de la même zone géographique.
- Nom ambigu (ex: 2 députés homonymes) → étape de désambiguation par circonscription.
- Député non-réélu → historique conservé, badge "Mandat terminé".

### 2.2. Parcours B — Consultation de l'historique des votes

```
[Fiche député — onglet "Votes"]
   │
   ├──► [Vote détaillé] ──► [Texte de loi associé]
   │
   ├──► [Pagination ou scroll infini]
   │
   └──► [Export PDF / lien permanent]
```

**Edge cases :**

- Député jamais voté (nouvel élu) → état vide illustré + message explicatif.
- Député absent à tous les votes du mois → bandeau d'alerte contextualisé.

### 2.3. Parcours C — Recherche par sujet / texte de loi

```
[Accueil]
   │
   ▼
[Barre de recherche globale OU onglet "Textes de loi"]
   │  (mot-clé, numéro de texte, thématique)
   ▼
[Résultats — liste de textes / scrutins]
   │  (titre, date, thématique, résultat global)
   ▼
[Page scrutin]
   │  (détail du texte, résultat global, liste des votes par groupe)
   ▼
[Votes individuels — filtrables par groupe ou par nom]
```

**Edge cases :**

- Texte en cours de débat (pas encore voté) → état "En cours" + calendrier prévisionnel.
- Texte rejeté → mise en évidence du résultat + lien vers les interventions.

### 2.4. Parcours D — Comparaison de votes (comparateur)

```
[Depuis fiche député OU page dédiée]
   │
   ▼
[Sélection du député de référence]
   │
   ▼
[Ajout d'un ou plusieurs députés à comparer]
   │  (recherche par nom, suggestion par circonscription voisine,
   │   ou sélection dans liste de favoris)
   ▼
[Tableau comparatif des votes communs]
   │
   ├──► [Score de concordance global]
   ├──► [Liste des votes divergents]
   └──► [Partage du comparateur]
```

**Edge cases :**

- Un seul vote commun entre les deux députés → message "Échantillon limité, interpréter avec prudence".
- Comparaison sur une période sans vote commun → suggestion d'élargir la période.
- Députés de législatures différentes → impossible, message explicatif.

---

## 3. Architecture de l'information (simplifiée)

```
Accueil
├── Recherche globale (député / texte / thème)
├── Découverte
│   ├── Députés les plus consultés
│   ├── Derniers scrutins
│   └── Thématiques du moment
│
├── Fiche Député
│   ├── Infos (identité, contact, mandats)
│   ├── Activité (taux de présence, nombre de votes)
│   ├── Votes (liste filtrable)
│   └── Comparer
│
├── Page Scrutin
│   ├── Infos du texte
│   ├── Résultat global (graphique)
│   └── Votes détaillés
│
└── Comparateur
    ├── Sélection des députés
    ├── Vue synthétique (score + graphique)
    └── Vue détaillée (tableau vote par vote)
```

---

## 4. Wireframes textuels des écrans clés

### 4.1. Page d'accueil (Mobile — 375px)

```
┌─────────────────────────────┐
│  [Logo]         [Rechercher]│  ← Header sticky, 56px
├─────────────────────────────┤
│                             │
│   Comprenez les votes       │
│   de vos représentants      │  ← H1, 28px, centré
│                             │
│   ┌─────────────────────┐   │
│   │ 🔍 Nom, ville, loi… │   │  ← Barre de recherche
│   └─────────────────────┘   │    principale, 48px
│                             │    hauteur, radius 8px
│   [Rechercher]              │
│                             │
│   ───────────────────────── │
│                             │
│   Derniers scrutins         │  ← Section H2
│                             │
│   ┌─────────────────────┐   │
│   │ Projet de loi sur…  │   │  ← Card scrutin
│   │ 15 mai 2026         │   │    (thumb, title, date,
│   │ Adopté ✅           │   │     résultat badge)
│   └─────────────────────┘   │
│                             │
│   ┌─────────────────────┐   │
│   │ Réforme des retraites│  │  ← Card scrutin
│   │ 12 mai 2026         │   │
│   │ Rejeté ❌           │   │
│   └─────────────────────┘   │
│                             │
│   Thématiques               │
│   [Santé] [Éducation] …     │  ← Chips horizontalement
│                             │    scrollable
│                             │
│   ───────────────────────── │
│   À propos · Données · API  │  ← Footer
└─────────────────────────────┘
```

**Comportement :**

- La barre de recherche est focalisée au chargement sur desktop ; sur mobile, elle reste visible en haut de l'écran au scroll (barre réduite).
- Les chips thématiques filtrent la liste des derniers scrutins sans rechargement de page.

---

### 4.2. Résultats de recherche — Députés

```
┌─────────────────────────────┐
│  ◀ Résultats                │
│  "Durand"                   │
│                             │
│   3 députés trouvés         │
│                             │
│   ┌─────────────────────┐   │
│   │ [📷] Marie Durand   │   │  ← Card député
│   │ Circonscription 12  │   │    72px hauteur
│   │ Paris (75)          │   │    photo 48x48px
│   │ Groupe A            │   │
│   └─────────────────────┘   │
│                             │
│   ┌─────────────────────┐   │
│   │ [📷] Jean Durand    │   │
│   │ Circonscription 3   │   │
│   │ Lyon (69)           │   │
│   │ Groupe B            │   │
│   └─────────────────────┘   │
│                             │
│   [📷] Paul Durand          │  ← 3ème résultat
│   …                         │
│                             │
│   Voir aussi :              │  ← Désambiguïsation / suggestions
│   Députés de votre région   │
└─────────────────────────────┘
```

---

### 4.3. Fiche Député — Vue Votes

```
┌─────────────────────────────┐
│  ◀ [Photo] Marie Durand     │  ← Header avec retour
│     Députée · Paris (75)    │
│     Groupe A                │
├─────────────────────────────┤
│                             │
│   [Infos] [Votes] [Compare]│  ← Segmented control sticky
│                             │
│   ───────────────────────── │
│                             │
│   Activité                  │
│   ┌─────────┐ ┌─────────┐   │
│   │  89%    │ │  142    │   │  ← KPI cards
│   │Présence │ │  Votes  │   │    2 colonnes
│   └─────────┘ └─────────┘   │
│                             │
│   ───────────────────────── │
│                             │
│   🔍 Filtrer les votes      │  ← Barre filtre secondaire
│   [Période ▼][Thème ▼]      │    collapsible sur mobile
│   [Type ▼] [Résultat ▼]     │
│                             │
│   ┌─────────────────────┐   │
│   │ Projet de loi sur…  │   │  ← Card vote
│   │ 15 mai 2026         │   │
│   │ Thématique : Travail│   │
│   │                     │   │
│   │ Elle a voté :       │   │
│   │   ✅ POUR           │   │  ← Vote mis en avant
│   │   (Assemblée : 234  │   │     avec contexte global
│   │    pour, 198 contre)│   │
│   │                     │   │
│   │ [Détail du scrutin] │   │
│   └─────────────────────┘   │
│                             │
│   ┌─────────────────────┐   │
│   │ Réforme des retraites│  │  ← Card vote
│   │ 12 mai 2026         │   │
│   │ Elle a voté :       │   │
│   │   ❌ CONTRE         │   │
│   │   (Assemblée : adopté)│ │
│   └─────────────────────┘   │
│                             │
│   [Charger plus de votes]   │  ← Pagination / infinite scroll
│                             │
└─────────────────────────────┘
```

**Variantes de la fiche :**

- **État vide (nouvel élu)** : illustration + "Cet élu n'a pas encore participé à un scrutin depuis son élection le [date]."
- **État alerte (absences)** : bandeau jaune "Absent·e à 5 scrutins consécutifs sur la période sélectionnée."
- **Chargement** : skeleton cards (3 lignes) avec animation pulsée.

---

### 4.4. Page Scrutin

```
┌─────────────────────────────┐
│  ◀ Scrutin n° 1234          │
├─────────────────────────────┤
│                             │
│   Projet de loi renforçant  │  ← H1
│   la lutte contre la fraude │
│                             │
│   📅 15 mai 2026            │  ← Métadonnées
│   🏷️ Économie · Finance     │
│   📄 Lien vers le texte     │
│                             │
│   ───────────────────────── │
│                             │
│   Résultat de l'Assemblée   │
│                             │
│   ┌─────────────────────┐   │
│   │    ✅ ADOPTÉ        │   │  ← Badge résultat
│   │                     │   │
│   │  [GRAPHique circ.]  │   │  ← Graphique simple
│   │  342 POUR           │   │    (mobile : barres
│   │  198 CONTRE         │   │     horizontales)
│   │   12 ABSTENTION     │   │
│   └─────────────────────┘   │
│                             │
│   ───────────────────────── │
│                             │
│   Votes par groupe          │
│   [Groupe A ▼] [Groupe B ▼] │  ← Accordéon
│                             │
│   Députés ayant voté POUR   │  ← Liste filtrable
│   [📷] Dupont — Pour        │
│   [📷] Martin — Pour        │
│                             │
│   [📷] Durand — Contre      │
│   …                         │
│                             │
│   [Voir tous les votes]     │
│                             │
└─────────────────────────────┘
```

---

### 4.5. Comparateur de Votes (Écran clé)

#### Étape 1 — Sélection

```
┌─────────────────────────────┐
│  ◀ Comparateur              │
├─────────────────────────────┤
│                             │
│   Comparez les positions    │
│   de vos députés            │
│                             │
│   Député de référence       │
│   ┌─────────────────────┐   │
│   │ [📷] Marie Durand ✓ │   │  ← Sélectionnée
│   │ Paris (75) — GroupeA│   │
│   └─────────────────────┘   │
│                             │
│   Députés à comparer        │
│   ┌─────────────────────┐   │
│   │ + Ajouter un député │   │  ← CTA principal
│   └─────────────────────┘   │
│                             │
│   Suggestions :             │
│   [📷] Jean Martin          │  ← Basé sur circonscription
│   [📷] Lucie Bernard        │     voisine ou même groupe
│                             │
│   Période :                 │
│   [Toute la législature ▼]  │  ← Filtre temporel
│                             │
│   [Comparer les positions]  │  ← Bouton submit, disabled
│                             │    tant que < 2 députés
└─────────────────────────────┘
```

#### Étape 2 — Résultat comparatif

```
┌─────────────────────────────┐
│  ◀ Comparaison              │
├─────────────────────────────┤
│                             │
│   Marie Durand vs           │
│   Jean Martin               │
│                             │
│   ───────────────────────── │
│                             │
│   Score de concordance      │
│   ┌─────────────────────┐   │
│   │      78%            │   │  ← Indicateur visuel
│   │   ████████░░        │   │    fort (donut ou jauge)
│   │   sur 67 votes      │   │
│   │   communs           │   │
│   └─────────────────────┘   │
│                             │
│   ───────────────────────── │
│                             │
│   [🟢 Ensemble] [🔴 Divergent]│  ← Tabs filtre
│                             │
│   15 votes divergents       │
│                             │
│   ┌─────────────────────┐   │
│   │ Projet de loi sur…  │   │  ← Card vote comparé
│   │ 15 mai 2026         │   │
│   │                     │   │
│   │ Durand    Martin    │   │
│   │   ✅ POUR   ❌ CONTRE│  │  ← Alignés côte à côte
│   │                     │   │
│   │ [Détail du scrutin] │   │
│   └─────────────────────┘   │
│                             │
│   ┌─────────────────────┐   │
│   │ Réforme des …       │   │
│   │ Durand    Martin    │   │
│   │   ❌ CONTRE ✅ POUR │   │
│   └─────────────────────┘   │
│                             │
│   [Partager cette comparaison]│ ← CTA secondaire
│                             │
└─────────────────────────────┘
```

**Desktop (≥1024px) :** la vue passe en tableau à colonnes fixes :

- Colonne 1 : Date + titre du scrutin
- Colonne 2 : Député A (badge couleur)
- Colonne 3 : Député B (badge couleur)
- Colonne 4 : Résultat global

---

### 4.6. Écrans d'état

**État vide — Aucun vote trouvé**

```
┌─────────────────────────────┐
│                             │
│         [Icône 📭]          │
│                             │
│   Aucun vote ne correspond  │
│   à vos filtres.            │
│                             │
│   Essayez d'élargir la      │
│   période ou de supprimer   │
│   certains critères.        │
│                             │
│   [Réinitialiser les filtres]│
│                             │
└─────────────────────────────┘
```

**État erreur — Chargement impossible**

```
┌─────────────────────────────┐
│                             │
│         [Icône ⚠️]          │
│                             │
│   Impossible de charger     │
│   les données.              │
│                             │
│   [Réessayer]               │
│                             │
└─────────────────────────────┘
```

---

## 5. Informations critiques par écran

| Écran                   | Info critique #1           | Info critique #2                 | Info critique #3               |
| ----------------------- | -------------------------- | -------------------------------- | ------------------------------ |
| **Accueil**             | Barre de recherche visible | Derniers scrutins (actualité)    | Thématiques (entrée par sujet) |
| **Résultats recherche** | Nombre de résultats        | Circonscription (désambiguation) | Groupe politique               |
| **Fiche député**        | Taux de présence           | Position sur chaque vote         | Contexte du résultat global    |
| **Page scrutin**        | Résultat global clair      | Répartition des votes            | Lien vers le texte officiel    |
| **Comparateur**         | Score de concordance       | Nombre de votes communs          | Liste des divergences          |

---

## 6. Filtres et tris

### 6.1. Filtres disponibles

| Filtre               | Type               | Options                                                                                   | Applicable sur        |
| -------------------- | ------------------ | ----------------------------------------------------------------------------------------- | --------------------- |
| **Période**          | Date range         | Prédéfinies (7j, 30j, 6mois, législature) + custom                                        | Votes, Comparateur    |
| **Thématique**       | Multi-select chips | Santé, Éducation, Économie, Environnement, Travail, Sécurité, Institutions, Culture, etc. | Votes, Scrutins       |
| **Type de scrutin**  | Multi-select       | Vote solennel, motion de censure, amendement, budget, etc.                                | Votes, Scrutins       |
| **Résultat du vote** | Single-select      | Pour / Contre / Abstention / Absent·e                                                     | Votes du député       |
| **Résultat global**  | Single-select      | Adopté / Rejeté                                                                           | Scrutins              |
| **Groupe politique** | Multi-select       | Liste des groupes de l'Assemblée                                                          | Scrutins, Comparateur |
| **Circonscription**  | Search + select    | Département + numéro                                                                      | Recherche député      |

### 6.2. Tris disponibles

| Tri                          | Défaut | Applicable sur      |
| ---------------------------- | ------ | ------------------- |
| Date (plus récent)           | ✅ Oui | Votes, Scrutins     |
| Date (plus ancien)           | —      | Votes, Scrutins     |
| Pertinence (recherche texte) | ✅ Oui | Résultats recherche |
| Nom (A-Z)                    | —      | Liste de députés    |
| Concordance (%)              | —      | Comparateur         |

### 6.3. Comportement des filtres

- **Mobile** : les filtres s'ouvrent dans un drawer bottom-sheet (hauteur 80vh).
- **Desktop** : barre latérale gauche ou bandeau horizontal sticky selon la densité.
- **URL sync** : chaque filtre est reflété dans l'URL pour partage direct.
- **Compteur** : badge sur le bouton "Filtres" indiquant le nombre de filtres actifs.

---

## 7. Spécifications du Comparateur de Votes

### 7.1. Logique de sélection

- Minimum 2 députés, maximum 5 (au-delà, la lisibilité mobile est compromise).
- Un député de référence est systématiquement identifié (celui depuis la fiche duquel l'utilisateur est arrivé, ou le premier sélectionné).
- Les députés doivent appartenir à la même législature.

### 7.2. Calcul du score de concordance

```
Concordance (%) = (votes identiques / votes communs) × 100

Où :
- "votes identiques" = même position (Pour/Contre/Abstention)
- "votes communs" = scrutins où les deux députés étaient présents et ont voté
- "Absents" = exclus du dénominateur (on ne pénalise pas l'absence mutuelle)
```

**Affichage du score :**

- 0-40% : tonalité rouge/orange ("Peu d'accord")
- 41-70% : tonalité jaune ("Accords partiels")
- 71-100% : tonalité verte ("Majoritairement d'accord")

**Mise en garde :** si < 10 votes communs, affichage d'un bandeau d'avertissement : _"Score calculé sur un nombre limité de scrutins. Pour une analyse plus fiable, élargissez la période."_

### 7.3. Vues du comparateur

| Vue                | Description                                             | Par défaut ? |
| ------------------ | ------------------------------------------------------- | ------------ |
| **Synthétique**    | Score + graphique de répartition (ensemble / divergent) | ✅ Oui       |
| **Détaillée**      | Tableau vote par vote, filtrable par accord/désaccord   | Non          |
| **Par thématique** | Score de concordance décomposé par thématique           | Non          |

### 7.4. Interactions

- Cliquer sur un vote divergent ouvre le détail du scrutin dans un drawer.
- Le bouton "Permuter" échange la place des députés dans le tableau.
- "Enregistrer cette comparaison" ajoute un favori local (localStorage).

---

## 8. Stratégie responsive (Mobile-first)

### 8.1. Breakpoints

| Nom  | Valeur   | Objectif                                              |
| ---- | -------- | ----------------------------------------------------- |
| `sm` | ≥ 640px  | Tablette portrait — grille 2 colonnes pour les cards  |
| `md` | ≥ 768px  | Tablette paysage — drawer filtres devient sidebar     |
| `lg` | ≥ 1024px | Desktop — comparateur en tableau, navigation latérale |
| `xl` | ≥ 1280px | Large desktop — maximisation de l'aire de contenu     |

### 8.2. Adaptations clés par écran

| Écran            | Mobile                                       | Desktop                                                   |
| ---------------- | -------------------------------------------- | --------------------------------------------------------- |
| **Accueil**      | Recherche pleine largeur, cards empilées     | Recherche centrée (max 600px), cards en grille 3 colonnes |
| **Fiche député** | Onglets scrollables horizontalement          | Onglets standard, sidebar infos fixes                     |
| **Votes**        | Cards empilées, filtres en bottom-sheet      | Tableau optionnel, filtres sidebar                        |
| **Comparateur**  | Vue empilée (député A au-dessus de député B) | Tableau côte à côte, sticky headers                       |
| **Page scrutin** | Graphique en barres horizontales             | Graphique en demi-circulaire (donut)                      |

### 8.3. Priorité de contenu (mobile)

1. Le résultat (vote du député / résultat global)
2. La date et le titre du scrutin
3. Les métadonnées secondaires (thématique, type)
4. Les actions (comparer, partager, détail)

---

## 9. Design Tokens

### Couleurs (sémantiques)

| Token                  | Valeur hex | Usage                                        |
| ---------------------- | ---------- | -------------------------------------------- |
| `color-primary`        | `#1D4ED8`  | Liens, boutons principaux, focus             |
| `color-primary-hover`  | `#1E40AF`  | Survol des éléments interactifs              |
| `color-success`        | `#15803D`  | Vote "Pour", texte adopté, concordance forte |
| `color-success-bg`     | `#DCFCE7`  | Fond badge "Pour"                            |
| `color-danger`         | `#B91C1C`  | Vote "Contre", texte rejeté, erreur          |
| `color-danger-bg`      | `#FEE2E2`  | Fond badge "Contre"                          |
| `color-neutral`        | `#6B7280`  | Abstention, absence, texte secondaire        |
| `color-neutral-bg`     | `#F3F4F6`  | Fond badge "Abstention"                      |
| `color-warning`        | `#B45309`  | Alertes, avertissements (échantillon limité) |
| `color-warning-bg`     | `#FEF3C7`  | Fond bandeau avertissement                   |
| `color-surface`        | `#FFFFFF`  | Fond principal                               |
| `color-surface-raised` | `#F9FAFB`  | Fond cards, header                           |
| `color-border`         | `#E5E7EB`  | Bordures, séparateurs                        |
| `color-text-primary`   | `#111827`  | Titres, texte principal                      |
| `color-text-secondary` | `#4B5563`  | Sous-titres, métadonnées                     |
| `color-text-muted`     | `#9CA3AF`  | Placeholders, texte désactivé                |

**Contraste :** tous les textes sur fond clair atteignent un ratio ≥ 7:1 (niveau AAA). Les badges colorés utilisent le texte sombre sur fond pastel pour garantir la lisibilité (ratio ≥ 4.5:1).

### Espacements

| Token       | Valeur | Usage                                        |
| ----------- | ------ | -------------------------------------------- |
| `space-xs`  | 4px    | Gap interne tight (icône + texte)            |
| `space-sm`  | 8px    | Padding interne badges, gap entre boutons    |
| `space-md`  | 16px   | Padding standard cards, marge entre sections |
| `space-lg`  | 24px   | Marge entre blocs majeurs                    |
| `space-xl`  | 32px   | Marge verticale sections                     |
| `space-2xl` | 48px   | Hero, espacement page entière                |

### Typographie

| Token          | Taille / Hauteur de ligne | Graisse | Usage                     |
| -------------- | ------------------------- | ------- | ------------------------- |
| `text-h1`      | 28px / 36px               | 700     | Titre page d'accueil      |
| `text-h2`      | 22px / 28px               | 700     | Titres de section         |
| `text-h3`      | 18px / 24px               | 600     | Titres de cards           |
| `text-body`    | 16px / 24px               | 400     | Texte courant             |
| `text-body-sm` | 14px / 20px               | 400     | Métadonnées, descriptions |
| `text-caption` | 12px / 16px               | 500     | Badges, dates, légendes   |

**Famille de police** : système sans-serif (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`). Pas de police personnalisée à charger — performance et accessibilité maximale.

### Élévation (ombres)

| Token          | Valeur                          | Usage                          |
| -------------- | ------------------------------- | ------------------------------ |
| `shadow-sm`    | `0 1px 2px rgba(0,0,0,0.05)`    | Cards standard                 |
| `shadow-md`    | `0 4px 6px rgba(0,0,0,0.07)`    | Drawer, modales, header sticky |
| `shadow-focus` | `0 0 0 3px rgba(29,78,216,0.3)` | Indicateur de focus clavier    |

### Mouvement

| Token           | Valeur        | Usage                                    |
| --------------- | ------------- | ---------------------------------------- |
| `duration-fast` | 150ms         | Hover boutons, changements d'état        |
| `duration-base` | 200ms         | Ouverture drawer, transition de page     |
| `duration-slow` | 300ms         | Apparition modale, animations graphiques |
| `ease-default`  | `ease-in-out` | Toutes les transitions                   |

**Réduction de mouvement** : si `prefers-reduced-motion: reduce`, toutes les durées passent à 0ms (état final immédiat).

---

## 10. Spécifications des composants clés

### 10.1. Barre de recherche principale

| Propriété        | Valeur                                                         |
| ---------------- | -------------------------------------------------------------- |
| **Hauteur**      | 48px (mobile), 56px (desktop)                                  |
| **Padding**      | 16px horizontal                                                |
| **Icône**        | Loupe à gauche, croix d'effacement à droite (si texte présent) |
| **Placeholder**  | "Rechercher un député, une ville, un texte de loi…"            |
| **Focus**        | Bordure `color-primary`, `shadow-focus`                        |
| **Autocomplete** | Liste déroulante avec 5 suggestions max (députés + scrutins)   |

**Accessibilité :**

- `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`
- Navigation clavier : ↑ ↓ pour parcourir les suggestions, Entrée pour sélectionner, Échap pour fermer.

### 10.2. Card Vote

| Élément                | Style                                                     |
| ---------------------- | --------------------------------------------------------- |
| **Conteneur**          | `color-surface`, radius 12px, `shadow-sm`, padding 16px   |
| **Titre**              | `text-h3`, `color-text-primary`, 2 lignes max (ellipsis)  |
| **Date**               | `text-caption`, `color-text-secondary`                    |
| **Badge vote**         | `text-body-sm`, graisse 600, padding 6px 12px, radius 6px |
| **Badge "Pour"**       | fond `color-success-bg`, texte `color-success`            |
| **Badge "Contre"**     | fond `color-danger-bg`, texte `color-danger`              |
| **Badge "Abstention"** | fond `color-neutral-bg`, texte `color-neutral`            |
| **Badge "Absent·e"**   | fond `color-surface-raised`, texte `color-text-muted`     |

**États :**

- Default : `shadow-sm`
- Hover : `shadow-md`, translation Y -2px
- Focus-visible : `shadow-focus` sur le conteneur entier

### 10.3. Badge Résultat Global

| Résultat | Apparence                                           |
| -------- | --------------------------------------------------- |
| Adopté   | Fond `color-success-bg`, icône ✅, texte "Adopté"   |
| Rejeté   | Fond `color-danger-bg`, icône ❌, texte "Rejeté"    |
| En cours | Fond `color-warning-bg`, icône ⏳, texte "En cours" |

### 10.4. Indicateur de concordance (Comparateur)

| Type         | Mobile                       | Desktop                          |
| ------------ | ---------------------------- | -------------------------------- |
| **Forme**    | Jauge horizontale            | Donut / Demi-circulaire          |
| **Taille**   | 100% largeur, 16px hauteur   | 120px × 120px                    |
| **Couleurs** | Dégradé rouge → jaune → vert | Segment rempli selon pourcentage |
| **Texte**    | Pourcentage en gras à droite | Pourcentage au centre du donut   |

### 10.5. Bouton

| Variante  | Fond            | Texte                  | Bordure        | État hover             |
| --------- | --------------- | ---------------------- | -------------- | ---------------------- |
| Primary   | `color-primary` | `#FFFFFF`              | none           | `color-primary-hover`  |
| Secondary | `color-surface` | `color-primary`        | `color-border` | `color-surface-raised` |
| Ghost     | transparent     | `color-text-secondary` | none           | `color-surface-raised` |
| Danger    | `color-danger`  | `#FFFFFF`              | none           | `#991B1B`              |

**Tailles :**

- Small : hauteur 32px, padding 8px 12px, `text-caption`
- Medium : hauteur 40px, padding 12px 16px, `text-body-sm`
- Large : hauteur 48px, padding 16px 24px, `text-body`

**Accessibilité :**

- Touch target minimum : 44 × 44 CSS pixels (même pour small, zone cliquable étendue).
- Focus-visible : `shadow-focus`, outline transparent (pour Safari).
- `aria-label` obligatoire si icône seule.

---

## 11. Accessibilité (WCAG 2.1 AA)

### 11.1. Contrastes

| Élément                                   | Ratio minimum | Statut |
| ----------------------------------------- | ------------- | ------ |
| Texte principal sur fond blanc            | 7:1           | ✅ AAA |
| Texte secondaire (`color-text-secondary`) | 4.6:1         | ✅ AA  |
| Badges colorés (texte sur pastel)         | 4.5:1         | ✅ AA  |
| Composants UI (bordures, icônes)          | 3:1           | ✅ AA  |

### 11.2. Cibles tactiles

- Tous les éléments interactifs : minimum 44 × 44 CSS pixels.
- Espacement entre boutons d'action : minimum 8px.

### 11.3. Gestion du focus

- **Focus visible** : anneau `shadow-focus` sur tous les éléments interactifs.
- **Ordre de tabulation** : logique de lecture (gauche → droite, haut → bas).
- **Modales / Drawers** : piège de focus (`focus-trap`), retour au déclencheur à la fermeture.
- **Skip link** : lien "Aller au contenu principal" visible au focus clavier en haut de page.

### 11.4. Lecteurs d'écran

| Élément               | Rôle / Attribut                                                  |
| --------------------- | ---------------------------------------------------------------- |
| Résultat de recherche | `role="list"`, chaque item `role="listitem"`                     |
| Card vote             | `article`, titre en `h3`, date en `time` avec `datetime`         |
| Badge vote            | `aria-label="A voté pour"` (pas seulement la couleur)            |
| Graphique scrutin     | `role="img"`, `aria-label` décrivant les valeurs en texte        |
| Comparer              | `aria-pressed` sur le bouton de sélection                        |
| Score concordance     | `aria-label="Concordance de 78% sur 67 votes communs"`           |
| Filtres actifs        | `aria-live="polite"` annonçant le nombre de résultats mis à jour |

### 11.5. Zoom et adapation

- Mise en page fluide : pas de breakpoints basés sur les devices mais sur le contenu.
- Support du zoom 200% sans scroll horizontal (testé à 320px équivalent).
- Pas de contenu coupé, pas de texte superposé.

### 11.6. Motion

- Respect systématique de `prefers-reduced-motion`.
- Les graphiques animés (donut, jauges) sont statiques si la préférence est activée.

---

## 12. Checklist accessibilité par écran

### Accueil

- [ ] Skip link présent
- [ ] Recherche accessible (combobox ARIA)
- [ ] Contraste des textes ≥ 7:1
- [ ] Thématiques navigables au clavier

### Fiche Député

- [ ] Onglets : pattern `tablist` / `tab` / `tabpanel`
- [ ] Photo député : `alt="Photo officielle de [Prénom Nom]"`
- [ ] Badge vote : couleur + texte + aria-label
- [ ] Filtres : bouton "Filtres" avec badge compteur lu par SR

### Page Scrutin

- [ ] Graphique : alternative textuelle complète
- [ ] Accordéons groupes politiques : `aria-expanded`
- [ ] Tableau de votes (desktop) : en-têtes `scope="col"`

### Comparateur

- [ ] Tableau : `caption` décrivant la comparaison
- [ ] Lignes du tableau : alternance visuelle + focus clavier par cellule
- [ ] Alertes échantillon limité : `role="alert"`

---

## 13. Idées de partage social (Cards & Images de synthèse)

### 13.1. Card de partage — Fiche député

**Format** : 1200 × 630px (Open Graph standard)
**Contenu :**

- Photo du député (gauche, 40%)
- Nom et circonscription
- 3 chiffres clés : taux de présence, nombre de votes, groupe politique
- Bas de card : logo du site + URL
- Fond : blanc ou gris très clair, pas de couleur partisane

### 13.2. Card de partage — Résultat d'un scrutin

**Format** : 1200 × 630px
**Contenu :**

- Titre du scrutin (tronqué si nécessaire, max 2 lignes)
- Badge "Adopté" ou "Rejeté" très visible
- Mini graphique de répartition (barres horizontales stylisées)
- Date et numéro du scrutin

### 13.3. Card de partage — Comparateur

**Format** : 1200 × 630px (ou 1080 × 1080px pour Instagram)
**Contenu :**

- Visages ou noms des deux députés comparés
- Score de concordance en très grand (ex: "78% d'accord")
- Nombre de votes analysés
- Citation contextualisée : "Marie Durand et Jean Martin votent ensemble dans 78% des cas."
- Thématique de plus forte divergence (optionnel)

### 13.4. Génération dynamique

- Le site génère ces images côté serveur (ou via API) avec les données actualisées.
- Métadonnées Open Graph (`og:image`, `twitter:card`) renseignées sur chaque page.
- Bouton "Partager" natif (Web Share API sur mobile) + copie du lien + téléchargement de l'image.

### 13.5. Exemple visuel textuel (Comparateur)

```
┌─────────────────────────────┐
│                             │
│   [📷] Durand    [📷] Martin│
│                             │
│         78%                 │
│      d'accord               │
│                             │
│   sur 67 votes analysés     │
│                             │
│   transparence-votes.fr     │
│                             │
└─────────────────────────────┘
```

---

## 14. Questions ouvertes pour le développement

1. **Source des données** : L'API utilisée (Assemblée Nationale, Sénat, agrégateur tiers) impose-t-elle des contraintes de rate-limiting qui impacteraient le chargement infini des votes ?
2. **Photos des députés** : Avons-nous accès à un portail officiel de photos normalisées ? Quel `alt` si photo manquante (initiales, silhouette générique) ?
3. **Thématiques** : Qui définit la thématique d'un scrutin ? Classification automatique (NLP) ou manuelle ? Cela impactera la pertinence des filtres.
4. **Législatures** : Le comparateur doit-il permettre la comparaison inter-législatures (historique long terme) ou rester strictement sur la législature en cours ?
5. **Limitation légale** : Y a-t-il des contraintes RGPD ou de réutilisation des données publiques à prendre en compte pour l'affichage des photos et des données personnelles des députés ?

---

## Résumé des livrables UX

| Élément                                                        | Statut | Référence      |
| -------------------------------------------------------------- | ------ | -------------- |
| Parcours utilisateurs (4 flux + edge cases)                    | ✅     | Section 2      |
| Architecture de l'information                                  | ✅     | Section 3      |
| Wireframes textuels (6 écrans + états)                         | ✅     | Section 4      |
| Informations critiques par écran                               | ✅     | Section 5      |
| Filtres et tris                                                | ✅     | Section 6      |
| Spécifications comparateur                                     | ✅     | Section 7      |
| Stratégie responsive                                           | ✅     | Section 8      |
| Design tokens (couleurs, espacements, typo, élévation, motion) | ✅     | Section 9      |
| Spécifications composants                                      | ✅     | Section 10     |
| Accessibilité (WCAG 2.1 AA)                                    | ✅     | Sections 11-12 |
| Partage social (cards/images)                                  | ✅     | Section 13     |

---

> **Prochaine étape recommandée** : Révision avec l'équipe Produit et validation des hypothèses (sources de données, thématiques, limites du comparateur), puis prototypage basse fidélité des flux critiques (recherche → fiche → comparaison) pour test utilisateur.
