# Runbooks

## API is down or restarting
1. `kubectl -n <ns> get pods -l app=api` and `kubectl -n <ns> logs deploy/api --tail=200`.
2. Check `/api/health`. If the pod is crash-looping, the usual causes are a wrong `DATABASE_URL` or a missing `JWT_SECRET`.
3. If a release caused it: `kubectl -n <ns> rollout undo deploy/api`.

## Database connection errors
1. Confirm the RDS instance is available and the node security group is allowed on 5432 (see `infra/terraform/main.tf`).
2. Check the secret: `kubectl -n <ns> get secret sentinel-secrets -o jsonpath='{.data.DATABASE_URL}' | base64 -d` (do not paste it anywhere).
3. Restart the API after fixing: `kubectl -n <ns> rollout restart deploy/api`.

## Users are logged out after a deploy
`JWT_SECRET` changed. Keep it stable across releases; rotating it invalidates every session and API key stays valid (keys are hashed separately).

## Integration tokens cannot be decrypted
`SECRETS_KEY` changed. Restore the previous key, or ask users to reconnect their integrations.

## Rotate a leaked API key
Settings, API keys, delete the key, create a new one. Deleting takes effect immediately.

## Metrics
`GET /api/metrics` serves Prometheus text. Set `METRICS_TOKEN` and configure the scraper with `authorization: Bearer <token>`. Counters are per process and reset on restart.

## Failed deploy workflow
Open the Actions run. If `rollout status` timed out, run the rollback above, fix forward on a branch, and redeploy.
