# AgroConnect

**Connecting Agriculture. Empowering Markets.**

AgroConnect is a digital agricultural marketplace and supply-chain coordination platform for farmers, buyers, cooperatives, transporters and platform administrators. The initial pilot focuses on Plateau State, Nigeria, with a long-term vision of expanding to other regions and countries.

The project is developed in approved phases. **Phase 1** delivered the frontend homepage and backend foundation. **Phase 2** adds the PostgreSQL database foundation. **Phase 3** adds a complete authentication and authorization system.

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
- argon2 (password hashing)
- jsonwebtoken (JWT access tokens)
- zod (input validation)
- cors, cookie-parser, express-rate-limit
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
│   │   │   ├── migrations/         # Sequelize migrations (Phase 2 + Phase 3)
│   │   │   ├── models/             # Sequelize models
│   │   │   ├── seeders/            # Idempotent development seeders
│   │   │   ├── config.ts           # Connection and TLS configuration
│   │   │   ├── connection.ts       # Connection test and health helpers
│   │   │   ├── migrator.ts         # Umzug migration runner
│   │   │   ├── seeder.ts           # Umzug seeder runner
│   │   │   └── sequelize.ts        # Shared Sequelize instance
│   │   ├── integrations/
│   │   │   ├── sms/                # SMS provider interface + dev adapter
│   │   │   └── email/              # Email provider interface + dev adapter
│   │   ├── middleware/             # Error handling, auth middleware
│   │   ├── modules/
│   │   │   └── auth/               # Auth routes, controller, service, validation
│   │   ├── routes/                 # Health and other API routes
│   │   ├── services/               # Password, OTP, email-verification, token services
│   │   ├── utils/                  # Contact normalization helpers
│   │   ├── app.ts                  # Express application
│   │   └── server.ts               # Startup, DB check and graceful shutdown
│   ├── tests/                      # Isolated PostgreSQL automated tests
│   ├── .env.example
│   ├── .env.test                   # Test environment overrides (no secrets)
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/             # Auth pages: register, login, verify-phone, verify-email
│   │   │   ├── account/            # Protected account page
│   │   │   └── page.tsx            # Phase 1 homepage (preserved)
│   │   ├── components/             # Shared components (Logo, SiteHeader, SiteFooter)
│   │   ├── features/landing/       # Phase 1 landing sections (preserved)
│   │   └── lib/api.ts              # Backend API client
│   ├── .env.example
│   └── package.json
├── render.yaml
├── .gitignore
├── README.md
└── skills.md
```

## Requirements

- Node.js 22 LTS or newer (Node.js 24 LTS recommended)
- npm 10 or newer
- PostgreSQL 13 or newer
- An Aiven PostgreSQL service for shared/remote environments

## Getting Started

Install and run each application separately.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env and set NEXT_PUBLIC_API_URL
npm run dev
```

The frontend runs at <http://localhost:3000>.

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL, SSL settings, and JWT secrets in .env
npm run db:migrate
npm run db:seed
npm run dev
```

The backend runs at <http://localhost:5000> by default.

## Environment Variables

Never commit `.env` files or real credentials.

### Backend

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | `development`, `test` or `production`. Defaults to `development`. |
| `PORT` | No | API port. Defaults to `5000`. |
| `DATABASE_URL` | Yes* | Aiven PostgreSQL URI. |
| `DB_SSL` | No | Enable TLS. Defaults to `true` in production. |
| `DB_SSL_CA_PATH` | When verifying | Path to the Aiven CA certificate. |
| `DB_SSL_VERIFY` | No | Defaults to `true`. |
| `DB_HOST` | Yes* | Used only when `DATABASE_URL` is empty. |
| `DB_PORT` | No | Defaults to `5432`. |
| `DB_NAME` | Yes* | Used only when `DATABASE_URL` is empty. |
| `DB_USER` | Yes* | Used only when `DATABASE_URL` is empty. |
| `DB_PASSWORD` | No | Used only when `DATABASE_URL` is empty. |
| `DEFAULT_PHONE_COUNTRY` | No | E.164 default country. Defaults to `NG`. |
| `FRONTEND_URL` | No | Frontend origin for CORS. |
| `JWT_ACCESS_SECRET` | **Production** | Secret for signing access tokens. |
| `JWT_ACCESS_EXPIRES_IN` | No | Access token lifetime. Defaults to `15m`. |
| `JWT_REFRESH_SECRET` | **Production** | Secret for refresh token HMAC. |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token lifetime. Defaults to `7d`. |
| `OTP_EXPIRES_IN_SECONDS` | No | OTP lifetime in seconds. Defaults to `300` (5 min). |
| `OTP_RESEND_COOLDOWN_SECONDS` | No | Seconds between OTP resends. Defaults to `60`. |
| `OTP_MAX_ATTEMPTS` | No | Max OTP verification attempts. Defaults to `5`. |
| `EMAIL_VERIFICATION_EXPIRES_IN_SECONDS` | No | Email token lifetime. Defaults to `86400` (24 h). |
| `SMS_PROVIDER` | No | `dev` (console log) or future real provider. |
| `SMS_API_KEY` | When using real SMS | API key for SMS provider. |
| `SMS_SENDER_ID` | No | SMS sender name. Defaults to `AgroConnect`. |
| `EMAIL_PROVIDER` | No | `dev` (console log) or future real provider. |
| `EMAIL_HOST` | When SMTP | SMTP hostname. |
| `EMAIL_PORT` | No | SMTP port. Defaults to `587`. |
| `EMAIL_USER` | When SMTP | SMTP username. |
| `EMAIL_PASSWORD` | When SMTP | SMTP password. |
| `EMAIL_FROM` | No | Sender address. Defaults to `noreply@agroconnect.app`. |
| `TEST_DATABASE_URL` | Tests only | Isolated test database (name must include `test`). |
| `TEST_DB_SSL` | Tests only | `true` if the test database requires TLS. |
| `TEST_DB_SSL_VERIFY` | Tests only | `false` to skip certificate verification for tests. |

### Frontend

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend API base URL, e.g. `http://localhost:5000/api`. |

## Authentication Architecture

Phase 3 implements a complete token-based authentication system.

### Registration Flow

1. User submits display name (optional), phone number and/or email, password.
2. At least one contact method is required.
3. Password is hashed with **Argon2id** and stored in `user_passwords`.
4. User is created with `status = pending`.
5. Default role `farmer` is assigned via `user_roles`.
6. If a phone number was provided, an OTP is issued and sent via the SMS provider.
7. If an email was provided, a verification token is issued and sent via the email provider.

### Phone Verification

1. User receives a 6-digit OTP via SMS.
2. User submits `user_id` and OTP to `POST /api/auth/verify-phone`.
3. The OTP hash is checked against the stored hash. Never compared in plaintext.
4. Successful verification may activate the user (`status = active`) if all required contact methods are verified.
5. OTPs expire after `OTP_EXPIRES_IN_SECONDS` (default 5 minutes).
6. Maximum `OTP_MAX_ATTEMPTS` failed attempts before the OTP is locked.
7. A resend cooldown of `OTP_RESEND_COOLDOWN_SECONDS` is enforced.

### Email Verification

1. User receives a verification link containing a 64-character hex token.
2. The link directs to `/verify-email?token=<token>`.
3. User submits the token to `POST /api/auth/verify-email`.
4. The token hash is checked against the stored hash.
5. Tokens expire after `EMAIL_VERIFICATION_EXPIRES_IN_SECONDS` (default 24 hours).
6. Tokens are single-use.

### Login

1. User submits identifier (phone number or email) and password.
2. Identifier is normalized (E.164 for phone, lowercase for email).
3. User is looked up by the normalized identifier.
4. The login contact method must be verified.
5. Account must not be suspended.
6. Password is verified against the Argon2id hash.
7. On success, a short-lived **JWT access token** is returned in the response body.
8. A long-lived **refresh token** is stored as an HttpOnly, Secure, SameSite=Strict cookie.

### Token Lifecycle

- Access tokens are JWTs signed with `JWT_ACCESS_SECRET`, containing `sub` (user ID) and `roles`.
- Refresh tokens are random 40-byte hex strings. Only the SHA-256 hash is stored in `refresh_tokens`.
- `POST /api/auth/refresh` rotates the refresh token: revokes the old one, issues a new one.
- Refresh token reuse is detected: if a revoked token is presented, all sessions for the user are invalidated.
- `POST /api/auth/logout` revokes the current refresh token cookie.
- `POST /api/auth/logout-all` revokes all refresh tokens for the authenticated user.

### SMS Provider

The SMS provider is abstracted behind an interface. The configured provider is selected via `SMS_PROVIDER`:

- `dev` (default): Logs OTPs to the server console. **Development only.**
- Future: `africas-talking` and other providers can be added without changing auth logic.

Real SMS delivery has not been tested. Configure `SMS_PROVIDER`, `SMS_API_KEY` and `SMS_SENDER_ID` for a real provider.

### Email Provider

The email provider is abstracted behind an interface. Configured via `EMAIL_PROVIDER`:

- `dev` (default): Logs emails to the server console. **Development only.**
- Future: `smtp` and transactional email services can be added.

Real email delivery has not been tested. Configure `EMAIL_PROVIDER` and SMTP settings for a real provider.

### Password Security

- Argon2id, memory cost 19 MiB, time cost 2, parallelism 1.
- Minimum 8 characters, maximum 128 characters.
- Hashes are never returned through API responses.
- Passwords are never logged.

### RBAC

Five roles exist from Phase 2: `farmer`, `buyer`, `cooperative`, `transporter`, `admin`.

The `authenticate` middleware verifies the JWT access token. The `requireRoles` middleware checks that the authenticated user has at least one of the required roles.

Users cannot assign themselves admin privileges. Role changes must be performed directly in the database by a platform administrator.

## API Endpoints

All auth endpoints are under `/api/auth`.

### Registration and Verification

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/verify-phone` | Verify a phone OTP |
| `POST` | `/api/auth/resend-phone-otp` | Resend a phone OTP |
| `POST` | `/api/auth/verify-email` | Verify an email token |
| `POST` | `/api/auth/resend-email-verification` | Resend the verification email |

### Session Management

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | — | Log in with phone/email and password |
| `POST` | `/api/auth/refresh` | Cookie | Rotate the refresh token |
| `POST` | `/api/auth/logout` | Cookie | Revoke current session |
| `POST` | `/api/auth/logout-all` | Bearer | Revoke all sessions |
| `GET` | `/api/auth/me` | Bearer | Get current user |

### Health

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Database and API health check |

### Response format

Success:

```json
{
  "success": true,
  "message": "Registration successful.",
  "data": { "user": { ... }, "phone_otp_pending": true }
}
```

Error:

```json
{
  "success": false,
  "error": { "message": "Invalid credentials." }
}
```

Validation error:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [{ "field": "email", "message": "Email address is invalid." }]
}
```

## Database Schema

### Phase 2 tables

`users`, `roles`, `user_roles` — see Phase 2 documentation above.

### Phase 3 tables

#### `user_passwords`

- UUID primary key
- `user_id` foreign key to `users.id` (CASCADE delete, unique)
- `hash` — Argon2id encoded hash string (max 512 chars)

#### `phone_otps`

- UUID primary key
- `user_id` foreign key to `users.id` (CASCADE delete)
- `otp_hash` — SHA-256 hex digest of the OTP (64 chars)
- `attempts` — failed attempt counter
- `expires_at`, `used`

#### `email_verification_tokens`

- UUID primary key
- `user_id` foreign key to `users.id` (CASCADE delete)
- `token_hash` — SHA-256 hex digest of the raw token (64 chars, unique)
- `expires_at`, `used`

#### `refresh_tokens`

- UUID primary key
- `user_id` foreign key to `users.id` (CASCADE delete)
- `token_hash` — SHA-256 hex digest of the raw refresh token (64 chars, unique)
- `expires_at`, `revoked`, `user_agent`

## Migrations and Seeders

Schema changes use migrations only. `sequelize.sync()` is not used.

| Command | Description |
| --- | --- |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:migrate:undo` | Revert the most recent migration |
| `npm run db:migrate:undo:all` | Revert all migrations |
| `npm run db:migrate:status` | Show migration status |
| `npm run db:seed` | Apply pending seeders |
| `npm run db:seed:undo` | Revert the most recent seeder |
| `npm run db:seed:undo:all` | Revert all seeders |
| `npm run db:seed:status` | Show seeder status |

## Automated Tests

Tests use an isolated PostgreSQL database. The database name **must include** `test`.

Create a test database:

```bash
# Local PostgreSQL
createdb agroconnect_test

# Aiven (connect then CREATE DATABASE)
psql "postgresql://USER:PASSWORD@HOST:PORT/defaultdb?sslmode=require" -c "CREATE DATABASE agroconnect_test;"
```

Run the tests:

```bash
cd backend

# Local PostgreSQL (no TLS)
TEST_DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/agroconnect_test npm test

# Aiven test database (TLS without cert verification)
TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/agroconnect_test?sslmode=require \
  TEST_DB_SSL=true \
  TEST_DB_SSL_VERIFY=false \
  npm test
```

The test suite covers:

**Phase 2 (27 tests):**
- Database configuration and TLS
- Database connectivity
- Migrations (apply, rollback, re-apply)
- User/role/user_role models and constraints
- Role seeder idempotency
- Health endpoint

**Phase 3 (26 tests):**
- Registration with phone only, email only, and both
- Duplicate phone and email rejection
- Phone/email normalization
- Password mismatch and length validation
- Phone OTP verification (invalid, bad format, missing fields)
- Email token verification (invalid token, missing token)
- Login with wrong password, unverified contact, empty identifier
- Successful login (returns access token, sets HttpOnly cookie)
- Token refresh
- Logout
- Protected route access without/with invalid tokens
- Resend OTP with invalid user

Other available commands:

```bash
npm run test:watch
npm run typecheck
npm run lint
npm run build
```

## Aiven PostgreSQL Setup

1. Sign in to the [Aiven Console](https://console.aiven.io/).
2. Create or select a PostgreSQL service.
3. Copy the **Service URI** from the service overview.
4. Download the **CA certificate** from the service page.
5. Store the CA certificate outside source control.
6. Configure the backend `.env` with the connection URI and CA path.

Example `backend/.env`:

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DATABASE
DB_SSL=true
DB_SSL_CA_PATH=/absolute/path/to/aiven-ca.pem
DB_SSL_VERIFY=true

JWT_ACCESS_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<generate separately>
JWT_REFRESH_EXPIRES_IN=7d

SMS_PROVIDER=dev
EMAIL_PROVIDER=dev

FRONTEND_URL=http://localhost:3000
```

## Render Deployment Preparation

Render deployment is prepared but not performed.

### Backend Render Web Service

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Runtime | Node.js |
| Root directory | `backend` |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Backend environment variables on Render:

```env
DATABASE_URL=<from Aiven>
DB_SSL=true
DB_SSL_CA_PATH=/etc/secrets/aiven-ca.pem
DB_SSL_VERIFY=true
JWT_ACCESS_SECRET=<strong random secret>
JWT_REFRESH_SECRET=<strong random secret>
FRONTEND_URL=<deployed frontend URL>
SMS_PROVIDER=dev
EMAIL_PROVIDER=dev
```

Add the Aiven CA certificate as a Render **Secret File** named `aiven-ca.pem`.

### Frontend Render Web Service

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Runtime | Node.js |
| Root directory | `frontend` |
| Build command | `npm install && npm run build` |
| Start command | `npm run start` |
| Environment variable | `NEXT_PUBLIC_API_URL=<deployed backend URL>/api` |

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

- **SMS delivery:** The dev SMS adapter logs OTPs to the server console. Real SMS via Africa's Talking or another provider has not been configured or tested. Configure `SMS_PROVIDER`, `SMS_API_KEY` and `SMS_SENDER_ID` for real delivery.
- **Email delivery:** The dev email adapter logs emails to the server console. Real SMTP delivery has not been configured or tested. Configure `EMAIL_PROVIDER` and SMTP settings for real delivery.
- **Render deployment:** `render.yaml` and deployment instructions are prepared but not live-tested.
- **Aiven connectivity:** Verified against Aiven PostgreSQL 18.6. The backend uses DNS pre-resolution to work around IPv6 Happy Eyeballs timeout issues on this network.
- **Cooperative agent, farmer profiles, marketplace features:** Not implemented — belong to Phase 4 and beyond.
- **Account recovery / password reset:** Not implemented in Phase 3.
- **Admin dashboard:** Not implemented in Phase 3.

## Coding Rules for AI Agents

All future work must follow [`skills.md`](./skills.md). In summary:

- Read the project documentation before changing code.
- Work only on the approved development phase.
- Preserve existing work.
- Use TypeScript.
- Keep frontend and backend separate.
- Use migrations for every schema change.
- Validate inputs and enforce permissions on the backend.
- Write and run tests for implemented functionality.
- Never expose secrets, connection strings or certificate contents.
- Review changes before finishing.
- Wait for approval before starting another phase.
