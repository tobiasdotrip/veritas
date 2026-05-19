# Cahier des charges produit — Transparence des votes des députés français

**Version** : 1.0  
**Date** : 2026-05-19  
**Statut** : Brouillon — En cours de validation  
**Produit** : Plateforme web de transparence parlementaire ( MVP → V1 )

---

## 1. Vision & Contexte

### 1.1 Problème
Les citoyens français n’ont pas accès à une vision simple, comparative et actionnable des votes de leurs députés. Les données existent (OpenData de l’Assemblée nationale), mais elles sont fragmentées, techniques et difficilement réutilisables par un public non averti.

### 1.2 Proposition de valeur
Une plateforme web **gratuite**, **accessible** et **virale**, qui permet à tout citoyen, journaliste ou chercheur de :
- Retrouver instantanément la position de vote d’un député sur un texte précis
- Comparer un député à son groupe politique et à la moyenne de l’hémicycle
- Partager facilement des faits vérifiables sur les réseaux sociaux

### 1.3 Cible principale
**Tout citoyen français majeur**, sans compétence technique, sur mobile et desktop.

---

## 2. Personas utilisateurs

### 2.1 Clara — Citoyenne lambda
- **Profil** : 34 ans, employée administrative, non technique, consulte son téléphone pour s’informer.
- **Contexte** : Entend parler d’une loi controversée à la radio et veut savoir si son député l’a soutenue.
- **Besoins** : Recherche ultra-rapide (nom du député ou code postal), réponse en 3 clics, langage simple.
- **Frustrations** : Ne comprend pas les sigles parlementaires, ne sait pas interpréter un scrutin public.
- **Objectif** : "Mon député a-t-il voté pour ou contre X ?"

### 2.2 Thomas — Journaliste politique
- **Profil** : 42 ans, rédacteur dans un média en ligne, travaille sous deadline.
- **Contexte** : Prépare un article sur les défections au sein d’un groupe politique lors d’un vote récent.
- **Besoins** : Données vérifiables, export rapide, comparaison groupe/députés, source clairement citée.
- **Frustrations** : Doit parser des fichiers XML ou PDF pour obtenir une liste de votes.
- **Objectif** : "Qui a voté contre la ligne du groupe sur tel texte ?"

### 2.3 Samira — Militante associative
- **Profil** : 29 ans, responsable plaidoyer dans une ONG environnementale.
- **Contexte** : Veut identifier les députés "swing" à convaincre avant un prochain vote.
- **Besoins** : Suivi thématique (écologie, santé, éducation), alertes sur les votes à venir, fiches de position.
- **Frustrations** : Aucun outil ne permet de suivre un député sur une thématique précise sur le long terme.
- **Objectif** : "Quels députés modèrent leur position sur l’écologie ?"

### 2.4 Prof. Dubois — Chercheur en science politique
- **Profil** : 55 ans, enseignant-chercheur, analyse les comportements législatifs.
- **Contexte** : Mène une étude statistique sur la cohésion des groupes parlementaires sur 5 ans.
- **Besoins** : Accès aux données brutes, API stable, historique complet, métadonnées précises (date, type de scrutin, amendements).
- **Frustrations** : Le format et la structure des données publiées changent sans préavis.
- **Objectif** : "Puis-je corréler le taux de participation avec la taille du groupe ?"

---

## 3. User stories priorisées

### 3.1 Méthode de priorisation
**MoSCoW** appliqué sur deux axes : valeur utilisateur (citoyen lambda d’abord) et faisabilité technique avec les données ouvertes existantes.

### 3.2 MVP — Must Have

#### US-MVP-01 : Recherche d’un député
> **En tant que** citoyenne lambda (Clara),  
> **Je veux** rechercher mon député par nom, prénom ou code postal,  
> **Afin de** accéder à sa fiche en moins de 10 secondes.

**Critères d’acceptation (Gherkin)** :
```gherkin
Étant donné que je suis sur la page d’accueil
Quand je saisis "Martin" ou "75001" dans la barre de recherche
Alors je vois une liste de résultats cliquables en moins de 500 ms
Et chaque résultat affiche : nom, prénom, circonscription, groupe politique, photo
```

#### US-MVP-02 : Fiche député synthétique
> **En tant que** citoyenne lambda,  
> **Je veux** consulter une fiche claire avec la photo, l’étiquette politique, le groupe et les statistiques clés,  
> **Afin de** m’y retrouver sans connaître le jargon parlementaire.

**Critères d’acceptation** :
```gherkin
Étant donné que j’ai sélectionné un député
Alors je vois : taux de participation aux votes, taux de cohésion avec son groupe, nombre de votes "contre" son groupe
Et les termes sont expliqués par des infobulles (tooltips)
```

#### US-MVP-03 : Historique des votes
> **En tant que** citoyenne lambda,  
> **Je veux** voir la liste des votes récents d’un député avec sa position (Pour/Contre/Abstention/Absent),  
> **Afin de** savoir s’il a voté pour ou contre un texte précis.

**Critères d’acceptation** :
```gherkin
Étant donné que je suis sur la fiche d’un député
Quand je clique sur l’onglet "Votes"
Alors je vois les 20 derniers scrutins sous forme de liste chronologique
Et chaque scrutin indique : date, titre du texte, position du député, position du groupe
```

#### US-MVP-04 : Comparaison avec le groupe politique
> **En tant que** citoyenne lambda,  
> **Je veux** voir en un coup d’œil si mon député vote différemment de son groupe,  
> **Afin de** comprendre son indépendance ou sa discipline de vote.

**Critères d’acceptation** :
```gherkin
Étant donné un scrutin affiché sur la fiche d’un député
Alors une icône visuelle (✅ identique / ⚠️ différent / ❌ opposé) indique l’alignement avec le groupe
Et je peux filtrer pour ne voir que les votes en désaccord avec le groupe
```

#### US-MVP-05 : Partage sur les réseaux sociaux
> **En tant que** utilisateur,  
> **Je veux** partager une statistique ou un vote spécifique sur Twitter/X, Facebook, Bluesky ou WhatsApp,  
> **Afin de** alerter mon entourage ou alimenter un débat.

**Critères d’acceptation** :
```gherkin
Étant donné que je visualise un vote ou une statistique
Quand je clique sur "Partager"
Alors une image/carte générée automatiquement (OG image + texte pré-rédigé) est proposée
Et l’URL partagée pointe directement vers la fiche ou le vote concerné
```

#### US-MVP-06 : Recherche par scrutin / texte
> **En tant que** journaliste (Thomas),  
> **Je veux** rechercher un vote par mot-clé ou date,  
> **Afin de** identifier rapidement les positions de tous les députés sur ce texte.

**Critères d’acceptation** :
```gherkin
Étant donné que je saisis "retraite" dans la recherche globale
Alors je vois une liste de scrutins correspondants
Et en cliquant sur un scrutin, j’accède à la liste complète des votes (Pour/Contre/Abstention/Absent)
```

### 3.3 Phase 2 — Should Have (V1 complète)

#### US-V1-07 : Tableau de bord thématique
> **En tant que** militante (Samira),  
> **Je veux** suivre une thématique (ex: "climat") et voir un classement des députés,  
> **Afin d**'orienter mon action de plaidoyer.

#### US-V1-08 : Alertes et notifications
> **En tant que** citoyen engagé,  
> **Je veux** m’abonner par email à un député ou une thématique,  
> **Afin de** recevoir une alerte dès qu’un nouveau vote est publié.

#### US-V1-09 : Export de données
> **En tant que** chercheur (Dubois) ou journaliste,  
> **Je veux** exporter les données d’un député ou d’un scrutin en CSV/JSON,  
> **Afin de** les réutiliser dans mes propres outils d’analyse.

#### US-V1-10 : API publique
> **En tant que** chercheur ou développeur,  
> **Je veux** accéder à une API documentée et stable,  
> **Afin de** récupérer les données brutes sans scraping.

### 3.4 Backlog — Could Have

- **Classements et badges** : "Député le plus présent", "Le plus rebelle" (attention aux biais méthodologiques)
- **Commentaires citoyens** : Débat modéré sous chaque vote (risque modération + légal)
- **Comparateur côte-à-côte** : Comparer visuellement deux députés
- **Application mobile native** : PWA en priorité, native plus tard si traction
- **Notifications navigateur (Web Push)** : Complément des emails

### 3.5 Won’t Have (Non-goals explicites)

- **Recueil de pétitions** : Hors scope, c’est un outil d’information, pas d’action citoyenne directe
- **Notation ou jugement de valeur** : On affiche les faits, pas de score global "bon/mauvais député" (éviter le biais éditorial)
- **Monétisation par publicité ciblée** : Pas de tracking publicitaire tiers
- **Couverture des sénateurs ou élus locaux** : Focus députés à l’Assemblée nationale uniquement dans la V1

---

## 4. Fonctionnalités MVP vs V1

| # | Fonctionnalité | MVP (Must Ship) | V1 (Fast Follow) |
|---|----------------|-----------------|------------------|
| 1 | Recherche député (nom, CP) | ✅ | — |
| 2 | Fiche député avec stats clés | ✅ | — |
| 3 | Historique des votes détaillé | ✅ | — |
| 4 | Alignement député vs groupe | ✅ | — |
| 5 | Recherche par scrutin/texte | ✅ | — |
| 6 | Partage social + cartes générées | ✅ | — |
| 7 | Accessibilité WCAG 2.1 AA | ✅ | — |
| 8 | Design responsive mobile-first | ✅ | — |
| 9 | Alertes email thématiques/député | — | ✅ |
| 10 | Tableaux de bord par thématique | — | ✅ |
| 11 | Export CSV / JSON | — | ✅ |
| 12 | API publique documentée | — | ✅ |
| 13 | Inscription compte utilisateur | — | ✅ (pour alertes) |
| 14 | Page "Qui sommes-nous ? / Méthodologie" | ✅ | — |

---

## 5. Questions métier que les utilisateurs veulent résoudre

Ces questions doivent être répondables en **3 clics maximum** depuis la page d’accueil.

### 5.1 Questions individuelles (citoyen)
1. **Mon député a-t-il voté pour ou contre X ?**
2. **Quel est le taux de participation de mon député aux votes ?**
3. **Mon député vote-t-il comme son groupe politique ?**
4. **Mon député est-il souvent absent ?**
5. **Quels sont les derniers textes sur lesquels il s’est prononcé ?**

### 5.2 Questions comparatives / collectives (journaliste, militant)
6. **Quels députés ont voté contre la ligne de leur groupe sur tel texte ?**
7. **Quel est le groupe le plus discipliné / le plus fragmenté ?**
8. **Quels députés ont le plus haut taux de participation ?**
9. **Sur la thématique "écologie", quels députés sont les plus actifs ?**

### 5.3 Questions analytiques (chercheur)
10. **Comment le taux de cohésion d’un groupe évolue-t-il sur la législature ?**
11. **Y a-t-il une corrélation entre taille du groupe et discipline de vote ?**
12. **Les députés de telle commission votent-ils différemment sur leurs sujets de compétence ?**

---

## 6. Alertes et notifications

### 6.1 MVP — Pas de notification temps réel
Le MVP se concentre sur la consultation à la demande. Les alertes demandent une infrastructure email et une gestion de consentement (opt-in).

### 6.2 V1 — Alertes email

| Type | Déclencheur | Destinataire | Fréquence |
|------|-------------|--------------|-----------|
| **Nouveau scrutin sur un sujet suivi** | Publication d’un vote lié à une thématique (tags) | Utilisateur inscrit | Immédiat ou digest quotidien |
| **Nouveau vote d’un député suivi** | Publication d’un scrutin auquel le député a participé | Utilisateur inscrit | Digest quotidien (éviter le spam) |
| **Anomalie détectée** | Vote en désaccord majeur avec le groupe (exceptionnel) | Abonnés thématique | Immédiat |
| **Rappel législatif** | Ouverture d’une session sur un sujet suivi | Utilisateur inscrit | 24h avant |

### 6.3 Consentement & conformité
- Opt-in explicite (case à cocher décochée par défaut)
- Lien de désinscription dans chaque email
- Conservation de la preuve de consentement (horodatage + IP)
- Pas de partage des adresses avec des tiers

---

## 7. Aspects légaux et éthiques

### 7.1 Réutilisation des données publiques
- **Source principale** : OpenData de l’Assemblée nationale (data.assemblee-nationale.fr)
- **Cadre légal** : Loi pour une République numérique (2016) + Directive INSPIRE / Open Data
- **Licence** : Vérifier la licence appliquée par l’Assemblée (généralement Licence Ouverte / Open Licence 2.0). Mentionner la source est obligatoire.
- **Obligation** : Page "Méthodologie & Sources" citant explicitement l’origine des données et la date de dernière synchronisation.

### 7.2 RGPD / Protection des données
- **Données des députés** : Les données relatives aux parlementaires dans l’exercice de leur mandat sont des données publiques. Cependant, la photo, la biographie et les coordonnées doivent être utilisées dans un but d’information du public (légitime).
- **Données des utilisateurs** :
  - Si inscription (alertes email) : collecte minimale (email uniquement, pas de nom obligatoire)
  - Base légale : consentement explicite (art. 6.1.a RGPD)
  - Durée de conservation : email conservé tant que l’utilisateur est abonné + 1 an après désinscription (preuve), puis anonymisation
  - Droit à l’effacement : possible via email ou espace personnel
- **Cookies & traçage** :
  - Cookies techniques uniquement dans l’idéal
  - Si analytics (Matomo recommandé, pas Google Analytics pour la souveraineté) : bandeau d’information + opt-out possible
  - Pas de cookies publicitaires ni de profilage comportemental
- **Hébergement** : Recommandé en UE (ou France) pour éviter les transferts extra-UE de données personnelles.

### 7.3 Responsabilité éditoriale
- **Neutralité** : L’outil ne doit pas émettre de jugement de valeur. Les statistiques doivent être contextualisées (ex: un député ministre a un taux de participation plus faible pour des raisons institutionnelles).
- **Mentions légales** : Obligatoires (éditeur, hébergeur, contact DPO)
- **Droit de réponse** : Prévoir un mécanisme de signalement d’erreur de données (pas un droit de réponse éditorial classique, mais une correction technique si la donnée brute est mal interprétée).

---

## 8. Indicateurs clés de succès (KPIs)

### 8.1 Adoption & Trafic
| KPI | Cible MVP (3 mois) | Cible V1 (12 mois) | Méthode de mesure |
|-----|-------------------|-------------------|-------------------|
| Visiteurs uniques mensuels | 50 000 | 300 000 | Analytics (Matomo) |
| Taux de rebond | < 40 % | < 35 % | Analytics |
| Temps moyen sur site | > 2 min 30 | > 3 min | Analytics |
| Partages sur RS par mois | 5 000 | 30 000 | Compteur de clics + UTM |

### 8.2 Utilisation des fonctionnalités clés
| KPI | Cible MVP | Cible V1 | Méthode |
|-----|-----------|----------|---------|
| % recherches aboutissant à une fiche député | > 80 % | > 85 % | Events analytics |
| % utilisateurs consultant l’onglet "Votes" | > 60 % | > 65 % | Events analytics |
| Taux de partage depuis une fiche/vote | > 5 % | > 8 % | Events analytics |
| Taux d’inscription aux alertes (V1) | N/A | > 3 % des visiteurs récurrents | Events + base de données |

### 8.3 Qualité & Fiabilité
| KPI | Cible | Méthode |
|-----|-------|---------|
| Temps de synchronisation des nouveaux scrutins | < 4h après publication | Monitoring ETL |
| Précision des données affichées | 100 % (aucune erreur de transcription) | Tests automatisés + audit mensuel |
| Uptime | > 99.5 % | Monitoring technique |

### 8.4 Impact démocratique (qualitatif)
- Nombre de citations dans des articles de presse (veille manuelle ou Google Alerts)
- Retours utilisateurs via formulaire "Vous avez une idée ?"
- Nombre de réutilisations par des chercheurs (API key tracking)

---

## 9. Exigences non-fonctionnelles

### 9.1 Accessibilité
- **Norme cible** : WCAG 2.1 niveau AA (idéal : viser AAA sur le contraste)
- **Obligations** :
  - Textes alternatifs sur toutes les images (photos de députés, icônes)
  - Navigation complète au clavier (tabindex logique)
  - Lecteur d’écran compatible (ARIA labels sur les graphiques et tableaux de votes)
  - Contraste minimum 4.5:1 pour le texte courant
  - Pas d’information transmise uniquement par la couleur (ex: vert/rouge doit être doublé d’une icône ou d’un texte)
- **Test** : Audit automatique (Lighthouse) + test manuel avec NVDA ou VoiceOver

### 9.2 Performance
- **First Contentful Paint** : < 1.5s sur 4G
- **Time to Interactive** : < 3s sur 4G
- **Lighthouse Performance score** : > 90
- **Pages lentes** : Les pages fiches députés et scrutins doivent être générées statiquement (SSG) ou mises en cache pour tenir la charge virale.

### 9.3 SEO & Viralité
- **URLs propres** : `/depute/nom-prenom`, `/scrutin/numero-loi`, `/thematique/climat`
- **Meta OG / Twitter Cards** : Génération dynamique d’images de partage (og:image) avec le nom du député, la statistique clé et le logo du site
- **Schema.org** : Markup `Person` pour les députés, `GovernmentOrganization` pour les groupes
- **Sitemap XML** : Mis à jour quotidiennement

### 9.4 Internationalisation (future-proof)
- Interface en français uniquement pour la V1
- Structure du code prévue pour l’i18n (anglais, langues régionales) en Phase 2 si audience internationale (observatoires étrangers)

---

## 10. Définition de Done (Definition of Done)

Une user story est considérée comme terminée lorsque :
- [ ] Le code est revu et mergé sur la branche principale
- [ ] Les tests automatisés (unitaires + intégration) passent
- [ ] Les critères d’acceptation sont validés par un test manuel
- [ ] L’accessibilité est vérifiée (Lighthouse a11y > 90 + test clavier)
- [ ] La fonctionnalité fonctionne sur mobile (iOS Safari + Android Chrome)
- [ ] La documentation utilisateur (FAQ) ou méthodologique est mise à jour si nécessaire
- [ ] Les métriques d’usage sont instrumentées (event tracking)
- [ ] Le product manager a donné son Go pour mise en production

---

## 11. Roadmap & Jalons

| Jalon | Contenu | Durée estimée |
|-------|---------|---------------|
| **Jalon 1 — Data & Architecture** | Connecteur OpenData, modèle de données, pipeline ETL | Semaine 1-2 |
| **Jalon 2 — MVP Core** | Recherche, fiches, votes, comparaison groupe | Semaine 3-6 |
| **Jalon 3 — Polissage MVP** | Accessibilité, SEO, partage RS, tests de charge | Semaine 7-8 |
| **Release MVP** | Mise en ligne, communication initiale | Fin mois 2 |
| **Jalon 4 — V1 Alertes & Thématiques** | Inscription, alertes email, dashboards thématiques | Mois 3-4 |
| **Jalon 5 — V1 Data & API** | Export CSV, API publique, documentation | Mois 4-5 |
| **Release V1** | Communication ciblée presse & chercheurs | Fin mois 5 |

---

## 12. Questions ouvertes & Risques

### 12.1 Questions ouvertes (à valider avec le sponsor / architecte)
1. **Source de données** : Quelle API ou quel flux utiliser exactement (API Assemblée nationale, NosDéputés.fr, scraping indirect) ? Quelle est la latence de mise à jour ?
2. **Budget hébergement** : Quel trafic viral attendu ? CDN + hébergement serverless (Vercel/Netlify) ou serveur dédié ?
3. **Modération** : Si on ajoute des commentaires plus tard, quel est le budget modération ?
4. **Partenariats** : Existe-t-il des partenariats potentiels avec des médias ou des ONG pour la diffusion ?

### 12.2 Risques identifiés
| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Changement de format des données OpenData | Moyenne | Élevé | Abstraction du connecteur ETL + monitoring quotidien |
| Charge virale imprévue (pic de trafic) | Moyenne | Moyen | Architecture serverless / cache agressif / CDN |
| Accusation de partialité politique | Élevée | Élevé | Charte éditoriale stricte, neutralité algorithmique, comité de conseil pluraliste |
| Mauvaise interprétation des votes (ex: vote de procuration) | Moyenne | Élevé | Page méthodologie très détaillée, distinction vote nominal / scrutin public |
| RGPD — collecte email non conforme | Faible | Élevé | DPO interne ou externe, registre des traitements, opt-in explicite |

---

## 13. Synthèse pour l’architecte & le designer

### Pour l’UX-Designer
- **Priorité #1** : La recherche et la fiche député doivent être compréhensibles par une personne de 65 ans sur un smartphone de 5 pouces.
- **Contraintes** : Palette neutre (pas de couleurs de parti), iconographie explicite, textes courts.
- **Livrables attendus** : Wireframes mobile-first ( homepage, recherche, fiche député, page scrutin ), user flow "3 clics pour répondre à sa question", design tokens accessibles (contraste AA minimum).

### Pour l’Architecte
- **Données** : Besoin d’un pipeline fiable depuis l’OpenData de l’Assemblée nationale.
- **Performance** : SSG / ISR recommandé pour les fiches députés (contenu quasi-statique, fort trafic viral).
- **Sécurité** : Pas de données sensibles utilisateurs en MVP, mais prévoir l’authentification légère pour les alertes V1 (Magic Link ou OAuth sans mot de passe stocké).
- **API** : Exposer tôt une API REST (même en V1) pour permettre la réutilisation par des tiers et valider la qualité des données.

---

## 14. Références

- Assemblée nationale — OpenData : https://data.assemblee-nationale.fr/
- Licence Ouverte Etalab 2.0
- Référentiel Général d’Amélioration de l’Accessibilité (RGAA) v4
- WCAG 2.1 niveau AA
- Loi n° 2016-1321 pour une République numérique
- Règlement (UE) 2016/679 (RGPD)

---

*Document rédigé par le Product Manager — 2026-05-19*  
*Prochaine étape : Revue avec le sponsor, puis lancement des ateliers UX et architecture technique.*
