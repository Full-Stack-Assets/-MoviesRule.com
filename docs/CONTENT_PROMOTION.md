# Content Promotion

1. Scheduled generation writes to `automation/content-candidate`.
2. Open or update a pull request from the candidate branch to `main`.
3. Require type checks, lint, tests, a full build, source review, and preview review.
4. Merge only after the candidate is accepted.
5. Let the normal Git integration deploy the merged production commit.
6. Roll back by reverting the promotion commit, not by editing generated files directly in production.
