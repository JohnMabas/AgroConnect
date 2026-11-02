# AgroConnect

**Connecting Agriculture. Empowering Markets.**

AgroConnect is a digital agricultural marketplace and supply-chain coordination platform for farmers, buyers, cooperatives, transporters and platform administrators. The initial pilot focuses on Plateau State, Nigeria, with a long-term vision of expanding to other regions and countries.

The project is developed in approved phases. **Phase 1** delivered the frontend homepage and backend foundation. **Phase 2** adds the PostgreSQL database foundation: Aiven-compatible connections, Sequelize models, migrations, seeders, database-aware health checks, tests and Render deployment preparation. Authentication, marketplace features and dashboards are intentionally not implemented yet.

## Technology Stack

### Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- ESLint
- npm

### Backend

- Node.js 22 LTS or newer (Node.js 24 LTS recommended)
- Express.js
- TypeScript
- PostgreSQL
- Sequelize ORM
- Umzug migrations and seeders
- `pg` PostgreSQL driver
- dotenv
- ESLint
- Vitest and Supertest
- npm

### Infrastructure

- **Database hosting:** Aiven PostgreSQL
- **Application hosting:** Render
  - One Render Web Service for the backend
  - One Render Web Service for the frontend

No Docker, Kubernetes, Redis or microservices are used.

## Project Structure

```text
AgroConnect/
├── backend/
│   ├── src/
│   │   ├── config/                 # Environment configuration
│   │   ├── database/
│   │   │   ├── migrations/         # Sequelize migrations
│   │   │   ├── models/             # User, Role and UserRole models
│   │   │   ├── seeders/            # Idempotent development seeders
│   │   │   ├── config.ts           # Connection and TLS configuration
│   │   │   ├── connection.ts       # Connection test and health helpers
│   │   │   ├── migrator.ts         # Umzug migration runner
│   │   │   ├── seeder.ts           # Umzug seeder runner
│   │   │   ├── run-migrations.ts   # Migration CLI
│   │   │   ├── run-seeders.ts      # Seeder CLI
│   │   │   └── sequelize.ts        # Shared Sequelize instance
│   │   ├── middleware/             # Not-found and error handling
│   │   ├── routes/                 # API routes, including /api/health
│   │   ├── utils/                  # Contact normalization helpers
│   │   ├── app.ts                  # Express application
│   │   └── server.ts               # Startup, DB check and graceful shutdown
│   ├── tests/                      # Isolated PostgreSQL automated tests
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── frontend/
│   ├── src/                        # Existing Phase 1 Next.js homepage
│   ├── .env.example
│   └── package.json
├── render.yaml                     # Render Blueprint for both services
├── .gitignore
├── README.md
└── skills.md
```

`frontend/` and `backend/` are separate applications. There is no npm workspace or shared package layer.

## Requirements

- Node.js 22 LTS or newer (Node.js 24 LTS recommended)
- npm 10 or newer
- PostgreSQL 13 or newer (for `gen_random_uuid()`)
- An Aiven PostgreSQL service for shared/remote environments

## Getting Started

Install and run each application separately.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The frontend runs at <http://localhost:3000>. The Phase 1 homepage is preserved and does not depend on the database.

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL and SSL settings in .env
npm run db:migrate
npm run db:seed
npm run dev
```

The backend runs at <http://localhost:5000> by default. It binds to `0.0.0.0` so it works on Render.

The backend now requires valid database configuration at startup. It tests the database connection before listening and exits with a clear error if configuration is missing or invalid.

## Environment Variables

Never commit `.env` files or real credentials.

### Backend

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | `development`, `test` or `production`. Defaults to `development`. |
| `PORT` | No | API port. Defaults to `5000`. Render supplies this automatically. |
| `DATABASE_URL` | Yes* | Aiven PostgreSQL URI. Preferred over individual variables. |
| `DB_SSL` | No | Enable encrypted PostgreSQL connections. Defaults to `true` in production and when `DATABASE_URL` contains `sslmode=require`, `verify-ca` or `verify-full`. |
| `DB_SSL_CA_PATH` | Yes when verifying | Absolute path to the Aiven CA certificate. Required when `DB_SSL=true` and `DB_SSL_VERIFY` is not `false`. |
| `DB_SSL_VERIFY` | No | Defaults to `true`. Set to `false` only to explicitly accept encryption without certificate verification. Not recommended for production. |
| `DB_HOST` | Yes* | Used only when `DATABASE_URL` is empty. Local development only. |
| `DB_PORT` | No | Used only when `DATABASE_URL` is empty. Defaults to `5432`. |
| `DB_NAME` | Yes* | Used only when `DATABASE_URL` is empty. |
| `DB_USER` | Yes* | Used only when `DATABASE_URL` is empty. |
| `DB_PASSWORD` | No | Used only when `DATABASE_URL` is empty. |
| `DEFAULT_PHONE_COUNTRY` | No | Country used to normalize local phone numbers to E.164. Defaults to `NG`. |
| `FRONTEND_URL` | No | Frontend origin, for example `https://agroconnect-frontend.onrender.com`. |
| `TEST_DATABASE_URL` | Tests only | Isolated PostgreSQL test database. Its name must include `test`. |

\* Provide `DATABASE_URL`, or all required individual `DB_*` variables.

### Frontend

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public backend API base URL, for example `http://localhost:5000/api`. Never put database credentials here. |

## Aiven PostgreSQL Setup

1. Sign in to the [Aiven Console](https://console.aiven.io/).
2. Create or select a PostgreSQL service in a region appropriate for the pilot.
3. Wait for the service status to become **Running**.
4. Open the service **Overview** page and find **Connection information**.
5. Copy the **Service URI** (or the host, port, user, password and database name).
6. Do not assume the database name is `defaultdb`; use the exact database name shown by Aiven.
7. Download the **CA certificate** from the Aiven service page.
8. Store the CA certificate outside source control, for example at an absolute local path.
9. Configure the backend with the connection URI and CA path.

Example `backend/.env`:

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DATABASE
DB_SSL=true
DB_SSL_CA_PATH=/absolute/path/to/aiven-ca.pem
DB_SSL_VERIFY=true

FRONTEND_URL=http://localhost:3000
```

The URI may contain `sslmode=require`. AgroConnect parses the URI into host/port/database/credentials and controls TLS through `DB_SSL`, `DB_SSL_CA_PATH` and `DB_SSL_VERIFY`. This avoids conflicting `sslmode` behaviour.

### Aiven CA Certificate and TLS

- With `DB_SSL=true` and `DB_SSL_VERIFY=true` (default), the Aiven CA certificate is loaded from `DB_SSL_CA_PATH` and the server certificate is verified. Hostname verification is enabled, which is equivalent to `verify-full`.
- If `DB_SSL=true`, verification is on and `DB_SSL_CA_PATH` is missing, startup fails with a clear configuration error.
- `DB_SSL_VERIFY=false` explicitly enables encryption without certificate verification. This is not recommended and is never enabled silently.
- `sslmode=require` only encrypts the connection; it does not verify the server certificate the way `verify-ca` or `verify-full` does. Prefer the Aiven CA certificate with verification enabled.

### Verifying Aiven Connectivity

Live Aiven connectivity has not been verified in this workspace. To verify it with your Aiven service:

```bash
cd backend
cp .env.example .env
# Edit .env with the real DATABASE_URL, DB_SSL=true and DB_SSL_CA_PATH
npm install
npm run db:migrate:status
npm run db:migrate
npm run db:seed
npm run dev
```

In another terminal:

```bash
curl -i http://localhost:5000/api/health
```

A `200` response with `"database": { "status": "up" }` confirms the API can reach Aiven. A `503` response means the database is unreachable or the TLS/CA configuration is wrong. Check the backend log for a sanitized configuration error; it will not print the password or connection string.

### Local PostgreSQL

For local development, either:

- Point `DATABASE_URL` at the local database and set `DB_SSL=false`, or
- Leave `DATABASE_URL` empty and set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD`, with `DB_SSL=false`.

Do not use production Aiven credentials for local tests.

## Database Schema

Phase 2 creates only three tables.

### `users`

- UUID primary key
- `display_name` nullable
- `phone_number` nullable, unique when present, stored in E.164 format
- `email` nullable, unique when present, trimmed and lowercased
- `status` enum: `pending` (default), `active`, `suspended`
- `created_at` and `updated_at`
- Database check constraint requiring a phone number or email
- Database check constraints for E.164 phone format and lowercased email

### `roles`

- UUID primary key
- Unique lowercase `name`
- `created_at` and `updated_at`

Initial roles: `farmer`, `buyer`, `cooperative`, `transporter`, `admin`.

### `user_roles`

- UUID primary key
- `user_id` foreign key to `users.id`
- `role_id` foreign key to `roles.id`
- Composite uniqueness on `(user_id, role_id)`
- Cascading deletes when a user or role is removed
- `created_at` and `updated_at`

A user may eventually have more than one role.

## Migrations and Seeders

Schema changes use migrations only. `sequelize.sync()` is not used.

The scripts build the backend first, then run the compiled migration/seeder runner.

| Command | Description |
| --- | --- |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:migrate:undo` | Revert the most recent migration |
| `npm run db:migrate:undo:all` | Revert all migrations |
| `npm run db:migrate:status` | Show executed and pending migrations |
| `npm run db:seed` | Apply pending seeders |
| `npm run db:seed:undo` | Revert the most recent seeder |
| `npm run db:seed:undo:all` | Revert all seeders |
| `npm run db:seed:status` | Show executed and pending seeders |

The initial role seeder is idempotent and uses PostgreSQL `ON CONFLICT DO NOTHING`. It never creates users, fake accounts or production administrators. Reverting the seeder deletes the five initial roles and cascades any user-role assignments that reference them; use it with care outside development.

When rolling back a full database, revert seeders before reverting migrations so the `roles` table still exists.

## Database Connectivity Check

Start the backend and request:

```bash
curl http://localhost:5000/api/health
```

- HTTP `200` when the API and database are available.
- HTTP `503` when the database is unavailable.
- The response reports API status, database status and a timestamp.
- Passwords, connection strings and stack traces are never returned.

Example healthy response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "agroconnect-api",
    "timestamp": "2026-11-02T00:00:00.000Z",
    "uptime": 12,
    "api": "up",
    "database": {
      "status": "up"
    }
  }
}
```

## Automated Tests

Tests use an isolated PostgreSQL database. They reset the `public` schema, so the test database name **must include** `test` and must never be a production database.

Create a test database:

```bash
createdb agroconnect_test
```

Run the tests:

```bash
cd backend
TEST_DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/agroconnect_test npm test
```

If the test database uses TLS, also set `TEST_DB_SSL=true` and configure the matching CA path variables. Local test databases normally use `TEST_DB_SSL=false`.

The suite covers:

- Database connection success and invalid connection failure
- SSL/TLS configuration and CA handling
- Migration up, rollback, and re-apply
- User creation with phone only, email only, or both
- Contact normalization and invalid contact rejection
- Contact method database constraint
- Duplicate phone/email rejection
- Role seeding and seeder idempotency
- User-role assignment, foreign keys and duplicate prevention
- Health endpoint 200/503 behaviour

You can also run:

```bash
npm run test:watch
npm run typecheck
npm run lint
npm run build
```

## Render Deployment Preparation

Render deployment is prepared but **not performed** in Phase 2. Use the Render dashboard or the included `render.yaml` Blueprint. Do not commit secrets.

### Backend Render Web Service

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Runtime | Node.js |
| Root directory | `backend` |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Bind address | `0.0.0.0` (automatic) |
| Port | `process.env.PORT` with local fallback `5000` |

Backend environment variables:

```env
DATABASE_URL=<from Aiven>
DB_SSL=true
DB_SSL_CA_PATH=/etc/secrets/aiven-ca.pem
DB_SSL_VERIFY=true
FRONTEND_URL=<deployed frontend URL>
```

Render sets `NODE_ENV=production` automatically at **runtime** for Node services. Do not also add `NODE_ENV=production` as a service environment variable unless you change the build command to `npm install --include=dev && npm run build`. npm omits devDependencies when `NODE_ENV=production` is present during install, and the build needs TypeScript from devDependencies.

To use the Aiven CA certificate on Render:

1. Save the Aiven CA certificate locally.
2. In the backend service, open **Environment** and add a **Secret File** named `aiven-ca.pem` with the certificate contents.
3. Set `DB_SSL_CA_PATH` to `/etc/secrets/aiven-ca.pem`.
4. Keep `DB_SSL_VERIFY=true`.

Run migrations as a Render pre-deploy command or a one-off job after setting the environment variables:

```bash
npm run db:migrate
```

Then run the role seeder once:

```bash
npm run db:seed
```

### Frontend Render Web Service

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Runtime | Node.js |
| Root directory | `frontend` |
| Build command | `npm install && npm run build` |
| Start command | `npm run start` |
| Environment variable | `NEXT_PUBLIC_API_URL=<deployed backend URL>/api` |

Do not configure the frontend as a static site. It uses Next.js server-side functionality and must run as a Node Web Service. Do not put database credentials in frontend variables.

The frontend homepage remains the Phase 1 implementation and has not been redesigned.

## Available Scripts

### Frontend

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting |

### Backend

| Command | Description |
| --- | --- |
| `npm run dev` | Start in watch mode with tsx |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run the compiled server |
| `npm run typecheck` | Run TypeScript without emitting |
| `npm run lint` | Run ESLint |
| `npm test` | Run the automated test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:migrate:undo` | Revert the most recent migration |
| `npm run db:migrate:undo:all` | Revert all migrations |
| `npm run db:migrate:status` | Show migration status |
| `npm run db:seed` | Apply pending seeders |
| `npm run db:seed:undo` | Revert the most recent seeder |
| `npm run db:seed:undo:all` | Revert all seeders |
| `npm run db:seed:status` | Show seeder status |

## Known Limitations

- Live Aiven connectivity has not been verified in this environment because Aiven credentials are not available. The configuration and tests were verified against an isolated PostgreSQL 16 instance.
- Render deployment has not been performed. `render.yaml` and manual dashboard instructions are prepared but not live-tested.
- Authentication, registration, OTP, sessions, RBAC middleware and marketplace features are not implemented.
- The database schema intentionally contains only `users`, `roles` and `user_roles`.
- There are no user-facing registration or login screens in Phase 2.
- The role seeder is development-oriented. Do not run seeder rollback carelessly against shared data.

## Coding Rules for AI Agents

All future work must follow [`skills.md`](./skills.md). In summary:

- Read the project documentation before changing code.
- Work only on the approved development phase.
- Preserve existing work and the Phase 1 homepage.
- Use TypeScript.
- Keep frontend and backend separate.
- Use migrations for every schema change.
- Validate inputs and enforce database constraints.
- Write and run tests for implemented functionality.
- Never expose secrets, connection strings or certificate contents.
- Review changes before finishing.
- Wait for approval before starting another phase.
