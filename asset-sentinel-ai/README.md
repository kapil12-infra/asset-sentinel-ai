# Asset Sentinel AI Build Studio

This package contains the supplied, self-contained HTML application plus Nginx and Docker deployment files.

## Files
- `index.html`: supplied dashboard HTML (CSS and JavaScript are inline).
- `Dockerfile`: builds a lightweight Nginx image.
- `nginx.conf`: serves the app and supports client-side page fallback.
- `assets/`: ready for any images, stylesheets, or scripts you add later.
- `deploy.sh`: builds and starts the container on port 8080 by default.

## Deploy on Ubuntu EC2
1. Install Docker if it is not already installed.
2. Copy/extract this folder onto EC2.
3. Run:
   ```bash
   cd asset-sentinel-ai
   chmod +x deploy.sh
   ./deploy.sh
   ```
4. Allow inbound TCP 8080 in the EC2 security group for your test IP.
5. Open `http://EC2-PUBLIC-IP:8080`.

Change the host port with `HOST_PORT=8090 ./deploy.sh`.

## Important
The supplied HTML currently behaves as a frontend demo and uses in-browser sample data.
Docker/Nginx hosting does not create backend APIs, database persistence, real AI model access,
real test execution, or real deployments. Those require backend services and integrations.
