# Phase 18 — Evidence and test results

This document records what has actually been verified. It must not contain invented
results, fake users, fake transactions or sandbox results presented as live integration.

## Current verification record

Date of this record: 2026-11-12.

| Check | Result | Notes |
| --- | --- | --- |
| Backend TypeScript typecheck | Passed | `npm run typecheck` in `backend/`. |
| Backend ESLint | Passed | `npm run lint` in `backend/`. |
| Frontend TypeScript typecheck | Passed | `npm run typecheck` in `frontend/`. |
| Frontend ESLint | Passed | `npm run lint` in `frontend/`. |
| Phase 18 migration and models present | Verified by inspection | Migration registered; models registered with associations. |
| Phase 18 integration test file present | Verified by inspection | `backend/tests/phase18.test.ts`. |
| Readiness catalogue/report smoke check | Passed | 20 unique modules; test runtime produced `INTERNAL_TESTING_READY`. No database connection was used. |
| Phase 18 database integration tests executed | **Not executed** | `TEST_DATABASE_URL` host timed out (`ETIMEDOUT`). |
| Phase 1–17 database suites re-executed | **Not executed** | Same database connectivity blocker. |
| Live Paystack settlement | **Not verified** | Test mode only; provider approval outstanding. |
| Live USSD short code | **Not verified** | No approved short code or live credentials. |
| Live voice number | **Not verified** | No approved voice number or live credentials. |
| Real-device field test | **Not performed** | Requires participants, staffing and approvals. |

Static checks are evidence that the code compiles and passes lint. They are not evidence
that the database integration suite passes.

## Commands used

```bash
cd backend && npm run typecheck && npm run lint
cd frontend && npm run typecheck && npm run lint
```

Database tests require an isolated PostgreSQL database:

```bash
cd backend
TEST_DATABASE_URL=postgres://user:password@host:5432/agroconnect_test npm test
```

The database name or hostname must contain `test`; the test setup refuses destructive runs
otherwise.

## Evidence register template

| Date | Module key | Environment | Evidence reference | Result | Reviewed by |
| --- | --- | --- | --- | --- | --- |
|  |  | local / Render / sandbox / live | test log, screenshot, order ID, session ID | passed / failed / blocked |  |

## Rules for recording evidence

1. Record failures as failures.
2. Include identifiers and timestamps.
3. State whether providers were mocked, sandbox or live.
4. State whether payments were test mode.
5. Link evidence to the readiness module it supports.
6. Do not set a critical module to `passed` without a second review.
7. Update this document before changing the readiness dashboard to a passing state.

## Known blockers

- Test database connectivity from the current environment.
- Paystack live/marketplace settlement approval.
- Africa's Talking short-code and voice-number approval.
- Legal/consent review for real participant data.
- Operational support staffing and real-device field testing.
