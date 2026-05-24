# Avis Produit — Texte des amendements/articles dans les scrutins

**Date :** 2026-05-24
**Auteur :** Product Manager
**Décision :** 🟢 **GO — MVP Phase 2 (fast follow)**

---

## 1. Valeur utilisateur réelle

Le problème est réel et bien identifié :

> _"L'amendement n° 1867 de Mme Trouvé à l'article 10 (examen prioritaire) du projet de loi d'urgence pour la protection et la souveraineté agricoles (première lecture)."_

Aujourd'hui, un citoyen qui s'intéresse à ce vote doit :

1. Lire le titre cryptique
2. Copier le numéro d'amendement
3. Ouvrir Google, chercher "amendement 1867 assemblée nationale"
4. Trouver la page AN, lire le texte
5. Revenir sur Veritas pour voir comment les députés ont voté

C'est **3 à 5 étapes inutiles** qui cassent le parcours et découragent l'engagement. La promesse de Veritas est la **transparence des votes** — si le citoyen ne comprend pas le sujet, la transparence est incomplète.

### Jobs-to-be-done principal

> _Quand je consulte un scrutin, je veux comprendre immédiatement le sujet du vote (ce qui est proposé, argumenté, modifié), pour décider en connaissance de cause si le résultat est bon ou mauvais pour mes valeurs._

### Impact utilisateur

| Segment                | Bénéfice                                                 |
| ---------------------- | -------------------------------------------------------- |
| Citoyen engagé         | Compréhension immédiate, zéro friction                   |
| Journaliste / analyste | Source primaire accessible, pas de recherche Google      |
| Militant / ONG         | Suivi des positions parlementaires sur des sujets précis |

---

## 2. User Story (Connextra)

**En tant que** citoyen consultant un scrutin,
**Je veux** voir le texte intégral de l'amendement ou de l'article de loi concerné par le vote,
**Afin de** comprendre immédiatement le sujet sans avoir à quitter Veritas pour chercher ailleurs.

### Acceptance Criteria (Gherkin)

```
Étant donné un scrutin lié à un amendement (ex: "amendement n° 338 à l'article 5")
Quand j'affiche la page de détail du scrutin
Alors je vois, sous le titre, le texte intégral de l'amendement (contenu + exposé des motifs)
Et un lien vers la page officielle de l'amendement sur le site de l'Assemblée Nationale
```

```
Étant donné un scrutin qui n'est pas lié à un amendement identifiable
Quand j'affiche la page de détail
Alors l'interface n'affiche pas de section vide ou d'erreur — simplement pas de bloc "amendement"
```

```
Étant donné un scrutin lié à un amendement dont le matching automatique a échoué
Quand j'affiche la page de détail
Alors seule l'information disponible est affichée (pas de fallback trompeur)
```

---

## 3. Impact sur le parcours utilisateur

### Page scrutin actuelle

```
┌─────────────────────────────────┐
│ ← Retour                        │
│                                 │
│ Titre du scrutin                │  ← Le problème est ici
│ Date · Type · Résultat          │
│                                 │
│ Votes par groupe                │
│ ┌─────────────────────────────┐ │
│ │ Renaissance    80% Pour     │ │
│ │ RN             90% Contre   │ │
│ └─────────────────────────────┘ │
│                                 │
│ Votes individuels               │
│ ┌─────────────────────────────┐ │
│ │ Dupont, Jean    Pour        │ │
│ │ Martin, Marie   Contre      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Page scrutin avec la feature

```
┌─────────────────────────────────┐
│ ← Retour                        │
│                                 │
│ Titre du scrutin                │
│ Date · Type · Résultat          │
│                                 │
│ 📜 Texte de l'amendement     ▼  │  ← NOUVEAU bloc rétractable
│ ┌─────────────────────────────┐ │
│ │ L'article 5 est ainsi       │ │
│ │ modifié :                   │ │
│ │ "Les objectifs de réduction │ │
│ │ des émissions sont..."      │ │
│ │                             │ │
│ │ 📎 Voir sur le site de l'AN │ │  ← Lien source
│ └─────────────────────────────┘ │
│                                 │
│ Votes par groupe                │
│ ┌─────────────────────────────┐ │
│ │ Renaissance    80% Pour     │ │
│ │ RN             90% Contre   │ │
│ └─────────────────────────────┘ │
│                                 │
│ Votes individuels               │
└─────────────────────────────────┘
```

**Changement UX :** un bloc rétractable entre le titre et les résultats, avec le texte de l'amendement et un lien vers la source officielle.

---

## 4. Métriques de succès

| Métrique                              | Cible              | Comment on mesure                                  |
| ------------------------------------- | ------------------ | -------------------------------------------------- |
| **Taux de rebond page scrutin**       | -15%               | Comparaison avant/après sur les scrutins enrichis  |
| **Temps passé sur la page scrutin**   | +30%               | Les utilisateurs lisent le contenu avant de partir |
| **Clics sur le lien "Voir sur l'AN"** | < 20% des vues     | Si > 20%, c'est que notre affichage est incomplet  |
| **Couverture des scrutins enrichis**  | > 60% des scrutins | % de scrutins qui matchent un amendement           |

---

## 5. Risques

| Risque                                              | Probabilité | Impact | Mitigation                                                                                                                               |
| --------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Matching automatique inexact                        | Moyenne     | Moyen  | Le titre est structuré ("amendement n° X à l'article Y") — le parsing par regex est fiable à ~90%. Le reste est un lien manuel possible. |
| Tous les scrutins ne sont pas des amendements       | Haute       | Faible | On n'affiche rien si pas d'amendement. Pas de dégradation UX.                                                                            |
| Volume de données (20K+ amendements)                | Faible      | Faible | Le zip fait < 100 Mo. PostgreSQL gère ça sans problème.                                                                                  |
| Maintenance : les amendements évoluent              | Moyenne     | Moyen  | L'ETL est conçu pour le re-run. Un `ON CONFLICT UPDATE` gère les mises à jour.                                                           |
| Le texte peut être très long (exposé des motifs)    | Haute       | Faible | UI rétractable par défaut, affichage limité avec "Lire la suite".                                                                        |
| Ne pas confondre avec les articles de loi eux-mêmes | Moyen       | Moyen  | Phase 1 = amendements seulement (dataset AN dispo). Phase 2 = texte des articles de loi (nécessite les dossiers législatifs).            |

---

## 6. Priorisation

### Framework RICE

|                                 | Reach                      | Impact       | Confidence | Effort  | RICE     |
| ------------------------------- | -------------------------- | ------------ | ---------- | ------- | -------- |
| Texte amendements               | 80% des visiteurs scrutins | 4/5 (énorme) | 90%        | 5-8 j/h | **57.6** |
| Recherche full-text avancée     | 30%                        | 3/5          | 70%        | 15 j/h  | 4.2      |
| Notifications nouveaux scrutins | 10%                        | 3/5          | 80%        | 10 j/h  | 2.4      |

La feature est **très haute priorité** — faible effort, fort impact, haute confiance.

### MoSCoW

- **Must have :** ❌ (pas bloquant, le produit fonctionne sans)
- **Should have (Phase 2) :** ✅ — amélioration majeure de l'expérience, différenciant fort
- **Could have :** Liens vers les dossiers législatifs complets

---

## 7. Recommandation

### 🟢 GO — MVP Phase 2

**Justification :**

1. **Problème réel et fréquent :** 80%+ des scrutins sont des amendements. Chaque visiteur de scrutin est concerné.
2. **Faible coût technique :** Le dataset AN existe déjà, le parsing est simple, l'ETL est déjà architecturé pour ce genre d'extension.
3. **Différenciant fort :** Aucun site de transparence parlementaire n'intègre le texte des amendements à côté des votes. Ça fait de Veritas la **référence**.
4. **Aligné avec la vision :** La transparence, c'est pas juste montrer qui a voté quoi — c'est donner au citoyen les clés pour comprendre.

### Scope MVP recommandé

| Inclus                                               | Exclus (Phase 3)                                   |
| ---------------------------------------------------- | -------------------------------------------------- |
| Parsing amendements depuis le zip AN                 | Texte des articles de loi hors amendement          |
| Matching scrutin → amendement via regex sur le titre | Dossiers législatifs complets                      |
| Affichage du contenu + exposé des motifs             | Recherche par contenu d'amendement                 |
| Lien vers la page officielle AN                      | Comparaison côte à côte amendement vs loi actuelle |
| Bloc rétractable dans la page scrutin                |                                                    |

### Non-goals

- Ne pas remplacer le site de l'AN : on affiche, on renvoie à la source
- Ne pas commenter ou analyser le texte : on reste neutre
- Ne pas matcher les scrutins qui ne sont pas des amendements (motions de censure, scrutins solennels sur texte entier, etc.) — on les traitera plus tard
