# Phase 18 — Controlled pilot readiness

Phase 18 adds the operational layer for a controlled, evidence-based pilot. It does not
rebuild any Phase 1–17 marketplace feature. It adds:

- a pilot configuration with one active pilot at a time;
- participant invitation, consent and approval records;
- participant feedback intake and administrator triage;
- success metrics derived from real application data;
- a 20-module readiness catalogue with explicit evidence and runtime checks;
- an admin pilot dashboard at `/admin/pilot`;
- API routes under `/api/pilot` and `/api/admin/pilot`.

## Pilot region

The default pilot region is **Plateau State, Nigeria**. The configuration model stores
`country`, `state_or_region`, `locations`, `produce_category_ids` and start/end dates so
the same code can support another state or country without a schema change.

## Core rules

- A pilot is controlled, not public. Only approved participants can submit feedback.
- Participation requires a recorded consent timestamp and version.
- Only one pilot configuration may be active at a time. This is enforced by a partial
  unique index and by the service layer.
- Readiness status is evidence-based. The catalogue ships conservative defaults; an
  administrator may record an override only with evidence and notes.
- The dashboard never fabricates users, transactions, messages or test results.
- Test-mode Paystack success is labelled `sandbox_tested_only`; it is not proof of live
  settlement.
- Sandbox USSD/voice callbacks are labelled `prepared_awaiting_provider_approval`; they
  are not proof of live carrier integration.
- The admin API never returns provider secrets.
- Feedback is visible to its owner and to administrators. Other participants cannot read
  it.

## Launch gate vocabulary

The readiness report returns one of:

| Recommendation | Meaning |
| --- | --- |
| `NOT_READY` | At least one critical module is not implemented or is blocked. |
| `INTERNAL_TESTING_READY` | Critical modules are implemented, but not all have passing evidence. |
| `CONTROLLED_PILOT_READY` | Every critical module has passing evidence or an explicit controlled-pilot approval. |
| `EXPANSION READY` | Not produced automatically. Requires a separate expansion decision after the controlled pilot. |

`EXPANSION READY` is deliberately outside the automatic recommendation. Expansion needs a
post-pilot review of metrics, incidents, provider approvals and legal review.

## Current status

The code is implemented and static checks pass. The readiness report currently returns
**INTERNAL TESTING READY**: critical modules are implemented, but they do not all have
passing evidence. The database integration suite has not been executed successfully in the
current environment because the configured test PostgreSQL host times out. External
approvals for live USSD, voice and Paystack settlement are also outstanding. Therefore the
honest position is **INTERNAL TESTING READY**, not `CONTROLLED PILOT READY` and not
`NOT READY` for internal test execution.

## Related documents

- [Pilot configuration](./phase18-pilot-configuration.md)
- [Participant management](./phase18-participant-management.md)
- [Feedback management](./phase18-feedback-management.md)
- [Success metrics](./phase18-success-metrics.md)
- [Readiness catalogue](./phase18-readiness-catalog.md)
- [Field testing](./phase18-field-testing.md)
- [Real-world validation](./phase18-real-world-validation.md)
- [Operations runbook](./phase18-pilot-operations-runbook.md)
- [Evidence and test results](./phase18-evidence-and-test-results.md)
- [Launch gate](./phase18-launch-gate.md)
