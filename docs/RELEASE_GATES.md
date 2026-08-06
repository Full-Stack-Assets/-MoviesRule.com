# Release Gates

A content candidate may reach `main` only after:

- `npm ci`
- `npm run typecheck`
- `npm run typecheck:test`
- `npm run lint`
- `npm test`
- `npm run build`
- source and factual review for changed articles
- duplicate-topic review
- preview deployment review

The scheduled generator writes only to `automation/content-candidate`. Production deployment occurs only after a reviewed pull request is merged.
