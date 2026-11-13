# Phase 18 — Evidence-based readiness catalogue

The catalogue lives in
`backend/src/modules/pilot/pilot.readiness.catalog.ts`. It is a pure data module with 20
modules. Runtime environment checks are merged in by
`pilot.readiness.service.ts`.

## Status vocabulary

Implementation: `implemented`, `partial`, `not_implemented`.

Testing: `implemented_not_tested`, `testing_in_progress`, `passed`, `blocked`,
`sandbox_tested_only`.

Integration: `integrated`, `sandbox_only`, `not_configured`, `blocked`.

Pilot readiness: `not_implemented`, `implemented_not_tested`, `testing_in_progress`,
`passed`, `blocked`, `sandbox_tested_only`, `prepared_awaiting_provider_approval`,
`ready_for_controlled_pilot`.

## Modules

| # | Key | Critical |
| --- | --- | --- |
| 1 | `registration_authentication` | Yes |
| 2 | `farmer_profiles` | Yes |
| 3 | `buyer_profiles` | Yes |
| 4 | `produce_listings_inventory` | Yes |
| 5 | `buyer_requests` | Yes |
| 6 | `farmer_buyer_messaging` | Yes |
| 7 | `offers_negotiations` | Yes |
| 8 | `orders_reservations` | Yes |
| 9 | `paystack_payments` | Yes |
| 10 | `transport_delivery` | Yes |
| 11 | `notifications` | No |
| 12 | `reviews_verification` | Yes |
| 13 | `market_intelligence` | No |
| 14 | `integrity_ai` | No |
| 15 | `agroconnect_ai_assistant` | No |
| 16 | `farmer_protection` | Yes |
| 17 | `cooperative_agent_management` | Yes |
| 18 | `ussd_access` | No |
| 19 | `voice_ivr_access` | No |
| 20 | `security_deployment` | Yes |

## Evidence rules

- Defaults are conservative. Existing code and tests are evidence of implementation, not
  proof that tests passed in the current environment.
- A module is only `passed` or `ready_for_controlled_pilot` after an administrator records
  evidence and notes through the override endpoint.
- Test-mode payment success is `sandbox_tested_only`, never `passed` for live settlement.
- Sandbox USSD/voice success is `prepared_awaiting_provider_approval`, never live proof.
- The dashboard displays the source (`catalog` or `admin_review`) and all runtime notes.

## Runtime checks

| Module | Runtime check |
| --- | --- |
| Payments | Paystack key presence and `PAYSTACK_MODE`; webhook secret warning. |
| Notifications | SMS/email provider must not be `dev`. |
| USSD | Telecom/USSD switches, provider environment, service code and callback secret. |
| Voice | Telecom/voice switches, provider environment, voice number and callback secret. |
| AI | `AI_PROVIDER` must not be `dev` for production evidence. |
| Security | Production requires database SSL and `FRONTEND_URL`. |

## Overrides

`PATCH /api/admin/pilot/configurations/:configurationId/readiness/:moduleKey`

```json
{
  "testing_status": "passed",
  "integration_status": "sandbox_only",
  "pilot_readiness": "sandbox_tested_only",
  "evidence": ["Manual Paystack test-mode run recorded on 2026-11-17"],
  "notes": "Sandbox only. Live approval still outstanding."
}
```

Each override records `reviewed_by_user_id` and `reviewed_at` inside the configuration's
`readiness_overrides` JSONB.

## Launch recommendation logic

1. If any critical module is `not_implemented` or `blocked` → `NOT_READY`.
2. Else if every critical module is `passed` or `ready_for_controlled_pilot` →
   `CONTROLLED_PILOT_READY`.
3. Otherwise → `INTERNAL_TESTING_READY`.

The report never returns `EXPANSION READY`; that requires a separate post-pilot decision.
