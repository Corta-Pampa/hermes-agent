# `corta/` — espace propre à Corta

Tout ce qui est spécifique à la distribution Corta et n'existe pas en amont (Hermes Agent, Nous Research).
Rien ici n'entre en conflit avec une fusion upstream.

| Fichier | Contenu |
|---|---|
| [`docs/AUDIT.md`](docs/AUDIT.md) | État des lieux initial du dépôt (avant toute modification Corta). |
| [`docs/BRANDING.md`](docs/BRANDING.md) | Architecture de la couche de marque, thème Corta, comment modifier l'identité. |
| [`docs/BRAND_ASSETS.md`](docs/BRAND_ASSETS.md) | **Ressources de marque à fournir** (logo, icônes, couleurs, typographie). |
| [`docs/UPSTREAM_SYNC.md`](docs/UPSTREAM_SYNC.md) | Synchronisation avec NousResearch/hermes-agent, conflits, points de contact. |
| [`docs/RELEASE.md`](docs/RELEASE.md) | Build, versions, canal `updates.corta.fr`, signature, rollback, variables d'environnement. |
| [`docs/MIGRATION.md`](docs/MIGRATION.md) | Données utilisateur : cohabitation et migration depuis une installation Hermes. |
| [`docs/RISKS_AND_NEXT_STEPS.md`](docs/RISKS_AND_NEXT_STEPS.md) | Risques de maintenance du fork, points restant à traiter. |
| `scripts/sync-upstream.sh` | Synchronisation upstream reproductible (rapport, branche de sync, fusion, conflits). |
| `scripts/check-brand-assets.mjs` | Garde de release : refuse un installateur client contenant encore des visuels Hermes/Nous. |
| `brand/upstream-brand-assets.json` | Empreintes git des visuels Hermes/Nous au point de fork (utilisées par la garde). |

Le reste de la personnalisation Corta est dans `apps/desktop/branding/`, `apps/desktop/src/branding/`
et dans des points d'accroche marqués `CORTA CUSTOMIZATION` (`grep -rn "CORTA CUSTOMIZATION"`).
