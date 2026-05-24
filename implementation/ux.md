# UX/UI Design Specification — Texte des amendements

**Date** : 2026-05-24  
**Auteur** : UX Designer  
**Feature** : Affichage du texte des amendements sur la page scrutin  
**Statut** : Design handoff → `frontend-developer`

---

## 1. Contexte & Objectif utilisateur

L'utilisateur arrive sur une page scrutin depuis une recherche ou un lien. Il a besoin de **comprendre immédiatement le sujet du vote** — ce que dit l'amendement, pas seulement son intitulé. Aujourd'hui, seul le titre du scrutin est affiché ; le corps du texte législatif est invisible, obligeant l'utilisateur à quitter Veritas pour le site de l'Assemblée nationale.

**Objectif utilisateur** : Lire le texte de l'amendement directement sur la page scrutin, sans navigation externe.

---

## 2. User Flow

```
┌─────────────────────────────┐
│  L'utilisateur arrive sur   │
│  la page scrutin            │
└─────────────┬───────────────┘
              │
              ▼
       ┌─────────────┐    NON     ┌──────────────────────┐
       │ Amendement  ├──────────►│ Ne rien afficher      │
       │ lié ?       │           │ (pas de section vide) │
       └──────┬──────┘           └──────────────────────┘
              │ OUI
              ▼
   ┌─────────────────────┐
   │ Afficher l'accordéon │
   │ "Lire le texte de    │
   │ l'amendement" (fermé)│
   └──────────┬──────────┘
              │
     ┌────────┴────────┐
     │                 │
  L'utilisateur    L'utilisateur
  clique/déplie    ignore →
     │             pas d'action
     ▼
┌────────────────────────┐
│ Afficher le dispositif │
│ (corps de l'amend.)    │
│                        │
│ + Si > 800 car. :      │
│   500 premiers +       │
│   "Lire la suite"      │
│                        │
│ + Sous-accordéon       │
│   "Voir l'exposé des   │
│   motifs" (si présent) │
│                        │
│ + Lien vers le site    │
│   de l'AN              │
└───────────┬────────────┘
            │
   ┌────────┴────────┐
   │                 │
L'utilisateur    L'utilisateur
déplie l'exposé  ne déplie pas
des motifs       → fin du flow
   │
   ▼
┌────────────────────────┐
│ Afficher l'exposé des  │
│ motifs                 │
│                        │
│ Toujours en intégralité│
│ (pas de troncature     │
│  pour l'exposé)        │
└────────────────────────┘
```

### États et cas particuliers

| État                                  | Comportement                                                    |
| ------------------------------------- | --------------------------------------------------------------- |
| `amendment: null`                     | **Ne rien afficher.** Pas de placeholder, pas d'accordéon vide. |
| `dispositif` absent ou vide           | Accordéon présent mais contenu "Texte non disponible".          |
| `exposeSommaire` absent               | Pas de sous-accordéon.                                          |
| `dispositif > 800 car.`               | 500 premiers + bouton "Lire la suite" → affiche le reste.       |
| `dispositif ≤ 800 car.`               | Texte intégral directement.                                     |
| Lien AN absent (`id` non convertible) | Pas de lien externe.                                            |
| Chargement                            | Squelette 1 ligne dans l'emplacement.                           |
| Erreur                                | Message discret "Texte indisponible", ne bloque PAS la page.    |

### Exit points

| Abandon                         | Comportement                                        |
| ------------------------------- | --------------------------------------------------- |
| Utilisateur quitte la page      | Aucune sauvegarde nécessaire (pas de saisie)        |
| Utilisateur referme l'accordéon | Retour à l'état fermé standard                      |
| Utilisateur clique le lien AN   | Ouverture dans un nouvel onglet (`target="_blank"`) |

---

## 3. Wireframes

### 3.1 Mobile — Accordéon fermé (état par défaut)

```
┌─────────────────────────────────────────┐
│  🏛️ Veritas                    [☰]     │
├─────────────────────────────────────────┤
│                                         │
│  [Environnement]  [Rejeté]              │
│                                         │
│  Scrutin n°2568 — l'amendement n° 338   │
│  de Mme Trouvé à l'article 5 de la      │
│  proposition de loi portant             │
│  programmation nationale énergie...     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ▸ Lire le texte de   [FileText] │    │ ← Accordéon fermé
│  │   l'amendement                  │    │   (bordure, fond surface)
│  └─────────────────────────────────┘    │
│                                         │
│  19 juin 2025 · Scrutin public ordinaire│
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Résultat du vote     99 vot.   │    │
│  │  ████████████████░░░░░░         │    │
│  │  Pour · 23 (23.2%)              │    │
│  │  ...                            │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 3.2 Mobile — Accordéon ouvert (dispositif visible)

```
│  ┌─────────────────────────────────┐    │
│  │ ▾ Lire le texte de   [FileText] │    │ ← Ouvert, chevron tourné
│  │   l'amendement                  │    │
│  │ ┌─────────────────────────────┐ │    │
│  │ │ Amendement n°338            │ │    │ ← Étiquette info
│  │ │ Article 5 · par Mme Trouvé  │ │    │
│  │ │                             │ │    │
│  │ │ À l'alinéa 3 de l'article 5,│ │    │ ← Corps du texte
│  │ │ après le mot :              │ │    │   max-width: 72ch
│  │ │ « transition », insérer     │ │    │   font-size: 16px
│  │ │ les mots : « , en           │ │    │
│  │ │ garantissant une            │ │    │
│  │ │ trajectoire de réduction    │ │    │
│  │ │ des émissions compatible    │ │    │
│  │ │ avec l'accord de Paris, »   │ │    │
│  │ │                             │ │    │
│  │ │ ▸ Voir l'exposé des motifs │ │    │ ← Sous-accordéon
│  │ │                             │ │    │   (fermé par défaut)
│  │ │ 📎 Voir sur le site de      │ │    │ ← Lien externe AN
│  │ │    l'Assemblée Nationale    │ │    │
│  │ └─────────────────────────────┘ │    │
│  └─────────────────────────────────┘    │
```

### 3.3 Mobile — Exposé des motifs ouvert

```
│  │ ▾ Lire le texte de l'amendement │    │
│  │ ┌─────────────────────────────┐ │    │
│  │ │ ... (dispositif ci-dessus)  │ │    │
│  │ │                             │ │    │
│  │ │ ▾ Voir l'exposé des motifs │ │    │ ← Sous-accordéon ouvert
│  │ │ ┌─────────────────────────┐ │ │    │
│  │ │ │ Exposé des motifs       │ │ │    │
│  │ │ │                         │ │ │    │
│  │ │ │ Cet amendement vise à   │ │ │    │
│  │ │ │ inscrire dans la loi la │ │ │    │
│  │ │ │ trajectoire de réduction│ │ │    │
│  │ │ │ des émissions de gaz à  │ │ │    │
│  │ │ │ effet de serre conforme │ │ │    │
│  │ │ │ aux engagements          │ │ │    │
│  │ │ │ internationaux...        │ │ │    │
│  │ │ └─────────────────────────┘ │ │    │
│  │ │                             │ │    │
│  │ │ 📎 Voir sur le site de      │ │    │
│  │ │    l'Assemblée Nationale    │ │    │
│  │ └─────────────────────────────┘ │    │
```

### 3.4 Mobile — Texte long (> 800 car.) avec "Lire la suite"

```
│  │ ▾ Lire le texte de l'amendement │    │
│  │ ┌─────────────────────────────┐ │    │
│  │ │ Amendement n°338            │ │    │
│  │ │ Article 5 · par Mme Trouvé  │ │    │
│  │ │                             │ │    │
│  │ │ [500 premiers caractères]…  │ │    │ ← Tronqué avec ellipsis
│  │ │                             │ │    │
│  │ │ [+ Lire la suite ▾]        │ │    │ ← Bouton expand
│  │ │                             │ │    │
│  │ │ ▸ Voir l'exposé des motifs │ │    │
│  │ │ 📎 Voir sur le site de l'AN │ │    │
│  │ └─────────────────────────────┘ │    │
```

### 3.5 Desktop — Accordéon ouvert

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [Environnement]  [Rejeté]                                   │
│                                                              │
│  Scrutin n°2568 — l'amendement n° 338 de Mme Trouvé          │
│  à l'article 5 de la proposition de loi portant               │
│  programmation nationale énergie et climat...                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ ▾ Lire le texte de l'amendement           [FileText] │    │
│  │                                                      │    │
│  │  Amendement n°338 · Article 5 · par Mme Trouvé        │    │
│  │                                                      │    │
│  │  À l'alinéa 3 de l'article 5, après le mot :         │    │
│  │  « transition », insérer les mots : « , en           │    │
│  │  garantissant une trajectoire de réduction des       │    │
│  │  émissions compatible avec l'accord de Paris, »      │    │
│  │                                                      │    │
│  │  ▸ Voir l'exposé des motifs                          │    │
│  │  📎 Voir sur le site de l'Assemblée Nationale        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  19 juin 2025 · Scrutin public ordinaire                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Design Tokens

### Tokens du design system existant (DSFR)

Aucun nouveau token n'est nécessaire. Tous les tokens ci-dessous existent déjà dans `app.css`.

#### Couleurs

| Token                       | Valeur    | Usage                               |
| --------------------------- | --------- | ----------------------------------- |
| `--color-surface`           | `#FFFFFF` | Fond de l'accordéon                 |
| `--color-primary-bg-subtle` | `#F5F5FE` | Hover du trigger d'accordéon        |
| `--color-primary-bg`        | `#E3E3FD` | Fond de l'étiquette info amendement |
| `--color-primary`           | `#000091` | Icône FileText, liens, focus ring   |
| `--color-text-primary`      | `#161616` | Texte du dispositif, titres         |
| `--color-text-secondary`    | `#555555` | Métadonnées, labels                 |
| `--color-text-muted`        | `#929292` | Chevrons, texte secondaire          |
| `--color-border`            | `#DDDDDD` | Bordure de l'accordéon              |
| `--color-border-light`      | `#E8E8E8` | Séparateurs internes                |

#### Typographie

| Token             | Propriétés                    | Usage                            |
| ----------------- | ----------------------------- | -------------------------------- |
| `text-base`       | 16px / 24px / font-weight-400 | Corps du dispositif (législatif) |
| `text-sm`         | 14px / 20px / font-weight-400 | Métadonnées, auteurs, article    |
| `text-xs`         | 12px / 16px / font-weight-400 | Étiquettes, lien AN              |
| `font-medium`     | weight: 500                   | Trigger d'accordéon, labels      |
| `font-semibold`   | weight: 600                   | Titre de l'amendement            |
| `leading-relaxed` | line-height: 1.625            | Corps long pour lisibilité       |

#### Espacement

| Token       | Valeur CSS  | Usage                               |
| ----------- | ----------- | ----------------------------------- |
| `p-2`       | 8px         | Padding étiquette info              |
| `px-4 py-3` | 16px / 12px | Padding trigger d'accordéon         |
| `p-4`       | 16px        | Padding contenu ouvert              |
| `gap-2`     | 8px         | Espacement entre éléments inline    |
| `gap-3`     | 12px        | Espacement vertical dans le contenu |
| `space-y-3` | 12px        | Écart entre blocs                   |
| `space-y-6` | 24px        | Écart entre sections (existant)     |

#### Bordures & Ombres

| Token                        | Valeur                    | Usage                       |
| ---------------------------- | ------------------------- | --------------------------- |
| `rounded-xl`                 | `var(--radius-xl)` = 12px | Bordure externe accordéon   |
| `rounded-lg`                 | `var(--radius-lg)` = 12px | Bordure sous-accordéon      |
| `rounded-md`                 | `var(--radius-md)` = 8px  | Étiquettes, boutons         |
| `border border-border-light` | 1px #E8E8E8               | Bordure accordéon           |
| `shadow-sm`                  | `var(--shadow-sm)`        | Ombre légère de l'accordéon |

#### Animation & Motion

| Token                    | Valeur                         | Usage                           |
| ------------------------ | ------------------------------ | ------------------------------- |
| `duration-200`           | `var(--duration-base)` = 200ms | Rotation chevron                |
| `animate-accordion-down` | Keyframe déjà défini           | Ouverture accordéon             |
| `animate-accordion-up`   | Keyframe déjà défini           | Fermeture accordéon             |
| `transition-colors`      | —                              | Changements de couleur au hover |
| `transition-transform`   | —                              | Rotation du chevron             |

#### Focus & Accessibilité

| Token                           | Valeur               | Usage                     |
| ------------------------------- | -------------------- | ------------------------- |
| `focus-visible:ring-[3px]`      | 3px solid            | Anneau de focus cohérent  |
| `focus-visible:ring-primary/25` | `rgba(0,0,145,0.25)` | Couleur de l'anneau       |
| `focus-visible:outline-none`    | —                    | Supprime l'outline native |

---

## 5. Component Specification

### 5.1 `AmendmentCard`

**Chemin** : `apps/frontend/src/components/scrutin/AmendmentCard.tsx`

**Rôle** : Affiche le texte de l'amendement dans un accordéon sous le titre du scrutin.

#### Props

```typescript
interface AmendmentCardProps {
  amendment: Amendment | null;
  className?: string;
}
```

#### Structure anatomique

```
AmendmentCard
├── [si amendment !== null]
│   └── AccordionPrimitive.Root (type="single", collapsible)
│       └── AccordionPrimitive.Item (value="amendment")
│           ├── AccordionPrimitive.Header
│           │   └── AccordionPrimitive.Trigger
│           │       ├── FileText (icône Lucide, 18px)
│           │       ├── "Lire le texte de l'amendement" (label)
│           │       └── ChevronDown (icône, 16px, rotation 180° ouvert)
│           └── AccordionPrimitive.Content
│               ├── [si dispositif]
│               │   ├── Étiquette info : "Amendement n°{numero}"
│               │   │   + articleRef + auteurs (si présents)
│               │   ├── Corps du texte (dispositif)
│               │   │   ├── max-width: 72ch
│               │   │   └── [si > 800 car.] troncature + bouton
│               ├── [si exposeSommaire]
│               │   └── Sous-accordéon "Voir l'exposé des motifs"
│               │       └── Contenu : exposeSommaire intégral
│               └── [si id AN convertible]
│                   └── Lien externe "📎 Voir sur le site de l'AN"
└── [si amendment === null]
    └── Rendu vide (null)
```

#### Variants

| Variant          | Condition                | Rendu                      |
| ---------------- | ------------------------ | -------------------------- |
| **Null**         | `amendment === null`     | `null` (rien)              |
| **Standard**     | `dispositif` ≤ 800 car.  | Texte intégral             |
| **Long**         | `dispositif` > 800 car.  | 500 car. + "Lire la suite" |
| **Avec exposé**  | `exposeSommaire` présent | Sous-accordéon visible     |
| **Sans exposé**  | `exposeSommaire` absent  | Pas de sous-accordéon      |
| **Avec lien AN** | `id` présent             | Lien externe visible       |
| **Sans lien AN** | `id` absent/null         | Pas de lien                |

#### States du trigger principal

| State               | Styles                                                        |
| ------------------- | ------------------------------------------------------------- |
| **Default (fermé)** | Chevron → 0°, fond transparent, bordure `border-border-light` |
| **Hover**           | Fond → `bg-primary-bg-subtle`                                 |
| **Open**            | Chevron → 180°, fond → `bg-primary-bg-subtle` (léger)         |
| **Focus-visible**   | `ring-[3px] ring-primary/25`                                  |
| **Active**          | Pas de style supplémentaire                                   |

#### States du sous-accordéon (exposé des motifs)

| State               | Styles                                                  |
| ------------------- | ------------------------------------------------------- |
| **Default (fermé)** | Petit chevron → 0°, texte `text-sm text-text-secondary` |
| **Hover**           | Texte → `text-primary`, fond subtil                     |
| **Open**            | Chevron → 180°, fond légèrement teinté                  |
| **Focus-visible**   | `ring-[3px] ring-primary/25`                            |

#### States du bouton "Lire la suite"

| State             | Styles                                    |
| ----------------- | ----------------------------------------- |
| **Default**       | Texte `text-sm text-primary`, pas de fond |
| **Hover**         | Souligné, curseur pointer                 |
| **Focus-visible** | `ring-[3px] ring-primary/25 rounded`      |

---

### 5.2 `Amendment` (Type)

**Chemin** : `apps/frontend/src/lib/api-types.ts`

```typescript
export interface Amendment {
  /** Identifiant unique de l'amendement (ex: "AMANR5L17SE1234") */
  id: string | null;
  /** Numéro de l'amendement */
  numero: number | null;
  /** Corps du texte de l'amendement (dispositif) */
  dispositif: string | null;
  /** Exposé des motifs (justification politique) */
  exposeSommaire: string | null;
  /** Liste des auteurs (ex: "Mme Trouvé, M. Dupont") */
  auteurs: string | null;
  /** Référence de l'article cible (ex: "Art. 5") */
  articleRef: string | null;
  /** Titre de l'article cible */
  articleTitre: string | null;
  /** Code de sort : "adopté" | "rejeté" | null */
  sortCode: "adopté" | "rejeté" | null;
}
```

---

## 6. Accessibility Specifications

### 6.1 Accordéon principal

| Règle                   | Application                                         | Conformité    |
| ----------------------- | --------------------------------------------------- | ------------- |
| **Rôle sémantique**     | `<AccordionPrimitive.Root>` gère les rôles WAI-ARIA | WCAG 4.1.2    |
| **aria-expanded**       | Automatique via Radix `data-state`                  | WCAG 4.1.2 ✅ |
| **aria-controls**       | Automatique via Radix (relie trigger ↔ content)     | WCAG 4.1.2 ✅ |
| **Navigation clavier**  | `Enter` / `Space` pour toggle ; `Tab` pour naviguer | WCAG 2.1.1 ✅ |
| **Focus visible**       | `focus-visible:ring-[3px] ring-primary/25`          | WCAG 2.4.7 ✅ |
| **Ordre de tabulation** | Trigger → Sous-accordéon → Lien AN (logique)        | WCAG 2.4.3 ✅ |

### 6.2 Sous-accordéon (exposé des motifs)

| Règle               | Application                                      |
| ------------------- | ------------------------------------------------ |
| **Niveau de titre** | `<h3>` ou `<h4>` via `AccordionPrimitive.Header` |
| **Indépendance**    | `aria-expanded` propre, ne dépend pas du parent  |
| **Focus**           | Même anneau `ring-[3px] ring-primary/25`         |

### 6.3 Contraste des couleurs

| Élément           | Premier plan         | Arrière-plan        | Ratio      | Minimum     |
| ----------------- | -------------------- | ------------------- | ---------- | ----------- |
| Texte dispositif  | `#161616`            | `#FFFFFF` (surface) | 17.1:1     | 4.5:1 ✅    |
| Texte métadonnées | `#555555`            | `#FFFFFF`           | 7.1:1      | 4.5:1 ✅    |
| Texte muted       | `#929292`            | `#FFFFFF`           | 3.4:1      | 3:1 (UI) ✅ |
| Icône FileText    | `#000091`            | `#F5F5FE`           | 9.4:1      | 3:1 ✅      |
| Lien primary      | `#000091`            | `#FFFFFF`           | 15.0:1     | 4.5:1 ✅    |
| Focus ring        | `rgba(0,0,145,0.25)` | `#FFFFFF`           | N/A (ring) | N/A ✅      |
| Badge étiquette   | `#000091`            | `#E3E3FD`           | 9.4:1      | 4.5:1 ✅    |

### 6.4 Touch targets

| Élément                | Taille                         | Minimum    |
| ---------------------- | ------------------------------ | ---------- |
| Trigger accordéon      | Pleine largeur, hauteur ≥ 44px | 44×44px ✅ |
| Sous-accordéon trigger | Pleine largeur, hauteur ≥ 44px | 44×44px ✅ |
| Bouton "Lire la suite" | ≥ 44×44px                      | 44×44px ✅ |
| Lien AN                | ≥ 44px de hauteur              | 44×44px ✅ |

### 6.5 Screen reader

| Élément               | Annonce                                                       |
| --------------------- | ------------------------------------------------------------- |
| Accordéon fermé       | "Lire le texte de l'amendement, bouton réduit"                |
| Accordéon ouvert      | "Lire le texte de l'amendement, bouton déplié"                |
| Sous-accordéon fermé  | "Voir l'exposé des motifs, bouton réduit"                     |
| Sous-accordéon ouvert | "Voir l'exposé des motifs, bouton déplié"                     |
| Lien AN               | "Voir sur le site de l'Assemblée Nationale, nouvelle fenêtre" |

### 6.6 Motion & réduction

| Règle                    | Application                                    |
| ------------------------ | ---------------------------------------------- |
| `prefers-reduced-motion` | Durées d'animation → 0ms (déjà dans `app.css`) |
| Animation chevron        | `duration-200` → 0ms avec la règle globale     |
| Animation accordéon      | `animate-accordion-down/up` → instantané       |

### 6.7 Zoom & responsive

| Règle              | Application                                  |
| ------------------ | -------------------------------------------- |
| Zoom 200%          | Layout fluide, pas de scroll horizontal      |
| Largeur de lecture | `max-w-[72ch]` pour le corps du texte        |
| Police minimum     | 16px pour le texte législatif (`text-base`)  |
| Mobile-first       | Accordéon pleine largeur, padding responsive |

---

## 7. Responsive Strategy

### Breakpoints (Tailwind defaults)

| Breakpoint        | Largeur  | Adaptation                               |
| ----------------- | -------- | ---------------------------------------- |
| **Base** (mobile) | < 640px  | Accordéon pleine largeur, padding `px-4` |
| **sm**            | ≥ 640px  | Même comportement, texte plus aéré       |
| **md**            | ≥ 768px  | Conteneur `max-w-3xl` pour le texte      |
| **lg**            | ≥ 1024px | Largeur max 72ch pour le corps du texte  |
| **xl**            | ≥ 1280px | Pas de changement                        |

### Content priority (mobile-first)

1. **Titre du scrutin** — toujours visible
2. **Trigger accordéon** — toujours visible, attractif
3. **Dispositif** — première chose vue à l'ouverture
4. **Sous-accordéon exposé** — secondaire, en dessous
5. **Lien AN** — tertiaire, tout en bas

---

## 8. Intégration dans la page scrutin

### Emplacement

L'`AmendmentCard` s'insère dans la page scrutin (`routes/scrutin/$id.tsx`), **directement sous le `ScrutinHeader`** et au-dessus du `VoteChart`, dans le flux vertical existant.

```
┌─────────────────────────────┐
│  <ScrutinHeader />          │  ← Titre, badges, date
├─────────────────────────────┤
│  <AmendmentCard />          │  ← NOUVEAU : accordéon amendement
├─────────────────────────────┤
│  <VoteChart />              │  ← Résultat du vote
├─────────────────────────────┤
│  <Tabs />                   │  ← Votes par groupe / député
└─────────────────────────────┘
```

### Données

La prop `amendment` est passée depuis le `ScrutinDetail` (à enrichir côté backend). En attendant, le composant gère `amendment: null` en ne rendant rien.

```typescript
// Dans ScrutinPage :
<ScrutinHeader scrutin={scrutin} className="flex-1" />
<AmendmentCard amendment={scrutin.amendment ?? null} />
<VoteChart ... />
```

---

## 9. Assets Nécessaires

| Asset                | Source                       | Format     | Taille  |
| -------------------- | ---------------------------- | ---------- | ------- |
| Icône `FileText`     | Lucide React (déjà installé) | SVG inline | 18×18px |
| Icône `ChevronDown`  | Lucide React (déjà installé) | SVG inline | 16×16px |
| Icône `ExternalLink` | Lucide React (déjà installé) | SVG inline | 12×12px |

**Aucun nouvel asset graphique** n'est requis.

---

## 10. Questions ouvertes pour le `frontend-developer`

1. **Type `Amendment`** : Ajouter dans `api-types.ts` ou dans `@veritas/shared` ? (Recommandé : `api-types.ts` d'abord, migration vers shared plus tard)
2. **Données backend** : Le `ScrutinDetail` actuel n'inclut pas de champ `amendment`. Coordonner avec le backend pour :
   - Ajouter `amendment?: Amendment \| null` au `ScrutinDetailSchema`
   - Créer une table `amendments` ou enrichir la table `scrutins`
3. **Lien AN** : Construction de l'URL à partir de l'`id` (format `AMANR5L17SE...`) → `https://www.assemblee-nationale.fr/dyn/16/amendements/{...}`. Confirmer le format d'URL exact.
4. **Squelette de chargement** : Si l'amendement est chargé séparément (fetch additionnel), prévoir un `SkeletonCard` léger. Sinon, le chargement du scrutin parent couvre tout.

---

## 11. Checklist d'implémentation

- [ ] Créer `AmendmentCard.tsx` dans `components/scrutin/`
- [ ] Ajouter le type `Amendment` dans `api-types.ts`
- [ ] Importer et utiliser `@radix-ui/react-accordion` (déjà installé)
- [ ] Icônes : `FileText`, `ChevronDown` depuis `lucide-react`
- [ ] Composant gère `amendment: null` → rend `null`
- [ ] Troncature à 800 car. avec bouton "Lire la suite"
- [ ] Sous-accordéon pour l'exposé des motifs
- [ ] Lien externe vers l'AN avec `target="_blank"` et `rel="noopener noreferrer"`
- [ ] `aria-expanded`, `aria-controls` (natifs via Radix)
- [ ] `focus-visible:ring-[3px]` cohérent
- [ ] `prefers-reduced-motion` (déjà global dans `app.css`)
- [ ] Intégration dans `routes/scrutin/$id.tsx`
- [ ] Test : amendement null → rien affiché
- [ ] Test : dispositif > 800 car. → troncature + bouton
- [ ] Test : pas d'exposé → pas de sous-accordéon
- [ ] Test : navigation clavier complète
- [ ] Test : screen reader (VoiceOver / NVDA)
- [ ] Test : mobile (iPhone SE, 375px)

---

_Fin de la spécification design. Prêt pour implémentation._
