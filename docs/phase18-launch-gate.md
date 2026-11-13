# Phase 18 — Launch gate

## Decision vocabulary

| Gate | Meaning |
| --- | --- |
| `NOT READY` | Critical implementation, test execution, security, legal or provider requirements are unmet. |
| `INTERNAL TESTING READY` | Critical modules are implemented and can be exercised internally, but evidence review is incomplete. |
| `CONTROLLED PILOT READY` | Every critical module has passing evidence or explicit controlled-pilot approval, and operational prerequisites are met. |
| `EXPANSION READY` | Post-pilot review approves expansion. This is never set automatically. |

## Current decision

**INTERNAL TESTING READY** for internal test execution. **NOT READY** for a controlled
external pilot or live traffic.

Reasons:

- The database integration suite has not been executed in the current environment.
- Live Paystack settlement/marketplace approval is outstanding.
- No live USSD short code or voice number has been approved.
- Real-device field testing and legal/consent review are outstanding.
- Operational support staffing is not evidenced.

The implementation is complete enough for internal test execution. That is not the same as
being ready for a controlled external pilot.

## Requirements by gate

### Internal testing ready

- Backend and frontend static checks pass.
- Phase 18 migration and models are present.
- An isolated test database is reachable.
- The Phase 18 integration suite has been executed and results recorded.
- No critical module is `not_implemented` or `blocked`.
- Readiness overrides are not used to hide failures.

### Controlled pilot ready

All internal testing requirements, plus:

- Every critical readiness module is `passed` or `ready_for_controlled_pilot` with evidence.
- Payment provider approval and settlement process are confirmed.
- USSD/voice provider approval and callback security are confirmed, or those channels are
  explicitly excluded from the pilot scope.
- Legal/consent review is complete.
- Participant onboarding and support staffing are in place.
- Incident, pause and stop procedures are agreed.
- Data protection and retention arrangements are documented.
- A pilot lead has signed the evidence register.

### Expansion ready

All controlled pilot requirements, plus:

- Pilot success metrics have been reviewed against agreed targets.
- Critical feedback and complaints have been resolved or accepted with mitigation.
- No unresolved critical security or safeguarding issue remains.
- Provider capacity and support can handle expansion.
- A separate expansion decision is recorded by the pilot lead and technical lead.

## Sign-off

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Pilot lead |  |  |  |
| Technical lead |  |  |  |
| Safeguarding lead |  |  |  |
| Operations/support lead |  |  |  |

A signature is only valid after the evidence register has been reviewed. Do not pre-sign or
backdate a gate decision.
