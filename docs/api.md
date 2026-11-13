# API overview

Endpoints are under `/api` and use `{ success, data }` responses. Main groups:
`/auth`, `/profiles`, `/farmers`, `/cooperatives`, `/agents`, `/listings`,
`/marketplace`, `/conversations`, `/offers`, `/orders`, `/payments`,
`/deliveries`, `/notifications`, `/reviews`, `/verifications`, `/market`,
`/ai`, `/ussd`, `/voice`, `/localization`, `/pilot`, `/admin/farmer-protection`,
`/admin/telecom`, and `/admin/pilot`. `GET /api/health` reports
application/database status. Bearer authentication, ownership and role checks are
enforced server-side.

Phase 16 farmer protection endpoints are documented in
[`phase16-farmer-protection.md`](./phase16-farmer-protection.md). Phase 17
USSD, voice/IVR, callback security and localization endpoints are documented in
[`phase17-telecom-localization.md`](./phase17-telecom-localization.md). Phase 18
pilot configuration, participants, feedback, metrics and readiness endpoints are
documented in [`phase18-pilot-readiness.md`](./phase18-pilot-readiness.md).
