# Phoenix Payment Service

Payment microservice for the Phoenix system (payments + refunds) using Node.js, Express, and MongoDB.

## Quick start

1) Create `.env` (see `.env.example`).

2) Install dependencies:

```bash
npm install
```

3) Run locally:

```bash
npm run dev
```

## API endpoints

See `end_api.txt`.

**OpenAPI / Swagger UI (browser):** with the server running, open [http://localhost:4002/api-docs](http://localhost:4002/api-docs) (default port from `PORT` / `4002`). Raw spec: `/api-docs/swagger.json`.

## Testing APIs with a dummy JWT (local)

This service verifies JWTs using `JWT_SECRET` and reads:
- user id from `sub` (or `userId` / `id`)
- role from `role` (defaults to `USER`)

### Generate a USER token

PowerShell:

```powershell
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({sub:'user-123',role:'USER'}, process.env.JWT_SECRET, {expiresIn:'1h'}));"
```

### Generate an ADMIN token

```powershell
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({sub:'admin-1',role:'ADMIN'}, process.env.JWT_SECRET, {expiresIn:'1h'}));"
```

### Example requests (curl)

Health:

```bash
curl http://localhost:4002/health
curl http://localhost:4002/ready
```

Create payment (requires Booking Service running at `BOOKING_SERVICE_BASE_URL`):

```bash
curl -X POST http://localhost:4002/api/payments \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"bookingId\":\"booking-1\",\"amount\":100,\"currency\":\"LKR\",\"paymentMethod\":\"CARD\"}"
```

List my payments:

```bash
curl http://localhost:4002/api/payments -H "Authorization: Bearer <USER_TOKEN>"
```

Admin list all payments:

```bash
curl "http://localhost:4002/api/payments?all=true" -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Update payment status (ADMIN only):

```bash
curl -X PATCH http://localhost:4002/api/payments/<paymentId>/status \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"PROCESSING\"}"
```

Request refund (only for `SUCCESS` payments):

```bash
curl -X POST http://localhost:4002/api/refunds \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"paymentId\":\"<paymentId>\",\"refundAmount\":50,\"refundReason\":\"test\"}"
```

## Logging

- Logs are **structured JSON** (one object per line) on stdout/stderr with fields: `ts`, `level`, `msg`, `service`, `env`, plus optional metadata.
- Set `LOG_LEVEL` to `error`, `warn`, `info`, or `debug`. HTTP access lines are logged with `type: "http_access"`.
- **Do not** log secrets or full `MONGO_URI` (the DB layer only logs “Connecting to MongoDB”).

## CI/CD (GitHub Actions)

- **[`.github/workflows/ci.yml`](.github/workflows/ci.yml)** — on every push/PR: `npm ci`, **`npm audit`** (high+), **ESLint**, **Jest + coverage**, **SonarCloud** (with Quality Gate wait via `sonar-project.properties`), **Trivy** (filesystem + Docker image when `Dockerfile` exists).
- **[`.github/workflows/cd.yml`](.github/workflows/cd.yml)** — on semver tags `v*.*.*` (or manual dispatch): build and push image to **GHCR** (`ghcr.io/<owner>/<repo>`).

### Required secrets / config

- **SonarCloud**: GitHub secret `SONAR_TOKEN`; set `sonar.organization` and `sonar.projectKey` in [`sonar-project.properties`](sonar-project.properties).
- **GHCR**: uses default `GITHUB_TOKEN` from the workflow (packages write permission on the CD job).

### Local checks (same as CI)

```bash
npm ci
npm audit --audit-level=high
npm run lint
npm run test:coverage
```

## SonarCloud + Trivy (summary)

- **SonarCloud**: Quality Gate waits on analysis when `sonar.qualitygate.wait=true`.
- **Trivy**: filesystem scan on every run; image scan when `Dockerfile` is present.

