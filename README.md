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

## SonarCloud + Trivy (GitHub Actions)

- **SonarCloud**: requires `SONAR_TOKEN` secret and updating `sonar-project.properties` values:\n  - `sonar.organization`\n  - `sonar.projectKey`\n\n- **Trivy**:\n  - filesystem scan runs on every push/PR\n  - image scan runs automatically **only if** `Dockerfile` exists\n+
