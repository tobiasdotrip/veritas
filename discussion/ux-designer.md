# Reco UX — Texte de l'amendement/article sur la page scrutin

**Date** : 2026-05-24
**Auteur** : UX Designer (subagent)
**Contexte** : Ajouter le corps du texte de l'amendement/article sur la page scrutin pour que l'utilisateur comprenne immédiatement le sujet du vote sans recherche externe.

---

## 1. Où et comment afficher le texte ?

### Recommandation : **Accordéon juste sous le titre** (dans le header)

Deux options défendables selon le contexte du scrutin :

| Option                                                    | Description                                                                                                            | Quand l'utiliser                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **A. Accordéon natif sous le titre**                      | Le texte se déplie directement sous le titre dans le `ScrutinHeader`. Icône chevron + "Lire le texte de l'amendement". | **Recommandé** — simple, naturel, mobile-friendly          |
| **B. Section "Contexte" entre le Header et le VoteChart** | Une carte dédiée avec le texte toujours visible + exposé des motifs en accordéon.                                      | Quand le texte est court (1-2 phrases), toujours pertinent |

**Option A retenue** comme défaut, avec fallback vers **Option B** si le texte est court (< 200 caractères).

### Pourquoi pas :

- **Modal** : Trop intrusif, casse le flux de lecture. L'utilisateur veut _lire_ pas _naviguer_.
- **Sidebar** : Inexistant dans le design actuel (pas de layout 2 colonnes), compliqué en mobile.
- **Tooltip au survol** : Impossible d'afficher plusieurs paragraphes, inaccessible.

---

## 2. Taille du texte

Un amendement type se compose de :

- **Corps** : 50 à 2000 caractères (moyenne ~400-600)
- **Exposé des motifs** : 200 à 5000 caractères (moyenne ~800-1200)

**Règle d'affichage proposée** :

- Afficher le **corps** intégralement dans l'accordéon (pas de troncature abusive)
- Si le corps > 800 caractères : afficher les 500 premiers + bouton "Lire la suite"
- L'**exposé des motifs** est toujours dans un second accordéon, fermé par défaut

---

## 3. Faut-il afficher l'exposé des motifs ?

**Oui**, dans un **deuxième accordéon séparé**, fermé par défaut.

Raison : l'exposé des motifs est la justification politique de l'amendement. Pour un utilisateur de Veritas, comprendre _pourquoi_ un amendement est proposé est aussi important que de savoir _ce qu'il_ dit. Mais c'est un contenu secondaire — l'utilisateur lit le corps d'abord, puis décide s'il veut la justification.

**Hiérarchie** :

1. Titre du scrutin (déjà présent)
2. → **Corps de l'amendement** (accordéon, fermé par défaut si texte court absent)
3. → → Exposé des motifs (sous-accordéon, fermé par défaut)

---

## 4. Impact design mobile

**Aucun impact négatif**. L'accordéon est le pattern le plus adapté au mobile :

- Pas de scroll horizontal
- Pas de layout complexe
- L'utilisateur contrôle ce qu'il voit
- Fonctionne avec les lecteurs d'écran natifs

**Contraintes** :

- Police lisible (16px minimum pour le corps de texte)
- Largeur max 72ch pour la lisibilité
- Marge gauche/droite cohérente avec le reste de la page

---

## 5. Accessibilité

| Règle                  | Application                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| **Contraste**          | Texte noir sur fond clair → ratio > 7:1 ✅                                                     |
| **Focus**              | Accordéon focusable, `focus-visible:ring-[3px]` cohérent avec le design system                 |
| **Screen reader**      | `aria-expanded`, `aria-controls`, région `<section>` avec `aria-label="Texte de l'amendement"` |
| **Navigation clavier** | `Enter`/`Space` pour déplier, `Tab` pour naviguer entre accordéons                             |
| **Taille police**      | 16px minimum, support zoom 200%                                                                |
| **Motion**             | Animation `duration-200` déjà dans le design system, respecte `prefers-reduced-motion`         |

Le texte législatif est technique mais c'est du **contenu textuel standard**. Aucune difficulté d'accessibilité particulière au-delà des bonnes pratiques habituelles.

---

## 6. Mockup textuel

### Version mobile (accordéon fermé)

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
│  programmation nationale énergie et     │
│  climat...                              │
│                                         │
│  ▸ Lire le texte de l'amendement        │  ← Accordéon fermé
│                                         │
│  19 juin 2025 · Scrutin public ordinaire│
│                                         │
├─────────────────────────────────────────┤
│  ████████████████░░░░  Résultat du vote │
│  Pour          23  (23.2%)              │
│  Contre        72  (72.7%)              │
│  Abstentions    4  (4.0%)              │
│                                         │
│  [ Votes par groupe | Votes par député ]│
│                                         │
│  ▼ Renaissance                ████░░░░  │
│  ▼ Rassemblement National     ████████  │
│  ▼ La France insoumise        ░░░░░░░░  │
│  ...                                    │
└─────────────────────────────────────────┘
```

### Version mobile (accordéon ouvert)

```
┌─────────────────────────────────────────┐
│  [Environnement]  [Rejeté]              │
│                                         │
│  Scrutin n°2568 — l'amendement n° 338   │
│  de Mme Trouvé à l'article 5...         │
│                                         │
│  ▾ Lire le texte de l'amendement        │  ← Accordéon ouvert
│  ┌─────────────────────────────────┐    │
│  │ 📜 Texte de l'amendement n°338  │    │
│  │                                 │    │
│  │ À l'alinéa 3 de l'article 5,    │    │
│  │ après le mot : « transition »,  │    │
│  │ insérer les mots :              │    │
│  │                                 │    │
│  │ « , en garantissant une         │    │
│  │  trajectoire de réduction des   │    │
│  │  émissions compatible avec      │    │
│  │  l'accord de Paris, »           │    │
│  │                                 │    │
│  │ ▸ Voir l'exposé des motifs     │    │  ← Sous-accordéon fermé
│  └─────────────────────────────────┘    │
│                                         │
│  19 juin 2025 · Scrutin public ordinaire│
│  ...                                    │
└─────────────────────────────────────────┘
```

### Version mobile (exposé des motifs ouvert)

```
│  ▾ Lire le texte de l'amendement        │
│  ┌─────────────────────────────────┐    │
│  │ 📜 Texte de l'amendement n°338  │    │
│  │ ... (contenu ci-dessus) ...     │    │
│  │                                 │    │
│  │ ▾ Voir l'exposé des motifs     │    │  ← Sous-accordéon ouvert
│  │ ┌───────────────────────────┐   │    │
│  │ │ 💬 Exposé des motifs      │   │    │
│  │ │                           │   │    │
│  │ │ Cet amendement vise à     │   │    │
│  │ │ inscrire dans la loi la   │   │    │
│  │ │ trajectoire de réduction  │   │    │
│  │ │ des émissions de gaz à    │   │    │
│  │ │ effet de serre conforme   │   │    │
│  │ │ aux engagements            │   │    │
│  │ │ internationaux de la      │   │    │
│  │ │ France. Il s'agit de      │   │    │
│  │ │ donner une portée          │   │    │
│  │ │ contraignante aux         │   │    │
│  │ │ objectifs climatiques.    │   │    │
│  │ └───────────────────────────┘   │    │
│  └─────────────────────────────────┘    │
```

### Version desktop

Même layout, largeur max de lecture à ~72ch (environ 650px) pour le texte législatif :

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [Environnement]  [Rejeté]                              │
│                                                         │
│  Scrutin n°2568 — l'amendement n° 338 de Mme Trouvé     │
│  à l'article 5 de la proposition de loi portant          │
│  programmation nationale énergie et climat pour les      │
│  années 2025 à 2035 (première lecture).                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ▾ Lire le texte de l'amendement              ▾  │    │
│  │                                                 │    │
│  │  📜 Amendement n°338 — Article 5                │    │
│  │                                                 │    │
│  │  À l'alinéa 3 de l'article 5, après le mot :    │    │
│  │  « transition », insérer les mots : « , en      │    │
│  │  garantissant une trajectoire de réduction      │    │
│  │  des émissions compatible avec l'accord de      │    │
│  │  Paris, »                                       │    │
│  │                                                 │    │
│  │  ▸ Voir l'exposé des motifs                     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  19 juin 2025 · Scrutin public ordinaire                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Résultat du vote                   99 votants   │    │
│  │  ████████████░░░░░░░░░░░░░░░░░░░░               │    │
│  │  Pour          23  (23.2%)                       │    │
│  │  Contre        72  (72.7%)                       │    │
│  │  Abstentions    4  (4.0%)                        │    │
│  └─────────────────────────────────────────────────┘    │
```

---

## 7. États et cas particuliers

| État                                                           | Comportement                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Amendement avec texte**                                      | Accordéon présent, fermé par défaut                                     |
| **Texte court (< 200 car.)**                                   | Option B : texte visible directement (pas d'accordéon)                  |
| **Texte très long (> 800 car.)**                               | 500 premiers caractères + "Lire la suite" avec animation de déroulement |
| **Pas d'amendement lié** (scrutin solennel, motion de censure) | Pas d'accordéon. Ne pas afficher de section vide.                       |
| **Amendement avec exposé des motifs**                          | Sous-accordéon "Voir l'exposé des motifs"                               |
| **Amendement sans exposé des motifs**                          | Pas de sous-accordéon                                                   |
| **Chargement**                                                 | Skeleton léger (1 ligne) dans l'emplacement de l'accordéon              |
| **Erreur de chargement**                                       | Message discret "Texte indisponible" — ne pas bloquer la page           |

---

## 8. Design tokens utilisés

Tokens déjà existants dans le design system, aucun nouveau nécessaire :

```
Composant     : Accordéon (Radix UI, déjà utilisé dans GroupAccordion)
Couleurs      : surface, border-light, text-primary, text-secondary, text-muted
Typographie   : text-sm (14px) pour le texte législatif, font-medium pour les labels
Icônes        : ChevronDown (Lucide, déjà utilisé), FileText pour l'icône 📜
Espacement    : px-4 py-3 pour le contenu de l'accordéon
Animation     : duration-200, animate-accordion-up/down (déjà défini)
```

---

## 9. Résumé des recommandations

1. **Accordéon "Lire le texte de l'amendement"** sous le titre dans `ScrutinHeader`, fermé par défaut
2. **Texte intégral** affiché, avec limite à 500 car. + "Lire la suite" si > 800 car.
3. **Sous-accordéon "Voir l'exposé des motifs"** séparé, fermé par défaut
4. **Ne rien afficher** si aucun amendement/article n'est lié au scrutin
5. **Design responsive natif** : l'accordéon fonctionne identiquement mobile/desktop
6. **Accessible** : ARIA, focus, contraste, navigation clavier — zéro régression
