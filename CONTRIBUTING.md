# Contributing

## Branches
- `main`: production. Merge only from `develop` via pull request.
- `develop`: staging.
- `feature/<short-name>`: your work; open a PR into `develop`.

## Workflow
1. `npm install && npm run build:shared`
2. Make your change with tests where it makes sense.
3. Run `npm run typecheck && npm test && npm run build` before pushing.
4. Open a PR. CI must pass.

## Conventions
- Shared types live in `packages/shared` and are imported with `import type`.
- New API routes go in the matching module, with DTOs validated by `class-validator`, and are documented in `docs/API.md`.
- Never commit secrets. Use `.env` locally and Kubernetes secrets in clusters.
