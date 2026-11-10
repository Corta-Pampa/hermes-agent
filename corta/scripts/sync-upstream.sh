#!/usr/bin/env bash
# CORTA CUSTOMIZATION
# Reproducible upstream synchronization for the Corta fork.
#
#   corta/scripts/sync-upstream.sh            # prepare a sync branch and merge upstream into it
#   corta/scripts/sync-upstream.sh --report   # only report what upstream has that Corta does not
#
# What it does, in order (nothing is pushed, nothing is force-anything):
#   1. Checks the remotes: `upstream` must point at NousResearch/hermes-agent.
#      It is added ONLY if absent; an existing remote is never rewritten.
#   2. Fetches upstream (branch + tags) and origin.
#   3. Reports incoming upstream commits, new upstream release tags, Corta-only
#      commits, and the upstream files Corta modifies ("touchpoints").
#   4. Creates `corta/sync/upstream-<UTC date>` from origin/<corta branch> and
#      runs `git merge --no-ff upstream/<branch>` on it.
#   5. On conflict it STOPS with the merge in progress, lists every conflicted
#      file and flags the ones that are Corta touchpoints. It never resolves a
#      conflict for you.
#
# Environment overrides (all optional):
#   UPSTREAM_URL     default https://github.com/NousResearch/hermes-agent.git
#   UPSTREAM_BRANCH  default main
#   CORTA_BRANCH     default main
#   SYNC_BRANCH      default corta/sync/upstream-<UTC date>
#   REPORT_FILE      write the markdown report here as well as stdout
set -euo pipefail

UPSTREAM_URL="${UPSTREAM_URL:-https://github.com/NousResearch/hermes-agent.git}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-main}"
CORTA_BRANCH="${CORTA_BRANCH:-main}"
SYNC_BRANCH="${SYNC_BRANCH:-corta/sync/upstream-$(date -u +%Y%m%d)}"
REPORT_ONLY=0
[[ "${1:-}" == "--report" ]] && REPORT_ONLY=1

cd "$(git rev-parse --show-toplevel)"

report() { printf '%s\n' "$*"; [[ -n "${REPORT_FILE:-}" ]] && printf '%s\n' "$*" >> "$REPORT_FILE"; return 0; }
die() { echo "[corta-sync] ERROR: $*" >&2; exit 2; }
[[ -n "${REPORT_FILE:-}" ]] && : > "$REPORT_FILE"

# ── 1. Remotes ───────────────────────────────────────────────────────────────
if git remote get-url upstream >/dev/null 2>&1; then
  current="$(git remote get-url upstream)"
  case "$current" in
    *NousResearch/hermes-agent*|*nousresearch/hermes-agent*) ;;
    *) die "remote 'upstream' points at '$current', not NousResearch/hermes-agent. Fix it by hand; this script never rewrites a remote." ;;
  esac
else
  echo "[corta-sync] adding remote upstream -> $UPSTREAM_URL"
  git remote add upstream "$UPSTREAM_URL"
fi

# README.md and Corta-replaced brand assets use the `ours` merge driver
# (.gitattributes). Git needs the driver defined locally; this is repo-scoped.
git config merge.ours.driver true

if [[ $REPORT_ONLY -eq 0 ]] && ! git diff --quiet HEAD -- 2>/dev/null; then
  die "working tree has uncommitted changes; commit or stash them first."
fi
if [[ $REPORT_ONLY -eq 0 ]] && [[ -e "$(git rev-parse --git-path MERGE_HEAD)" ]]; then
  die "a merge is already in progress; finish or abort it (git merge --abort) first."
fi

# ── 2. Fetch ─────────────────────────────────────────────────────────────────
# Release tags only (vX.Y.Z and canaries); upstream also keeps hundreds of
# abandoned-rc.* bookkeeping tags Corta has no use for.
git fetch --no-tags upstream "$UPSTREAM_BRANCH"
git fetch --no-tags upstream "+refs/tags/v*:refs/tags/v*"
git fetch origin "$CORTA_BRANCH"

UP="upstream/$UPSTREAM_BRANCH"
OURS="origin/$CORTA_BRANCH"
base="$(git merge-base "$OURS" "$UP" || true)"
[[ -n "$base" ]] || die "no merge base between $OURS and $UP (shallow clone? run: git fetch --unshallow origin)"

# ── 3. Report ────────────────────────────────────────────────────────────────
incoming="$(git rev-list --count "$OURS..$UP")"
corta_only="$(git rev-list --count "$UP..$OURS")"
touchpoints="$(git diff --name-only --diff-filter=M "$base" "$OURS" | sort)"
upstream_changed="$(git diff --name-only "$base" "$UP" | sort)"
overlap="$(comm -12 <(printf '%s\n' "$touchpoints") <(printf '%s\n' "$upstream_changed") | sed '/^$/d')"
new_tags="$(git tag --merged "$UP" --no-merged "$OURS" --sort=-creatordate 'v*' 2>/dev/null | grep -v '+canary' | head -20 | sed 's/^/- /' || true)"

report "# Upstream sync report ($(date -u +%Y-%m-%dT%H:%MZ))"
report ""
report "- Corta branch: \`$OURS\` @ $(git rev-parse --short "$OURS")"
report "- Upstream: \`$UP\` @ $(git rev-parse --short "$UP")"
report "- Merge base: $(git rev-parse --short "$base")"
report "- Upstream commits not yet in Corta: **$incoming**"
report "- Corta-only commits (customizations): **$corta_only**"
report ""
report "## New upstream release tags"
report "${new_tags:-_none_}"
report ""
report "## Upstream files Corta modifies (touchpoints)"
report "$(printf '%s\n' "$touchpoints" | sed '/^$/d;s/^/- /')"
report ""
report "## Touchpoints upstream ALSO changed since the merge base (review these first)"
report "$(printf '%s\n' "${overlap:-}" | sed '/^$/d;s/^/- /')"
[[ -n "$overlap" ]] || report "_none_"
report ""
report "## Incoming upstream commits (latest 50)"
report "$(git log --oneline --no-merges -50 "$OURS..$UP" | sed 's/^/- /')"

[[ $REPORT_ONLY -eq 1 ]] && exit 0
if [[ "$incoming" == "0" ]]; then
  report ""
  report "Corta is up to date with $UP. Nothing to merge."
  exit 0
fi

# ── 4. Merge on a dedicated branch ───────────────────────────────────────────
git rev-parse --verify --quiet "refs/heads/$SYNC_BRANCH" >/dev/null && die "branch $SYNC_BRANCH already exists; delete it or set SYNC_BRANCH."
git checkout -b "$SYNC_BRANCH" "$OURS"

if git merge --no-ff --no-edit -m "Merge upstream $UP ($(git rev-parse --short "$UP")) into Corta" "$UP"; then
  report ""
  report "## Merge result: CLEAN"
  report "Branch \`$SYNC_BRANCH\` holds the merge. Next: run the checks in corta/docs/UPSTREAM_SYNC.md, then open a PR into $CORTA_BRANCH."
  exit 0
fi

# ── 5. Conflicts: report, never resolve ─────────────────────────────────────
conflicts="$(git diff --name-only --diff-filter=U | sort)"
report ""
report "## Merge result: CONFLICTS ($(printf '%s\n' "$conflicts" | sed '/^$/d' | wc -l | tr -d ' ') file(s))"
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if printf '%s\n' "$touchpoints" | grep -qxF "$file"; then
    report "- \`$file\`  **CORTA TOUCHPOINT: keep the Corta customization, re-apply it on upstream's new code**"
  else
    report "- \`$file\`"
  fi
done <<< "$conflicts"
report ""
report "The merge is left IN PROGRESS on \`$SYNC_BRANCH\`. Resolve by hand (corta/docs/UPSTREAM_SYNC.md), or abort with: git merge --abort"
exit 1
