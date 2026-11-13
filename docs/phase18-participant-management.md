# Phase 18 — Pilot participant management

## Data model

Table: `pilot_participants`.

- `pilot_configuration_id` — configuration the participant belongs to.
- `user_id` — existing AgroConnect user. A user can participate once per configuration.
- `participant_type` — `farmer`, `buyer`, `cooperative`, `cooperative_agent`,
  `transporter`, `administrator`.
- `status` — `invited`, `pending_consent`, `approved`, `active`, `suspended`, `removed`.
- `consent_given_at`, `consent_version` — recorded consent evidence.
- `approved_by_user_id`, `approved_at` — administrator approval evidence.
- `notes` — operational notes.

A unique index prevents duplicate participation for the same user and configuration.

## Consent rules

- A participant cannot be `approved` or `active` without `consent_given_at`.
- Adding a participant with `consent_confirmed: false` and an approval status results in
  `pending_consent`.
- Recording consent sets `consent_given_at` and the consent version (default
  `pilot-consent-v1`).
- Revoking consent clears the consent timestamp and moves an approved/active participant
  to `pending_consent`.
- Consent text and the legal basis must be reviewed before real field use. The code records
  the version; it does not replace a signed consent form where local law requires one.

## API

Administrator routes:

| Method | Path |
| --- | --- |
| `GET` | `/api/admin/pilot/configurations/:configurationId/participants` |
| `POST` | `/api/admin/pilot/configurations/:configurationId/participants` |
| `PATCH` | `/api/admin/pilot/configurations/:configurationId/participants/:participantId` |

Participant routes:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/pilot/me` | Active configuration and this user's participant record. |
| `POST` | `/api/pilot/feedback` | Submit feedback (approved/active only). |
| `GET` | `/api/pilot/feedback` | List own feedback. |
| `GET` | `/api/pilot/feedback/:feedbackId` | Read own feedback. |

### Add a participant

```http
POST /api/admin/pilot/configurations/<configurationId>/participants
Authorization: Bearer <admin access token>
Content-Type: application/json

{
  "user_id": "<user uuid>",
  "participant_type": "farmer",
  "status": "approved",
  "consent_confirmed": true,
  "consent_version": "pilot-consent-v1"
}
```

### Status transitions

| Action | Allowed next status | Consent required |
| --- | --- | --- |
| Invite | `invited` | No |
| Record consent | `approved` | Yes |
| Activate | `active` | Yes |
| Suspend | `suspended` | Not required |
| Remove | `removed` | Not required |

Suspended and removed participants lose feedback submission access immediately because
only `approved` and `active` participants pass the participation check.

## Privacy

- Participant lists are administrator-only.
- A participant can read only their own feedback.
- User IDs are UUIDs; do not add unnecessary personal data to `notes`.
- Do not include phone numbers, bank details or identity documents in participant notes.
