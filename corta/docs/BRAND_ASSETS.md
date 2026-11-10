# Ressources de marque Corta

Ce document liste les ressources de marque, où elles vivent et ce qui reste à fournir. Logo, icônes et
couleurs sont en place : `pnpm run corta:check-brand` passe. Restent facultatifs : la typographie
(§6) et le fond du DMG (§4).

## 1. Pictogramme / logo (sources vectorielles) — fournis (`corta/brand/logo/`)

| Ressource | Format | Usage |
|---|---|---|
| Pictogramme Corta, positif noir | SVG, 1 tracé, fond transparent, carré | Source de toutes les icônes (`scripts/generate_icons.py`) |
| Pictogramme Corta, positif blanc | SVG, idem | Variantes sombres |
| Pictogramme monochrome (gris) | SVG | Icône macOS 26 « Clear/Tinted » |
| Logotype « Corta » (si différent du pictogramme) | SVG | Futur écran About / onboarding |
| Règles : zone de protection, taille minimale, fond de tuile (clair/sombre) | PDF ou spécification | Composition des tuiles d'icône |

## 2. Icônes applicatives — générées

Source : `corta/brand/logo/corta-icon.svg` (icône Corta 195×195). `corta/scripts/generate-icons.py`
produit toutes les icônes que l'installateur Corta embarque, aux chemins upstream (`merge=ours` dans
`.gitattributes`) : l'icône Corta sur une tuile encre `#0A0A16`, identique en clair et en sombre.

- macOS : `apps/desktop/assets/icon.icns`, `icon-dark.icns`, `icon-mac.png`, `icon.icon/` (macOS 26, avec
  la couche monochrome Clear/Tinted), `packaging/dmg-volume.icns` (volume du DMG)
- Windows : `apps/desktop/assets/icon.ico`, `icon-dark.ico`, `assets/appx/*` (tuiles MSIX, toutes échelles)
- Commun : `apps/desktop/assets/icon.png`, `icon-dark.png`, `public/apple-touch-icon.png`,
  `public/nous-girl*.png` (anciens chemins du pictogramme, gardés valides)

Le générateur réutilise le moteur de rendu et la géométrie de plateforme du générateur upstream
(`scripts/generate_icons.py`) sans le modifier. Régénérer après un changement d'icône ou une
synchronisation upstream qui touche ces fichiers :

```
<python du runtime Hermes> -I corta/scripts/generate-icons.py          # écrit
<python du runtime Hermes> -I corta/scripts/generate-icons.py --check  # vérifie
```

`scripts/ci/check_icons.sh` (contrôle CI des icônes) l'exécute après le générateur upstream : les icônes
Corta commitées sont donc celles attendues par la CI. Le site, le tableau de bord web et l'installateur
bootstrap gardent les icônes upstream (hors installateur Corta).

## 3. Logo dans l'application — fourni

Sources Corta : `corta/brand/logo/logo-dark.svg` (logotype) et `logo-dark-short.svg` (version courte).
Servis depuis `apps/desktop/public/corta/` et déclarés dans `brands.cjs` (`renderer.mark`, `renderer.logo`) :

| Fichier | Usage |
|---|---|
| `mark-dark.svg` / `logo-dark.svg` | Mode sombre : fichiers Corta tels quels |
| `mark.svg` / `logo.svg` | Mode clair : mêmes tracés, encre et papier inversés (le badge papier disparaîtrait sur le fond `#E7EDF7`) |

Si Corta dispose d'une version claire officielle, remplacer `mark.svg` / `logo.svg`.

## 4. Installateur macOS (DMG) — facultatif

| Fichier | Spécification |
|---|---|
| `apps/desktop/packaging/corta-dmg.tiff` | Fond 660×400 pt, TIFF multi-résolution (1x + 2x), emplacements icône (253,238) et Applications (512,235) |
| `apps/desktop/packaging/corta-dmg-volume.icns` | Icône du volume monté |

Puis `dmg.background` / `dmg.icon` dans `brands.cjs`. Sans eux : fond neutre par défaut d'electron-builder.

## 5. Jetons de couleur (thème Corta) — fournis (encre, papier, menthe ; voir `BRANDING.md`)

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
