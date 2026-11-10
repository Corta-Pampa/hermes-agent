# Couche de marque Corta (Desktop)

## Principe

Une seule variable de build choisit la marque, indépendante de la variante :

```
HERMES_DESKTOP_BRAND = (vide) | hermes   →  identité Hermes upstream, inchangée octet pour octet
HERMES_DESKTOP_BRAND = corta             →  distribution Corta
HERMES_DESKTOP_VARIANT = light | (vide) | bundled | store   (inchangé, upstream)
```

Conséquence voulue : les tests et commandes upstream (qui ne posent pas la variable) continuent de
décrire Hermes ; seuls les scripts `*:corta*` produisent Corta. Une fusion upstream qui ajoute un test
sur l'identité Hermes ne casse donc pas le fork.

## Où vivent les valeurs

| Fichier | Rôle |
|---|---|
| `apps/desktop/branding/brands.cjs` | **Source unique** : noms par variante, préfixe d'appId (`fr.corta`), organisation MSIX, éditeur, copyright, fiche Linux, catégorie macOS, habillage DMG, origine des mises à jour, marque du renderer. |
| `apps/desktop/branding/vite-brand.mjs` | Plugin Vite : injecte la marque du renderer (`__HERMES_DESKTOP_BRAND__`) et le `<title>`. |
| `apps/desktop/src/branding/brand.ts` | Accès typé à la marque côté renderer (repli Hermes si non défini, ex. tests). |
| `apps/desktop/src/branding/copy.ts` | Réécriture du nom de produit dans les 9 catalogues de traduction intégrés. |
| `apps/desktop/src/branding/corta-theme.ts` | Thème Corta et **jetons de marque** (`CORTA_TOKENS`). |
| `apps/desktop/src/branding/themes.ts` | Politique : thèmes proposés, thème par défaut. |
| `apps/desktop/electron/brand-name.ts` | Nom de produit pour les textes du processus principal (tray, fermeture, notifications). |

## Ce que la marque Corta change

**Identité OS** (variante `light`) : `appId fr.corta.desktop`, produit « Corta », exécutable `Corta`,
`userData` = `<appData>/CortaDesktop` (épinglé avant le premier accès), AppUserModelID Windows
`fr.corta.desktop`, MSIX `Corta.CortaDesktop`, éditeur `CORTA_MSIX_PUBLISHER` (défaut `CN=Corta`),
`author`/`CompanyName` « Corta », copyright « Corta. Built on Hermes Agent, Copyright © 2026 Nous
Research (MIT License) » (panneau About + métadonnées).

**Interface** : titre de fenêtre et menus natifs (`About Corta`, `Quit Corta`, via `app.setName`),
textes des 9 langues intégrées, tray, dialogue de fermeture, notification par défaut, fenêtre HUD,
écran de premier lancement, pictogramme (aucun tant que Corta n'en fournit pas).

**Ce qui reste volontairement « Hermes »** : « Hermes Agent » (le moteur que le serveur exécute — vrai et
dû à l'attribution), « Hermes Cloud » (service hébergé de Nous Research), les commandes et liens en
minuscules (`hermes serve`, `hermes://`), les clés techniques (`hermes-desktop-*` dans le stockage local),
les noms de fichiers/variables d'environnement `HERMES_*`. Le schéma d'URL `hermes://` est conservé :
le serveur génère lui-même des liens `hermes://connections/done`, `hermes://plugin/install`… ; un schéma
`corta://` les casserait.

**Limite connue** : ~370 littéraux « Hermes » hors catalogues ne sont pas réécrits (locales propres aux
plugins Bot Mode et Kanban, quelques messages d'erreur). Voir `RISKS_AND_NEXT_STEPS.md`.

## Thème Corta

- Préréglage natif `corta` du système de thèmes (`DesktopTheme`) : palette claire **et** sombre,
  terminal ANSI clair et sombre, typographie système (aucune police téléchargée depuis un tiers).
  Toutes les surfaces (fonds, panneaux, sidebar, textes, bordures, survol/focus/actif, boutons, champs,
  bulles, modales/popovers/menus contextuels, navigation, notifications, statuts, chargement/erreur,
  terminal) dérivent de ces emplacements via `applyTheme` — aucun CSS global, aucun `customCSS`.
- Thème par défaut de toute nouvelle installation (`DEFAULT_SKIN_NAME`).
- Seul thème intégré proposé : les autres préréglages ne sont pas listés, et les skins poussés par le
  serveur (`/skin`, `display.skin`) ne reteintent pas le client. Un choix enregistré d'un thème non
  proposé n'est pas effacé : il se résout simplement vers `corta`. Restent possibles, par action délibérée :
  mode clair/sombre/système, couleur d'accent, import d'un thème VS Code.
- **Valeurs** : aucune charte Corta n'existe dans le dépôt ; tant que `CORTA_TOKENS` est vide, chaque
  emplacement reprend la palette upstream `github` (GitHub Light/Dark Default, neutre et contrastée).
  Remplir `CORTA_TOKENS` (partiellement si besoin) suffit à appliquer la charte ; rien d'autre à modifier.

Pour assouplir le verrouillage (tous les thèmes intégrés), mettre `builtinSkins: null` dans
`BRANDS.corta.renderer`.

## Modifier l'identité

1. Valeurs textuelles / identifiants / URL : `branding/brands.cjs` (bloc `corta`).
   **Ne jamais changer `appIdPrefix`, les `pascal` ou `kebab` d'une variante déjà distribuée** :
   cela crée une autre application pour l'OS (nouveau `userData`, perte apparente des réglages).
2. Couleurs / typographie : `src/branding/corta-theme.ts` (`CORTA_TOKENS`).
3. Pictogramme et icônes : voir [`BRAND_ASSETS.md`](BRAND_ASSETS.md).
4. Vérifier : `pnpm exec vitest run src/branding` et
   `pnpm exec vitest run --project electron electron/product-identity-brand.test.ts`.
