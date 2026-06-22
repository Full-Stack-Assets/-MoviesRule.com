#!/usr/bin/env bash
#
# verify-rotation.sh — post-incident credential rotation helper.
#
# This script contains NO secret values. It reads keys from the environment
# (or a .env.local you source first) and pings each provider's cheapest
# authenticated endpoint to report whether the key is ALIVE or REVOKED.
#
# Usage:
#   1. Confirm the OLD keys are dead (run BEFORE setting new ones, or with the
#      old values exported): every check should print REVOKED.
#        GROQ_API_KEY=old... BRAVE_API_KEY=old... ./scripts/verify-rotation.sh
#   2. Confirm the NEW keys work (after rotating + updating .env.local):
#        set -a && . ./.env.local && set +a && ./scripts/verify-rotation.sh
#
# Only variables that are set are checked. Nothing is written or transmitted
# anywhere except the provider liveness probes below.
set -u

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
# $1 label, $2 http_status, $3 alive-codes (space separated)
report() {
  local label="$1" code="$2" alive="$3"
  if [ -z "$code" ] || [ "$code" = "000" ]; then
    printf '  %-14s ? UNKNOWN (no response / network)\n' "$label"
  elif case " $alive " in *" $code "*) true ;; *) false ;; esac; then
    printf '  %-14s \033[33mALIVE\033[0m (HTTP %s) — fine for a NEW key, BAD if this is the leaked one\n' "$label" "$code"
  else
    printf '  %-14s \033[32mREVOKED\033[0m (HTTP %s)\n' "$label" "$code"
  fi
}
probe() { curl -s -o /dev/null -w '%{http_code}' -m 15 "$@" 2>/dev/null; }

bold "Credential liveness check (ALIVE = key still works, REVOKED = safely killed)"

if [ -n "${GROQ_API_KEY:-}" ]; then
  report "Groq"   "$(probe -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models)" " 200 "
fi
if [ -n "${GEMINI_API_KEY:-}" ]; then
  # NB: an invalid/revoked Gemini key returns HTTP 400 (API_KEY_INVALID), so 200 only.
  report "Gemini" "$(probe "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY")" " 200 "
fi
if [ -n "${BRAVE_API_KEY:-}" ]; then
  report "Brave"  "$(probe -H "X-Subscription-Token: $BRAVE_API_KEY" 'https://api.search.brave.com/res/v1/web/search?q=test&count=1')" " 200 "
fi
if [ -n "${PEXELS_API_KEY:-}" ]; then
  report "Pexels" "$(probe -H "Authorization: $PEXELS_API_KEY" 'https://api.pexels.com/v1/search?query=a&per_page=1')" " 200 "
fi
if [ -n "${GITHUB_TOKEN:-}" ]; then
  report "GitHub PAT" "$(probe -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user)" " 200 "
fi

echo
bold "Fresh CRON_SECRET (set this in .env.local AND Vercel, then redeploy):"
if command -v openssl >/dev/null 2>&1; then
  echo "  CRON_SECRET=$(openssl rand -hex 32)"
else
  echo "  (openssl not found) generate with: openssl rand -hex 32"
fi

echo
bold "Update the new values in ALL of these, then re-run with the new keys:"
cat <<'PLACES'
  - .env.local                 (local development)
  - GitHub → Settings → Secrets and variables → Actions   (the hourly pipeline)
  - Vercel → Project → Settings → Environment Variables    (then redeploy)
PLACES
