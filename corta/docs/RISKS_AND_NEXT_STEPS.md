# Risques de maintenance du fork et points restant à traiter

## Estimation du risque de maintenance

**Global : faible à modéré.** 21 fichiers upstream touchés (≈ 200 lignes, `main.ts` raccourci de 3 lignes), tous marqués
`CORTA CUSTOMIZATION` ; le reste est dans des fichiers propres à Corta. Aucune modification du moteur
Python, du gateway ni des outils.

| Point de contact | Activité upstream | Risque de conflit | Remarque |
|---|---|---|---|
| `apps/desktop/electron/main.ts` (~18 000 lignes, 8 points) | Très forte | **Moyen** | Blocs d'une à quatre lignes ; la sentinelle « bootstrap-needed » déplacée dans un module frère est le plus exposé si upstream la modifie. |
| `electron-builder.config.cjs`, `product-identity.cjs` | Moyenne (release/packaging) | Moyen | Si upstream ajoute un champ d'identité (ex. nouvel identifiant), vérifier qu'il passe par la marque. |
| `desktop-install-overlay.tsx`, `desktop-install-local-card.ts`, `first-run-setup-gate.ts` | Moyenne | Faible | Quelques lignes chacun. |
| `presets.ts`, `catalog.ts`, `backend-sync.ts`, `brand-mark.tsx`, `vite.config.ts`, `main.tsx`, tray/notification/quit-guard | Faible à moyenne | Faible | 1 à 6 lignes chacun. |
| `README.md`, icônes | Moyenne | Nul | `merge=ours`. |

Risques **non textuels** (une fusion propre peut les réintroduire sans conflit Git) :

1. **Nouvelles chaînes « Hermes » hors catalogues** ou nouveaux composants affichant la marque Nous
   (nouveau logo, nouvel écran). Mitigation : test `copy.test.ts` (en/fr), relire le rapport de sync,
   `grep` des nouveaux littéraux, revue visuelle du build.
2. **Nouveaux identifiants ou URL Nous en dur** (feed, publisher, protocole, domaine d'aide). Mitigation :
   `product-identity-brand.test.ts` ; inspecter `git diff` des fichiers de packaging à chaque sync.
3. **Changement du modèle de thème** (nouveaux emplacements de couleur) : le thème Corta hérite des
   valeurs de repli ; vérifier les deux modes visuellement.
4. **Variante light refondue upstream** (ex. Nous livre enfin Light) : les gardes Corta de `main.ts`
   peuvent devenir redondantes — à retirer alors au profit du comportement upstream.
5. **Workflows upstream** actifs dans le fork : à désactiver dans l'interface GitHub.
6. **Clone superficiel** : la synchronisation exige l'historique complet (`git fetch --unshallow`).

## Points restant à traiter

**Bloquants avant distribution client**

- [ ] Ressources de marque Corta (logo, icônes, couleurs, typographie) — voir `BRAND_ASSETS.md`.
      La garde `corta:check-brand` bloque les installateurs tant que ce n'est pas fait.
- [ ] Certificats : Apple Developer ID + notarisation ; certificat de signature Windows (sujet →
      `CORTA_MSIX_PUBLISHER`). Aucun n'est configuré (pas d'autorisation).
- [ ] Hébergement `updates.corta.fr` (HTTPS, types MIME) et procédure d'upload — non créé.
- [ ] Mises à jour Windows de la variante light : aucune mise à jour intégrée upstream. Choisir
      déploiement géré (Intune/GPO) ou développer la génération d'un `.appinstaller` light.
- [ ] Builds réels macOS (DMG/ZIP signés) et Windows (MSIX) : impossibles dans l'environnement Linux
      utilisé ici ; à exécuter sur des hôtes macOS et Windows.

**Branding restant**

- [ ] ~370 littéraux « Hermes » dans 73 fichiers hors catalogues (principalement les locales propres aux
      plugins Bot Mode `hermes-bots` et Kanban, quelques messages d'erreur et textes du processus
      principal : fenêtre de vérification « Hermes — quick check », page d'erreur de chargement,
      rapports de mise à jour, libellés techniques `Hermes backend …`). Étendre la réécriture aux
      registres de langues des plugins, ou les traiter au cas par cas.
- [ ] Packs de langue livrés par le backend (`.desktop.yaml`) et plugins tiers : non réécrits.
- [ ] Mode de connexion « Hermes Cloud » (service Nous) : toujours proposé dans Réglages → Gateways ;
      le masquer dans la distribution Corta si Corta ne le supporte pas.
- [ ] Onboarding fournisseurs : la ligne « Nous Portal » utilise `apple-touch-icon.png` (icône Hermes)
      — à revoir quand l'icône sera remplacée (sinon le fournisseur Nous portera l'icône Corta).
- [ ] Contenus Nous visibles côté serveur (tableau de bord web, site, catalogue de plugins) : hors
      périmètre Desktop.
- [ ] Mascottes/« pets », animations et fonds (`ds-assets`, `hermes-sprite.png`) : vérifier qu'aucun ne
      porte l'identité Nous dans les écrans clients ; le fond `Backdrop` est désactivable.
- [ ] Translucidité/vibrance macOS (effet « verre ») : réglage d'apparence utilisateur, non piloté par le
      thème ; décider s'il doit être désactivé par défaut dans Corta.

**Améliorations**

- [ ] Préconfiguration de l'URL du serveur à l'installation (aujourd'hui : variables
      `HERMES_DESKTOP_REMOTE_URL`/`_TOKEN` ou saisie au premier lancement).
- [ ] Rapport de synchronisation enrichi (notes de release upstream, changelog).
- [ ] Proposer upstream : variante light strictement distante, nom de produit dans tray/notifications/
      fermeture, couche de marque — chaque acceptation réduit le fork.
- [ ] Journal `HERMES_HOME/logs/desktop.log` partagé avec un Hermes Desktop installé sur le même poste.
