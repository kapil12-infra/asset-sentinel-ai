# Architecture

```
Browser ──► nginx (web image) ──► /api ──► NestJS API ──► PostgreSQL
                                              │
                                              └──► Anthropic API (optional)
```

## Modules (apps/api/src)

| Module | Responsibility |
|---|---|
| `core` (global) | Prisma, activity log, AI wrapper, crypto, users, metrics store |
| `auth` | Register, login, `/me`, Google and GitHub OAuth |
| `projects` | CRUD, clone, files, AI assist |
| `builds` | `POST /projects/generate`: scaffold plus optional AI, then auto test, scan and deploy per user preferences |
| `tests` | Simulated suites, persisted runs |
| `security` | Simulated scans, per-finding fixes |
| `deploy` | Deployments (`POST /deployments`) |
| `environments` | List, create, start/stop, remove environments |
| `monitoring` | Real request latency and success rate, process CPU and memory; Prometheus text at `/api/metrics` |
| `integrations` | Catalog of six services; tokens stored AES-256-GCM encrypted |
| `agents` | Four default agents plus custom ones; output from the model or a template |
| `settings` | API keys (SHA-256 hashed), team, billing, preferences |

## Auth

A global `JwtAuthGuard` protects every route. Use `@Public()` to opt out (login, register, OAuth, health). The guard accepts a JWT or an `as_live_` API key. Keys are shown once and stored only as a hash.

## Data

See `apps/api/prisma/schema.prisma`. Deleting a user or project cascades to its files, runs, scans and environments.

## Extension points

- **Real tests**: replace `simulateRun` in `tests/suites.ts` with a runner that executes the project's files (for example in an isolated container) and returns the same `RunResult` shape.
- **Real scans**: replace `makeFindings` in `security/vulns.ts` with a scanner such as Trivy or Semgrep output mapped to `VulnTemplate`.
- **Real deploys**: in `DeployService.deploy`, call your target (Kubernetes API, ECS, Vercel) instead of the 1.5 s wait.
- **Migrations**: the container uses `prisma db push`. Switch to `prisma migrate deploy` once you commit migrations.

## Security notes

- Set a strong `JWT_SECRET` and a 64-hex `SECRETS_KEY` in every real environment.
- The metrics store is in memory and per process; use Prometheus when running several replicas.
- Rate limiting is not included. Put it at the ingress or add `@nestjs/throttler` before exposing the API publicly.
