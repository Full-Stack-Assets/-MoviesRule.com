# Security Remediation: Credential Exposure

## Summary
A set of API credentials was exposed in this repository and must be treated as
compromised. The actual secret values have been removed from this document and
the working tree. This note is retained as an incident record and contains
**no key values**.

## Affected credential types
The following credential **types** were exposed (values intentionally omitted):

- LLM provider API key (Groq)
- Brave Search API key
- Pexels API key
- GitHub personal access token
- `CRON_SECRET`

## Required action — rotate everything (do this first)
Exposed secrets cannot be "un-leaked" by editing or deleting files. Every
credential above must be **revoked and regenerated** at its provider, and the
new values stored only in untracked secret stores (local `.env.local`, GitHub
Actions secrets, and the Vercel project env vars) — never committed.

| Credential | Rotate at |
|---|---|
| Groq API key | https://console.groq.com/keys |
| Brave Search key | https://api.search.brave.com/app/keys |
| Pexels key | https://www.pexels.com/api/ |
| GitHub PAT | https://github.com/settings/tokens |
| `CRON_SECRET` | regenerate: `openssl rand -hex 32` |

After rotating, update each deployment environment (Vercel) and redeploy.

## Repository hygiene
- `.env.local` is git-ignored and was never tracked in this repository.
- `.env.example` contains placeholders only — keep it that way.
- Enable GitHub secret scanning **and push protection** on the repository.
- Consider a pre-commit secret scanner (e.g. gitleaks or TruffleHog).

## History note
The exposed values previously lived in this file as far back as the
repository's initial commit, so they remain reachable through git history
until history is rewritten or the repository is recreated. **Once every key
above is rotated, that residual history is inert** (the strings are dead).
If full eradication from the host is also desired, recreate the repository
from a clean tree.
