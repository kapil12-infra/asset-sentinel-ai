# Deployment

## Environments
| Branch | Environment | Namespace |
|---|---|---|
| `develop` | STAGE | `sentinel-stage` |
| `main` | PROD | `sentinel-prod` |

## One-time setup
1. `cd infra/terraform && terraform init && terraform apply -var environment=stage` (repeat for `prod`).
2. Fetch kubeconfig: `aws eks update-kubeconfig --name asset-sentinel-<env>`.
3. Create the namespace and secrets (see `infra/k8s/secrets.example.yaml`). Use the `database_url_secret_arn` output for `DATABASE_URL`.
4. Add the GitHub secret `KUBE_CONFIG` (base64 kubeconfig) to the `stage` and `prod` environments. Require reviewers on `prod`.
5. Replace `OWNER` and `sentinel.example.com` in `infra/k8s/app.yaml`.

## Release
Merge to `develop` (STAGE), verify, then PR `develop` into `main` (PROD). The deploy workflow builds images tagged with the commit SHA and rolls them out.

## Rollback
`kubectl -n sentinel-prod rollout undo deploy/api` (and `deploy/web`).

## Database
The API container runs `prisma db push` on start. Once the schema is stable, generate migrations with `npx prisma migrate dev` and change the container command to `prisma migrate deploy`.
