# Intégration "Texte des amendements" — Rapport d'implémentation Frontend

## Résumé

Fonctionnalité intégrée avec succès. Le composant `AmendmentCard` affiche le texte complet des amendements sur la page de détail d'un scrutin, placé entre l'en-tête et le graphique de résultats.

## Fichiers modifiés

### 1. Types — `apps/frontend/src/lib/api-types.ts`

Ajout de l'interface `Amendment` :

```ts
export interface Amendment {
  id: string;
  numero: string;
  dispositif: string | null;
  exposeSommaire: string | null;
  auteurs: string | null;
  articleRef: string | null;
  articleTitre: string | null;
  sortCode: string | null;
}
```

Extension de `ScrutinDetail` avec le champ `amendement: Amendment | null`.

### 2. Composant — `apps/frontend/src/components/AmendmentCard.tsx`

Composant React créé avec les caractéristiques suivantes :

| Aspect            | Détail                                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structure**     | Card → En-tête (n° + badge) → Dispositif → Exposé sommaire → Métadonnées (auteurs, article) → Lien AN                                        |
| **Accessibilité** | `aria-label="Texte de l'amendement"`, heading `<h2>`, lien avec `sr-only` "(nouvelle fenêtre)", `rel="noopener noreferrer"`                  |
| **Responsive**    | Mobile-first, `flex-wrap` pour le header, breakpoint `sm:` pour la taille du titre                                                           |
| **États gérés**   | Chaque section conditionnelle (`dispositif`, `exposeSommaire`, `auteurs`, `articleRef`) — rien affiché si `null`                             |
| **Design system** | Tokens `text-primary`, `text-secondary`, `text-muted`, `border-light`, `primary`, `primary-hover` — pas de valeurs hardcodées                |
| **Lien AN**       | `https://www.assemblee-nationale.fr/dyn/17/amendements/{amendment.id}` — icône SVG inline (flèche externe), focus visible, `target="_blank"` |

### 3. Page scrutin — `apps/frontend/src/routes/scrutin/$id.tsx`

Intégration conditionnelle entre `ScrutinHeader` et `VoteChart` :

```tsx
{
  scrutin.amendement && <AmendmentCard amendment={scrutin.amendement} />;
}
```

Position : juste sous le titre → avant les résultats de vote → avant les onglets.  
Cas `null` : rien n'est affiché, aucune régression.

### 4. Tests — `apps/frontend/src/components/AmendmentCard.test.tsx`

14 cas de test couvrant :

- Rendu complet (tous les champs)
- Rendu minimal (tous les champs `null`)
- Badge résultat présent/absent
- Lien AN avec `href`, `target`, `rel`
- Accessibilité (`aria-label`, heading, `sr-only`)
- Chaque section conditionnelle : dispositif, exposé, auteurs, article

## Backend (mise à jour minimale)

- `apps/backend/src/modules/scrutins/routes.ts` — `AmendmentSchema` ajouté au `ScrutinDetailSchema`
- `apps/backend/src/modules/scrutins/repository.ts` — `amendement: null` dans `getWithDetails`

> **Note** : Le champ est actuellement toujours `null` côté backend. La création de la table `amendements` et le peuplement via l'ETL sont nécessaires pour que la feature soit pleinement fonctionnelle.

## Vérifications

| Test                                  | Résultat           |
| ------------------------------------- | ------------------ |
| Tests frontend (28 tests, 6 fichiers) | ✅ 28/28 passent   |
| Tests backend (76 tests, 8 fichiers)  | ✅ 76/76 passent   |
| TypeScript strict (`tsc --noEmit`)    | ✅ Clean, 0 erreur |
| Régression                            | ✅ Aucune          |

## Patterns respectés

- ✅ Mobile-first (styles de base pour mobile, `sm:` pour tablette+)
- ✅ Design tokens (`app.css`) — pas de couleurs/spacing hardcodés
- ✅ Composants UI existants (`Card`, `BadgeResultat`)
- ✅ Utilitaires existants (`cn`, `formatTitle`)
- ✅ Types stricts (`Amendment`, `ScrutinDetail`)
- ✅ TanStack Query (pas de `useEffect` + `fetch`)
- ✅ Conditionnel propre (`scrutin.amendement &&`) — pas de rendu inutile
- ✅ Accessibilité WCAG 2.1 AA : headings, labels, focus visible, `sr-only`
- ✅ `prefers-reduced-motion` respecté (via CSS `--duration-*` variables)
