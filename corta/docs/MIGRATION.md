# Données utilisateur : cohabitation et migration depuis Hermes

Règle : Corta ne supprime, ne déplace et n'écrase jamais silencieusement de données d'une installation
Hermes. Aucune migration automatique n'est implémentée.

## Où sont les données

| Données | Hermes Desktop / Hermes Light (stable) | Corta Desktop Remote |
|---|---|---|
| État Electron (`userData`) : `connection.json` (connexions, jetons chiffrés), `active-profile.json`, `localStorage` (thème, préférences d'affichage), caches | `<appData>/Hermes` (partagé par Hermes et Hermes Light) | `<appData>/CortaDesktop` — épinglé avant tout accès |
| Verrou d'instance unique | dans `<appData>/Hermes` | dans `<appData>/CortaDesktop` |
| Identité OS (appId, AppUserModelID, MSIX) | `com.nousresearch.hermes*`, `NousResearch.*` | `fr.corta.desktop`, `Corta.CortaDesktop` |
| `HERMES_HOME` (config agent, profils, sessions) | `~/.hermes` / `%LOCALAPPDATA%\hermes` | identique (contrat moteur) : le client distant y lit quelques clés `desktop.*` / `updates.*` et y écrit son journal `logs/desktop.log` ; les sessions, profils et mémoires vivent sur le serveur |

`<appData>` = `~/Library/Application Support` (macOS), `%APPDATA%` (Windows), `~/.config` (Linux).

## Conséquences

- Corta et un Hermes officiel peuvent être installés sur le même poste **sans partager** l'état Electron,
  le verrou ni l'identité OS. Corta ne lit pas les connexions de Hermes et inversement.
- Exception volontaire : le gestionnaire de liens `hermes://` (les liens générés par le serveur) est
  enregistré par l'application lancée en dernier ; si les deux sont installées, ces liens peuvent
  ouvrir l'autre application. Documenté, sans perte de données.
- Les sessions, profils, mémoires et fichiers sont sur le **serveur** : un poste reconfiguré retrouve tout
  en se reconnectant.

## Passer d'un Hermes Desktop existant à Corta

1. Installer Corta (l'installation Hermes n'est pas touchée).
2. Au premier lancement, saisir l'URL du serveur Corta et s'authentifier. Rien d'autre n'est à migrer :
   les données de travail sont côté serveur.
3. Les préférences d'affichage Hermes (thème, raccourcis locaux) ne sont pas reprises : Corta démarre
   sur son thème.
4. Désinstaller Hermes Desktop si souhaité ; son dossier `<appData>/Hermes` reste en place jusqu'à
   suppression manuelle par l'utilisateur ou l'infogérant.

Les jetons enregistrés par Hermes sont chiffrés par le trousseau de l'OS au nom de l'application Hermes ;
copier `connection.json` ne permet pas de les relire. Une migration assistée (import des URL de
connexion sans les secrets) serait possible mais n'est pas implémentée.

## Pour les versions futures de Corta

Ne jamais modifier `appIdPrefix` ni les noms `pascal`/`kebab` de la variante `light` dans
`apps/desktop/branding/brands.cjs` une fois distribuée : l'OS y verrait une autre application et le
`userData` changerait (perte apparente des réglages locaux).
