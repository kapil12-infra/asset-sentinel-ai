# Asset Sentinel AI: REST API

Base URL: `/api`. JSON in, JSON out. Types live in `packages/shared/src/index.ts`.

**Auth.** Every endpoint except `register`, `login` and the OAuth routes needs
`Authorization: Bearer <jwt>`. An API key (`as_live_...`) is also accepted in the same
header, or in `x-api-key`.

**Errors.** Nest default shape: `{ "statusCode": 400, "message": "text" | ["text", ...], "error": "Bad Request" }`.
`401` means the token is missing or expired. `404` means not found or not owned by the caller.

## Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password (min 8) }` | `AuthResponse` |
| POST | `/auth/login` | `{ email, password }` | `AuthResponse` |
| GET | `/auth/me` | | `User` |
| PATCH | `/auth/me` | `{ name?, email?, role?, org? }` | `User` |
| GET | `/auth/oauth/:provider` | `provider` is `google` or `github` | 302 to the provider. 501 if not configured |
| GET | `/auth/oauth/:provider/callback` | provider query | 302 to `${WEB_URL}/oauth/callback?token=<jwt>` or `?error=<text>` |

## Dashboard and activity

| Method | Path | Returns |
|---|---|---|
| GET | `/dashboard` | `DashboardSummary` (`trend` is the last 7 days, oldest first) |
| GET | `/activity?limit=20` | `ActivityItem[]`, newest first |

## Projects

| Method | Path | Body / query | Returns |
|---|---|---|---|
| GET | `/projects?q=&status=` | `status` is `none`, `pass` or `warn` | `Project[]`, newest first |
| POST | `/projects/generate` | `{ prompt (min 12 chars), name?, type }` | `Project` (slow, 2 to 60 s) |
| GET | `/projects/:id` | | `Project` |
| PATCH | `/projects/:id` | `{ name?, desc?, state? }` | `Project` |
| DELETE | `/projects/:id` | | `{ ok: true }` |
| POST | `/projects/:id/clone` | | `Project` |
| GET | `/projects/:id/files` | | `ProjectFile[]` |
| PUT | `/projects/:id/files` | `{ path, content }` creates or overwrites | `ProjectFile` |
| DELETE | `/projects/:id/files?path=` | | `{ ok: true }` |
| POST | `/projects/:id/assist` | `{ path, prompt }` | `{ content }`: the new file content. Not saved. The client shows it, then calls PUT to save |

`path` must match `^[\w\-./]+\.\w+$`.

## Tests (QA)

`SuiteKey` is `functional | api | automation | regression | performance`.

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/projects/:id/tests` | `{ suite }` | `TestRun` (takes about 1 s) |
| GET | `/tests?suite=&projectId=` | both optional | `TestRunSummary[]`, newest first |
| GET | `/tests/:id` | numeric id | `TestRun` |
| POST | `/tests/:id/rerun` | | `TestRun` (new run) |

## Security

| Method | Path | Returns |
|---|---|---|
| POST | `/projects/:id/scan` | `Scan` (replaces the previous scan) |
| GET | `/projects/:id/scan` | `Scan` or `null` when never scanned |
| POST | `/projects/:id/scan/fix-all` | `{ fixed: number }` |
| POST | `/security/vulnerabilities/:vulnId/fix` | `Vulnerability` |

## Deploy and environments

`stage` is upper case, 1 to 12 characters from `A-Z 0-9 _ -`. `DEV`, `STAGE` and `PROD` are the usual ones.

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/deployments` | `{ projectId, stage, method }` (`method` is `DeployMethod`) | `Environment` with `status: "Running"` (takes about 1.5 s) |
| GET | `/environments?projectId=` | `projectId` optional | `Environment[]` |
| POST | `/environments` | `{ projectId, stage }` creates it as `Stopped` | `Environment` (409 if it exists) |
| POST | `/environments/:id/toggle` | | `Environment` (Running becomes Stopped and back) |
| DELETE | `/environments/:id` | | `{ ok: true }` |

## Monitoring

| Method | Path | Returns |
|---|---|---|
| GET | `/monitoring?range=1h\|24h\|7d` | `MonitoringSnapshot` (real process and request metrics) |

## Integrations

Fixed catalog: `github`, `aws`, `docker`, `jenkins`, `slack`, `jira`.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/integrations` | | `Integration[]` |
| POST | `/integrations/:id/connect` | `{ token (min 6) }` | `Integration` |
| POST | `/integrations/:id/disconnect` | | `Integration` |

## Agents

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/agents` | | `Agent[]` (the four defaults are created on first call) |
| POST | `/agents` | `{ name, description (min 8) }` | `Agent` |
| POST | `/agents/:id/run` | `{ task? }` | `{ output: string }` (plain text, may contain markdown) |

## Settings

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/settings/api-keys` | | `ApiKeyInfo[]` |
| POST | `/settings/api-keys` | `{ name }` | `{ key: string, info: ApiKeyInfo }`: the full key is shown only here |
| DELETE | `/settings/api-keys/:id` | | `{ ok: true }` |
| GET | `/settings/team` | | `TeamMember[]` (the owner comes first) |
| POST | `/settings/team` | `{ email, role }` | `TeamMember` (status `Invited`) |
| DELETE | `/settings/team/:id` | | `{ ok: true }` |
| GET | `/settings/billing` | | `Billing` |
| GET | `/settings/preferences` | | `Preferences` |
| PATCH | `/settings/preferences` | partial `Preferences` | `Preferences` |
