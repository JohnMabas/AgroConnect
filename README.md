# AgroConnect

**Connecting Agriculture. Empowering Markets.**

AgroConnect is a digital agricultural marketplace and supply-chain coordination platform for farmers, buyers, cooperatives, transporters and platform administrators. The initial pilot focuses on Plateau State, Nigeria, with a long-term vision of expanding to other regions and countries.

The project is developed in approved phases. **Phase 1** delivered the frontend homepage and backend foundation. **Phase 2** adds the PostgreSQL database foundation. **Phase 3** adds a complete authentication and authorization system. **Phase 4** adds user profiles, farmer profiles, cooperative registration and approval, cooperative membership management, cooperative agent assignments, and an agent activity audit log. **Phase 5** adds the produce catalogue, farmer produce listings, secure image uploads, listing lifecycle management, and inventory tracking with an adjustment audit trail.

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
- multer (multipart image uploads)
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
│   │   │   ├── migrations/         # Sequelize migrations (Phase 2 through Phase 5)
│   │   │   ├── models/             # Sequelize models
│   │   │   ├── seeders/            # Idempotent development seeders (includes produce catalogue)
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
│   │   │   ├── auth/               # Auth routes, controller, service, validation
│   │   │   ├── profiles/           # User profile CRUD
│   │   │   ├── farmers/            # Farmer profile CRUD
│   │   │   ├── cooperatives/       # Cooperative registration, approval, membership, agents
│   │   │   ├── agents/             # Agent assignments and activity log
│   │   │   ├── produce/            # Produce categories and types catalogue
│   │   │   └── listings/           # Listings, images and inventory adjustments
│   │   ├── routes/                 # Health and other API routes
│   │   ├── services/               # Password, OTP, email-verification, token, activity-log services
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
│   │   │   ├── (dashboard)/        # Phase 4 dashboard pages
│   │   │   │   ├── profile/        # /profile — general user profile
│   │   │   │   ├── farmer/         # farmer profile, listings, listing create/edit, inventory
│   │   │   │   ├── cooperatives/   # /cooperatives/register, /dashboard, /membership
│   │   │   │   ├── agent/          # /agent/dashboard — agent page (role-gated)
│   │   │   │   └── admin/          # /admin/cooperatives — admin review (role-gated)
│   │   │   ├── account/            # Protected account page
│   │   │   └── page.tsx            # Phase 1 homepage (preserved)
│   │   ├── components/             # Shared components (Logo, SiteHeader, SiteFooter)
│   │   │   └── listings/           # Reusable listing card, status badge, quantity display
│   │   ├── app/produce/            # Public produce catalogue and listing details
│   │   ├── features/landing/       # Phase 1 landing sections (preserved)
│   │   ├── hooks/                  # useDashboardAuth — shared auth hook
│   │   ├── lib/
│   │   │   ├── api.ts              # Backend API client
│   │   │   └── listing-form.ts     # Shared listing form validation and payload helpers
│   │   └── test/setup.ts           # Vitest + Testing Library setup
│   ├── .env.example
│   ├── package.json
│   └── vitest.config.mts
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
| `UPLOAD_STORAGE_PATH` | No | Directory for locally stored listing images. Defaults to `uploads`. |
| `UPLOAD_PUBLIC_PREFIX` | No | Public URL prefix for locally stored images. Defaults to `/uploads`. |
| `UPLOAD_MAX_FILE_SIZE_BYTES` | No | Maximum image upload size. Defaults to 5 MiB. |
| `UPLOAD_MAX_IMAGES_PER_LISTING` | No | Maximum images per listing. Defaults to `5`. |

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

Six roles exist: `farmer`, `buyer`, `cooperative`, `transporter`, `admin`, `cooperative_agent`.

The `authenticate` middleware verifies the JWT access token and always fetches the user's current roles from the database, so role assignments take effect immediately without requiring a new login.

The `requireRoles` middleware checks that the authenticated user has at least one of the required roles.

Users cannot assign themselves admin or agent privileges. Role changes must be performed directly in the database by a platform administrator.

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

### Phase 4 — User Profiles

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/profiles/me` | Bearer | Get or create my user profile |
| `PUT` | `/api/profiles/me` | Bearer | Update my user profile |

### Phase 4 — Farmer Profiles

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/farmers/profile` | Bearer | Create farmer profile |
| `GET` | `/api/farmers/profile/me` | Bearer | Get my farmer profile (with memberships) |
| `PUT` | `/api/farmers/profile/me` | Bearer | Update my farmer profile |

### Phase 4 — Cooperatives

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/cooperatives` | Bearer | Register a new cooperative (starts pending) |
| `GET` | `/api/cooperatives/me` | Bearer | Get my cooperative |
| `PUT` | `/api/cooperatives/me/:id` | Bearer | Update my cooperative |
| `GET` | `/api/cooperatives/approved` | — | List all approved cooperatives |
| `GET` | `/api/cooperatives/:id` | — | Get a cooperative by ID |

### Phase 4 — Cooperative Membership

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/cooperatives/:id/memberships` | Bearer | Request to join a cooperative |
| `GET` | `/api/cooperatives/:id/memberships` | Bearer (rep/admin) | List cooperative memberships |
| `GET` | `/api/cooperatives/memberships/me` | Bearer | Get my memberships |
| `PATCH` | `/api/cooperatives/:id/memberships/:membershipId` | Bearer | Approve/reject/suspend membership |
| `POST` | `/api/cooperatives/:id/memberships/:membershipId/leave` | Bearer | Leave a cooperative |

### Phase 4 — Cooperative Agents

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/cooperatives/:id/agents` | Bearer (cooperative role) | Assign an agent |
| `GET` | `/api/cooperatives/:id/agents` | Bearer (rep/admin) | List agents |
| `PATCH` | `/api/cooperatives/:id/agents/:agentId` | Bearer (cooperative role) | Deactivate an agent |

### Phase 4 — Administrative Cooperative Review

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/cooperatives/admin/review` | Bearer (admin) | List cooperatives (filterable by status) |
| `PATCH` | `/api/cooperatives/admin/:id/approve` | Bearer (admin) | Approve a cooperative |
| `PATCH` | `/api/cooperatives/admin/:id/reject` | Bearer (admin) | Reject a cooperative (notes required) |
| `PATCH` | `/api/cooperatives/admin/:id/suspend` | Bearer (admin) | Suspend a cooperative (notes required) |

### Phase 4 — Agent Activity

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/agents/me/assignments` | Bearer (cooperative_agent) | Get my active assignments |
| `GET` | `/api/agents/me/activities` | Bearer (cooperative_agent) | Get my activity log (paginated) |

### Phase 5 — Produce Catalogue

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/produce/categories` | — | List active produce categories |
| `GET` | `/api/produce/types` | — | List produce types (optional `category_slug` or `category_id`) |
| `GET` | `/api/produce/types/:id` | — | Get a produce type by ID |

### Phase 5 — Listings

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/listings` | Bearer + farmer profile | Create a draft listing |
| `GET` | `/api/listings/me` | Bearer | List my listings (paginated) |
| `GET` | `/api/listings/:id` | Optional Bearer | Get a listing; drafts are owner/admin only |
| `PUT` | `/api/listings/:id` | Bearer (owner) | Update a draft or paused listing |
| `PATCH` | `/api/listings/:id/publish` | Bearer (owner) | Publish a draft or paused listing |
| `PATCH` | `/api/listings/:id/pause` | Bearer (owner) | Pause a published listing |
| `PATCH` | `/api/listings/:id/resume` | Bearer (owner) | Resume a paused listing |
| `PATCH` | `/api/listings/:id/close` | Bearer (owner) | Close a listing |
| `DELETE` | `/api/listings/:id` | Bearer (owner) | Delete a draft with no inventory history |

### Phase 5 — Listing Images

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/listings/:id/images` | Bearer (owner) | Upload an image file, or add an image URL (development fallback) |
| `DELETE` | `/api/listings/:id/images/:imageId` | Bearer (owner) | Delete an image; promotes the next primary image |
| `PATCH` | `/api/listings/:id/images/:imageId/primary` | Bearer (owner) | Set the primary image |

### Phase 5 — Inventory

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/listings/:id/inventory` | Bearer (owner) | Get available/reserved/sold quantities |
| `POST` | `/api/listings/:id/inventory/adjustments` | Bearer (owner) | Add stock, remove stock, or correct available quantity |
| `GET` | `/api/listings/:id/inventory/adjustments` | Bearer (owner) | Get paginated adjustment history |

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

### Phase 4 tables

#### `user_profiles`

- UUID primary key
- `user_id` foreign key to `users.id` (CASCADE delete, unique)
- `first_name`, `last_name`, `display_name`, `profile_image_url`
- `country`, `state_or_region`, `local_government_area`, `city_or_community`
- `preferred_language` (default `en`)
- `created_at`, `updated_at`

#### `farmer_profiles`

- UUID primary key
- `user_id` foreign key to `users.id` (CASCADE delete, unique)
- `farm_name`, `farm_location`, `farm_size`, `farm_size_unit`
- `farming_experience_years`, `farming_description`
- `primary_produce_interests` (text array)
- `verification_status` ENUM: `unverified` | `pending` | `verified` | `rejected` (default `unverified`)
- `created_at`, `updated_at`

#### `cooperative_profiles`

- UUID primary key
- `registered_by_user_id` foreign key to `users.id`
- `cooperative_name`, `registration_number`, `description`
- `country`, `state_or_region`, `local_government_area`, `community`, `address`
- `contact_phone`, `contact_email`, `logo_url`
- `verification_status` ENUM: `pending` | `approved` | `rejected` | `suspended` (default `pending`)
- `approval_notes`, `approved_by_user_id`, `approved_at`
- `created_at`, `updated_at`

#### `cooperative_memberships`

- UUID primary key
- `cooperative_id` foreign key to `cooperative_profiles.id` (CASCADE delete)
- `farmer_user_id` foreign key to `users.id` (CASCADE delete)
- `membership_number`, `membership_role` ENUM: `member` | `coordinator` (default `member`)
- `status` ENUM: `pending` | `active` | `rejected` | `suspended` | `left` (default `pending`)
- `joined_at`, `approved_by_user_id`
- `created_at`, `updated_at`

#### `cooperative_agent_assignments`

- UUID primary key
- `cooperative_id` foreign key to `cooperative_profiles.id` (CASCADE delete)
- `agent_user_id` foreign key to `users.id` (CASCADE delete)
- `assigned_by_user_id` foreign key to `users.id`
- `status` ENUM: `active` | `deactivated` (default `active`)
- `assigned_at`, `created_at`, `updated_at`

#### `agent_activity_logs`

Immutable audit log — no `updated_at`.

- UUID primary key
- `agent_user_id` foreign key to `users.id`
- `farmer_user_id` foreign key to `users.id`
- `cooperative_id` foreign key to `cooperative_profiles.id` (nullable, SET NULL)
- `action` (max 100 chars), `description` (text)
- `metadata` (JSONB) — never stores passwords, OTPs, or secrets
- `created_at`

### Phase 5 tables

#### `produce_categories`

- UUID primary key
- `name` (unique), `slug` (unique), `description`, `is_active`
- `created_at`, `updated_at`

#### `produce_types`

- UUID primary key
- `category_id` foreign key to `produce_categories.id`
- `name`, `slug` (unique), `description`, `image_url`, `is_active`
- Unique `(category_id, name)`
- `created_at`, `updated_at`

#### `produce_listings`

- UUID primary key
- `farmer_user_id` foreign key to `users.id`
- `produce_type_id` foreign key to `produce_types.id`
- `title`, `description`, `variety`, `grade`, `packaging_description`
- `quantity`, `available_quantity`, `reserved_quantity`, `sold_quantity` — PostgreSQL `NUMERIC(14,3)`
- `unit`, `price_per_unit`, `currency`
- `country`, `state_or_region`, `local_government_area`, `community`, `collection_location`
- `harvest_date`, `available_from`, `expiry_date`
- `status` ENUM: `draft` | `published` | `paused` | `sold_out` | `closed` | `expired`
- Database check constraints keep quantities non-negative and preserve
  `quantity = available_quantity + reserved_quantity + sold_quantity`
- Index on `(status, expiry_date)`
- `created_at`, `updated_at`

#### `produce_listing_images`

- UUID primary key
- `listing_id` foreign key to `produce_listings.id` (CASCADE delete)
- `image_url` — public/served URL; local files are stored outside PostgreSQL
- `storage_key` — internal storage reference, never returned by the API
- `is_primary`, `display_order`
- `created_at` only (images are replaced/deleted rather than updated in place)

#### `inventory_adjustments`

Immutable audit log.

- UUID primary key
- `listing_id` foreign key to `produce_listings.id`
- `farmer_user_id` foreign key to `users.id`
- `adjustment_type` ENUM: `stock_added` | `stock_removed` | `correction`
- `quantity_change`, `previous_available_quantity`, `new_available_quantity` — `NUMERIC(14,3)`
- `reason` (nullable)
- `created_at`

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
- Migrations (apply, rollback, re-apply) — all 19 migrations
- User/role/user_role models and constraints
- Role seeder idempotency — all 6 roles
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

**Phase 4 (54 tests):**
- User profile creation (idempotent GET, PUT updates fields, isolation per user)
- Farmer profile creation, duplicate rejection, 404 on missing, update
- Cooperative registration (pending status, name validation)
- Cooperative retrieval (by ID, by owner, approved list)
- Admin approve/reject/suspend with and without notes
- Non-admin blocked from admin routes
- Membership request, duplicate rejection, pending-coop rejection
- Cooperative rep approval of memberships
- Farmer leaving a cooperative
- Agent role-gating (401 without token, 403 without role, 200 with role)
- Self-assignment prevention
- All protected Phase 4 routes return 401 without token

**Phase 5 (79 tests):**
- Produce categories/types endpoints, category filtering and 404 handling
- Listing creation requires a farmer profile; draft creation and validation
- Owner-only listing access; public drafts return 404; published listings are public
- Decimal quantity validation and the quantity invariant
- Publish/pause/resume/close lifecycle and expired-listing handling
- Draft deletion guard when inventory history exists
- Reserved/sold quantities cannot be set directly by clients
- Image URL fallback, primary-image promotion and deletion
- Real multipart image uploads with magic-byte validation, MIME checks, size limits and per-listing limits
- Inventory summary, stock add/remove/correction, signed history and pagination
- Concurrent inventory adjustments are serialized without corrupting stock
- IDOR protection and authentication checks on all Phase 5 routes


### Frontend tests

Phase 5 UI helpers and reusable listing components are covered by 20 Vitest
tests using Testing Library (jsdom). The frontend suite does not require the
backend or a database.

```bash
cd frontend
npm test
```

Other available frontend commands:

```bash
npm run test:watch
npm run typecheck
npm run lint
npm run build
```

Other available backend commands:

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
- **Marketplace features:** Buyer requests, offers, orders, payments and transporter management belong to Phase 6 and beyond.
- **Account recovery / password reset:** Not implemented. Belongs to a future phase.
- **File uploads:** Produce listing images support secure multipart uploads to a local development adapter. Profile image and cooperative logo uploads (`profile_image_url`, `logo_url`) are not implemented and still accept a manually supplied URL. Production object storage (for example S3-compatible storage) is not configured; Render's filesystem is ephemeral, so a durable storage adapter must be added before production use.
- **Public listing discovery:** Phase 5 exposes produce categories/types publicly and published listing details by ID. A public search/browse endpoint for listings, buyer offers, orders and payments belongs to Phase 6.
- **Agent-assisted farmer operations:** The `agent_activity_logs` table and `logAgentActivity` service are implemented. Dedicated agent-assisted profile update endpoints (where an agent edits a farmer's data on their behalf) are not yet implemented — that workflow belongs to a future phase.

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
