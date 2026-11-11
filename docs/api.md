# API overview

Endpoints are under `/api` and use `{ success, data }` responses. Main groups:
`/auth`, `/profiles`, `/farmers`, `/cooperatives`, `/agents`, `/listings`,
`/marketplace`, `/conversations`, `/offers`, `/orders`, `/payments`,
`/deliveries`, `/notifications`, `/reviews`, `/verifications`, `/market`,
`/ai`, and `/admin/farmer-protection`. `GET /api/health` reports
application/database status. Bearer authentication, ownership and role checks
are enforced server-side.

Phase 16 farmer protection endpoints are documented in
[`phase16-farmer-protection.md`](./phase16-farmer-protection.md).
