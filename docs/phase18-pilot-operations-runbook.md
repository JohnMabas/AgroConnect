# Phase 18 — Pilot operations runbook

## Roles

- **Pilot lead** — owns the pilot window, staffing, evidence review and stop decision.
- **Administrator** — manages configurations, participants, feedback and readiness
  overrides.
- **Support agent** — receives participant issues, records feedback and escalates.
- **Technical lead** — owns deployment, database, provider configuration and incident
  response.
- **Safeguarding lead** — owns complaints involving fraud, coercion, threats or
  vulnerable participants.

## Start of day

1. Check `GET /api/health`.
2. Review new and critical pilot feedback.
3. Review new farmer-protection complaints.
4. Confirm the active pilot configuration and dates.
5. Confirm payment mode and telecom environment labels.
6. Check that support contacts are reachable.

## Participant onboarding

1. Create or identify the user account.
2. Add the participant to the active pilot with the correct type.
3. Record consent and version.
4. Approve and activate only after consent.
5. Explain test mode, USSD/voice limitations and how to get help.

## During the day

- Triage feedback by severity.
- Link payment/delivery feedback to the relevant order or complaint.
- Record resolution notes.
- Capture field evidence in the evidence register.
- Never edit readiness to `passed` without evidence.

## Incident response

### Payment issue

1. Do not retry or mark paid manually without verification.
2. Check the payment record and Paystack verification/webhook status.
3. Preserve the reference and error.
4. Escalate to the technical lead.
5. Record feedback or a complaint.

### USSD/voice issue

1. Confirm whether the environment is sandbox or live.
2. Capture the provider session ID.
3. Check callback authentication and session state.
4. Escalate to the technical lead.
5. Do not claim a carrier outage without provider evidence.

### Safeguarding issue

1. Follow the farmer-protection complaint process.
2. Preserve evidence.
3. Involve the safeguarding lead immediately.
4. Do not share participant identity unnecessarily.

## Pause or stop criteria

Pause or stop the pilot if:

- payment state is inconsistent or unverifiable;
- participant data is exposed;
- a critical security issue is found;
- a safeguarding incident requires it;
- the active configuration is wrong;
- support cannot be staffed.

Pausing is a configuration status change. Stopping requires a pilot lead decision and a
recorded reason.

## End of day

1. Review open critical feedback.
2. Review incidents and complaints.
3. Record the day's evidence.
4. Confirm the next day's staffing.
5. Report actual metrics, not estimates presented as facts.

## Data handling

- Keep exports minimal and access-controlled.
- Do not copy production secrets or provider credentials into documents.
- Do not store payment credentials.
- Follow the retention and deletion policy agreed for the pilot.
