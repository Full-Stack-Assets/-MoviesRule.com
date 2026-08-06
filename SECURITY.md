# Security Policy

Report vulnerabilities privately to the repository owner. Do not open a public issue containing credentials, exploit details, private URLs, or personal data.

## Production controls

- Generated content must pass type checks, lint, tests, and a production build before promotion.
- Scheduled generation must not deploy production directly.
- Secrets must remain in GitHub Actions or deployment-provider secret stores.
- Workflow changes and content-pipeline changes require owner review.
