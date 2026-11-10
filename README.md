# Corta — Hermes Agent Distribution

> **This is not the official Hermes Agent repository.**
> It is Corta's maintained fork of [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent).
> Hermes Agent is designed and developed by [Nous Research](https://nousresearch.com) and released under the MIT License.
> For Hermes Agent itself (features, documentation, support, community) go to the upstream project:
> https://github.com/NousResearch/hermes-agent · https://hermes-agent.nousresearch.com/docs/

---

## 1. About this repository

Corta is a commercial distribution of **Hermes Agent** for professional firms.

- **Hermes Agent is the engine.** The agent core, the gateway, tools, memory, skills, the CLI and
  the Desktop application are developed upstream by Nous Research. Corta does not rewrite them.
- **Corta is the product.** Corta adds a visual identity, a Desktop packaging of its own, a
  distribution channel it controls (`updates.corta.fr`), and the operational tooling to ship it to
  clients.
- **This repository is a fork kept close to upstream.** Corta's changes are concentrated in a
  small number of clearly marked places (branding, Desktop packaging, distribution, docs). Upstream
  changes are merged regularly with a reproducible procedure (section 4).

Fork point at the time of writing: upstream commit `67fc279c` (upstream release line `v0.23.1`).
Run `corta/scripts/sync-upstream.sh --report` to see where the fork stands today.

## 2. Architecture

```
 Firm's premises                                         Users' computers (macOS / Windows)
┌───────────────────────────────────────────────┐       ┌──────────────────────────────────┐
│ Corta Server  (Ubuntu Server)                 │       │ Corta Desktop (Remote)           │
│                                               │ HTTPS │  = Hermes Desktop, "light"       │
│  Hermes Agent ── gateway (`hermes serve`) ◄───┼───────┤    variant, Corta brand          │
│      │                                        │  WS   │  - no local agent, no Python     │
│      ├── local LLM (runs on the server)       │       │  - connects to the server's      │
│      └── firm files: server disks / NAS       │       │    gateway (token or sign-in)    │
└───────────────────────────────────────────────┘       └──────────────────────────────────┘
```

| Component | Role | Origin |
|---|---|---|
| **Hermes Agent** | Agent engine: sessions, tools, memory, skills, scheduled jobs, model calls. | Upstream, unmodified. |
| **Corta Server** | An Ubuntu server at the firm running Hermes Agent and its gateway. | Upstream Hermes install + Corta operations. |
| **Gateway** | The server's HTTP/WebSocket endpoint (`hermes serve`) the Desktop connects to. Authenticates with a session token or OAuth. | Upstream. |
| **Local LLM** | The model runs on the server, configured as a Hermes provider/endpoint. Nothing runs on users' computers. | Upstream provider configuration. |
| **Storage / NAS** | The firm's files are reached by the agent from the server (local disks or mounted NAS). They never need to live on the users' computers. | Server configuration. |
| **Corta Desktop** | The client users install. It is the upstream Hermes Desktop built as the **light** (remote-only) variant under the Corta brand. | Upstream app + Corta brand layer. |

Corta Desktop is a **remote client**: it carries no agent runtime, needs no Python and no model on
the workstation, and does not install one. On first launch it only offers to connect to a gateway
(see the upstream guide
[Connecting to a remote backend](https://hermes-agent.nousresearch.com/docs/user-guide/desktop#connecting-to-a-remote-backend)).
A gateway URL can be preset for managed deployments with `HERMES_DESKTOP_REMOTE_URL`.

## 3. What's different from upstream?

Every Corta change in an upstream file is marked `CORTA CUSTOMIZATION`. Corta-only files live in
`corta/`, `apps/desktop/branding/`, `apps/desktop/src/branding/` and one workflow.

| Area | Change | Where |
|---|---|---|
| **Branding** | A brand layer selected at build time (`HERMES_DESKTOP_BRAND=corta`). Unset, every build is byte-for-byte upstream Hermes. | `apps/desktop/branding/brands.cjs` |
| Branding | Product name "Corta" in window titles, native menus, About panel, tray, notifications, quit dialog and all bundled UI copy (9 locales); "Hermes Agent" (engine) and "Hermes Cloud" (a Nous service) are kept where they are true. | `src/branding/copy.ts`, `electron/brand-name.ts`, `branding/vite-brand.mjs` |
| Branding | The Hermes/Nous brand mark is not shown. Corta's mark, icons and installer artwork are **not supplied yet**; a release gate blocks client installers until they are. | `corta/docs/BRAND_ASSETS.md`, `corta/scripts/check-brand-assets.mjs` |
| **Theme** | A native "Corta" preset in the Hermes theme system (light + dark, all surfaces, terminal palettes), default on every new install; the alternative built-in presets and server-pushed CLI skins are not offered. Its colour values are a neutral upstream palette until Corta's tokens are supplied. | `src/branding/corta-theme.ts`, `src/branding/themes.ts` |
| **Packaging** | Corta OS identity: `fr.corta.desktop`, product "Corta", own userData directory, own MSIX identity/publisher, no Nous artwork, metadata/copyright with Nous Research attribution. Store packaging refused (no Corta Store identity). | `branding/brands.cjs`, `product-identity.cjs`, `electron-builder.config.cjs` |
| **Desktop configuration** | The light variant is strictly remote-only: it never adopts a Hermes install found on the computer and never offers or starts a local install. | `electron/main.ts`, `electron/bootstrap-needed-backend.ts`, `electron/first-run-setup-gate.ts`, `src/components/desktop-install-local-card.ts` |
| **Distribution** | Updates come from `https://updates.corta.fr`, never from Nous Research's feeds or GitHub releases. Corta build scripts (`dist:corta:*`). | `branding/brands.cjs`, `apps/desktop/package.json`, `corta/docs/RELEASE.md` |
| **Upstream sync** | Sync script, merge rules for Corta-owned files, a scheduled GitHub Action that prepares (never publishes) sync branches. | `corta/scripts/sync-upstream.sh`, `.gitattributes`, `.github/workflows/corta-upstream-sync.yml` |
| Corta-specific features | None yet. | — |

The full list of upstream files Corta touches, and why, is in
[`corta/docs/UPSTREAM_SYNC.md`](corta/docs/UPSTREAM_SYNC.md#touchpoints).

## 4. Upstream synchronization

Remotes and branches:

| Remote | URL | Branch |
|---|---|---|
| `origin` | `https://github.com/Corta-Pampa/hermes-agent` | `main` (Corta) |
| `upstream` | `https://github.com/NousResearch/hermes-agent.git` | `main` |

Check the remotes, and add `upstream` if it is missing (never rewrite an existing one):

```sh
git remote -v
git remote add upstream https://github.com/NousResearch/hermes-agent.git   # only if absent
git config merge.ours.driver true                                        # once per clone (see below)
```

Recommended: the scripted procedure, which works on a dedicated branch and never pushes:

```sh
corta/scripts/sync-upstream.sh --report   # what upstream has that Corta does not
corta/scripts/sync-upstream.sh            # creates corta/sync/upstream-<date> and merges into it
```

The equivalent manual commands:

```sh
git fetch upstream
git checkout main
git pull origin main
git checkout -b corta/sync/upstream-$(date -u +%Y%m%d)
git merge --no-ff upstream/main
```

Compare the two lines of history:

```sh
git log --oneline upstream/main..main      # Corta's own commits (customizations, merges)
git log --oneline main..upstream/main      # upstream commits Corta has not merged yet
git diff upstream/main...main              # everything Corta changes relative to upstream
git diff --stat upstream/main...main       # the same, as a file list
```

Three kinds of commits:

- **Upstream commits merged in** — arrive through `git merge upstream/main`; never edit them.
- **Corta customizations** — commits on `main` that are not upstream (`upstream/main..main`). They
  live in the places listed in section 3 and survive merges as long as conflicts are resolved by
  keeping the Corta intent.
- **Commits to re-apply** — a Corta change in an upstream file that upstream rewrote. Git reports it
  as a conflict; re-apply the Corta change on top of upstream's new code (never drop either side
  silently).

**Conflicts.** The script stops with the merge in progress and flags conflicted files that are Corta
touchpoints. Resolve each by keeping upstream's new behaviour *and* re-applying the
`CORTA CUSTOMIZATION` hunk. `README.md` and Corta-replaced icon files use the `ours` merge driver
(`.gitattributes`), so they keep Corta's version only when both sides changed them. Never resolve a
conflict by deleting a Corta customization or by discarding upstream's change wholesale.

**Test, then push the sync branch and open a PR into `main`:**

```sh
cd apps/desktop
NODE_OPTIONS=--max-old-space-size=8192 pnpm run typecheck && pnpm run lint
pnpm exec vitest run --project ui
pnpm exec vitest run --project electron electron/product-identity-brand.test.ts electron/product-identity.test.ts
pnpm run build:corta
cd ../.. && git push -u origin corta/sync/upstream-<date>
```

No force push, no history rewrite. The detailed procedure, the touchpoint list and the automated
workflow are in [`corta/docs/UPSTREAM_SYNC.md`](corta/docs/UPSTREAM_SYNC.md).

## 5. Build Corta Desktop

Prerequisites (pinned by `pm/lock.json`, provisioned by `./activate`): Node 26, pnpm 12, git.
macOS installers are built on macOS (Xcode CLT; Xcode 26 for the macOS 26 icon), Windows MSIX on
Windows 11 with the Windows SDK. Signing is optional for local builds.

```sh
source ./activate                          # PM-managed Node/pnpm (use an isolated HERMES_HOME for dev)
pnpm install --frozen-lockfile             # at the repository root

cd apps/desktop
pnpm run dev:corta                         # run Corta Desktop Remote from source
pnpm run build:corta                       # renderer + main bundles, Corta brand, light variant
pnpm run pack:corta                        # unpacked app in release/ (no installer, no publish)
pnpm run corta:check-brand                 # release gate: fails while Hermes/Nous artwork is shipped
pnpm run dist:corta:mac                    # DMG + ZIP   (macOS host)
pnpm run dist:corta:win                    # MSIX        (Windows host)
pnpm run dist:corta:linux                  # AppImage/deb/rpm (internal use)
```

Variants (`HERMES_DESKTOP_VARIANT`) remain the upstream ones and can all be built under either
brand (`HERMES_DESKTOP_BRAND=hermes|corta`):

| Variant | Corta product | Local runtime | Corta use |
|---|---|---|---|
| `light` | **Corta** (`fr.corta.desktop`) | none — remote only | **The commercial product** |
| *(empty)* | Corta Local (`fr.corta.desktop-local`) | bootstraps a local Hermes | internal only |
| `bundled` | Corta Agent (`fr.corta.desktop-agent`) | embedded Python payload | internal only |
| `store` | refused under the Corta brand | — | — |

`dist:corta:*` refuses to run while the brand gate fails; `CORTA_ALLOW_PLACEHOLDER_ASSETS=1` lets an
**internal** test build through. Details: [`corta/docs/RELEASE.md`](corta/docs/RELEASE.md).

## 6. Release process

1. Merge the upstream sync you want to ship into `main` (section 4) and pin it: the Desktop and the
   firm's server must run Hermes from the **same upstream merge commit** (the Desktop checks the
   server's backend contract and warns on skew in either direction).
2. Tag the Corta release in Corta's own namespace, e.g. `corta-v1.2.0` (never `v*`, which is
   upstream's), and build on macOS and Windows with
   `HERMES_PAYLOAD_TAG=v1.2.0 HERMES_RELEASE_EPOCH=<tag time>` so the app carries the version.
3. Sign (Apple Developer ID + notarization; Windows code-signing certificate whose subject is
   `CORTA_MSIX_PUBLISHER`). No secret or certificate is configured in this repository.
4. Test the installers on clean machines against a staging Corta Server.
5. Upload to `updates.corta.fr` under the layout in `corta/docs/RELEASE.md` — beta channel first,
   then stable. Keep previous versions online for rollback.

Nothing in this repository publishes automatically. The GitHub Action only prepares sync branches.

## 7. License and attribution

This project is based on **Hermes Agent** by **Nous Research**, distributed under the
[MIT License](LICENSE) (`Copyright (c) 2025 Nous Research`). The license and copyright notices in
this repository, including those of bundled components (e.g. `apps/desktop/src/plugins/hermes-bots/LICENSE`),
are kept as-is and must ship with every distribution. Corta's About panel states that the product
is built on Hermes Agent, © Nous Research (MIT).

Corta is not the author of the Hermes Agent engine. "Hermes", "Hermes Agent", "Hermes Cloud" and
"Nous Research" are names of Nous Research's projects and services; Corta is not affiliated with or
endorsed by Nous Research. The licence under which Corta publishes its own changes is Corta's
decision; whatever it is, the upstream code keeps its MIT notice. `README.es.md`, `README.zh-CN.md`
and `README.ur-pk.md` are upstream's translated Hermes READMEs, kept unchanged.

## 8. Development

- Start with [`AGENTS.md`](AGENTS.md) (upstream's engineering guide, applies to this fork too) and
  `apps/desktop/AGENTS.md`.
- Corta-specific documentation is in [`corta/`](corta/README.md): audit, branding, brand assets to
  supply, upstream sync, release and updates, user-data migration, risks and remaining work.
- Where Corta customizations live:
  - `apps/desktop/branding/` — brand manifests (names, IDs, publisher, update origin, renderer brand).
  - `apps/desktop/src/branding/` — Corta theme preset and tokens, copy rewriting, theme policy.
  - `corta/` — scripts and documentation; `.github/workflows/corta-upstream-sync.yml`.
  - `grep -rn "CORTA CUSTOMIZATION"` — every hook in an upstream file.
- Rules for Corta changes: prefer the brand layer and upstream extension points; touch an upstream
  file only when no seam exists, keep the hunk small and marked; never change the agent engine for
  branding; add a behaviour test for every hook (see `src/branding/*.test.ts`,
  `electron/product-identity-brand.test.ts`).
- Fixes that are not Corta-specific (e.g. the light variant's remote-only behaviour) are good
  candidates to propose upstream, which shrinks the fork.
