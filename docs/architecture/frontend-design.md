# Rapport Technique Frontend — Transparence des Votes des Députés Français

> **Version** : 1.1  
> **Date** : 2026-05-20  
> **Framework** : TanStack Start (React, Vite 7)  
> **Cible** : Mobile-first, WCAG 2.1 AA, FCP < 1.5s  
> **Implémentation** : [ETAT_PROJET.md](../ETAT_PROJET.md) — ce document reste la spec produit cible.

---

## 1. Résumé exécutif

Ce document définit l'architecture frontend complète pour la plateforme de transparence parlementaire. Il s'appuie sur le cahier des charges produit, les spécifications UX, et les contraintes des API officielles et tierces.

**Choix technologiques clés (cible) :**

- **Framework** : TanStack Start (file-system routing, build **Vite**, plugin `tanstackStart()`)
- **Styling** : Tailwind CSS **v4** (`@theme` dans `src/app.css`, PostCSS `@tailwindcss/postcss`)
- **Composants** : Radix UI primitives (headless, accessible) + composants métier maison
- **Data fetching** : TanStack Query v5 vers l'API Fastify (`VITE_API_BASE_URL`) — Server Functions **non** branchées en V1 actuelle
- **State UI** : URL-first pour les filtres ; Zustand pour le comparateur et les préférences
- **OG Images** : Satori + resvg-js génération côté serveur (API route)

---

## 2. Architecture Frontend

### 2.1. Stack technique

| Couche          | Technologie                           | Justification                                                                                                                           |
| --------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | **TanStack Start**                    | SSR/SSG natif, Server Functions (pas de API routes manuelles pour le CRUD standard), file-system routing type-safe avec TanStack Router |
| Langage         | **TypeScript** (strict)               | Typage des routes, des API, des composants. `strict: true` obligatoire                                                                  |
| Styling         | **Tailwind CSS** + **CSS Variables**  | Utility-first rapide, design tokens en variables CSS pour le theming et les transitions sans JS                                         |
| Composants base | **Radix UI**                          | Primitives accessibles (focus trap, roving focus, WAI-ARIA) sans style imposé                                                           |
| Data serveur    | **TanStack Query v5**                 | Cache normalisé, stale-while-revalidate, prefetching SSR, déduplication des requêtes                                                    |
| State client    | **Zustand**                           | Léger, pas de boilerplate, pour le comparateur et les préférences utilisateur                                                           |
| Graphiques      | **SVG vanilla** + **recharts** (lazy) | Graphiques simples en SVG pour LCP ; recharts lazy-loadé uniquement pour les graphiques complexes (desktop)                             |
| OG Images       | **Satori** + **@resvg/resvg-js**      | Génération d'images Open Graph côté serveur, 0 dépendance runtime lourde                                                                |
| Analytics       | **Matomo** (self-hosté)               | Souveraineté des données, pas de cookies tiers, bandeau information simple                                                              |

### 2.2. Stratégie de rendu (SSR vs SSG)

TanStack Start permet trois modes par route : `ssr`, `static`, ou `api`.

| Route              | Mode                       | Justification                                                                                                                                |
| ------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` (Accueil)      | `static` avec revalidation | Contenu quasi-statique (derniers scrutins, thématiques). Rebuild toutes les 4h via CI/CD ou webhook                                          |
| `/recherche`       | `ssr`                      | Résultats dépendants des paramètres de recherche. Pas de prérendu statique pertinent                                                         |
| `/depute/$slug`    | `static` (SSG)             | ~577 députées. Générées au build + revalidation incrémentale (ISR-like) quotidienne. Chaque fiche est indépendante                           |
| `/scrutin/$id`     | `static` (SSG)             | ~5800+ scrutins par législature. Génération au build pour les scrutins récents (N derniers). Les anciens sont générés à la volée (on-demand) |
| `/comparateur`     | `ssr`                      | État utilisateur (sélection de députés) déterminé à l'exécution                                                                              |
| `/api/og/*`        | `api`                      | Endpoint serveur pour la génération dynamique d'images de partage                                                                            |
| `/api/sitemap.xml` | `api`                      | Génération dynamique du sitemap à partir de la base de données                                                                               |

**Mécanisme de revalidation :**

- TanStack Start ne dispose pas nativement d'ISR comme Next.js. La revalidation est implémentée via :
  1. **Build quotidien** (CI/CD cron) qui regénère les pages statiques critiques.
  2. **Server Functions avec cache** : pour les pages SSG, un Server Function expose la donnée avec un header `Cache-Control: s-maxage=3600, stale-while-revalidate=86400`. Le CDN (Cloudflare / Vercel Edge) sert la page en cache et la revalide en arrière-plan.
  3. **On-demand revalidation** : webhook déclenché par le backend ETL à chaque nouvelle importation de scrutins.

### 2.3. Data fetching — Architecture en couches

Le frontend consomme une **API REST interne** (backend à construire par l'équipe backend) qui normalise les données de l'Assemblée nationale (ZIP bulk → ETL → API REST). Les sources tierces (CIVIX, Poligraph) peuvent servir de fallback ou de sources de bootstrap, mais l'API interne est la source de vérité pour le frontend.

**Couche 1 : Server Functions (SSR)**

```ts
// app/routes/depute/$slug.tsx
import { createServerFn } from "@tanstack/react-start";

export const getDeputeBySlug = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const depute = await apiClient.get(`/deputes/${slug}`);
    return depute;
  });
```

- Exécutées uniquement sur le serveur (Node.js / Edge).
- Pas de fuite de clés API côté client.
- Le résultat est sérialisé et hydraté dans le HTML initial.

**Couche 2 : TanStack Query (Client)**

- Chaque Server Function est wrappée dans une query pour le cache client :

```ts
export const deputeQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["depute", slug],
    queryFn: () => getDeputeBySlug({ data: slug }),
    staleTime: 1000 * 60 * 60, // 1h
  });
```

- Sur la route `/depute/$slug`, le loader SSR précharge la query. Le client réutilise cette donnée hydratée.
- Les interactions (filtres de votes, pagination) utilisent des queries client séparées pour éviter de re-render le shell.

**Couche 3 : URL State (Partageable)**

- Tous les filtres (période, thématique, type, résultat) sont stockés dans l'URL via `useSearch` de TanStack Router.
- Avantages : partage direct, historique navigateur, pas de state manager complexe.

```ts
// Exemple de search schema pour la fiche député
export const Route = createFileRoute("/depute/$slug")({
  component: DeputePage,
  validateSearch: z.object({
    periode: z
      .enum(["7j", "30j", "6mois", "legislature"])
      .default("legislature"),
    themes: z.array(z.string()).default([]),
    type: z.array(z.string()).default([]),
    resultat: z.enum(["pour", "contre", "abstention", "absent"]).optional(),
    page: z.number().default(1),
  }),
});
```

### 2.4. State Management — Décision arbre

| Type de state                     | Solution               | Justification                                                |
| --------------------------------- | ---------------------- | ------------------------------------------------------------ |
| Serveur (listes, détails)         | TanStack Query         | Cache normalisé, gestion des états réseau                    |
| Filtres / Pagination              | URL Search Params      | Partageable, SEO-friendly, pas de librairie                  |
| Comparateur (sélection)           | Zustand                | Éphémère, max 5 députés, interactions complexes entre écrans |
| Préférences (theme, consentement) | localStorage + Zustand | Persistance légère, pas besoin de backend                    |
| UI transitoire (drawer, modale)   | React state local      | Pas besoin de globaliser                                     |

**Store Zustand — Comparateur :**

```ts
interface ComparatorStore {
  reference: Depute | null;
  compared: Depute[];
  period: Period;
  addDepute: (d: Depute) => void;
  removeDepute: (id: string) => void;
  setReference: (d: Depute) => void;
}
```

- Persisté en `localStorage` pour permettre le retour sur la page comparateur sans perdre la sélection.
- Limité à 5 députés (contrainte UX).

---

## 3. Design System

### 3.1. Fondations — Design Tokens en CSS Variables

Tailwind est configuré pour lire les variables CSS. Cela permet le theming (mode sombre futur) et le respect de `prefers-reduced-motion` sans JavaScript.

```css
/* app/styles/tokens.css */
:root {
  --color-primary: #1d4ed8;
  --color-primary-hover: #1e40af;
  --color-success: #15803d;
  --color-success-bg: #dcfce7;
  --color-danger: #b91c1c;
  --color-danger-bg: #fee2e2;
  --color-neutral: #6b7280;
  --color-neutral-bg: #f3f4f6;
  --color-warning: #b45309;
  --color-warning-bg: #fef3c7;
  --color-surface: #ffffff;
  --color-surface-raised: #f9fafb;
  --color-border: #e5e7eb;
  --color-text-primary: #111827;
  --color-text-secondary: #4b5563;
  --color-text-muted: #9ca3af;

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-focus: 0 0 0 3px rgba(29, 78, 216, 0.3);

  --duration-fast: 150ms;
  --duration-base: 200ms;
  --duration-slow: 300ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-base: 0ms;
    --duration-slow: 0ms;
  }
}
```

### 3.2. Configuration Tailwind étendue

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        success: "var(--color-success)",
        "success-bg": "var(--color-success-bg)",
        danger: "var(--color-danger)",
        "danger-bg": "var(--color-danger-bg)",
        neutral: "var(--color-neutral)",
        "neutral-bg": "var(--color-neutral-bg)",
        warning: "var(--color-warning)",
        "warning-bg": "var(--color-warning-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        border: "var(--color-border)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
      },
      spacing: {
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        "2xl": "var(--space-2xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        focus: "var(--shadow-focus)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
    },
  },
};
```

### 3.3. Composants réutilisables (librairie interne)

Tous les composants sont construits sur Radix UI + Tailwind. Ils respectent les critères d'accessibilité (focus visible, touch target 44×44, aria-labels).

| Composant          | Source / Base            | Props clés                                                 | Accessibilité                                          |
| ------------------ | ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------ |
| `Button`           | Radix primitive          | `variant`, `size`, `isLoading`                             | `focus-visible:ring`, touch target min 44px            |
| `Input`            | Radix primitive          | `iconLeft`, `clearable`                                    | Label associé, `aria-describedby`                      |
| `SearchCombobox`   | Radix Popover + Command  | `options`, `onSelect`, `groupBy`                           | `role="combobox"`, `aria-expanded`, navigation clavier |
| `Card`             | HTML div                 | `variant` (default / hoverable)                            | `aria-label` sur le lien interne                       |
| `BadgeVote`        | Custom                   | `position: 'pour' \| 'contre' \| 'abstention' \| 'absent'` | `aria-label` explicite, pas seulement couleur          |
| `BadgeResultat`    | Custom                   | `resultat: 'adopté' \| 'rejeté' \| 'en-cours'`             | Rôle `status`                                          |
| `Skeleton`         | Custom CSS               | `lines`, `className`                                       | `aria-busy="true"`, `aria-live="polite"`               |
| `Drawer`           | Radix Dialog             | `direction: bottom \| left`                                | Focus trap, retour au trigger                          |
| `Tabs`             | Radix Tabs               | `value`, `onValueChange`                                   | `tablist` / `tab` / `tabpanel`                         |
| `Accordion`        | Radix Accordion          | `type: single \| multiple`                                 | `aria-expanded`                                        |
| `ComparateurScore` | Custom SVG               | `score`, `votesCount`                                      | `aria-label` avec valeur et contexte                   |
| `VoteChart`        | Custom SVG               | `data: {pour,contre,abstention}`                           | `role="img"`, `aria-label` textuel                     |
| `ShareButton`      | Web Share API + fallback | `title`, `text`, `url`, `ogImage`                          | Label explicite par réseau                             |

### 3.4. Typographie

Police système uniquement (pas de chargement de fonte externe) :

```css
font-family:
  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
  Arial, sans-serif;
```

- Échelle typographique définie dans Tailwind (`text-h1`, `text-h2`, etc. via plugin).
- Pas de flash de texte invisible (FOUT/FOIT).

---

## 4. Pages et Routes détaillées

### 4.1. Route racine (`__root.tsx`)

**Responsabilités :**

- Layout commun (Header, Footer, Skip Link)
- Providers (TanStack Query, Zustand, Router)
- `html` lang="fr", meta viewport, favicon
- Chargement de Matomo (déferred, async, `data-respect-dnt`)

### 4.2. Page d'accueil (`/index.tsx`)

**Mode** : `static` (SSG) + revalidation 4h

**Données chargées (Server Function) :**

- `getLatestScrutins(limit: 10)` : derniers scrutins publics
- `getTopThemes()` : thématiques du moment
- `getMostViewedDeputes(limit: 6)` : députés les plus consultés (si analytics disponible)

**Composants :**

- `HeroSearch` : barre de recherche principale (48px mobile, 56px desktop)
- `ScrutinCard` : carte scrutin avec badge résultat
- `ThemeChips` : chips horizontalement scrollables
- `DeputeCarousel` : députés mis en avant (grid 2 cols mobile, 3 cols desktop)

**SEO :**

- Title : `Transparence des votes — Découvrez comment votent vos députés`
- Meta description générique
- JSON-LD `WebSite` avec `SearchAction` (barre de recherche dans les résultats Google)

### 4.3. Page de recherche (`/recherche`)

**Mode** : `ssr`

**Search params :**

- `q`: chaîne de recherche
- `type`: `depute` | `scrutin` | `all`
- `page`, `limit`

**Données chargées :**

- `searchDeputes(query, page, limit)`
- `searchScrutins(query, page, limit)`

**Composants :**

- `SearchInput` (sticky header réduit au scroll)
- `SearchResultsTabs` : onglets Députés / Textes
- `DeputeResultCard` : photo 48×48, nom, circonscription, groupe
- `ScrutinResultCard` : titre, date, badge résultat
- `EmptyState` : message + suggestions géographiques

**SEO :**

- Title dynamique : `"Durand" — Résultats de recherche`
- `noindex` si `q` vide (éviter le duplicate content)
- Canonical avec paramètre `q`

### 4.4. Fiche Député (`/depute/$slug.tsx`)

**Mode** : `static` (SSG) pour tous les slugs actifs + revalidation quotidienne

**Données chargées (SSR) :**

- `getDeputeBySlug(slug)` : identité, contact, groupe, mandats, stats clés
- `getDeputeVotes(slug, periode, themes, type, resultat, page)` : liste paginée des votes (lazy, charge côté client après hydratation du shell)

**Architecture de la page :**
La page est découpée en deux zones de données pour optimiser le LCP :

1. **Shell (SSR)** : photo, nom, groupe, KPI (présence, votes) → affiché immédiatement
2. **Contenu interactif (Client)** : onglet "Votes" avec filtres et pagination

**Composants :**

- `DeputeHeader` : photo, nom, circonscription, groupe, badge mandat en cours/terminé
- `KPIGrid` : taux de présence, nombre de votes, taux de cohésion (2 colonnes mobile, 4 desktop)
- `InfoTooltip` : explication des termes (infobulle accessible, `aria-describedby`)
- `VoteTabs` : `[Infos] [Votes] [Comparer]`
- `VoteFilters` : barre de filtres, ouvre un drawer bottom-sheet sur mobile
- `VoteCard` : carte vote avec badge position, contexte assemblée
- `VoteList` : liste avec infinite scroll (ou pagination numérotée si SEO critique)
- `EmptyStateVotes` : illustration + message
- `ShareSection` : boutons de partage + téléchargement image synthétique

**SEO :**

- Title : `Marie Durand — Députée Paris (75) — Groupe A`
- Meta description avec stats clés
- JSON-LD `Person` :

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Marie Durand",
  "jobTitle": "Députée",
  "memberOf": { "@type": "Organization", "name": "Groupe A" },
  "image": "https://.../photos/marie-durand.jpg"
}
```

- OG Image : `/api/og/depute?slug=marie-durand`

### 4.5. Page Scrutin (`/scrutin/$id.tsx`)

**Mode** : `static` (SSG) pour les scrutins récents (N=500) + on-demand pour les anciens

**Données chargées (SSR) :**

- `getScrutinById(id)` : titre, date, thématique, type, résultat global, synthèse
- `getScrutinVotesByGroup(id)` : ventilation par groupe politique

**Composants :**

- `ScrutinHeader` : titre, date, badges thématique et type
- `ResultatBadge` : Adopté/Rejeté en grand
- `VoteChart` : graphique répartition (barres horizontales mobile, donut desktop)
- `GroupAccordion` : votes par groupe, dépliable
- `VoteListFiltered` : liste nominative filtrable par position et groupe
- `TextLink` : lien vers le texte officiel (Assemblée nationale)

**SEO :**

- Title : `Projet de loi sur... — Scrutin n°1234`
- JSON-LD `Legislation` + `VoteAction`
- OG Image : `/api/og/scrutin?id=1234`

### 4.6. Comparateur (`/comparateur.tsx`)

**Mode** : `ssr` (état dépendant de la sélection utilisateur)

**Données :**

- La sélection est stockée dans Zustand + URL sync (`?ref=slug1&compare=slug2,slug3`)
- `getComparisonResult(refSlug, compareSlugs[], period)` : Server Function ou appel API pour récupérer les votes communs et le score

**Composants :**

- `ComparatorSelector` : sélection député de référence + ajout députés (max 5)
- `ComparatorSuggestions` : députés de même circonscription/groupe
- `PeriodFilter` : période prédéfinie
- `ConcordanceScore` : jauge/donut avec pourcentage et nombre de votes
- `ComparisonTabs` : `Ensemble` / `Divergent`
- `ComparisonTable` : tableau côte à côte (mobile : empilé, desktop : colonnes fixes)
- `ComparisonRow` : vote avec positions alignées
- `ShareComparator` : partage de l'URL avec la sélection encodée

**Calcul du score :**

- **Stratégie hybride** : le calcul est effectué côté serveur par l'API interne (`/api/comparateur/concordance`) pour gérer la volumétrie (jusqu'à 5 députés × milliers de votes).
- Le frontend envoie les slugs + filtres, le backend retourne : `{ score, votesCommuns, votesIdentiques, details: [...] }`.
- Alternative client-side : uniquement si les données sont déjà en cache (ex: comparaison rapide depuis la fiche député avec un seul autre député et peu de votes).

**SEO :**

- Title dynamique : `Marie Durand vs Jean Martin — Concordance 78%`
- OG Image : `/api/og/comparateur?ref=durand&compare=martin&score=78`

---

## 5. Intégration API Client

### 5.1. Client API interne

Un client HTTP unique, typé, configuré pour TanStack Query.

```ts
// app/lib/api-client.ts
import { QueryClient } from "@tanstack/react-query";

const API_BASE_URL = process.env.VITE_API_BASE_URL; // ou import.meta.env

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 30, // 30 min
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        )
          return false;
        return failureCount < 3;
      },
    },
  },
});
```

### 5.2. Hooks de données métier

```ts
// app/hooks/use-depute.ts
export function useDepute(slug: string) {
  return useQuery(deputeQueryOptions(slug));
}

// app/hooks/use-depute-votes.ts
export function useDeputeVotes(
  slug: string,
  filters: VoteFilters,
  page: number,
) {
  return useQuery({
    queryKey: ["depute", slug, "votes", filters, page],
    queryFn: () =>
      apiFetch(
        `/deputes/${slug}/votes?${stringifyFilters(filters)}&page=${page}`,
      ),
    placeholderData: keepPreviousData,
  });
}

// app/hooks/use-search.ts
export function useSearch(query: string, type: SearchType, page: number) {
  return useQuery({
    queryKey: ["search", query, type, page],
    queryFn: () =>
      apiFetch(
        `/search?q=${encodeURIComponent(query)}&type=${type}&page=${page}`,
      ),
    enabled: query.length >= 2,
  });
}

// app/hooks/use-comparator.ts
export function useComparison(
  refSlug: string,
  compareSlugs: string[],
  period: Period,
) {
  return useQuery({
    queryKey: ["compare", refSlug, compareSlugs, period],
    queryFn: () =>
      apiFetch(
        `/compare?ref=${refSlug}&compare=${compareSlugs.join(",")}&period=${period}`,
      ),
    enabled: compareSlugs.length > 0,
  });
}
```

### 5.3. Stratégie de Prefetching

- **SSR initial** : les Server Functions appellent directement le backend (pas de fetch HTTP interne si possible, appel direct à la DB ou au service).
- **Navigation** : TanStack Router permet de précharger les données au hover sur les liens (`preload="intent"`).
- **Scroll infini / Pagination** : `placeholderData: keepPreviousData` pour éviter le flash de chargement.

### 5.4. Gestion des états réseau

Chaque écran doit gérer explicitement :

| État                   | UI                                           | Composant                                   |
| ---------------------- | -------------------------------------------- | ------------------------------------------- |
| **Loading initial**    | Skeleton pulsés (3 cartes)                   | `SkeletonCard` avec `aria-busy="true"`      |
| **Loading pagination** | Spinner inline + contenu précédent conservé  | `LoadingSpinner`                            |
| **Success vide**       | Illustration + message + CTA                 | `EmptyState`                                |
| **Error**              | Message + bouton retry + log monitoring      | `ErrorBoundary` + `QueryErrorResetBoundary` |
| **Offline**            | Bannière "Mode hors-ligne, données en cache" | `NetworkStatusBanner`                       |

**Error Boundary :**

- Route-level Error Boundary avec TanStack Router (`errorComponent`).
- Fallback UI : message user-friendly + bouton "Réessayer" qui invalide la query.

---

## 6. Stratégie SEO

### 6.1. Meta tags dynamiques

TanStack Start expose `Head` et `Meta` via `@tanstack/react-start`.

```tsx
// Composant réutilisable par page
export function PageSEO({
  title,
  description,
  image,
  type = "website",
}: SEOProps) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="fr_FR" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </>
  );
}
```

### 6.2. Sitemap XML

Généré dynamiquement via une API route (`/api/sitemap.xml`).

```ts
// app/routes/api/sitemap.xml.ts
import { createAPIFileRoute } from "@tanstack/react-start";

export const APIRoute = createAPIFileRoute("/api/sitemap.xml")({
  GET: async () => {
    const [deputes, scrutins] = await Promise.all([
      getAllDeputeSlugs(),
      getAllScrutinIds(),
    ]);

    const urls = [
      { loc: "/", priority: 1.0 },
      { loc: "/recherche", priority: 0.8 },
      { loc: "/comparateur", priority: 0.7 },
      ...deputes.map((d) => ({
        loc: `/depute/${d.slug}`,
        priority: 0.9,
        lastmod: d.updatedAt,
      })),
      ...scrutins.slice(0, 1000).map((s) => ({
        loc: `/scrutin/${s.id}`,
        priority: 0.8,
        lastmod: s.dateScrutin,
      })),
    ];

    const xml = generateSitemapXml(urls);
    return new Response(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  },
});
```

- Référencé dans `robots.txt`.
- Limité à 1000 scrutins les plus récents (les anciens sont moins pertinents SEO et peuvent être indexés via le flux mais pas dans le sitemap pour le allerger).

### 6.3. OG Images dynamiques

Génération côté serveur avec Satori (JSX → SVG) et resvg-js (SVG → PNG).

```ts
// app/routes/api/og/depute.tsx (API route)
export const APIRoute = createAPIFileRoute('/api/og/depute')({
  GET: async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const depute = await getDeputeBySlug(slug);

    const svg = await satori(
      <OgDeputeTemplate depute={depute} />,
      { width: 1200, height: 630, fonts: [...] }
    );
    const png = new Resvg(svg).render().asPng();

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  },
});
```

**Templates :**

- `/api/og/depute?slug=...` : photo, nom, circonscription, 3 chiffres clés
- `/api/og/scrutin?id=...` : titre, badge résultat, mini barres de répartition
- `/api/og/comparateur?ref=...&compare=...&score=...` : visuels des 2 députés, score en grand

**Performance :**

- Cache CDN long (24h) car les données changent lentement.
- Polices embarquées en base64 ou chargées depuis le filesystem (pas de fetch réseau).

### 6.4. JSON-LD structuré

Injection de Schema.org dans chaque page critique :

- **Accueil** : `WebSite` + `SearchAction`
- **Fiche député** : `Person` + `MemberOf` (groupe politique)
- **Page scrutin** : `Legislation` + `VoteAction`
- **Comparateur** : `ComparisonPage` (custom type, pas de standard strict mais enrichi)

### 6.5. URLs et Canonicalisation

| Page        | URL pattern                              | Canonical                                       |
| ----------- | ---------------------------------------- | ----------------------------------------------- |
| Accueil     | `/`                                      | Self                                            |
| Recherche   | `/recherche?q=durand`                    | `/recherche?q=durand` (pas de paramètre page=1) |
| Député      | `/depute/marie-durand`                   | Self                                            |
| Scrutin     | `/scrutin/VTANR5L17V1`                   | Self                                            |
| Comparateur | `/comparateur?ref=durand&compare=martin` | Self                                            |

- Pas de trailing slash (redirection 301 si présent).
- Paramètres de tracking (`utm_*`) autorisés mais canonical sans.

---

## 7. Structure du projet

```
├── app/
│   ├── routes/                    # File-system routing TanStack Start
│   │   ├── __root.tsx             # Root layout + providers
│   │   ├── index.tsx              # Accueil
│   │   ├── recherche.tsx          # Page recherche
│   │   ├── depute/
│   │   │   └── $slug.tsx          # Fiche député
│   │   ├── scrutin/
│   │   │   └── $id.tsx            # Page scrutin
│   │   ├── comparateur.tsx        # Comparateur
│   │   ├── methodologie.tsx       # Page Méthodologie & Sources
│   │   ├── mentions-legales.tsx   # Mentions légales
│   │   ├── api/
│   │   │   ├── sitemap.xml.ts     # Génération sitemap
│   │   │   ├── og/
│   │   │   │   ├── depute.ts      # OG image député
│   │   │   │   ├── scrutin.ts     # OG image scrutin
│   │   │   │   └── comparateur.ts # OG image comparateur
│   │   │   └── robots.txt.ts      # Robots.txt
│   │   └── (content)/             # Pages statiques
│   │
│   ├── components/                # Composants métier et réutilisables
│   │   ├── ui/                    # Composants base (Button, Input, Badge...)
│   │   ├── layout/                # Header, Footer, SkipLink, Container
│   │   ├── search/                # SearchCombobox, SearchResults
│   │   ├── depute/                # DeputeHeader, KPIGrid, VoteCard
│   │   ├── scrutin/               # VoteChart, GroupAccordion
│   │   ├── comparator/            # ComparatorSelector, ComparisonTable, ConcordanceScore
│   │   └── shared/                # EmptyState, ErrorFallback, SkeletonCard, ShareButton
│   │
│   ├── hooks/                     # Hooks custom
│   │   ├── use-depute.ts
│   │   ├── use-depute-votes.ts
│   │   ├── use-search.ts
│   │   ├── use-comparator.ts
│   │   ├── use-media-query.ts
│   │   └── use-reduced-motion.ts
│   │
│   ├── lib/                       # Utilitaires et configuration
│   │   ├── api-client.ts          # Fetcher + QueryClient
│   │   ├── api-types.ts           # Types DTO API (générés depuis OpenAPI si dispo)
│   │   ├── utils.ts               # cn(), formatDate, slugify...
│   │   ├── seo.ts                 # Helpers meta tags, JSON-LD
│   │   └── constants.ts           # Breakpoints, limites, URLs externes
│   │
│   ├── stores/                    # State management client
│   │   └── comparator-store.ts    # Zustand store + localStorage persist
│   │
│   ├── styles/                    # Styles globaux
│   │   ├── tokens.css             # Variables CSS design tokens
│   │   ├── globals.css            # Tailwind directives + reset
│   │   └── og-fonts/              # Polices pour Satori (subsetées)
│   │
│   ├── types/                     # Types TypeScript globaux
│   │   ├── depute.ts
│   │   ├── scrutin.ts
│   │   └── comparator.ts
│   │
│   └── ssr/                       # Logique serveur spécifique
│       ├── api-calls.ts           # Appels directs au backend (DB/service)
│       └── og-templates.tsx       # Templates JSX pour Satori
│
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── favicon.ico
│   └── icons/                     # Icônes PWA (192, 512)
│
├── scripts/
│   ├── generate-static-params.ts  # Préliste des slugs pour le build SSG
│   └── update-sitemap.ts          # Hook de post-build
│
├── tests/
│   ├── components/                # Tests unitaires composants (Vitest + Testing Library)
│   ├── hooks/                     # Tests hooks
│   └── a11y/                      # Audits axe-core par page
│
├── postcss.config.mjs             # @tailwindcss/postcss
├── vite.config.ts                 # tanstackStart() + @vitejs/plugin-react
├── src/router.tsx                 # Point d'entrée router Start
├── src/app.css                    # @import "tailwindcss" + @theme
├── tsconfig.json
└── package.json                   # scripts: vite dev | vite build
```

---

## 8. Comparateur de Votes — Spécification technique

### 8.1. Architecture state

Le comparateur est le feature le plus complexe côté client. Son state est géré en trois couches :

**Couche 1 : URL Search Params**

- `ref` : slug du député de référence
- `compare` : slugs séparés par des virgules (max 4 comparés + 1 ref = 5)
- `period` : période de filtrage
- `view` : `synthese` | `detail` | `thematique`

**Couche 2 : Zustand Store (éphémère + persistant)**

- Maintient la liste des députés sélectionnés pendant la navigation.
- Persisté dans `localStorage` sous la clé `comparator-state`.
- Synchronisé bidirectionnellement avec l'URL (URL source de vérité au load, Zustand source de vérité pendant l'interaction).

```ts
// app/stores/comparator-store.ts
interface ComparatorState {
  reference: DeputeSummary | null;
  compared: DeputeSummary[];
  period: Period;
  view: ViewMode;
  setReference: (d: DeputeSummary) => void;
  addCompared: (d: DeputeSummary) => void;
  removeCompared: (slug: string) => void;
  setPeriod: (p: Period) => void;
  setView: (v: ViewMode) => void;
}
```

**Couche 3 : TanStack Query (données serveur)**

- La query `useComparison` récupère le résultat calculé.
- `staleTime: Infinity` pour cette query (les votes passés ne changent pas) ; invalidation uniquement si la sélection ou la période change.

### 8.2. Calcul de la concordance — Client vs Serveur

**Règle d'or** : le calcul est fait côté serveur pour garantir la performance et la cohérence sur des volumes importants.

**Endpoint API requis :**

```
GET /api/v1/compare?ref={slug}&compare={slug1,slug2,slug3}&period={period}&themes={themes}
```

**Réponse attendue :**

```json
{
  "reference": { "slug": "marie-durand", "nom": "Marie Durand" },
  "compared": [
    {
      "slug": "jean-martin",
      "nom": "Jean Martin",
      "score": 78.5,
      "votesCommuns": 67,
      "votesIdentiques": 53
    }
  ],
  "details": [
    {
      "scrutinId": "VTANR5L17V1",
      "titre": "Motion de confiance",
      "date": "2024-07-18",
      "positions": {
        "marie-durand": "pour",
        "jean-martin": "contre"
      },
      "resultatGlobal": "adopté"
    }
  ],
  "warning": "Echantillon limité" // si votesCommuns < 10
}
```

**Calcul côté serveur (logique métier) :**

```
concordance(ref, target, period, themes) =
  let votes = intersection(scrutins où ref a voté, scrutins où target a voté, dans period et themes)
  let communs = votes où ref.position ∈ {pour,contre,abstention} ET target.position ∈ {pour,contre,abstention}
  let identiques = communs où ref.position == target.position
  return {
    score: (identiques / communs) * 100,
    votesCommuns: communs.length,
    details: [...]
  }
```

- Les absences (`nonVotants`) sont exclues du dénominateur.
- Si `votesCommuns < 10`, `warning = true`.

**Fallback client-side (optionnel) :**
Si l'utilisateur compare 2 députés et que leurs votes sont déjà en cache (navigation depuis les fiches), un calcul rapide côté client peut afficher un résultat provisoire avant la confirmation serveur. **Non recommandé pour le MVP** pour éviter la divergence de logique.

### 8.3. Interactions et transitions

- **Sélection** : l'utilisateur clique "Comparer" depuis une fiche député → Zustand mis à jour + redirection `/comparateur?ref=durand`.
- **Ajout** : recherche d'un député dans le comparateur → ajout dans Zustand + mise à jour URL → invalidation query.
- **Changement de période** → mise à jour URL → re-fetch automatique.
- **Partage** : l'URL encodée contient toute la sélection. OG image générée à la volée avec le score.

### 8.4. Performance du comparateur

- **Données** : la réponse API est paginée côté client (virtual scrolling si >100 votes affichés).
- **Tableau** : sur desktop, les colonnes sont sticky (`position: sticky`) pour garder les noms des députés visibles au scroll horizontal.
- **Memoization** : les lignes du tableau sont mémoïsées (`React.memo`) pour éviter les re-renders au changement de filtre.

---

## 9. Performance et Optimisations

### 9.1. Budget de performance

| Métrique | Cible   | Technique                                                                         |
| -------- | ------- | --------------------------------------------------------------------------------- |
| FCP      | < 1.5s  | SSG, polices système, pas de JS blocking, prefetch DNS                            |
| LCP      | < 2.0s  | Images optimisées (WebP/AVIF), `fetchpriority="high"` sur photo député, SSR       |
| INP      | < 200ms | Pas de gros calculs sur le main thread, Workers pour le comparateur si besoin     |
| CLS      | < 0.1   | Dimensions explicites sur images, pas de layout shift au chargement des skeletons |
| TTFB     | < 600ms | Edge deployment, cache CDN, Server Functions rapides                              |

### 9.2. Optimisations techniques

1. **Images**
   - Format AVIF avec fallback WebP/JPEG via `<picture>`.
   - Photos députés : 96×96px (mobile), 192×192px (desktop), chargement eager pour la fiche député.
   - `width` et `height` explicites sur toutes les images.

2. **JavaScript**
   - Code-splitting par route automatique avec TanStack Start.
   - Lazy loading des sections non critiques (graphiques complexes, drawer filtres).
   - `dynamic import` pour Recharts (si utilisé) et le comparateur avancé.

3. **CSS**
   - Purge Tailwind activé (seules les classes utilisées sont embarquées).
   - CSS critique inline pour le header et le hero (éviter le render-blocking stylesheet).

4. **Cache**
   - CDN : `s-maxage=3600, stale-while-revalidate=86400` sur les pages SSG et les OG images.
   - Navigateur : Service Worker minimal pour le offline (cache des pages visitées, pas d'install prompt agressif).
   - TanStack Query : stale-while-revalidate côté client.

5. **Fonts**
   - Pas de fonte externe (système).
   - Pour les OG images, polices subsettées embarquées dans le binaire serveur (Inter ou IBM Plex Sans subset fr).

---

## 10. Accessibilité (WCAG 2.1 AA)

### 10.1. Implémentation systématique

| Critère                     | Implémentation                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **1.4.3 Contraste**         | Tous les tokens de couleur sont vérifiés à ≥ 4.5:1 (texte normal) et ≥ 3:1 (UI). Les badges utilisent du texte sombre sur fond pastel |
| **1.4.1 Couleur**           | Les votes utilisent couleur + texte + icône. Jamais de couleur seule                                                                  |
| **2.1.1 Clavier**           | Tous les éléments interactifs sont atteignables par Tab. Skip link en haut de page                                                    |
| **2.4.3 Focus Order**       | Ordre de tabulation logique. Retour au trigger après fermeture drawer/modale                                                          |
| **2.4.7 Focus Visible**     | Anneau `shadow-focus` (#1D4ED8, 3px) sur tous les éléments interactifs                                                                |
| **4.1.2 Name, Role, Value** | Radix UI fournit les rôles ARIA. Vérification manuelle pour les graphiques (`aria-label` descriptif)                                  |

### 10.2. Patterns ARIA par écran

- **Recherche** : `combobox` + `listbox` + `option`
- **Fiche député onglets** : `tablist`, `tab`, `tabpanel`
- **Page scrutin groupes** : `accordion` (`button aria-expanded`)
- **Comparateur tableau** : `<table>` sémantique avec `scope="col"`, `caption`
- **Filtres actifs** : `aria-live="polite"` sur le compteur de résultats

### 10.3. Tests accessibilité

- **Automatisés** : axe-core dans Vitest pour chaque composant critique.
- **Manuels** : Navigation clavier (Tab, Shift+Tab, Entrée, Espace, Échap).
- **Lecteur d'écran** : VoiceOver (macOS/iOS) et NVDA (Windows) sur les parcours critiques (recherche → fiche → comparateur).

---

## 11. Sécurité et Vie privée

### 11.1. Sécurité frontend

- **CSP (Content Security Policy)** :
  ```
  default-src 'self';
  script-src 'self' 'unsafe-inline' (pour les JSON-LD et les events inline si nécessaire — à réduire);
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://data.assemblee-nationale.fr;
  connect-src 'self' https://api.transparence-votes.fr;
  ```
- **Pas de secrets côté client** : toutes les clés API sont dans les Server Functions.
- **Sanitization** : les données API sont traitées comme non fiables. `dangerouslySetInnerHTML` interdit (sauf pour le JSON-LD encodé).

### 11.2. Vie privée

- **Pas de cookies tiers**.
- **Matomo** auto-hébergé, mode sans consentement (pas de tracking personnel, données anonymisées).
- **Pas de fingerprinting**.
- Bandeau d'information minimal si Matomo est utilisé (pas de bannière de consentement bloquante selon les dernières recommandations CNIL pour l'audience anonymisée).

---

## 12. Points d'attention et Escalations

### 12.1. Ambiguïtés nécessitant une décision

| Sujet                               | Question                                                                                                                                               | Impact                                          | Statut                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------- |
| **API Backend**                     | Le frontend suppose l'existence d'une API REST interne qui agrège les données de l'AN (ZIP bulk). Qui construit cette API ? Quelle techno ? Quel SLA ? | Blocage total si l'API n'est pas prête          | ⚠️ **À valider avec Backend**   |
| **Photos députés**                  | Quelle source pour les photos normalisées ? L'AN fournit des URLs stables ? Fallback si photo manquante ?                                              | UX des fiches députés                           | ⚠️ **À valider avec Backend**   |
| **Thématiques**                     | Qui définit la classification thématique des scrutins ? NLP, manuel, ou source tierce (Datan) ?                                                        | Fonctionnalité filtres et comparateur par thème | ⚠️ **À valider avec Produit**   |
| **OG Image generation**             | Satori + resvg-js fonctionne bien en Node.js. Si déploiement Edge (Cloudflare Workers), resvg-js nécessite une WASM spécifique. Où déploie-t-on ?      | Choix infrastructure                            | ⚠️ **À valider avec Tech Lead** |
| **Comparateur : limite de députés** | UX limite à 5 députés. L'API doit supporter jusqu'à 5 slugs en paramètre.                                                                              | Contrat API                                     | ✅ Spécifié ici                 |

### 12.2. Hypothèses posées

1. Une **API REST interne** sera disponible avec les endpoints suivants :
   - `GET /deputes`, `GET /deputes/:slug`, `GET /deputes/:slug/votes`
   - `GET /scrutins`, `GET /scrutins/:id`, `GET /scrutins/:id/votes`
   - `GET /search?q=...&type=...`
   - `GET /compare?ref=...&compare=...&period=...`
   - `GET /themes` (liste des thématiques)
2. Les données de l'Assemblée nationale sont normalisées côté backend (nettoyage des `acteurRef`, jointure avec les noms, calcul des stats).
3. Les photos des députés sont servies par notre propre CDN (proxy/resize) ou par l'AN avec des URLs stables.
4. L'hébergement supporte Node.js (SSR `dist/server/server.js` après `vite build`) + possibilité de déployer des fonctions serveur.

---

## 13. Livrables et Prochaines étapes

### 13.1. Livrables frontend immédiats

- [ ] **Setup projet** : TanStack Start + Tailwind + TanStack Query + Radix + TypeScript strict
- [ ] **Design tokens** : variables CSS + config Tailwind
- [ ] **Composants base** : Button, Input, BadgeVote, Card, Skeleton, EmptyState, ShareButton
- [ ] **Layout** : Header (sticky, réduit au scroll), Footer, SkipLink, Container responsive
- [ ] **Page Accueil** : HeroSearch + derniers scrutins + thématiques
- [ ] **Page Recherche** : Combobox accessible + résultats députés/scrutins
- [ ] **Page Fiche Député** : Shell SSR + onglet votes avec filtres URL-sync
- [ ] **Page Scrutin** : Résultat global + ventilation par groupe
- [ ] **Comparateur** : Sélection Zustand + tableau comparatif + score concordance
- [ ] **SEO** : Meta dynamiques, sitemap, OG images, JSON-LD
- [ ] **Accessibilité** : Audit axe-core, test clavier, test lecteur écran

### 13.2. Dépendances à valider (Security Engineer)

Avant installation, les packages suivants doivent être audités :

- `satori` + `@resvg/resvg-js` (génération OG images)
- `recharts` (si graphiques complexes requis)
- `zustand` (state management)
- `@radix-ui/*` (primitives — audit léger, bien maintenu)
- `@tanstack/react-start` (plugin Vite — peer Vite ≥ 7, projet en Vite 6)

---

_Document rédigé par le Frontend Developer — 2026-05-19_  
_Prochaine étape : Revue avec l'Architecte (validation des Server Functions et du contrat API) et le Tech Lead (décision hébergement / OG image runtime)._
