# API overview

Endpoints are under `/api` and use `{ success, data }` responses. Main groups: `/auth`, `/profiles`, `/farmers`, `/listings`, `/marketplace`, `/conversations`, `/offers`, `/orders`, `/payments`, `/deliveries`, `/notifications`, `/reviews`, `/verifications`, `/market`, and `/ai`. `GET /api/health` reports application/database status. Bearer authentication, ownership and role checks are enforced server-side.
