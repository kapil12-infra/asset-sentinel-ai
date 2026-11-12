# Asset Sentinel AI Build Studio

Build, test, secure and deploy apps from one place. Describe an app, get a generated project, run QA suites, scan for vulnerabilities and deploy to DEV, STAGE or PROD.

| Part | Tech |
|---|---|
| `apps/web` | React 18, Vite, TypeScript, React Router |
| `apps/api` | NestJS 10, Prisma 5, PostgreSQL, JWT |
| `packages/shared` | Shared TypeScript types (types only) |
| `infra/` | `docker/` Dockerfiles and nginx config, `k8s/` manifests, `terraform/` AWS EKS + RDS |
| `.github/workflows` | CI and deploy pipelines |

## Quick start (Docker)

```bash
cp .env.example .env        # optional, set JWT_SECRET and ANTHROPIC_API_KEY
docker compose up --build
```

Open http://localhost:8080 and create an account.

## Local development

Requires Node 20+ and PostgreSQL 14+.

```bash
npm install
cp .env.example apps/api/.env       # edit DATABASE_URL
npm run build:shared
npm run db:push                     # create tables
npm run db:seed                     # optional: demo@assetsentinel.ai / Demo@12345
npm run dev:api                     # http://localhost:3000/api
npm run dev:web                     # http://localhost:5173 (proxies /api)
```

## Scripts

| Command | What it does |
|---|---|
| `npm run typecheck` | Typecheck shared, api and web |
| `npm test` | API unit tests (Jest) |
| `npm run build` | Build shared, api and web |

## Optional features

- **AI generation and assist**: set `ANTHROPIC_API_KEY`. Without it the app uses built-in templates.
- **Google and GitHub sign-in**: set the `*_CLIENT_ID` and `*_CLIENT_SECRET` variables. Callback URLs are `${API_URL}/api/auth/oauth/<provider>/callback`. Without them the buttons return 501.
- **API keys**: create them in Settings. Send as `Authorization: Bearer as_live_...` or `x-api-key`.

## What is simulated

Test runs, security scans and deployments are simulated: results are generated and stored, but no real test runner, scanner or cloud deploy is invoked. Monitoring shows real request and process metrics of the API itself. Playwright, Newman and k6 runners, ZAP scans and Kubernetes or Lambda deploys are not implemented yet. Wiring them is the main extension point (see `docs/ARCHITECTURE.md`).

## Branching

`main` deploys to PROD (protect the `prod` GitHub environment with required reviewers), `develop` deploys to STAGE, work happens in `feature/*`.

## Docs

- [API reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Runbooks](docs/RUNBOOKS.md)
