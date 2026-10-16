#!/usr/bin/env bash
set -euo pipefail
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add public-data/
if git diff --cached --quiet; then exit 0; fi
git commit -m "Refresh Preflight public data $(date -u +%FT%TZ)"
for attempt in 1 2 3; do
  if git push origin "HEAD:${GITHUB_REF_NAME}"; then exit 0; fi
  git fetch origin "$GITHUB_REF_NAME"
  git rebase "origin/$GITHUB_REF_NAME"
done
git push origin "HEAD:${GITHUB_REF_NAME}"
