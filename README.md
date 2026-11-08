# AgroConnect

**Connecting Agriculture. Empowering Markets.**

AgroConnect is a digital agricultural marketplace and supply-chain coordination platform for farmers, buyers, cooperatives, transporters and platform administrators. The initial pilot focuses on Plateau State, Nigeria, with a long-term vision of expanding to other regions and countries.

The project is developed in approved phases. **Phase 1** delivered the frontend homepage and backend foundation. **Phase 2** adds the PostgreSQL database foundation. **Phase 3** adds a complete authentication and authorization system. **Phase 4** adds user profiles, farmer profiles, cooperative registration and approval, cooperative membership management, cooperative agent assignments, and an agent activity audit log. **Phase 5** adds the produce catalogue, farmer produce listings, secure image uploads, listing lifecycle management, and inventory tracking with an adjustment audit trail. **Phase 6** adds buyer requests with lifecycle and expiry handling plus authenticated marketplace discovery for listings and buyer requests. **Phase 7** adds secure one-to-one messaging with persistent conversations, read receipts, unread counts, and realtime Socket.IO delivery. **Phase 8** adds structured offers and counteroffers with negotiation history, expiry, authorization, inventory validation, and audit events. **Phase 9** converts accepted listing offers into orders, atomically reserves inventory with expiry handling, and adds Paystack hosted-checkout payments, signed webhooks, verification and refunds. **Phase 10** adds transporter profiles, delivery requests tied to paid orders, transporter assignment and coverage checks, a controlled delivery lifecycle with tracking history, and realtime delivery notifications. **Phase 11** adds a persistent notification centre with in-app, email and SMS delivery, user notification preferences, idempotent dispatch, delivery logs, exponential-backoff retries, admin retry controls, and realtime `notification:new` events.

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
- Socket.IO (authenticated realtime messaging)
- Paystack hosted checkout and webhooks (payments)
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
│   │   │   ├── migrations/         # Sequelize migrations (Phase 2 through Phase 11)
│   │   │   ├── models/             # Sequelize models
│   │   │   ├── seeders/            # Idempotent development seeders (includes produce catalogue)
│   │   │   ├── config.ts           # Connection and TLS configuration
│   │   │   ├── connection.ts       # Connection test and health helpers
│   │   │   ├── migrator.ts         # Umzug migration runner
│   │   │   ├── seeder.ts           # Umzug seeder runner
│   │   │   └── sequelize.ts        # Shared Sequelize instance
│   │   ├── integrations/
│   │   │   ├── sms/                # SMS provider interface, dev and Africa's Talking adapters
│   │   │   ├── email/              # Email provider interface, dev and Brevo adapters
│   │   │   └── payments/           # Paystack API client and webhook signature verification
│   │   ├── middleware/             # Error handling, auth middleware
│   │   ├── modules/
│   │   │   ├── auth/               # Auth routes, controller, service, validation
│   │   │   ├── profiles/           # User profile CRUD
│   │   │   ├── farmers/            # Farmer profile CRUD
│   │   │   ├── cooperatives/       # Cooperative registration, approval, membership, agents
│   │   │   ├── agents/             # Agent assignments and activity log
│   │   │   ├── produce/            # Produce categories and types catalogue
│   │   │   ├── listings/           # Listings, images and inventory adjustments
│   │   │   ├── buyer-requests/     # Buyer request lifecycle, expiry and discovery
│   │   │   ├── marketplace/        # Authenticated listing and buyer request discovery
│   │   │   ├── messaging/          # Conversations, messages, receipts and unread counts
│   │   │   ├── offers/             # Offers, counteroffers, negotiation history and expiry
│   │   │   ├── orders/             # Orders, inventory reservations and expiry sweep
│   │   │   ├── payments/           # Paystack initialization, webhooks, verification and refunds
│   │   │   ├── transporters/       # Transporter profiles, availability and admin approval
│   │   │   ├── deliveries/         # Delivery requests, assignment, lifecycle and tracking history
│   │   │   └── notifications/      # In-app/email/SMS notifications, preferences, retries and admin tools
│   │   ├── realtime/               # Authenticated Socket.IO server and room registry
│   │   ├── routes/                 # Health and other API routes
│   │   ├── services/               # Password, OTP, email-verification, token, activity-log services
│   │   ├── utils/                  # Contact normalization, decimal and money helpers
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
| `SMS_PROVIDER` | No | `dev` (console log) or `africastalking`. Defaults to `dev`; `dev` is rejected in production. |
| `AFRICASTALKING_USERNAME` | When using Africa's Talking | `sandbox` or the live Africa's Talking username. |
| `AFRICASTALKING_API_KEY` | When using Africa's Talking | Africa's Talking API key. Never expose it to the frontend. |
| `AFRICASTALKING_SENDER_ID` | No | Registered alphanumeric sender ID; leave empty for the shared shortcode. |
| `EMAIL_PROVIDER` | No | `dev` (console log) or `brevo`. Defaults to `dev`; `dev` is rejected in production. |
| `BREVO_API_KEY` | When using Brevo | Brevo transactional email API key. Never expose it to the frontend. |
| `BREVO_SENDER_EMAIL` | When using Brevo | Sender address verified in the Brevo account. |
| `BREVO_SENDER_NAME` | No | Sender display name. Defaults to `AgroConnect`. |
| `TEST_DATABASE_URL` | Tests only | Isolated test database (database name or hostname must include `test`). |
| `TEST_DB_SSL` | Tests only | `true` if the test database requires TLS. |
| `TEST_DB_SSL_VERIFY` | Tests only | `false` to skip certificate verification for tests. |
| `UPLOAD_STORAGE_PATH` | No | Directory for locally stored listing images. Defaults to `uploads`. |
| `UPLOAD_PUBLIC_PREFIX` | No | Public URL prefix for locally stored images. Defaults to `/uploads`. |
| `UPLOAD_MAX_FILE_SIZE_BYTES` | No | Maximum image upload size. Defaults to 5 MiB. |
| `UPLOAD_MAX_IMAGES_PER_LISTING` | No | Maximum images per listing. Defaults to `5`. |
| `ORDER_RESERVATION_MINUTES` | No | Minutes an unpaid order keeps inventory reserved. Defaults to `30`. |
| `ORDER_RESERVATION_SWEEP_INTERVAL_SECONDS` | No | Interval for the in-process reservation-expiry sweep. Defaults to `60`. |
| `PAYSTACK_SECRET_KEY` | Payments | Paystack secret key used for API calls and legacy webhook signatures. Never expose it to the frontend. |
| `PAYSTACK_PUBLIC_KEY` | Frontend checkout | Paystack public key, if a client uses inline checkout. |
| `PAYSTACK_BASE_URL` | No | Paystack API base URL. Defaults to `https://api.paystack.co`. |
| `PAYSTACK_CALLBACK_URL` | No | URL Paystack redirects the buyer to after hosted checkout. |
| `PAYSTACK_WEBHOOK_SIGNING_SECRET` | Webhooks | Timestamped webhook signing secret (`whsec_...`) from the Paystack dashboard. |
| `PAYSTACK_CURRENCY` | No | Default checkout currency. Defaults to `NGN`. |
| `PAYSTACK_MODE` | No | `test` or `live`. Defaults to `live` in production, otherwise `test`. |
| `PAYSTACK_REQUEST_TIMEOUT_MS` | No | Timeout for Paystack API requests. Defaults to `15000`. |
| `NOTIFICATION_MAX_RETRIES` | No | Maximum email/SMS delivery attempts before a delivery is marked permanently failed. Defaults to `5`. |
| `NOTIFICATION_RETRY_INTERVAL_SECONDS` | No | Base delay for exponential retry backoff. Defaults to `60`. |
| `NOTIFICATION_WORKER_INTERVAL_SECONDS` | No | Interval for the in-process notification retry and reservation-warning sweep. Defaults to `30`. |
| `NOTIFICATION_RESERVATION_WARNING_MINUTES` | No | How long before reservation expiry the buyer receives a warning. Defaults to `10`. |
| `NOTIFICATION_PROVIDER_TIMEOUT_SECONDS` | No | Hard timeout for an individual email or SMS provider call. Defaults to `15`. |

Phase 10 introduces no additional environment variables. Phase 11 adds the notification settings above and reuses the existing provider credentials.

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

- `dev` (default): Logs OTPs and notifications to the server console. **Development only.**
- `africastalking`: Delivers SMS through Africa's Talking. Set `AFRICASTALKING_USERNAME` (`sandbox` or live), `AFRICASTALKING_API_KEY` and optionally `AFRICASTALKING_SENDER_ID`.

Real SMS delivery has not been live-tested in this repository. Configure the Africa's Talking credentials to enable it.

### Email Provider

The email provider is abstracted behind an interface. Configured via `EMAIL_PROVIDER`:

- `dev` (default): Logs emails to the server console. **Development only.**
- `brevo`: Delivers transactional email through Brevo. Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` and optionally `BREVO_SENDER_NAME`.

Real email delivery has not been live-tested in this repository. Configure the Brevo credentials to enable it.

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

### Phase 6 — Buyer Requests

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/buyer-requests` | Bearer | Create an open buyer request |
| `GET` | `/api/buyer-requests` | Optional Bearer | Discover open, unexpired buyer requests |
| `GET` | `/api/buyer-requests/me` | Bearer | List my buyer requests, including inactive ones |
| `GET` | `/api/buyer-requests/:id` | Optional Bearer | Read an open request; owners can read any status |
| `PUT` | `/api/buyer-requests/:id` | Bearer (owner) | Update an owned open or paused request |
| `PATCH` | `/api/buyer-requests/:id/pause` | Bearer (owner) | Pause an open request |
| `PATCH` | `/api/buyer-requests/:id/reopen` | Bearer (owner) | Reopen a paused, unexpired request |
| `PATCH` | `/api/buyer-requests/:id/fulfill` | Bearer (owner) | Mark an open or paused request as fulfilled |
| `PATCH` | `/api/buyer-requests/:id/cancel` | Bearer (owner) | Cancel an open or paused request |

Buyer request statuses are `open`, `paused`, `fulfilled`, `cancelled` and `expired`.
Any authenticated user can create a request; ownership is enforced on every
mutation. At least one of `produce_type_id` or `produce_category_id` is required.
When a produce type is supplied, the category is derived from it. Produce
references must be active, and a type/category pair must match.

Discovery filters: `search`, `category_slug`, `produce_type_id`, `location`,
`min_quantity`, `max_quantity`, `min_target_price`, `max_target_price`,
`required_delivery_after`, `required_delivery_before`, `sort` (`newest` or
`delivery_soonest`), `page` and `limit`. Only open, unexpired requests are
returned. `GET /api/buyer-requests/me` also supports a `status` filter.

Expiry is applied before discovery/read requests and by an in-process sweep
started with the API server. Requests whose `expiry_date` has passed are marked
`expired`; the sweep is idempotent and requires no Redis or external worker.

### Phase 6 — Marketplace Discovery

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/marketplace/listings` | Bearer | Discover published, available listings |
| `GET` | `/api/marketplace/listings/:id` | Bearer | Read a published, available listing |
| `GET` | `/api/marketplace/requests` | Bearer | Discover open buyer requests |
| `GET` | `/api/marketplace/requests/:id` | Bearer | Read an open buyer request |

Marketplace listing discovery supports `search`, `category_slug`,
`produce_type_id`, `location`, `min_price`, `max_price`, `min_quantity`,
`max_quantity`, `currency`, `sort` (`newest`, `price_asc`, `price_desc`,
`quantity_asc`, `quantity_desc`), `page` and `limit`. Only published listings
with available stock are returned. Buyer request discovery uses the same filters
as `GET /api/buyer-requests`. Buyer request responses expose only the buyer's
`id` and `display_name`; private contact details are never returned.

### Phase 7 — Messaging

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/conversations` | Bearer | Create or resolve a one-to-one conversation |
| `GET` | `/api/conversations` | Bearer | List my conversations (optionally by status) |
| `GET` | `/api/conversations/:id` | Bearer (participant) | Read a conversation, participants and unread count |
| `POST` | `/api/conversations/:id/messages` | Bearer (participant) | Send a text message |
| `GET` | `/api/conversations/:id/messages` | Bearer (participant) | Read paginated message history |
| `PATCH` | `/api/conversations/:id/read` | Bearer (participant) | Mark messages read up to now or a message ID |
| `PATCH` | `/api/conversations/:id/archive` | Bearer (participant) | Archive a conversation |
| `PATCH` | `/api/conversations/:id/unarchive` | Bearer (participant) | Return an archived conversation to active |
| `PATCH` | `/api/conversations/:id/block` | Bearer (participant) | Block further messages |
| `PATCH` | `/api/conversations/:id/unblock` | Bearer (participant) | Return a blocked conversation to active |
| `GET` | `/api/messages/unread-count` | Bearer | Get total and per-conversation unread counts |

Conversations are strictly one-to-one. `POST /api/conversations` accepts a
`participant_user_id` and optional `listing_id` / `buyer_request_id`. The
participant pair and marketplace context form a deterministic dedupe key; a
duplicate returns `409`. When a listing or buyer request is supplied, the
context owner must be one of the two participants. Missing conversations and
non-participant access both return `404` so private conversation existence is
not leaked.

Conversation statuses are `active`, `archived` and `blocked`. Messages can only
be sent to active conversations. Message statuses are `sent`, `delivered` and
`read`. Delivery is only recorded after the recipient acknowledges it; it is not
inferred from persistence. Messages are limited to 4,000 characters. Clients
cannot supply `sender_user_id`; impersonation attempts return `403`. Cooperative
agents receive no implicit access and must be explicit participants.

Message history supports `page`, `limit`, `before` (ISO 8601 timestamp) and
`order` (`asc` or `desc`). The REST API is the authoritative history; realtime
events are hints that should be reconciled with a history fetch after reconnect.

### Phase 7 — Socket.IO Realtime Events

Connect with `auth: { token: "<access token>" }` (or an
`Authorization: Bearer <token>` handshake header). Unauthenticated or invalid
connections are rejected. Each socket joins a personal `user:<id>` room.
Participants may also join `conversation:<id>` after server-side authorization.

| Event | Direction | Payload |
| --- | --- | --- |
| `conversation:join` | client → server | `{ conversation_id }` |
| `conversation:leave` | client → server | `{ conversation_id }` |
| `message:send` | client → server | `{ conversation_id, content, message_type? }` |
| `message:delivered` | client → server | `{ conversation_id, message_id }` |
| `message:read` | client → server | `{ conversation_id, message_id? }` |
| `message:new` | server → client | `{ message }` |
| `message:delivered` | server → client | `{ conversation_id, message_id, status, delivered_at }` |
| `message:read` | server → client | `{ conversation_id, reader_user_id, read_at, message_ids }` |
| `conversation:created` | server → client | `{ conversation }` |
| `conversation:updated` | server → client | `{ conversation }` |

Events that mutate state use acknowledgements. The server authenticates the
socket, verifies conversation participation, validates the payload, persists the
change, then broadcasts to the conversation room and participant user rooms.
Socket message sending is limited to 60 messages per minute per connection.
REST conversation creation, message sending and read acknowledgements are also
rate limited outside the automated test environment.

### Phase 8 — Offers and Negotiation

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/offers` | Bearer | Create a structured offer on a listing or buyer request |
| `GET` | `/api/offers` | Bearer | List my sent and received offers with filters |
| `GET` | `/api/offers/:id` | Bearer (participant) | Read a single offer |
| `GET` | `/api/offers/:id/history` | Bearer (participant) | Read the full negotiation thread and audit events |
| `POST` | `/api/offers/:id/accept` | Bearer (recipient) | Accept a pending offer |
| `POST` | `/api/offers/:id/reject` | Bearer (recipient) | Reject a pending offer |
| `POST` | `/api/offers/:id/withdraw` | Bearer (creator) | Withdraw a pending offer |
| `POST` | `/api/offers/:id/counter` | Bearer (recipient) | Counter a pending offer with a linked child offer |
| `GET` | `/api/listings/:id/offers` | Bearer (owner) | List offers for one of my listings |
| `GET` | `/api/buyer-requests/:id/offers` | Bearer (owner) | List offers for one of my buyer requests |

An offer requires at least one marketplace context: `listing_id`,
`buyer_request_id`, or both. For a listing-only offer, the authenticated caller
becomes the buyer and the listing owner is the farmer. For a buyer-request-only
offer, the caller becomes the farmer and the request owner is the buyer. When
both are supplied, the caller must be the listing owner or the buyer request
owner, and the two owners must be different users. The offer `unit` must match
the context unit, and `currency` must match the context currency when supplied.
An optional `conversation_id` must belong to the caller and match the offer
context.

Offer terms include `quantity`, `unit`, `unit_price`, optional `currency`,
`delivery_terms`, `delivery_location`, `delivery_date`, `buyer_message`, and
`expires_at`. `total_amount` is calculated server-side using exact decimal
arithmetic and is never accepted from the client. The default expiry is 72
hours. Delivery dates cannot be in the past and `expires_at` must be in the
future.

Offer statuses are `pending`, `countered`, `accepted`, `rejected`, `withdrawn`
and `expired`. Only the offer recipient can accept, reject, or counter a
pending offer; only the creator can withdraw it. Counteroffers create a linked
child offer, mark the parent `countered`, and preserve the thread through
`root_offer_id`. A negotiation thread is limited to 20 offers. Terminal,
countered, and expired offers cannot be acted on again.

Listing offers are validated against a published, currently available listing,
and buyer-request offers require an open, unexpired request. Acceptance
re-validates the context and available quantity. Phase 8 does **not** reserve or
decrement listing inventory and does not create an order or payment; inventory
is only decremented by the existing Phase 5 inventory adjustments.

Offer listing filters: `role` (`buyer` or `farmer`), `direction` (`sent` or
`received`), `status`, `listing_id`, `buyer_request_id`, `conversation_id`,
`sort` (`newest` or `expiring_soon`, the latter only with `status=pending`),
`page` and `limit`. Non-participants receive `404` for offer reads and history.
Owner-only listing and buyer-request offer lists return `403` for other users.

Overdue pending offers are expired lazily before offer reads/lists and by an
in-process sweep started with the API server. Every lifecycle action writes an
immutable `offer_events` audit row. In-process `offer.*` events are published
and Socket.IO `offer:updated` events are sent to both participants' user rooms.
There is no separate offer notification center, email, or SMS delivery in this
phase.

### Phase 9 — Orders, Inventory Reservations and Paystack Payments

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/orders` | Bearer | Create an order from an accepted offer |
| `GET` | `/api/orders` | Bearer | List my buyer or farmer orders with filters |
| `GET` | `/api/orders/:id` | Bearer (participant) | Read an order with items and latest payment summary |
| `GET` | `/api/orders/:id/history` | Bearer (participant) | Read immutable order events |
| `PATCH` | `/api/orders/:id/status` | Bearer (actor) | Advance fulfillment status through the allowed transition |
| `POST` | `/api/orders/:id/cancel` | Bearer (participant) | Cancel an unpaid order and release its reservation |
| `GET` | `/api/orders/:id/reservation` | Bearer (participant) | Read the order's inventory reservation |
| `GET` | `/api/orders/:id/payments` | Bearer (participant) | List payment attempts for the order |
| `GET` | `/api/reservations` | Bearer | List reservations visible to the buyer or farmer |
| `POST` | `/api/payments/paystack/initialize` | Bearer (buyer) | Initialize or reuse a Paystack hosted checkout |
| `GET` | `/api/payments/paystack/verify/:reference` | Bearer (buyer) | Verify a payment with Paystack and apply the result |
| `POST` | `/api/payments/paystack/webhook` | Paystack signature | Receive signed Paystack webhook events |
| `POST` | `/api/payments/paystack/:reference/refund` | Bearer (participant) | Request a full or partial refund |
| `GET` | `/api/payments/paystack/:reference/refund` | Bearer (participant) | List refunds and reconcile provider status |

Orders can only be created from an `accepted` offer that has a `listing_id`.
Buyer-request-only offers have no listing inventory and are rejected for order
creation. Each offer can produce at most one order through a unique `offer_id`
constraint. The order preserves the agreed seller, buyer, listing, quantity,
unit, unit price and currency; totals are recalculated server-side with exact
decimal arithmetic. Order numbers are unique. New orders start with
`status=pending_payment` and `payment_status=pending`.

Creating an order locks the offer and listing, re-validates the listing and
available stock, then moves quantity from `available_quantity` to
`reserved_quantity` inside one database transaction. Conditional SQL updates and
`SELECT ... FOR UPDATE` prevent overselling. The reservation records its expiry
(default 30 minutes) and is unique per order. A background sweep plus lazy checks
expire unpaid reservations: the order is cancelled, pending payment attempts are
abandoned, and an order event is recorded. Fresh, active listings return the
stock to `available_quantity`; stale, expired or otherwise ineligible listings
remove the stock from `quantity` and never restore it. Paying for an order moves
the reservation from `reserved_quantity` to `sold_quantity`. A successfully paid
reservation is consumed rather than expired.

Order statuses are `pending_payment`, `paid`, `processing`,
`ready_for_delivery`, `in_transit`, `delivered`, `completed`, `cancelled`,
`payment_failed` and `refunded`. Payment statuses are `pending`, `paid`,
`failed`, `refunded` and `partially_refunded`. The farmer advances
`paid → processing → ready_for_delivery → in_transit → delivered`; the buyer
marks a delivered order `completed`. Only `pending_payment` and
`payment_failed` orders can be cancelled directly. A paid order must be refunded
before it can be cancelled. Every order transition writes an immutable
`order_events` row and emits an in-process `order.*` event; Socket.IO
`order:updated` events are sent to both participants' user rooms.

Payment initialization is buyer-only and creates a Paystack hosted checkout
using the order total in integer minor units. Pending checkouts are reused per
order while valid. Paystack amounts support NGN, GHS, ZAR and USD (exponent 2).
Phone-only buyers use a stable fallback payment email; a verified email is used
when present. Payment statuses are `pending`, `success`, `failed`, `abandoned`,
`refunded` and `partially_refunded`. Verification and webhooks both apply the
provider result idempotently. A successful payment consumes the reservation and
moves the order to `paid`; a failed event records `payment_failed` without
releasing stock before the reservation expires.

Webhook requests use the raw request body and are mounted before JSON parsing.
The current `Paystack-Signature` header has the form
`t=<unix-seconds>,v1=<key-id>:<hmac-sha512>`. The signed payload is
`t + "." + raw_body`, the HMAC key is the full `whsec_...` signing secret, and
the timestamp tolerance is 300 seconds. Multiple `v1` values are accepted.
Legacy `x-paystack-signature` headers are still verified with the Paystack
secret key. A unique provider event identifier deduplicates deliveries, and each
delivery is stored in `payment_webhook_events` with its processing result.

Refunds accept an optional amount in major currency units and are sent to
Paystack in minor units. Request acceptance is not treated as a completed
refund: the provider refund status is reconciled immediately and again when
refund status is read. Refund statuses are `pending`, `processing`, `processed`,
`failed` and `needs_attention`. A fully processed refund restores a consumed
reservation to available stock when the produce is still fresh and the listing
is active; otherwise the sold stock is removed permanently. A partial refund
updates payment and order refund status without changing inventory.

### Phase 10 — Transporters and Delivery

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/transporters/profile` | Bearer | Create the authenticated user's transporter profile |
| `GET` | `/api/transporters/profile` | Bearer | Read the authenticated user's transporter profile |
| `PATCH` | `/api/transporters/profile` | Bearer | Update profile details or availability |
| `GET` | `/api/transporters/available` | Bearer | List approved, available transporters, optionally filtered by coverage |
| `GET` | `/api/transporters/:id` | Bearer | Read a transporter profile (pending profiles are owner/admin only) |
| `PATCH` | `/api/transporters/:id/approve` | Bearer (admin) | Approve a pending transporter |
| `PATCH` | `/api/transporters/:id/suspend` | Bearer (admin) | Suspend a transporter with an optional reason |
| `PATCH` | `/api/transporters/:id/reactivate` | Bearer (admin) | Reactivate a suspended transporter |
| `GET` | `/api/transporters/my-deliveries` | Bearer | List deliveries assigned to the authenticated transporter |
| `POST` | `/api/deliveries` | Bearer (order participant) | Create a delivery request for an eligible paid order |
| `GET` | `/api/deliveries` | Bearer | List deliveries visible to the authenticated user |
| `GET` | `/api/deliveries/:id` | Bearer (participant) | Read one delivery with order and party summaries |
| `GET` | `/api/deliveries/:id/history` | Bearer (participant) | Read the immutable delivery tracking history |
| `PATCH` | `/api/deliveries/:id/assign` | Bearer (admin) | Assign an approved, available, in-coverage transporter |
| `PATCH` | `/api/deliveries/:id/reassign` | Bearer (admin) | Reassign an assigned or accepted delivery |
| `PATCH` | `/api/deliveries/:id/accept` | Bearer (transporter) | Accept the assigned delivery |
| `PATCH` | `/api/deliveries/:id/decline` | Bearer (transporter) | Decline the assigned delivery and return it to pending |
| `PATCH` | `/api/deliveries/:id/status` | Bearer (participant) | Advance, cancel or fail a delivery through allowed transitions |
| `GET` | `/api/orders/:orderId/delivery` | Bearer (participant) | Read the latest delivery for an order |

**Transporter management.** Any authenticated user can create one transporter
profile. Creation assigns the existing `transporter` role through the normal
role system, sets `approval_status=pending` and `availability_status=unavailable`.
Transporters provide a business name, contact phone, operating location,
coverage areas, optional vehicle details, transportable produce types and an
availability status. Only administrators can approve, suspend or reactivate a
transporter. A transporter can only mark themselves `available` after approval;
administrators set `suspended` when suspending.

**Delivery request workflow.** A delivery request is created from an existing
paid order by the buyer or farmer participant. The order must be `paid`,
`processing` or `ready_for_delivery`, and the order must be paid
(`payment_status=paid`). The request quantity, unit, currency, delivery location
and expected delivery date must match the order terms; the engine never trusts
client-supplied prices or payment status. Each order may have at most one active
delivery (cancelled and failed deliveries may be replaced); a partial unique
index plus a row lock enforce this under concurrency. Creating a delivery moves
a paid order to `processing` through the existing order service.

**Delivery assignment.** Administrators assign transporters. The transporter
must exist, have an approved profile, be `available`, have an active user
account and cover the delivery location. Only pending deliveries can receive a
first assignment; only `assigned` or `accepted` deliveries can be reassigned.
Declining an assigned delivery clears the transporter and returns the delivery
to `pending`.

**Delivery status lifecycle.** Statuses are `pending`, `assigned`, `accepted`,
`picked_up`, `in_transit`, `delivered`, `completed`, `cancelled` and `failed`.
The normal path is:

1. `pending` — delivery request created
2. `assigned` — administrator assigns a transporter
3. `accepted` — transporter accepts
4. `picked_up` — transporter marks produce collected
5. `in_transit` — transporter starts transit
6. `delivered` — transporter marks delivery complete
7. `completed` — buyer (or administrator) confirms receipt

Transitions are validated server-side. Only the assigned transporter can mark
`picked_up`, `in_transit` or `delivered`; a transporter cannot mark a delivery
`completed`. The buyer, farmer or an administrator may cancel before pickup
under the documented rules. `failed` requires a reason and is available to the
transporter or an administrator while the delivery is in progress. A completed
or cancelled delivery cannot be reopened. Every change writes an immutable
`delivery_history` row containing the previous status, new status, actor,
description, optional location and timestamp.

**Order and payment separation.** Delivery progress advances the order through
`processing → ready_for_delivery → in_transit → delivered → completed` only when
the order is paid and the current order status is compatible. Completing a
delivery never changes `payment_status` and never marks an unpaid order paid.
Delivery updates do not modify existing order or payment records beyond these
controlled status syncs.

**Delivery fees.** Fees are stored as integer minor units in
`delivery_fee_minor` alongside an explicit currency (default `NGN`) and are
returned both as minor units and as a safe major-unit value. NGN, GHS, ZAR and
USD are supported with exponent 2. The fee currency must match the order
currency; no implicit currency conversion is performed. There is no delivery
fee edit endpoint, so an agreed fee cannot be changed without a future
authorized workflow. Transporter payouts and commissions are out of scope.

**Realtime and privacy.** When Socket.IO is running, saved delivery changes emit
`delivery:updated` (plus `delivery:<action>`) to the buyer, farmer, creator and
assigned transporter user rooms. The database remains the source of truth.
Unrelated users receive `404` for delivery reads and history, and only
participants can update statuses.

### Phase 11 — Notifications

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/notifications` | Bearer | List the authenticated user's notifications with pagination, unread filter, type filter and unread count |
| `GET` | `/api/notifications/:id` | Bearer (owner) | Read one notification |
| `PATCH` | `/api/notifications/:id/read` | Bearer (owner) | Mark one notification as read |
| `PATCH` | `/api/notifications/read-all` | Bearer | Mark all of the user's notifications as read |
| `GET` | `/api/notifications/unread-count` | Bearer | Return the user's unread notification count |
| `GET` | `/api/notifications/preferences` | Bearer | Read notification preferences, creating defaults on first access |
| `PATCH` | `/api/notifications/preferences` | Bearer | Update one or more notification preferences |
| `GET` | `/api/admin/notifications/deliveries` | Bearer (admin) | List notification delivery logs with status and channel filters |
| `POST` | `/api/admin/notifications/deliveries/:id/retry` | Bearer (admin) | Reset and immediately retry a failed email/SMS delivery |

**Persistence and channels.** Notifications are persisted in `notifications`
before any realtime or external delivery is attempted. Each notification has a
required `dedupe_key` unique constraint so duplicate business events, webhook
retries and worker races cannot create duplicate inbox rows. Channel attempts
are recorded in `notification_deliveries`, separately from the notification
itself. `in_app` delivery is internal and created as `delivered`; email and SMS
start as `pending` and are retried by the in-process worker. The `provider` and
`provider_reference` fields preserve the selected provider and its response
identifier without storing provider credentials.

**Notification types.** Implemented types are `new_offer`,
`offer_accepted`, `offer_rejected`, `counter_offer_received`,
`offer_withdrawn`, `offer_expired`, `new_message`, `order_created`,
`order_cancelled`, `payment_successful`, `payment_failed`,
`reservation_expiring`, `reservation_expired`, `refund_confirmed`,
`delivery_assigned`, `delivery_accepted`, `delivery_declined`,
`delivery_picked_up`, `delivery_in_transit`, `delivery_delivered`,
`delivery_completed`, `delivery_failed`, `delivery_cancelled`,
`account_verified`, `system_announcement` and `marketing`.

**Preferences.** Users control in-app, email, SMS, offers, messages, orders,
payments, deliveries and marketing channels. Marketing is opt-in by default;
other categories default to enabled, while SMS defaults to disabled. Essential
account and payment/security notifications cannot be completely disabled: they
remain available in-app even when in-app notifications are turned off. Disabled
categories are not persisted or sent. Preferences are always scoped to the
authenticated user; clients cannot set another user's preferences.

**Event integration.** Workers subscribe to the existing in-process
`offer.updated`, `message.created`, order/payment and delivery events, plus
account verification. Messages are in-app only, avoiding email/SMS spam for
chat. Expired offers publish `offer.expired`; reservation expiry emits an order
expiration event; a notification-worker sweep sends `reservation_expiring`
warnings before the configured reservation deadline. Notifications are
dispatched after the business transaction has succeeded, so a notification or
provider failure never rolls back an order, payment, delivery or account state.

**Realtime delivery.** After a notification is committed, the API emits
`notification:new` to the recipient's authenticated Socket.IO room
(`user:<user_id>`). Offline users see the persisted notification through the
REST inbox. Socket.IO remains a delivery accelerator; the database is the
source of truth.

**Retries and idempotency.** Email and SMS attempts use a provider timeout and
record `attempts`, `last_attempt_at`, `next_attempt_at`, `failure_reason` and
`provider_reference`. Failed attempts retry with exponential backoff
(`NOTIFICATION_RETRY_INTERVAL_SECONDS * 2^(attempts - 1)`, capped at 24 hours)
until `NOTIFICATION_MAX_RETRIES` is reached. Admins can reset and retry a failed
delivery. In-app notifications are not retried. Dedupe keys make event dispatch
and retries safe to repeat.

**Providers and testing.** Brevo is used for email when
`EMAIL_PROVIDER=brevo`; Africa's Talking is used for SMS when
`SMS_PROVIDER=africastalking`. The existing `dev` adapters log content in
development and are rejected in production. Automated tests mock both
providers and make no real email or SMS calls. Real provider delivery has not
been live-tested in this repository.

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

### Phase 7 tables

#### `conversations`

- UUID primary key
- `created_by_user_id` foreign key to `users.id`
- `listing_id` foreign key to `produce_listings.id` (nullable)
- `buyer_request_id` foreign key to `buyer_requests.id` (nullable)
- `status` ENUM: `active` | `archived` | `blocked` (default `active`)
- `last_message_at` (nullable)
- `dedupe_key` (unique) — sorted participant pair plus marketplace context
- `created_at`, `updated_at`

#### `conversation_participants`

- UUID primary key
- `conversation_id` foreign key to `conversations.id` (CASCADE delete)
- `user_id` foreign key to `users.id` (CASCADE delete)
- `last_read_at` (nullable read cursor)
- Unique `(conversation_id, user_id)`
- `created_at`, `updated_at`

#### `messages`

- UUID primary key
- `conversation_id` foreign key to `conversations.id` (CASCADE delete)
- `sender_user_id` foreign key to `users.id`
- `content` text (maximum 4,000 characters enforced by validation)
- `message_type` ENUM: `text`
- `status` ENUM: `sent` | `delivered` | `read` (default `sent`)
- `delivered_at`, `read_at` (nullable)
- Indexes on `(conversation_id, created_at)` and conversation status
- `created_at`, `updated_at`

### Phase 8 tables

#### `offers`

- UUID primary key
- `offer_number` (unique, max 40 chars)
- `listing_id` foreign key to `produce_listings.id` (nullable, RESTRICT delete)
- `buyer_request_id` foreign key to `buyer_requests.id` (nullable, RESTRICT delete)
- Database check constraint requires at least one marketplace context
- `conversation_id` foreign key to `conversations.id` (nullable, SET NULL)
- `buyer_id`, `farmer_id`, `created_by` foreign keys to `users.id` (RESTRICT delete)
- `parent_offer_id`, `root_offer_id` self-references to `offers.id` (nullable, SET NULL)
- `quantity` — PostgreSQL `NUMERIC(14,3)`
- `unit` (max 50 chars)
- `unit_price` — PostgreSQL `NUMERIC(18,2)`
- `total_amount` — PostgreSQL `NUMERIC(18,2)`, calculated server-side
- `currency` (default `NGN`)
- `delivery_terms`, `delivery_location`, `buyer_message` (text, nullable)
- `delivery_date` (date, nullable)
- `status` ENUM: `pending` | `countered` | `accepted` | `rejected` | `withdrawn` | `expired` (default `pending`)
- `expires_at`, `accepted_at`, `rejected_at`, `withdrawn_at`, `expired_at`, `countered_at`
- Check constraints keep `quantity`, `unit_price`, and `total_amount` positive
  and require `buyer_id <> farmer_id`
- Indexes on marketplace contexts, participants, creator, parent/root thread,
  status, expiry, status/expiry, participant/status, and creation time
- `created_at`, `updated_at`

#### `offer_events`

Immutable audit log — no `updated_at`.

- UUID primary key
- `offer_id` foreign key to `offers.id` (CASCADE delete)
- `actor_user_id` foreign key to `users.id` (nullable, SET NULL)
- `action` (max 40 chars): `created` | `countered` | `accepted` | `rejected` | `withdrawn` | `expired`
- `previous_status`, `new_status` (nullable)
- `metadata` (JSONB) — context and lifecycle details; never stores secrets
- Indexes on `(offer_id, created_at)`, `actor_user_id`, and `action`
- `created_at`

### Phase 9 tables

#### `orders`

- UUID primary key
- `order_number` (unique, max 40 chars)
- `offer_id` foreign key to `offers.id` (unique, RESTRICT delete)
- `listing_id` foreign key to `produce_listings.id` (RESTRICT delete)
- `buyer_id`, `farmer_id` foreign keys to `users.id` (RESTRICT delete)
- `quantity` — PostgreSQL `NUMERIC(14,3)`
- `unit`, `unit_price`, `total_amount`, `currency`
- `status` ENUM (default `pending_payment`)
- `payment_status` ENUM (default `pending`)
- `delivery_terms`, `delivery_location`, `delivery_date`, `cancellation_reason` (nullable)
- `paid_at`, `completed_at`, `cancelled_at`, `refunded_at` (nullable)
- Check constraints keep quantity and amounts positive and require
  `buyer_id <> farmer_id`
- Indexes on buyer, farmer, listing, status, payment status and creation time
- `created_at`, `updated_at`

#### `order_items`

- UUID primary key
- `order_id` foreign key to `orders.id` (CASCADE delete)
- `listing_id` foreign key to `produce_listings.id` (RESTRICT delete)
- Snapshot fields: `produce_type_id`, `title`, `quantity`, `unit`,
  `unit_price`, `line_total`, `currency`
- `created_at`, `updated_at`

#### `order_events`

Immutable audit log — no `updated_at`.

- UUID primary key
- `order_id` foreign key to `orders.id` (CASCADE delete)
- `actor_user_id` foreign key to `users.id` (nullable, SET NULL)
- `event_type` (max 40 chars), `previous_status`, `new_status`
- `metadata` (JSONB) — lifecycle and provider details; never stores secrets
- Indexes on `(order_id, created_at)`, actor and event type
- `created_at`

#### `inventory_reservations`

- UUID primary key
- `order_id` foreign key to `orders.id` (unique, CASCADE delete)
- `listing_id` foreign key to `produce_listings.id` (RESTRICT delete)
- `buyer_id`, `farmer_id` foreign keys to `users.id` (RESTRICT delete)
- `quantity` — PostgreSQL `NUMERIC(14,3)`
- `status` ENUM: `active` | `released` | `expired` | `consumed` | `void` (default `active`)
- `expires_at`, `released_at`, `consumed_at` (nullable)
- `release_reason` (nullable)
- Check constraint keeps quantity positive
- Indexes on listing, buyer, farmer, status, expiry and creation time
- `created_at`, `updated_at`

#### `payments`

- UUID primary key
- `order_id` foreign key to `orders.id` (RESTRICT delete)
- `reference` (unique), `provider` (`paystack`), `provider_transaction_id` (nullable)
- `amount` in integer minor units, `currency`
- `status` ENUM: `pending` | `success` | `failed` | `abandoned` | `refunded` | `partially_refunded`
- `channel`, `gateway_response`, `authorization_url`, `access_code`,
  `last_error` (nullable)
- `raw_response` (JSONB), `paid_at`, `verified_at` (nullable)
- Indexes on order, status, reference and creation time
- `created_at`, `updated_at`

#### `payment_webhook_events`

Immutable audit log — no `updated_at`.

- UUID primary key
- `provider`, `provider_event_id` (unique per provider), `event_type`
- `payment_reference` (nullable)
- `signature_valid`, `processed`, `processing_error` (nullable)
- `payload` (JSONB) and `received_at`
- Indexes on provider event, reference, processed and received time
- `created_at`

#### `refunds`

- UUID primary key
- `order_id`, `payment_id` foreign keys (RESTRICT delete)
- `requested_by_user_id` foreign key to `users.id` (RESTRICT delete)
- `provider` (`paystack`), `provider_refund_id` (nullable)
- `transaction_reference`, `amount` in integer minor units, `currency`
- `status` ENUM: `pending` | `processing` | `processed` | `failed` | `needs_attention`
- `customer_note`, `merchant_note`, `provider_response` (JSONB), `processed_at`
- Indexes on order, payment, status, provider refund and creation time
- `created_at`, `updated_at`

### Phase 10 tables

#### `transporter_profiles`

- UUID primary key
- `user_id` unique foreign key to `users.id` (CASCADE delete)
- `business_name`, `contact_phone`, `operating_location`
- `coverage_areas` and `produce_types` as text arrays
- `vehicle_type`, `vehicle_registration_number`, `vehicle_capacity` (nullable)
- `availability_status` ENUM: `available` | `unavailable` | `suspended`
- `approval_status` ENUM: `pending` | `approved` | `rejected` | `suspended`
- `approved_by_user_id` foreign key to `users.id` (SET NULL), `approved_at`
- `suspended_reason`
- Indexes on user, availability status and approval status
- `created_at`, `updated_at`

#### `deliveries`

- UUID primary key and unique `delivery_reference`
- `order_id` foreign key to `orders.id` (CASCADE delete)
- `farmer_id`, `buyer_id` foreign keys to `users.id` (RESTRICT delete)
- `transporter_id` foreign key to `users.id` (SET NULL), nullable
- `pickup_location`, `delivery_location`, `produce_description`
- `quantity` DECIMAL(14,3), `unit`
- `expected_pickup_date`, `expected_delivery_date` (DATEONLY)
- `delivery_fee_minor` BIGINT and `currency` (default `NGN`)
- `additional_instructions`
- `status` ENUM: `pending` | `assigned` | `accepted` | `picked_up` | `in_transit` | `delivered` | `completed` | `cancelled` | `failed`
- `created_by_user_id` foreign key to `users.id` (SET NULL)
- Lifecycle timestamps: `assigned_at`, `accepted_at`, `picked_up_at`, `delivered_at`, `completed_at`, `cancelled_at`, `failed_at`
- `cancellation_reason`, `failure_reason`
- Partial unique index allowing one active delivery per order (excludes `cancelled` and `failed`)
- Indexes on order, transporter, buyer, farmer, status, creation time and transporter/status
- Check constraints for positive quantity, non-negative fee and ordered expected dates
- `created_at`, `updated_at`

#### `delivery_history`

- UUID primary key
- `delivery_id` foreign key to `deliveries.id` (CASCADE delete)
- `actor_user_id` foreign key to `users.id` (SET NULL), nullable
- `action`, `previous_status`, `new_status`
- `description`, optional `location`, optional `metadata` (JSONB)
- Indexes on delivery/creation time, actor and action
- `created_at`

### Phase 11 tables

#### `notifications`

- UUID primary key
- `user_id` foreign key to `users.id` (CASCADE delete)
- `title`, `message`, `notification_type`
- `channel` ENUM: `in_app` | `email` | `sms` (default `in_app`)
- `related_entity_type`, `related_entity_id`, optional `action_url`
- `is_read` (default false), nullable `read_at`
- Unique nullable `dedupe_key` for idempotent dispatch
- Indexes on user/creation time, user/read state and notification type
- `created_at`, `updated_at`

#### `notification_deliveries`

- UUID primary key
- `notification_id` foreign key to `notifications.id` (CASCADE delete)
- `user_id` foreign key to `users.id` (CASCADE delete)
- `channel` ENUM: `in_app` | `email` | `sms`
- `provider`, nullable `provider_reference`
- `delivery_status` ENUM: `pending` | `sent` | `delivered` | `failed` | `skipped`
- `attempts` (default 0), nullable `last_attempt_at`, `next_attempt_at`, `delivered_at`
- Nullable `failure_reason`
- Unique index on notification/channel, retry index on status/next attempt, indexes on user and notification
- `created_at`, `updated_at`

#### `notification_preferences`

- UUID primary key
- `user_id` unique foreign key to `users.id` (CASCADE delete)
- `in_app_enabled`, `email_enabled`, `sms_enabled`
- `offers_enabled`, `messages_enabled`, `orders_enabled`, `payments_enabled`, `deliveries_enabled`
- `marketing_enabled` (default false)
- `created_at`, `updated_at`

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

Tests use an isolated PostgreSQL database. The database name **or hostname** must include `test`.

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
- Migrations (apply, rollback, re-apply) — all 29 migrations
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

**Phase 6 (49 tests):**
- Buyer request creation with produce type or category, category derivation and currency defaults
- Validation for quantity, target price, dates, produce references, active catalogue entries and type/category mismatches
- Open-request discovery with search, category/type, location, quantity, price and delivery-date filters
- Sorting, pagination and my-requests status filtering
- Owner-only updates, lifecycle transitions, invalid transition rejection and IDOR protection
- Expiry sweeps for open and paused requests, inactive visibility rules and idempotency
- Marketplace authentication, listing discovery filters/sorting and published-only detail access
- Buyer request privacy: only buyer `id` and `display_name` are exposed

**Phase 7 (27 tests):**
- Conversation creation, deterministic duplicate prevention and marketplace-context ownership rules
- Self-conversation, invalid recipient, missing context and duplicate-context validation
- Participant-only conversation list, detail, history and message sending (IDOR returns 404)
- Message trimming, blank/empty/over-length validation and sender impersonation rejection
- Paginated history with sender details and ascending/descending order
- Unread counts for recipients and zero unread for the sender
- Read receipts, message status transitions, archive/block/unblock rules and messaging restrictions
- Socket.IO authentication, participant-only room joins, realtime message/delivery/read events
- REST and socket rate-limit enforcement
- Phase 7 migrations, tables and indexes

**Phase 8 (15 tests):**
- Authenticated offer creation on listings and buyer requests with derived buyer/farmer participants
- Offer term validation, context requirement, self-offer rejection and available-quantity checks
- Participant-only offer reads and history; non-participant access returns 404
- Offer list filters for role, direction, status and marketplace context
- Owner-only listing and buyer-request offer lists
- Recipient-only acceptance/rejection and creator-only withdrawal
- Acceptance re-validates inventory without reserving or decrementing it
- Counteroffers, thread history, parent `countered` status and latest-offer acceptance
- Expiry sweep behavior and rejection of overdue offers
- Acceptance failure after listing availability drops below the offered quantity
- Dual listing/buyer-request context offers and participant authorization
- Phase 8 migrations, tables, constraints and indexes

**Phase 9 (11 tests):**
- Order creation from accepted listing offers with participant derivation and authorization
- Accepted-offer validation, listing requirement, duplicate order prevention and stock reservation
- Order listing filters, participant-only detail access and immutable order history
- Cancellation releasing reserved stock back to available inventory
- Concurrent order creation race preventing overselling
- Payment initialization and pending checkout reuse
- Paystack verification applying payment success and order status transitions
- Signed webhook processing, deduplication and invalid-signature rejection
- Full refund restoring consumed reservation stock
- Reservation expiry cancelling unpaid orders and restoring stock
- Phase 9 migrations, tables and indexes

**Phase 10 (9 tests):**
- Transporter profile creation, duplicate prevention and owner/admin visibility
- Approval-only availability, coverage filtering and admin approve/suspend/reactivate
- Delivery creation from paid orders and prevention for unpaid orders
- Order-term validation for quantity, location, currency and fee
- Duplicate active-delivery prevention and delivery access control (IDOR returns 404)
- Transporter eligibility checks (approval, availability and coverage)
- Transporter acceptance/decline, invalid transitions and required failure reasons
- Completion restricted to buyer/admin and no reopening of terminal deliveries
- Delivery history, order/delivery status consistency and failed-delivery replacement

**Phase 11 (11 tests):**
- Offer event persistence, ownership and realtime notification creation
- Idempotent dispatch using unique dedupe keys
- Category preferences, essential in-app notifications and marketing opt-in
- Inbox listing, unread counts, read/read-all and cross-user access protection
- Offer acceptance and order creation event notifications
- Verified payment and delivery event notification mapping
- Messaging notifications persisted in-app without email/SMS
- SMS provider dispatch when enabled by preferences
- Admin delivery listing, retry reset, retry success and authorization checks
- Failed-delivery backoff prevents early retries
- Socket.IO `notification:new` emission to the recipient's user room

The full backend suite currently contains **308 tests** across Phases 2–11.


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

- **SMS delivery:** The dev SMS adapter logs OTPs and notifications to the server console. An Africa's Talking adapter exists, but real SMS delivery has not been live-tested. Configure `SMS_PROVIDER=africastalking`, `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY` and optionally `AFRICASTALKING_SENDER_ID`.
- **Email delivery:** The dev email adapter logs emails to the server console. A Brevo adapter exists, but real email delivery has not been live-tested. Configure `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` and optionally `BREVO_SENDER_NAME`.
- **Render deployment:** `render.yaml` and deployment instructions are prepared but not live-tested.
- **Aiven connectivity:** Verified against Aiven PostgreSQL 18.6. The backend uses DNS pre-resolution to work around IPv6 Happy Eyeballs timeout issues on this network.
- **Marketplace features:** Phase 6 implements authenticated marketplace discovery and buyer requests. Phase 7 implements farmer–buyer messaging. Phase 8 implements offers and negotiation. Phase 9 implements orders, inventory reservations and Paystack payments. Phase 10 implements transporter management and delivery coordination. Phase 11 implements persistent notifications and delivery preferences.
- **Messaging notifications:** Phase 11 persists in-app new-message notifications and emits `notification:new`, but intentionally suppresses email and SMS for chat messages to avoid spam.
- **Account recovery / password reset:** Not implemented. Belongs to a future phase.
- **File uploads:** Produce listing images support secure multipart uploads to a local development adapter. Profile image and cooperative logo uploads (`profile_image_url`, `logo_url`) are not implemented and still accept a manually supplied URL. Production object storage (for example S3-compatible storage) is not configured; Render's filesystem is ephemeral, so a durable storage adapter must be added before production use.
- **Public listing discovery:** Phase 5 exposes produce categories/types publicly and published listing details by ID. Phase 6 adds authenticated marketplace discovery for listings and buyer requests. Full marketplace and buyer-request frontend screens are not yet implemented.
- **Messaging frontend:** Phase 7 provides the REST API and Socket.IO backend only. Conversation, chat and unread-count frontend screens are not yet implemented.
- **Offers frontend:** Phase 8 provides the REST API and realtime backend only. Offer creation, negotiation history and offer-management screens are not yet implemented.
- **Offer inventory and fulfillment:** Accepting an offer still does not reserve inventory or create an order. The buyer must explicitly create a Phase 9 order from the accepted offer; order creation re-checks stock and atomically reserves it.
- **Offer notifications:** Phase 11 consumes in-process `offer.*` events to persist in-app notifications and dispatch email/SMS according to user preferences. Offer expiration notifications are emitted by the expiry sweep.
- **Agent-assisted offers:** Cooperative agents receive no implicit access to offers. Only the actual buyer and farmer participants can read or act on an offer in Phase 8.
- **Payment provider:** Paystack is integrated through its HTTP API and documented webhook signatures, but no live Paystack credentials are configured in this repository and all provider calls are mocked in tests. End-to-end card/bank checkout against the live provider has not been tested.
- **Payments frontend:** Phase 9 provides the backend API only. Hosted-checkout redirect, payment-status and refund screens are not yet implemented in the frontend.
- **Refund operations:** Provider refunds can remain `pending`, `processing`, `failed` or `needs_attention`. Operators must reconcile those states; there is no admin refund dashboard or automatic retry queue.
- **Reservation expiry job:** The reservation-expiry sweep is an in-process interval tied to the API server. Running multiple API instances would perform duplicate sweeps (idempotently) rather than coordinating through a distributed scheduler.
- **Order notifications:** Phase 11 consumes in-process order/payment events to persist order, payment, refund and reservation notifications. Reservation-expiry warnings are emitted by the notification worker; reservation-expired notifications follow the expiry sweep.
- **Transport and delivery tracking:** Phase 10 implements transporter profiles, coverage-based assignment, a controlled delivery lifecycle and event history. It does not implement GPS coordinates, live maps, route optimization, transporter payouts or commissions. Location history entries are free-text notes, not geospatial tracks.
- **Delivery frontend:** Phase 10 provides the REST API and Socket.IO backend only. Transporter dashboards, delivery assignment screens and buyer delivery tracking screens are not yet implemented in the frontend.
- **Delivery notifications:** Phase 11 consumes delivery events to persist in-app notifications and dispatch email/SMS according to preferences. It does not implement GPS tracking, push notifications or carrier delivery receipts.
- **Notification worker:** The retry and reservation-warning worker is an in-process interval tied to the API server. Multiple API instances would retry idempotently because of dedupe keys and delivery status checks, but a distributed scheduler is not configured.
- **Notification frontend:** Phase 11 provides the REST API and Socket.IO backend only. Notification inbox, preferences and admin delivery screens are not yet implemented in the frontend.
- **External delivery confirmation:** Email/SMS deliveries are marked `sent` when the provider accepts them. Provider-specific delivered/bounced receipts are not webhook-integrated.
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
