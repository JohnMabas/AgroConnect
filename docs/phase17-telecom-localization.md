# Phase 17 — USSD, Voice/IVR, rural access and localization

Phase 17 adds two low-bandwidth channels for users without smartphones or reliable data:
Africa's Talking USSD and Voice/IVR. Both channels reuse the existing auth, catalogue,
listing, offer, order, market-price, notification and farmer-protection services. No
second business-logic implementation, database, cache or microservice was introduced.

The channels are implemented and covered by tests, but they are **not** production
activated. A live USSD short code and voice number must be provisioned and approved by
the provider for each country before enabling the channel switches.

## Core rules

- USSD and Voice are entry points, not a parallel marketplace. Every state change goes
  through the existing Phase 1–16 services and permission checks.
- A phone number identifies the caller. Existing verified users are logged in by phone;
  unknown callers get the guest menu and can register through USSD.
- Registration still requires SMS OTP verification. A USSD session never bypasses phone
  verification.
- No PINs, card numbers, bank details or payment credentials are collected over USSD or
  Voice.
- A USSD/voice session can only be inspected or terminated by its owner or an admin.
- Responses are bounded for USSD display limits, and every menu has an exit/back path.
- Market prices and listings shown are read from verified backend records. The channels
  never invent prices, quantities or availability.

## USSD

Mount: `POST /api/ussd` (also `POST /api/ussd/callback`).

Africa's Talking sends `application/x-www-form-urlencoded` fields:
`sessionId`, `phoneNumber`, `networkCode`, `serviceCode`, and `text`. `text` contains the
cumulative user input separated by `*`. Responses must start with `CON` (continue) or
`END` (terminate).

### Menus

Guest (USSD only):

1. Register
2. Market prices
3. Language
4. Support

Pending verification:

1. Enter OTP
2. Resend OTP
3. Language
4. Support

Farmer:

1. Sell produce
2. My listings
3. Buyer requests
4. Offers
5. Orders
6. Market prices
7. Language
8. Support

Buyer:

1. Browse produce
2. Create buyer request
3. My buyer requests
4. Offers
5. Orders
6. Market prices
7. Language
8. Support

### Main flows

- **Registration:** name → OTP prompt → OTP verification → success message and main menu.
  Duplicate phone numbers return a safe message instead of creating a second account.
- **Sell produce:** produce type → quantity → unit → price per unit → collection location
  → explicit confirmation → listing created and published through the existing listing and
  inventory services. A missing farmer profile is created before listing so new USSD users
  are not blocked.
- **Offers:** pending received offers → select offer → accept/reject → explicit
  confirmation. Accepting uses the existing offer/order workflow and notifies the
  counterpart through the notification service.
- **Orders:** shows order status from stored orders only.
- **Market prices:** produce type → latest verified price summary, or a clear “no market
  prices available” response.
- **Language:** switches the session language for supported languages.
- **Support:** records a telecom support request for admin follow-up.

### Idempotency and retries

USSD providers retry callbacks. Each event is stored in `telecom_webhook_events` with a
deterministic event key. For USSD the key is based on the provider session and a hash of
the cumulative `text`, so a retried callback returns the cached response instead of
creating a duplicate listing, offer decision or order. Voice callbacks use the provider
session plus a short time bucket because DTMF input is not cumulative.

## Voice/IVR

Mount: `POST /api/voice` (also `/incoming`, `/events`, `/callback`).

Africa's Talking sends `sessionId`, `callerNumber`, `destinationNumber`, `direction`,
`isActive` and, for keypad input, `dtmfDigits`. The callback responds with Voice XML:
`<Response>`, `<Say>`, `<GetDigits>` and `<Dial>`/`<Hangup>` as appropriate.

- The welcome prompt and menus mirror the USSD capabilities.
- `GetDigits` collects menu choices and language selection; empty input replays the menu.
- `isActive=false` terminates the session safely and returns a goodbye response.
- Identical callbacks are deduplicated through `voice_call_events` and
  `telecom_webhook_events`.
- Voice does not perform payment, PIN or bank-detail collection.

## Localization

Module mount: `/api/localization`.

- `GET /api/localization/languages` lists supported languages.
- `GET /api/localization/messages?language=ha` returns message catalogs.
- `GET /api/localization/me` and `PUT /api/localization/me` read/update the authenticated
  user's preferred language. `PATCH /api/users/my-language` is also supported as an alias.
- Supported: `en`, `ha`, `ig`, `yo`, `pcm`. Reviewed for critical messages: `en` only by
  default.
- Critical messages (payments, consent, approvals, safety, OTP and other sensitive flows)
  fall back to English unless the language is in `LOCALIZATION_REVIEWED_LANGUAGES`.
  Unreviewed translations must never be used for money, consent or safety decisions.

## Callback security

Africa's Talking does not sign USSD or voice callbacks. Phase 17 therefore supports:

- A shared secret appended as `?secret=...` or sent in `X-Telecom-Callback-Secret`.
- An optional IPv4/CIDR allowlist through `TELECOM_CALLBACK_IP_ALLOWLIST`.
- Per-channel rate limiting.
- Channel kill switches (`TELECOM_ENABLED`, `USSD_ENABLED`, `VOICE_ENABLED`).
- Session TTL, duplicate windows, maximum menu options and maximum response length.
- Authenticated session inspection/termination with ownership checks.

Configure the secret and allowlist together in production. Leaving both empty is only
acceptable in local development.

## Admin APIs

All routes require `admin` role and are mounted under `/api/admin/telecom`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/sessions` | List USSD and voice sessions. |
| `POST` | `/sessions/:channel/:id/terminate` | Terminate a stuck session. |
| `GET` | `/support-requests` | List telecom support requests. |
| `PATCH` | `/support-requests/:id` | Update support request status/resolution. |
| `GET` | `/webhook-events` | Inspect provider callbacks and processing status. |
| `GET` | `/config` | Safe configuration summary (no secrets). |

Internal session endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/ussd/session/:id` | Session owner inspects their USSD session. |
| `POST` | `/api/ussd/session/:id/terminate` | Session owner terminates their session. |

## Data model

Migration `20261116000001-create-phase17-telecom-localization` adds:

- `ussd_sessions`, `ussd_session_events`
- `voice_call_sessions`, `voice_call_events`
- `telecom_webhook_events`
- `telecom_support_requests`

The migration is reversible and is included in the full migration test.

## Environment variables

See `backend/.env.example` and [`environment-variables.md`](./environment-variables.md).
Key groups: channel switches, Africa's Talking environment, USSD service code, callback
secrets/allowlist, voice number/callback URL, session and abuse controls, and localization
language lists. Never commit real secrets.

## Testing

`backend/tests/phase17.test.ts` covers:

- Malformed provider callback rejection.
- Guest registration and OTP verification through USSD.
- Produce listing end-to-end through existing services, retry idempotency, invalid
  quantity and invalid unit handling.
- Offer acceptance confirmation, order status, market prices and buyer discovery.
- Voice/IVR menu navigation, duplicate callback deduplication and call termination.
- Localization language listing, critical-message fallback and stored preference.
- Admin-only telecom access and USSD session ownership.

Run the backend checks with an isolated test database:

```bash
cd backend
npm run typecheck
npm run lint
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/agroconnect_test \
  TEST_DB_SSL=false npm test -- tests/phase17.test.ts
```

## Sandbox vs production

Sandbox:

- Africa's Talking simulator can exercise USSD/voice callbacks.
- Use `AFRICASTALKING_ENVIRONMENT=sandbox` and sandbox credentials.
- Short codes and voice numbers may be simulated; no real subscriber traffic.

Production:

- A short code and voice number must be approved per country.
- Public HTTPS callback URLs, shared secrets and the provider IP allowlist are required.
- Keep channels disabled until provider approval, legal review and localization review of
  critical messages are complete.
- Monitor webhook events, failed deliveries and support requests.

## Known limitations

- No live provider activation or short-code provisioning is included.
- Only English is reviewed for critical messages by default; other translations require
  review before enabling critical flows in those languages.
- USSD/voice support is text/keypad based; no file uploads or document verification.
- Payment collection remains on existing web/mobile channels; USSD/voice never handle
  card, PIN or bank data.
