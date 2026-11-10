# Interface web Corta (`hermes dashboard`)

L'interface web est ce qu'on déploie chez les clients : un expert foncier ouvre une adresse dans son
navigateur et retrouve, sous la marque Corta, ce qu'il fait dans Corta Desktop : parler à son assistant
et à ses agents, leur confier des missions, gérer ses compétences et ses automatisations. Aucun écran ne
nomme le moteur qui tourne derrière.

## Ce que voit l'expert

| Écran | Rôle | Données serveur |
|---|---|---|
| **Accueil / discussion** (`/`, `/c/<id>`) | Parler à l'assistant principal ou à un agent ; suggestions métier ; réponses en direct (Markdown, tableaux) ; étapes de travail résumées en français (« Recherche sur le web », « Lecture d'un document ») ; agents délégués affichés en cartes (« Au travail », « Terminé ») ; demandes d'accord et questions de l'agent sous forme de cartes ; bouton « Arrêter ». | WebSocket JSON-RPC `/api/ws` (protocole de Corta Desktop) |
| **Agents** (`/agents`) | Profils = agents spécialisés. Créer un agent (nom, rôle, instructions en langage naturel, ou à partir d'un exemple), « Lancer une mission », « Discuter », modifier les instructions, supprimer. | `profiles.list` / `profiles.create` / `profiles.describe` / `profiles.configure`, `DELETE /api/profiles/<nom>` |
| **Compétences** (`/competences`) | Compétences du cabinet (créées depuis Corta : nom, « Quand l'utiliser ? », « Comment faire ? ») et compétences intégrées (repliées), activation par agent, « Utiliser ». | `/api/skills*` |
| **Automatisations** (`/automatisations`) | Consignes programmées en français (« Tous les lundis à 8 h 30 »), pause, « Exécuter maintenant », modification, suppression. Les résultats apparaissent dans les discussions (icône horloge). | `/api/cron/jobs*` |
| **Réglages** (`/reglages`) | Apparence (automatique / clair / sombre), état de la connexion. | — |

Historique, agents et compétences sont **partagés avec Corta Desktop** : les discussions web sont créées
avec la source `desktop`, et le nom d'un agent est celui que le roster d'agents de Corta Desktop écrit
(`profile.yaml` → `ui_meta["hermes-bots"].title`).

## Architecture (fork)

Tout le code Corta vit dans des fichiers propres à Corta ; les fichiers upstream touchés sont listés plus bas.

```
web/index.html                  titre « Corta », lang="fr", entrée src/corta/entry.tsx   (upstream, modifié)
web/public/favicon.ico          icône Corta (corta/scripts/generate-icons.py, merge=ours) (upstream, régénéré)
web/public/corta/               logos (copies de apps/desktop/public/corta)
web/src/corta/
  entry.tsx                     aiguillage : interface Corta, ou dashboard upstream sur demande
  shell-mode.ts                 règle de l'aiguillage (?interface=avancee / ?interface=simple)
  mount.tsx, CortaApp.tsx       montage, barre latérale, routes
  corta.css                     build Tailwind séparé ; jetons encre/papier/menthe (= CORTA_TOKENS du Desktop)
  chat/                         chat : chat-store (connexion, conversations, demandes en attente),
                                conversation-model (événements → messages, testé), markdown, cartes
  lib/                          agents, compétences, planification en français, libellés, brandSafe
  pages/                        Agents, Compétences, Automatisations, Réglages
  ui/                           composants (boutons, champs, fenêtres) et logos
```

- Le dashboard upstream (`web/src/main.tsx`, `App.tsx`, pages) est **inchangé**. L'entrée Corta ne le
  charge que sur demande : ni son code ni son design system ne sont téléchargés dans l'interface Corta.
- Le chat n'utilise pas le terminal embarqué du dashboard upstream : il parle le même protocole que
  Corta Desktop (`session.create`, `prompt.submit`, `session.resume`, `session.interrupt`, événements
  `message.*`, `tool.*`, `subagent.*`, requêtes `approval` / `clarify` / `secret` / `sudo`).
- Les textes venant du serveur (erreurs, descriptions) passent par `brandSafe` (Hermes, Nous Research →
  Corta). Le contenu des conversations n'est jamais réécrit.
- Le magasin du chat se lit par sélecteurs immuables (`useChatSelector`) : le React Compiler du projet
  mémorise les lectures, une lecture directe de l'objet mutable ne se rafraîchirait pas.

### Interface avancée (intégrateur)

Le dashboard upstream complet (clés d'API, modèles, MCP, canaux, journaux…) reste accessible pour
l'intégrateur à l'adresse `https://<serveur>/?interface=avancee`. Le navigateur s'en souvient ; un bouton
« Revenir à l'interface Corta » (ou `?interface=simple`) ramène à Corta. Aucun lien n'y mène depuis
l'interface Corta. Cet écran porte la marque upstream : ne pas le montrer au client.

## Déployer chez un client

1. **Serveur** : le fork Corta (même commit que le Corta Desktop distribué, voir `RELEASE.md`).
   `hermes dashboard --host 127.0.0.1 --port 9119` construit l'interface si besoin et la sert.
2. **Accès** : publier l'interface en HTTPS derrière un proxy inverse **qui authentifie** (SSO de
   l'entreprise, oauth2-proxy, Cloudflare Access, Caddy/Traefik avec authentification…), le dashboard
   restant lié à `127.0.0.1`. Raison : la page de connexion intégrée du dashboard (mot de passe / OAuth,
   `hermes_cli/dashboard_auth/login_page.py`) est encore aux couleurs upstream et en anglais. Tant
   qu'elle n'est pas rebrandée, l'authentification doit être faite par le proxy.
3. **Service d'IA** : configurer le modèle et les clés (`hermes model`, ou l'interface avancée).
4. **Identité de l'assistant** : copier `corta/deploy/SOUL.md` dans le `HERMES_HOME` du serveur
   (`~/.hermes/SOUL.md` par défaut) et l'adapter au cabinet. Sans lui, l'assistant se présente avec
   l'identité par défaut du moteur. Les agents créés depuis Corta reçoivent automatiquement des
   instructions qui gardent cette identité.
5. **Compétence du moteur** : désactiver la compétence `hermes-agent` (aide sur le moteur lui-même),
   masquée dans l'interface mais active par défaut :

   ```yaml
   # config.yaml du serveur (et de chaque profil)
   skills:
     disabled: [hermes-agent]
   ```

6. Vérifier : onglet « Corta », icône Corta, accueil « Bonjour, que puis-je faire pour vous ? », puis
   demander à l'assistant « Qui es-tu ? ».

## Développer

```
cd web
pnpm run dev                      # interface Corta sur http://localhost:5173 (dashboard lancé à côté)
pnpm exec vitest run src/corta    # tests Corta
pnpm run typecheck && pnpm run lint
pnpm run build                    # bundle dans hermes_cli/web_dist
```

Couleurs : `web/src/corta/corta.css` (mêmes valeurs que `CORTA_TOKENS`,
`apps/desktop/src/branding/corta-theme.ts` ; les garder alignées). Logos : `web/public/corta/`.
Favicon : `corta/scripts/generate-icons.py`.

## Points de contact upstream

| Fichier | Changement | Risque à la synchro |
|---|---|---|
| `web/index.html` | titre, `lang`, `theme-color`, entrée `src/corta/entry.tsx` | Faible : si upstream modifie ce fichier, garder l'entrée Corta. |
| `web/public/favicon.ico` | icône Corta | Nul (`merge=ours`). |
| `corta/scripts/generate-icons.py` | cible `web/public/favicon.ico` | Fichier Corta. |

À surveiller : un changement du protocole du gateway (`apps/shared/src/gateway-contract.generated.ts`)
ou des routes `/api/profiles`, `/api/skills`, `/api/cron` ; `pnpm run typecheck` le signale pour les types.

## Limites connues

- **Page de connexion du dashboard** : marque upstream, en anglais (voir « Déployer », étape 2).
- **Code source de la page** : les variables injectées par le serveur s'appellent `__HERMES_*`, et le
  bundle contient le dashboard upstream (chargé seulement en interface avancée). Invisible à l'usage ;
  visible pour qui inspecte le code de la page.
- **Compétences intégrées** : descriptions en anglais, souvent techniques (section repliée, désactivables).
- **Descriptions d'autorisation** : traduites par catégorie d'action (« supprimer ou effacer des
  fichiers »…) ; le libellé technique anglais reste dans « Détails techniques ».
- **Pièces jointes** : pas d'envoi de fichiers depuis le chat web pour l'instant ; un fichier produit par
  l'agent s'affiche comme une étiquette avec son nom (pas de téléchargement).
- **Langue** : interface en français uniquement.
