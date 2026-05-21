# 🔒 Rapport d'Audit Sécurité — Stack Veritas

**Date** : 2026-05-19  
**Mise à jour** : 2026-05-20  
**Scope** : Dépendances runtime, transitives et infrastructure (12 derniers mois)  
**Méthodologie** : CVE database, npm audit, GitHub Security Advisories  

**Mitigations code (2026-05-20)** : voir [ETAT_PROJET.md](./ETAT_PROJET.md#sécurité-mitigations-en-place).

---

## Compromission supply-chain TanStack (CVE-2026-45321)

**Date** : 2026-05-11 (fenêtre 19:20–19:26 UTC) · **Sévérité** : Critique (CVSS 9.6) · [GHSA-g7cv-rxg3-hmpx](https://github.com/TanStack/router/security/advisories/GHSA-g7cv-rxg3-hmpx)

84 versions malveillantes de **42 paquets `@tanstack/*` Router/Start** (pas `@tanstack/react-query`). Malware au `npm install` via `optionalDependencies["@tanstack/setup"]` et fichier `router_init.js`.

### Veritas (état du lockfile)

| Paquet projet | Verdict |
|---------------|---------|
| `@tanstack/react-router`, `react-start`, `router-*`, `start-*` | Versions lockées **hors** la liste GHSA ; contrôle IOC **OK** (pas de `@tanstack/setup` / `router_init.js`) |
| `@tanstack/react-query` | Famille **non touchée** par l’incident |

**Versions minimales post-incident** (frontend) : `react-router >= 1.170.5`, `react-start >= 1.168.7`, `router-plugin >= 1.168.7`.

**Vérification locale** : `pnpm audit:tanstack` (script `scripts/audit-tanstack-packages.mjs`).

**Si install le 2026-05-11 entre 19:20 et 19:30 UTC** : considérer la machine compromise ; rotation AWS/GCP/K8s/Vault/GitHub/npm/SSH. TanStack [all-clear 2026-05-15](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem).

---

## ⚠️ Verdict Global

| Statut | Détail |
|--------|--------|
| **🔴 CORRECTIONS REQUISES** | Plusieurs vulnérabilités **HIGH/CRITICAL** dans les versions initialement proposées. Les documents d'architecture ont été mis à jour avec les versions corrigées. |

### Blockers corrigés dans les specs

| # | Composant | Problème | Version corrigée |
|---|-----------|----------|-----------------|
| 1 | **Fastify 4.x** | EOL juin 2025 + CVE HIGH bypass validation body | **5.8.x** |
| 2 | **Drizzle ORM < 0.45.2** | CVE SQL injection (CVE-2026-39356) | **0.45.2** |
| 3 | **PostgreSQL 15/16** | 10 CVEs 2026 (RCE, buffer overflow, injection SQL) | **17.x** |
| 4 | **Redis 7** | CVE CRITICAL RCE Lua (CVE-2025-49844) | **8.0.x** |
| 5 | **Meilisearch 1.6** | Path traversal + obsolète (non supportée) | **1.41.x** |

---

## 📋 Inventaire des CVE critiques

### Fastify 4.x → Migration 5.8.x obligatoire

| CVE | Sévérité | CVSS | Description |
|-----|----------|------|-------------|
| CVE-2026-25223 | 🔴 HIGH | 7.5 | Bypass validation body via `\t` dans `Content-Type` |
| CVE-2026-6321 | 🔴 HIGH | — | `fast-uri` : validation URI incorrecte |
| CVE-2026-6322 | 🔴 HIGH | — | `fast-uri` : injection de protocole |

> Fastify v4 n'est plus maintenu. Les correctifs de sécurité 2026 ne sont pas backportés.

### Drizzle ORM → Upgrade 0.45.2 obligatoire

| CVE | Sévérité | Description |
|-----|----------|-------------|
| CVE-2026-39356 | 🔴 HIGH | SQL injection via identifiants SQL mal échappés |

### PostgreSQL 15/16 → Upgrade 17.x recommandé

| CVE | Sévérité | Description |
|-----|----------|-------------|
| CVE-2026-6638 | 🔴 HIGH | SQL injection via `REFRESH PUBLICATION` |
| CVE-2026-6637 | 🔴 HIGH | Stack buffer overflow + SQL injection `refint` |
| CVE-2026-6477 | 🔴 HIGH | `libpq` : écrasement stack mémoire client |
| CVE-2026-6475 | 🔴 HIGH | `pg_basebackup` : écrasement fichiers arbitraires |
| CVE-2026-6473 | 🔴 HIGH | Integer wraparound allocations sous-dimensionnées |
| + 5 autres MEDIUM/LOW | | |

### Redis 7 → Upgrade 8.0.x obligatoire

| CVE | Sévérité | Description |
|-----|----------|-------------|
| CVE-2025-49844 | 🔴 **CRITICAL** | Use-After-Free Lua → RCE possible |
| CVE-2026-25243 | 🔴 HIGH | RCE via commande `RESTORE` |
| CVE-2026-23479 | 🔴 HIGH | Use-After-Free `unblock client` |
| CVE-2025-46817 | 🔴 HIGH | Integer overflow commandes Lua |
| + 4 autres | | |

### Meilisearch 1.6 → Upgrade 1.41.x

| Vulnérabilité | Description |
|---------------|-------------|
| Path Traversal | Dump import — toutes versions < 1.33.0 |
| Obsolescence | Version 1.6 non supportée, pas de backport sécurité |

---

## ✅ Dépendances propres (aucune CVE)

| Package | Version | Statut |
|---------|---------|--------|
| Zod | 4.4.3 | ✅ Implémenté (override pnpm racine) |
| h3 | ≥ 1.15.9 | ✅ Override pnpm racine (Vinxi retiré du frontend) |
| BullMQ | 5.76.x | ✅ Approuvé |
| React | 19.2.x | ✅ Approuvé |
| TanStack Query | 5.100.x | ✅ Approuvé |
| Tailwind CSS | 4.3.x | ✅ Approuvé |
| Zustand | 5.0.x | ✅ Approuvé |
| Radix UI | 1.4.x | ✅ Approuvé |

---

## 🛡️ Stratégie de maintenance

### CI/CD Security
```yaml
# .github/workflows/security.yml
- name: Audit dépendances
  run: npm audit --audit-level=high
- name: Scan Trivy
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scanners: 'vuln'
    severity: 'HIGH,CRITICAL'
```

### Outils recommandés
| Outil | Rôle |
|-------|------|
| **Dependabot / Renovate** | PR automatiques de mise à jour |
| **npm audit / pnpm audit** | Scan CVEs à chaque PR |
| **Trivy** | Scan filesystem + containers |
| **OSV-Scanner** | Scan alternatif OSV |

### SLAs de patch
| Sévérité | SLA |
|----------|-----|
| 🔴 CRITICAL | 24–48h |
| 🔴 HIGH | 7 jours |
| 🟡 MEDIUM | 30 jours |
| 🟢 LOW | 90 jours |

### Hardening infrastructure
- **PostgreSQL** : `pg_hba.conf` restrictif, SSL obligatoire, rôle `LEAST PRIVILEGE`
- **Redis** : `requirepass`, `rename-command FLUSHDB/FLUSHALL ""`, bind interne uniquement
- **Meilisearch** : Jamais exposé publiquement, `MEILI_MASTER_KEY` fort
- **Pinning strict** : Versions exactes dans `package.json` + `package-lock.json` commité

---

*Document rédigé par le Security Engineer — 2026-05-19*
