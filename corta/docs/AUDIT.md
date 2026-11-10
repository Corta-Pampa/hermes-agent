# Audit initial du dépôt (avant modifications Corta)

Date : 2026-11-10. Méthode : lecture du code réellement présent (pas de documentation antérieure supposée).

## 1. Version upstream forkée

- Dépôt : `Corta-Pampa/hermes-agent`, clone superficiel (`--depth`), 65 commits visibles.
- `origin/main` = commit upstream **`67fc279c`** (« plugin-catalog: hermes-axioma banner image », 2026-11-09).
- `git describe` : `v0.23.1+canary.20261110T064422Z-5-g67fc279c90` → ligne de release upstream **v0.23.1**,
  5 commits après le canary du 2026-11-10.
- `pyproject.toml` / `package.json` portent `0.0.0` : la version réelle est injectée au build par le tag
  (`HERMES_PAYLOAD_TAG`), jamais committée.
- Au moment de l'audit, `upstream/main` avait 8 commits d'avance (catalogue de plugins, comptage du raisonnement).

## 2. Remotes et branches

| Élément | Constat |
|---|---|
| `origin` | `https://github.com/Corta-Pampa/hermes-agent` (fetch/push) |
| `upstream` | **absent** — ajouté localement par `corta/scripts/sync-upstream.sh` (jamais réécrit s'il existe) |
| Branche principale Corta | `main` |
| Branche principale upstream | `main` |
| Branches distantes | `main`, `claude/corta-hermes-distribution-2fc3am` |

## 3. Modifications Corta préexistantes

**Aucune.** `origin/main` est identique au commit upstream `67fc279c` ; aucun commit Corta, aucune
ressource Corta. Les seules occurrences de « corta » dans le dépôt sont le mot espagnol/portugais dans les
catalogues de traduction. **Aucune ressource de marque Corta** (logo, couleurs, typographie, charte) n'existe.

## 4. Architecture du dépôt (pertinente pour Corta)

- Monorepo Python (agent, gateway, CLI, `hermes_state*`) + workspaces pnpm (`apps/desktop`, `apps/shared`,
  `ui-tui`, `web`, `website`). Outils épinglés par `pm/lock.json` (Node 26.12.1, pnpm 12.15.0), provisionnés par `./activate`.
- Desktop : Electron 44 + React 19 + nanostores, `apps/desktop/` (`electron/` = processus principal,
  `src/` = renderer). `electron/main.ts` fait ~18 000 lignes : fichier à forte activité upstream.
- 46 workflows GitHub Actions upstream, la plupart sur des runners `blacksmith-*` et avec des secrets
  Nous Research (R2, Azure Trusted Signing, Apple) : ils échoueront ou resteront en attente dans le fork.

## 5. Mécanismes de thème

- `apps/desktop/src/themes/` : modèle `DesktopTheme` (`types.ts`) — palettes claire **et** sombre, terminal
  ANSI clair/sombre, typographie (`fontSans`, `fontMono`, `fontUrl`, taille/interligne), `customCSS` optionnel.
- `presets.ts` : 12 thèmes intégrés (`nous` par défaut, `github`, `catppuccin`, … `classic`), palettes
  partagées dans `apps/shared/src/theme-presets.ts`. `DEFAULT_SKIN_NAME = 'nous'`.
- `context.tsx` (`applyTheme`) dérive **toutes** les variables du design system (`--dt-*`, `--theme-*`,
  `--ui-*`) à partir des emplacements de couleur : fonds, cartes, sidebar, popovers/menus/modales, bordures,
  champs, anneaux de focus, boutons, bulles, couleurs de statut, terminal. Aucun CSS global n'est requis
  pour retheminer l'application.
- Préférences persistées dans le `localStorage` du renderer (clés `hermes-desktop-theme-v2`,
  `…-profile-themes-v1`, mode par profil), donc dans le `userData` Electron.
- Le backend peut pousser un « skin » CLI (`skin.changed`, `display.skin`) converti en thème desktop
  (`backend-sync.ts`) ; les utilisateurs peuvent importer des thèmes VS Code (Marketplace) et retinter l'accent.

## 6. Branding et identité produit

- `apps/desktop/product-identity.cjs` : **source unique** des noms/identifiants par variante
  (`displayName`, `appId com.nousresearch.*`, `appNamePascal`, `msixAppIdWithOrg NousResearch.*`, canal de feed).
  Accesseur typé : `electron/product-identity.ts` (identité « cuite » au build via `__HERMES_PRODUCT_IDENTITY__`).
- `electron-builder.config.cjs` : protocole `hermes://`, icônes `assets/icon*`, DMG « Hermes Agent Installer »
  avec fond `nous-dmg-2b.tiff`, éditeur MSIX `CN=Nous Research Inc., …`, mainteneur Linux Nous Research.
- Renderer : `components/brand-mark.tsx` affiche le pictogramme « nous-girl » (`public/nous-girl*.png`),
  utilisé par l'onboarding/first-run, l'écran de mise à jour et l'overlay d'installation.
- Textes : ~200 chaînes « Hermes » par langue dans 9 catalogues (`src/i18n/*.ts`), plus ~370 littéraux
  dans 73 fichiers hors catalogues (surtout les locales propres aux plugins Bot Mode / Kanban).
- Processus principal : nom d'app `'Hermes'` par défaut, titres de fenêtres, About (`© 2026 Nous Research`),
  tray, notifications, dialogue de fermeture.
- Icônes générées par `scripts/generate_icons.py` à partir des SVG de la marque Nous.

## 7. Système de plugins Desktop

- Plugins intégrés : `src/plugins/<nom>/plugin.tsx` (glob Vite, `contrib/plugins.ts`) — `hermes-bots`
  (Bot Mode), `kanban`, `radio`, `hello-runtime`.
- Plugins utilisateur chargés à l'exécution depuis `$HERMES_HOME/desktop-plugins/<nom>/plugin.js`.
- SDK : `src/sdk/index.ts` (`@hermes/plugin-sdk`) ; contributions (`contrib/registry.ts`), pages de réglages,
  enregistrement de langues (`registerAppLocale`), `requestTheme`.
- Le guide du dépôt interdit d'en faire un système d'extension universel ; un plugin ne peut pas modifier
  l'identité de packaging ni l'icône : la marque relève donc du build, pas d'un plugin.

## 8. Packaging Electron

- Configuration unique `electron-builder.config.cjs` (pas de champ `build` dans `package.json`), pilotée par
  `HERMES_DESKTOP_VARIANT` : *(vide)* = bootstrap, `light`, `bundled`, `store`.
- macOS : DMG + ZIP, signature/notarisation par hooks (`scripts/mac-sign.mjs`, `notarize.mjs`), icône Icon
  Composer (`assets/icon.icon`) + `.icns`.
- Windows : **MSIX uniquement** (pas de NSIS/MSI), manifeste généré, signature Azure Trusted Signing si
  `AZURE_SIGN_*` présents, Windows 11 22H2 minimum.
- Linux : AppImage (deb/rpm en local).
- `pnpm run builder` refuse toute publication autre que `--publish never` (« Publishing belongs to the release adapter »).

## 9. Variante light

- `HERMES_DESKTOP_VARIANT=light` → « Hermes Light » (`com.nousresearch.hermes-light`), tampon d'installation
  `payload: light`, aucune charge utile Python embarquée, feed `light.yml` / `releases/darwin/light/…`.
- Mise à jour : macOS `electron-updater` ; **Windows `external` (aucune mise à jour intégrée)**.
- `BUILDING.md` : « Light has build/feed support but no release matrix leg » — non publié par Nous.
- **Constat important** : à l'exécution, Light se comportait comme la variante bootstrap. Au premier
  lancement il proposait « Installer Hermes localement » (téléchargement de `install.sh` depuis
  `raw.githubusercontent.com/NousResearch`) et adoptait silencieusement une installation Hermes trouvée
  sur le poste (`~/.hermes/hermes-agent`, lanceur dans `~/.local/bin`). → corrigé côté Corta (voir `UPSTREAM_SYNC.md`).
- Connexion distante : URL + jeton de session ou OAuth, registre multi-connexions, profils découverts
  depuis le serveur ; présélection possible via `HERMES_DESKTOP_REMOTE_URL` / `HERMES_DESKTOP_REMOTE_TOKEN`.

## 10. Mises à jour automatiques

- macOS : `electron-updater` (fournisseur `generic`) ; l'URL vient de `app-update.yml` généré au build
  (`mac.publish`), ou de `updates.desktop_feed_base_url` dans `config.yaml` de `HERMES_HOME`.
- Sans `CLOUDFLARE_R2_PUBLIC_URL`, le feed par défaut est **GitHub `NousResearch/hermes-agent`** (ou le
  dépôt de `GITHUB_REPOSITORY`) : un build Corta naïf aurait pointé vers les releases Nous.
- Windows : App Installer (`.appinstaller`) pour `bundled`, Microsoft Store pour `store`, rien pour `light`.
- Canaux : `stable`/`latest` et `canary` dérivés du tag (`vX.Y.Z` / `vX.Y.Z+canary.YYYYMMDDTHHMMSSZ`) ;
  « channel builds » R2 propres à l'infrastructure Nous.
- Compatibilité Desktop ↔ serveur : par **numéro de contrat** (`REQUIRED_BACKEND_CONTRACT = 8`,
  protocole `hermes-gateway-v1`), pas par numéro de version ; avertissement dans les deux sens.

## 11. Données utilisateur

- Électron `userData` : `<appData>/Hermes` pour les builds stables (Hermes et Hermes Light partagent ce
  dossier et le verrou d'instance unique). Contient `connection.json` (connexions, jetons chiffrés),
  `active-profile.json`, le `localStorage` du renderer (thème, préférences).
- `HERMES_HOME` (`~/.hermes`, ou `%LOCALAPPDATA%\hermes`) : configuration/profils de l'agent, partagé
  avec la CLI ; le client light n'y lit que quelques clés `desktop.*` et `updates.*`.
