# Ressources de marque Corta à fournir

Aucune ressource de marque Corta n'existait dans le dépôt. Conformément à la consigne, **rien n'a été
inventé** : pas de logo, pas de couleur, pas de typographie. Ce document liste précisément ce qu'il
faut fournir et où le déposer. Tant que ce n'est pas fait, `pnpm run corta:check-brand` échoue et les
commandes `dist:corta:*` refusent de produire un installateur client.

## 1. Pictogramme / logo (sources vectorielles)

| Ressource | Format | Usage |
|---|---|---|
| Pictogramme Corta, positif noir | SVG, 1 tracé, fond transparent, carré | Source de toutes les icônes (`scripts/generate_icons.py`) |
| Pictogramme Corta, positif blanc | SVG, idem | Variantes sombres |
| Pictogramme monochrome (gris) | SVG | Icône macOS 26 « Clear/Tinted » |
| Logotype « Corta » (si différent du pictogramme) | SVG | Futur écran About / onboarding |
| Règles : zone de protection, taille minimale, fond de tuile (clair/sombre) | PDF ou spécification | Composition des tuiles d'icône |

## 2. Icônes applicatives (générées à partir du §1)

Le générateur upstream `scripts/generate_icons.py` produit tout le jeu depuis deux SVG et des fonds de
tuile. Procédure : remplacer les sources SVG de la marque par celles de Corta (et les fonds de tuile
`assets/backgrounds/*` si la charte l'exige), lancer `node scripts/generate-icons.mjs`, vérifier avec
`--check`, puis committer. Les sources upstream sont `assets/nous-girl-black.svg` et
`assets/nous-girl-white.svg` (racine du dépôt). Attention : le générateur réécrit aussi les icônes du
site, du tableau de bord web (servi par le serveur Corta) et de l'installateur bootstrap ; relire
`git status` et ne committer que ce qui doit porter la marque Corta. Fichiers régénérés (empreintes Hermes listées dans
`corta/brand/upstream-brand-assets.json`) :

- macOS : `apps/desktop/assets/icon.icns`, `icon-dark.icns`, `icon-mac.png`, `icon.icon/` (Icon Composer, macOS 26)
- Windows : `apps/desktop/assets/icon.ico`, `icon-dark.ico`, `assets/appx/*` (tuiles MSIX, toutes échelles)
- Commun : `apps/desktop/assets/icon.png`, `icon-dark.png`

Ces chemins sont en `merge=ours` dans `.gitattributes` : une fusion upstream ne les écrase pas.

## 3. Pictogramme dans l'application

| Fichier à déposer | Spécification |
|---|---|
| `apps/desktop/public/corta/brand-mark.png` | Pictogramme sur tuile, mode clair, 512×512, PNG transparent |
| `apps/desktop/public/corta/brand-mark-dark.png` | Idem, mode sombre |

Puis dans `apps/desktop/branding/brands.cjs` :
`renderer.mark: { light: 'corta/brand-mark.png', dark: 'corta/brand-mark-dark.png' }`.

## 4. Installateur macOS (DMG) — facultatif

| Fichier | Spécification |
|---|---|
| `apps/desktop/packaging/corta-dmg.tiff` | Fond 660×400 pt, TIFF multi-résolution (1x + 2x), emplacements icône (253,238) et Applications (512,235) |
| `apps/desktop/packaging/corta-dmg-volume.icns` | Icône du volume monté |

Puis `dmg.background` / `dmg.icon` dans `brands.cjs`. Sans eux : fond neutre par défaut d'electron-builder.

## 5. Jetons de couleur (thème Corta)

À fournir pour le mode **clair** et le mode **sombre**, en hexadécimal, avec contrastes AA vérifiés
(texte ≥ 4,5:1) : à saisir dans `CORTA_TOKENS` (`apps/desktop/src/branding/corta-theme.ts`).

| Emplacement | Signification |
|---|---|
| `background`, `foreground` | Fond de l'application, texte principal |
| `card`, `cardForeground` | Panneaux, cartes |
| `popover`, `popoverForeground` | Menus, menus contextuels, modales, popovers |
| `muted`, `mutedForeground` | Zones atténuées, texte secondaire |
| `primary`, `primaryForeground` | Boutons principaux, éléments actifs |
| `secondary`, `secondaryForeground` | Boutons secondaires |
| `accent`, `accentForeground` | Survol, sélection douce |
| `border`, `input` | Bordures, champs de formulaire |
| `ring`, `midground`, `composerRing` | Anneaux de focus, accent de marque (curseur de streaming, éléments actifs, sélection) |
| `destructive`, `destructiveForeground` | Erreurs, actions destructives |
| `sidebarBackground`, `sidebarBorder` | Barre latérale |
| `userBubble`, `userBubbleBorder` | Bulles de message de l'utilisateur |
| Terminal (`terminal`, `darkTerminal`) | 16 couleurs ANSI + `foreground`, `cursor`, `selectionBackground` (facultatif : sinon palette neutre) |

## 6. Typographie

- Famille(s) d'interface et monospace, avec **licence autorisant l'embarquement** dans une application.
- Fichiers de police (WOFF2) si la police n'est pas une police système : à embarquer dans l'app
  (pas de chargement depuis Google Fonts ou autre tiers chez les clients).
- Saisie : `CORTA_TOKENS.typography` (`fontSans`, `fontMono`, éventuellement `baseSize`, `lineHeight`).

## 7. Identité technique et légale

| Élément | Où | État |
|---|---|---|
| Raison sociale exacte, adresse de support | `brands.cjs` (`linux.maintainer`, `publisherDisplayName`) | À fournir (actuellement « Corta ») |
| Sujet du certificat de signature Windows | variable `CORTA_MSIX_PUBLISHER` | À fournir |
| Apple Team ID / Developer ID | secrets de CI (voir `RELEASE.md`) | À fournir |
| Mention de copyright Corta | `brands.cjs` (`copyright`) | À valider (conserve l'attribution Nous Research) |
