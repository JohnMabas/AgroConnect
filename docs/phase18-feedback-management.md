# Phase 18 — Pilot feedback management

## Data model

Table: `pilot_feedback`.

| Field | Notes |
| --- | --- |
| `feedback_number` | Human-readable unique reference, e.g. `PF-20261117-1A2B3C4D`. |
| `pilot_configuration_id` | Active pilot when the feedback was submitted. |
| `user_id` | Submitting participant. |
| `participant_type` | Snapshot of the participant type. |
| `category` | See categories below. |
| `description` | Participant's own words. |
| `severity` | `low`, `normal`, `high`, `critical`. |
| `status` | `new`, `acknowledged`, `under_review`, `in_progress`, `resolved`, `closed`. |
| `assigned_admin_user_id` | Optional triage owner. |
| `resolution_notes` | Administrator notes. |
| `related_complaint_id` | Optional link to a Phase 16 farmer complaint. |
| `resolved_at` | Set when status becomes resolved or closed. |

## Categories

`registration`, `listing`, `finding_buyers`, `communication`, `payment`, `delivery`,
`ussd`, `voice`, `agent_misconduct`, `general`.

## Access rules

- Feedback can only be submitted by an `approved` or `active` participant in the active
  pilot.
- A participant can list and read only their own feedback.
- Administrators can list all feedback, filter it, assign it and update its status.
- Feedback is not a replacement for the formal farmer-protection complaint process.
  Financial fraud, coercion, threats and misconduct should be escalated to Phase 16
  complaints and, where appropriate, the authorities.

## API

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/pilot/feedback` | Approved/active participant. |
| `GET` | `/api/pilot/feedback` | Own feedback. |
| `GET` | `/api/pilot/feedback/:feedbackId` | Own feedback. |
| `GET` | `/api/admin/pilot/feedback` | Administrator list with filters. |
| `GET` | `/api/admin/pilot/feedback/:feedbackId` | Administrator read. |
| `PATCH` | `/api/admin/pilot/feedback/:feedbackId` | Administrator triage. |

### Submit

```http
POST /api/pilot/feedback
Authorization: Bearer <participant access token>
Content-Type: application/json

{
  "category": "listing",
  "description": "Publishing failed once on a slow connection.",
  "severity": "high"
}
```

Description must be 10–10,000 characters.

### Triage

```http
PATCH /api/admin/pilot/feedback/<feedbackId>
Authorization: Bearer <admin access token>
Content-Type: application/json

{
  "status": "resolved",
  "assigned_admin_user_id": "<admin uuid>",
  "resolution_notes": "Followed up with the farmer; retry succeeded."
}
```

## Operating expectations

- Acknowledge critical feedback the same day during the pilot.
- Link payment or delivery failures to the relevant order or complaint where possible.
- Record resolution notes that another administrator can understand.
- Never close critical feedback without a resolution note.
- Use the metrics endpoint to monitor open critical feedback.
