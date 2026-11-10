# Synchronisation avec NousResearch/hermes-agent

Objectif : intégrer les nouveautés upstream aussi souvent que possible, sans jamais réécrire
l'historique, sans force-push, sans masquer un conflit et sans perdre une personnalisation Corta.

## Organisation Git

| Remote | URL | Branche |
|---|---|---|
| `origin` | `https://github.com/Corta-Pampa/hermes-agent` | `main` — branche Corta |
| `upstream` | `https://github.com/NousResearch/hermes-agent.git` | `main` |

Branches de travail : `corta/sync/upstream-AAAAMMJJ` (une par synchronisation). On fusionne upstream
dans une branche de sync, on teste, puis on ouvre une PR vers `main`. On ne rebase jamais `main`.

Prérequis une fois par clone :

```sh
git remote -v
git remote add upstream https://github.com/NousResearch/hermes-agent.git   # seulement s'il est absent
git config merge.ours.driver true    # active la règle merge=ours de .gitattributes
git fetch --unshallow origin         # si le clone est superficiel (sinon pas de base de fusion)
```

## Procédure scriptée (recommandée)

```sh
corta/scripts/sync-upstream.sh --report      # rapport seul : commits entrants, tags, points de contact
corta/scripts/sync-upstream.sh               # crée corta/sync/upstream-<date> et fusionne upstream/main
REPORT_FILE=sync.md corta/scripts/sync-upstream.sh   # écrit aussi le rapport en markdown
```

Le script : vérifie `upstream` (l'ajoute s'il manque, **refuse** s'il pointe ailleurs), exige un arbre
propre, récupère `upstream/main` et les tags de release `v*`, produit le rapport, crée la branche de
sync depuis `origin/main`, lance `git merge --no-ff upstream/main`. En cas de conflit il **s'arrête**,
laisse la fusion en cours, liste les fichiers en conflit et signale ceux qui sont des points de contact
Corta. Il ne pousse rien.

## Procédure manuelle équivalente

```sh
git fetch upstream
git checkout main && git pull origin main
git checkout -b corta/sync/upstream-$(date -u +%Y%m%d)
git merge --no-ff upstream/main
```

Comparer les deux dépôts :

```sh
git log --oneline upstream/main..main     # commits propres à Corta (personnalisations + fusions)
git log --oneline main..upstream/main     # commits upstream pas encore intégrés
git diff upstream/main...main             # tout ce que Corta change par rapport à upstream
git diff --stat upstream/main...main
git diff upstream/main...main -- apps/desktop/electron/main.ts   # un point de contact précis
```

## Types de commits

- **Commits upstream récupérés** : arrivent par la fusion ; ne jamais les modifier ni les cherry-picker
  à la main dans `main`.
- **Personnalisations Corta** : commits de `upstream/main..main` touchant `corta/`, `apps/desktop/branding/`,
  `apps/desktop/src/branding/` et les points de contact ci-dessous.
- **Commits à réappliquer** : une personnalisation dans un fichier qu'upstream a réécrit. Git la signale en
  conflit ; on reprend la nouvelle version upstream et on y réapplique le bloc `CORTA CUSTOMIZATION`.

## Résolution des conflits

1. `git diff --name-only --diff-filter=U` — liste des conflits (le script la donne aussi).
2. Pour un **point de contact Corta** : prendre la version upstream comme base, réappliquer le bloc
   `CORTA CUSTOMIZATION` (son intention est décrite dans le commentaire et dans le tableau ci-dessous).
3. Pour un fichier **sans** personnalisation Corta : en général la version upstream (`git checkout --theirs`)
   — vérifier qu'aucun commit Corta ne l'a touché (`git log upstream/main..main -- <fichier>`).
4. `README.md` et les icônes Corta : réglés automatiquement par `merge=ours` (si le pilote est activé).
5. Jamais : supprimer une personnalisation pour « faire passer » la fusion, écraser tout un fichier par
   une version sans relire, `git push --force`, `git rebase` de `main`.
6. `git merge --abort` ramène à l'état d'avant la fusion à tout moment.

## Tests après fusion

```sh
source ./activate && pnpm install --frozen-lockfile
cd apps/desktop
export NODE_OPTIONS=--max-old-space-size=8192
pnpm run typecheck && pnpm run lint
pnpm exec vitest run --project ui                     # tests UI upstream + contrats de marque Corta
pnpm exec vitest run --project electron electron/product-identity-brand.test.ts electron/product-identity.test.ts
pnpm run build:corta && pnpm run pack:corta           # build réel de Corta Desktop Remote
grep -rn "CORTA CUSTOMIZATION" apps/desktop | wc -l   # les points d'accroche sont toujours là
```

Côté serveur, valider la même révision avec la suite Python upstream (`scripts/run_tests.sh`) avant de
la déployer chez un client. Puis pousser la branche de sync et ouvrir une PR vers `main`.

## Automatisation (GitHub Actions)

`.github/workflows/corta-upstream-sync.yml` — chaque jour ouvré à 05:17 UTC et à la demande :
rapport (commits, nouveaux tags de release, points de contact modifiés des deux côtés) dans le résumé du
job et en artefact ; fusion dans `corta/sync/upstream-<date>` ; si conflit : échec rouge, **rien n'est
poussé** ; si fusion propre : typecheck, lint, tests UI, contrats d'identité, build Corta Light, puis push
de la branche de sync (jamais `main`) et, si `CORTA_SYNC_OPEN_PR=true`, ouverture d'une PR. Aucun build
d'installateur, aucune publication.

**Fusions qui touchent `.github/workflows/`.** GitHub refuse tout push du `GITHUB_TOKEN` qui crée ou
modifie un workflow (`refusing to allow a GitHub App to create or update workflow … without workflows
permission`), et cette permission ne peut pas lui être accordée. Upstream modifie souvent ses workflows,
donc :

- avec le secret `CORTA_SYNC_TOKEN` (fine-grained PAT limité à ce dépôt, permissions **Contents** et
  **Workflows** en lecture/écriture), le job pousse la branche de sync avec ce token. Le token n'est
  exposé qu'à l'étape de push, jamais aux étapes d'installation et de build qui exécutent du code upstream ;
- sans ce secret, le job échoue juste après la fusion (avant les builds), liste les workflows modifiés
  dans le résumé, et la sync se pousse en local : `bash corta/scripts/sync-upstream.sh`, les
  vérifications ci-dessus, puis `git push origin corta/sync/upstream-<date>`.

Une branche poussée avec le PAT déclenche les workflows `push` du fork (pas celle poussée avec
`GITHUB_TOKEN`) : d'où l'intérêt de désactiver les workflows upstream (ci-dessous).

Les workflows upstream (46) arrivent aussi dans le fork. Ils tournent sur des runners `blacksmith-*` et
utilisent des secrets Nous : **les désactiver dans l'interface GitHub** (Actions → workflow → Disable),
ce qui ne modifie aucun fichier et n'introduit donc pas de conflit. À désactiver en priorité :
`canary-release.yml` (planifié), `stable-release*.yml`, `desktop-bundled-release.yml`, `deploy-site.yml`,
`docker.yml`, `skills-index*.yml`, `docs-search-monitor.yml`, `osv-scanner.yml`.

## Points de contact

Fichiers upstream modifiés par Corta (à surveiller à chaque fusion). Les fichiers Corta-only
(`corta/`, `apps/desktop/branding/`, `apps/desktop/src/branding/`, `electron/brand-name.ts`,
`electron/product-identity-brand.test.ts`, le workflow) ne peuvent pas entrer en conflit.

| Fichier | Personnalisation | Raison |
|---|---|---|
| `README.md` | Réécrit (README Corta) | `merge=ours` |
| `.gitattributes` | Règles `merge=ours` ajoutées en fin de fichier | Sync |
| `apps/desktop/product-identity.cjs` | Table des variantes, appId, org MSIX, CLI lus depuis la marque ; champs `brand`, `isolatedUserData`, `copyright` ; Store refusé sans identité | Identité OS |
| `apps/desktop/product-identity.d.cts` | Types des 3 champs ajoutés | Identité OS |
| `apps/desktop/electron/product-identity.ts` | Épingle `userData` si `isolatedUserData` | Données isolées de Hermes |
| `apps/desktop/electron-builder.config.cjs` | Éditeur, DMG, catégorie, Linux, métadonnées, copyright, feed `updates.corta.fr` sans repli GitHub | Packaging / mises à jour |
| `apps/desktop/electron/main.ts` | (1) copyright About ; (2) un garde Light dans `resolveHermesBackend` (+ commentaire `health: allow CC`) ; (3) la sentinelle « bootstrap-needed » construite par `bootstrap-needed-backend.ts` (code déplacé hors de `main.ts`) ; (4) titres de fenêtres `APP_NAME` (×4) | Light distant / marque |
| `apps/desktop/electron/bootstrap-needed-backend.ts` | Nouveau module : sentinelle déplacée de `main.ts` + saveur `remote-only` | Light distant |
| `apps/desktop/electron/first-run-setup-gate.ts` | Refuse `continueLocal` pour un choix `remote-only` | Light distant |
| `apps/desktop/electron/minimize-to-tray.ts`, `notification-ipc.ts`, `quit-guard.ts` | `BRAND_NAME` au lieu de « Hermes » | Marque |
| `apps/desktop/vite.config.ts` | Plugin `desktopBrand()` | Marque renderer |
| `apps/desktop/package.json` | Scripts `*:corta*` | Build |
| `apps/desktop/src/i18n/catalog.ts` | `TRANSLATIONS = brandCatalogs(…)` | Textes |
| `apps/desktop/src/themes/presets.ts` | `BUILTIN_THEMES` / `DEFAULT_SKIN_NAME` via la politique de marque | Thème |
| `apps/desktop/src/themes/backend-sync.ts` | Skins serveur ignorés si la marque verrouille ses thèmes | Thème |
| `apps/desktop/src/components/brand-mark.tsx` | Pictogramme issu de la marque (aucun si absent) | Marque |
| `apps/desktop/src/components/desktop-install-local-card.ts` | Présentation `remote-only` (carte locale non proposée, sous-titre) | Light distant |
| `apps/desktop/src/components/desktop-install-overlay.tsx` | Sous-titre et carte locale pilotés par la présentation (3 lignes) | Light distant |
| `apps/desktop/src/global.d.ts` | Valeur `remote-only` de `local` | Light distant |
| `apps/desktop/src/main.tsx` | Titre de la fenêtre HUD | Marque |

Candidats à proposer upstream (réduiraient le fork) : le comportement strictement distant de la variante
light, le nom de produit dans tray/notifications/fermeture/titres, et la couche de marque elle-même.
