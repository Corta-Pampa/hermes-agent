// CORTA CUSTOMIZATION
// What an authorisation request is about, in one French sentence. The server
// describes risky commands in technical English ("recursive delete", "SQL
// DROP", "force kill processes"…); the expert reads the kind of action, and
// the technical wording stays under "Détails techniques".

const KINDS: ReadonlyArray<[RegExp, string]> = [
  [/obfuscat|unicode|encoded/i, "exécuter une commande dont le contenu est masqué"],
  [/exfiltration|upload a secret|credential file/i, "envoyer un fichier confidentiel vers l'extérieur"],
  [/remote (content|script)|pipe .*to (shell|powershell)|invoke-expression|iwr|metadata endpoint/i, "exécuter du code récupéré sur Internet"],
  [/\bsql\b/i, "modifier ou effacer des données d'une base"],
  [/git /i, "modifier l'historique ou les fichiers d'un projet"],
  [/delete|\brm\b|wipe|format|mkfs|erase|truncate|clean|shadow copies|backups/i, "supprimer ou effacer des fichiers"],
  [/kill|stop|restart|service|gateway|launchd|update/i, "arrêter ou redémarrer un programme du serveur"],
  [/secret|credential|ssh|\.env|env\/config|config/i, "modifier une configuration ou accéder à des informations sensibles"],
  [/permission|chmod|chown|icacls|acl|sudo|privilege|everyone/i, "modifier des droits d'accès ou agir en administrateur"],
  [/docker|podman|container/i, "piloter des conteneurs logiciels"],
  [/package manager|uninstall/i, "désinstaller un logiciel"],
  [/disk|block device|partition|boot/i, "agir directement sur un disque du serveur"],
  [/fork bomb/i, "lancer une commande qui peut bloquer le serveur"],
];

/** "L'agent veut … " for a server approval description. */
export function approvalSentence(description: string): string {
  const text = description.trim();
  if (!text) return "L'agent souhaite effectuer une action sensible sur le serveur.";
  const kind = KINDS.find(([pattern]) => pattern.test(text))?.[1];
  return kind ? `L'agent souhaite ${kind}.` : "L'agent souhaite effectuer une action sensible sur le serveur.";
}

/** A clarify choice without the server's "(Recommended)" marker. */
export function choiceLabel(choice: string): { label: string; recommended: boolean } {
  const match = /\s*\((recommended|recommandé)\)\s*$/i.exec(choice);
  return match ? { label: choice.slice(0, match.index), recommended: true } : { label: choice, recommended: false };
}
