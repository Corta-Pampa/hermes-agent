# Build, release et mises à jour de Corta Desktop

Rien dans ce dépôt ne publie automatiquement. Aucun secret ni certificat n'y est configuré.

## 1. Commandes de build (depuis `apps/desktop`)

| Commande | Résultat | Hôte |
|---|---|---|
| `pnpm run dev:corta` | Corta Desktop Remote depuis les sources (hot reload) | tous |
| `pnpm run build:corta` | Bundles renderer + main, marque Corta, variante light | tous |
| `pnpm run pack:corta` | Application non empaquetée dans `release/` (`--publish never`) | tous |
| `pnpm run corta:check-brand` | Garde de marque (échoue tant que des visuels Hermes/Nous sont livrés) | tous |
| `pnpm run dist:corta:mac` | `CortaDesktop-<v>-mac-<arch>.dmg` + `.zip` | macOS |
| `pnpm run dist:corta:win` | `CortaDesktop-<v>-win-<arch>.msix` | Windows 11 + SDK |
| `pnpm run dist:corta:linux` | AppImage / deb / rpm (usage interne) | Linux |

Ces scripts posent `HERMES_DESKTOP_BRAND=corta HERMES_DESKTOP_VARIANT=light`. Les commandes upstream
(`dist:mac`, `dist:win`, …) restent disponibles et construisent Hermes ; avec
`HERMES_DESKTOP_BRAND=corta` elles construisent la variante choisie sous la marque Corta.

## 2. Versions

- Corta Desktop a **sa propre numérotation SemVer**, distincte de celle de Hermes (les versions sont
  comparées uniquement au sein du feed Corta). La compatibilité avec le serveur ne dépend pas du numéro
  de version mais du **contrat backend** (`REQUIRED_BACKEND_CONTRACT`, protocole `hermes-gateway-v1`).
- Tags Git Corta : espace de noms **`corta-vX.Y.Z`** (les tags `v*` appartiennent à upstream et sont
  récupérés par la synchronisation ; un `v*` Corta entrerait en collision).
- Au build, la version est injectée par le tag au format attendu par les scripts upstream :

```sh
export HERMES_PAYLOAD_TAG=v1.2.0                                       # stable
# ou HERMES_PAYLOAD_TAG=v1.3.0+canary.20261201T090000Z                # canal beta (horodatage UTC du build)
export HERMES_RELEASE_EPOCH=$(git for-each-ref --format='%(creatordate:unix)' refs/tags/corta-v1.2.0)
pnpm run dist:corta:mac
```

  `HERMES_RELEASE_EPOCH` est requis, sur tous les OS, pour un tag stable qui n'existe pas en `v*` dans
  le dépôt : `scripts/before-build.mjs` en dérive le numéro de version natif (MSIX) et échoue sans lui
  (« No immutable release timestamp »). Un tag canary porte son propre horodatage.

- **Appariement Desktop ↔ serveur** : chaque release Corta indique le commit upstream fusionné
  (`git log -1 --format=%H`) ; le serveur du cabinet doit exécuter Hermes depuis ce même commit (ou un
  commit au contrat identique). Le Desktop avertit si le serveur est plus ancien ou plus récent que lui.

## 3. Canal `updates.corta.fr`

Le build Corta grave `https://updates.corta.fr` dans l'application (`app-update.yml`). Surcharges :
`CLOUDFLARE_R2_PUBLIC_URL` au build (autre origine HTTPS canonique), ou
`updates.desktop_feed_base_url` dans `config.yaml` du poste (diagnostic uniquement). Jamais GitHub.

Arborescence attendue (variante light) :

```
https://updates.corta.fr/
  releases/darwin/light/stable/
      stable-mac.yml                          # généré par electron-builder (mac.publish)
      CortaDesktop-1.2.0-mac-arm64.zip        # + .blockmap ; le .yml les référence en relatif
      CortaDesktop-1.2.0-mac-x64.zip
  releases/darwin/light/canary/
      canary-mac.yml + zips                   # canal beta interne (builds canary)
  downloads/                                  # installateurs de première installation (DMG, MSIX)
      stable/CortaDesktop-1.2.0-mac-arm64.dmg
      stable/CortaDesktop-1.2.0-win-x64.msix
```

- **macOS** : mise à jour intégrée (`electron-updater` + Squirrel.Mac). **L'application doit être signée
  (Developer ID) et notarisée**, sinon macOS refuse la mise à jour. Un build beta suit le canal `canary`,
  un build stable le canal `stable` : le canal est fixé au build, on passe de l'un à l'autre en
  réinstallant.
- **Windows** : la variante light n'a **pas** de mise à jour intégrée (mécanisme `external`, upstream).
  Options : (a) déploiement géré (Intune / GPO / outil de l'infogérant) des MSIX, recommandé en cabinet ;
  (b) fichier `.appinstaller` hébergé sur `updates.corta.fr` pour que Windows vérifie lui-même les mises à
  jour — à développer (le générateur upstream ne couvre que la variante `bundled`).
- Le serveur web doit servir les bons types MIME (`.msix`, `.appinstaller` : voir
  `scripts/release-content-types.json`) et uniquement en HTTPS.

## 4. Processus de release

1. Fusion upstream validée sur `main` (voir `UPSTREAM_SYNC.md`), CI verte.
2. Ressources de marque fournies : `pnpm run corta:check-brand` doit passer.
3. Tag `corta-vX.Y.Z` (ou build canary pour la beta), builds macOS (arm64, x64) et Windows (x64, arm64)
   signés.
4. Tests sur machines vierges contre un serveur Corta de préproduction : premier lancement (connexion
   distante uniquement), connexion jeton/OAuth, profils, conversation, fichiers, mise à jour depuis la
   version N-1, coexistence avec un Hermes officiel.
5. Publication sur le canal beta, période d'observation, puis stable.
6. Conserver en ligne les versions précédentes.

## 5. Rollback

- `electron-updater` **ne rétrograde jamais** (`allowDowngrade = false`, choix upstream). Revenir en
  arrière = publier une version **supérieure** reconstruite depuis le commit sain (ex. `1.2.1` = contenu
  de `1.1.0`). Retirer un `.yml` empêche seulement la diffusion aux postes non encore mis à jour.
- Réinstallation manuelle d'une version antérieure possible depuis `downloads/` : les données
  (`userData`) sont conservées.
- Serveur : revenir au commit Hermes appairé précédent (procédure d'exploitation du serveur Corta).

## 6. Variables d'environnement

| Variable | Où | Rôle |
|---|---|---|
| `HERMES_DESKTOP_BRAND` | build | `corta` pour la distribution Corta (vide = Hermes) |
| `HERMES_DESKTOP_VARIANT` | build | `light` pour Corta Desktop Remote |
| `HERMES_PAYLOAD_TAG` | build | Version : `vX.Y.Z` ou `vX.Y.Z+canary.AAAAMMJJTHHMMSSZ` |
| `HERMES_RELEASE_EPOCH` | build | Horodatage Unix de la release (tags stables Corta) |
| `CLOUDFLARE_R2_PUBLIC_URL` | build | Surcharge de l'origine des mises à jour (HTTPS canonique) |
| `CORTA_MSIX_PUBLISHER` | build Windows | Sujet exact du certificat de signature Corta (`CN=…, O=…, C=FR`) |
| `CORTA_ALLOW_PLACEHOLDER_ASSETS` | build | `1` = laisser passer la garde de marque (builds internes uniquement) |
| `CSC_LINK`, `CSC_KEY_PASSWORD` (ou trousseau) | build macOS | Certificat Developer ID (electron-builder) |
| `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` ou `APPLE_NOTARY_PROFILE` | build macOS | Notarisation |
| `AZURE_SIGN_ENDPOINT`, `AZURE_CLIENT_ID`, `AZURE_SIGN_ACCOUNT`, `AZURE_SIGN_PROFILE`, `AZURE_SIGN_PUBLISHER` | build Windows | Azure Trusted Signing (mécanisme upstream ; un autre fournisseur demande d'adapter `scripts/batch-sign-binaries.mjs`) |
| `HERMES_DESKTOP_REMOTE_URL`, `HERMES_DESKTOP_REMOTE_TOKEN` | poste client | Présélection de la connexion au serveur (déploiement géré) |

Ces secrets se déclarent dans les environnements protégés de GitHub ou sur la machine de build ; rien
n'est committé.
