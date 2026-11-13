# Phase 18 — Pilot configuration

## Data model

Table: `pilot_configurations`.

| Column | Notes |
| --- | --- |
| `id` | UUID primary key. |
| `name` | Human-readable pilot name. |
| `status` | `draft`, `active`, `paused`, `completed`, `archived`. |
| `country` | Defaults to `Nigeria`; kept as text for reuse. |
| `state_or_region` | Defaults to `Plateau`. |
| `start_date`, `end_date` | Optional `DATEONLY` window used by metrics. |
| `locations` | JSONB array of pilot communities/LGAs. |
| `produce_category_ids` | JSONB array of produce category UUIDs. |
| `readiness_overrides` | JSONB keyed by readiness module key. |
| `notes` | Operational notes. |
| `is_active` | Only one row may be `true`. |
| `created_by_user_id` | Admin who created the configuration. |

A partial unique index (`pilot_configurations_single_active_idx`) allows at most one
active configuration. The service also deactivates the previous active pilot inside a
transaction before activating another.

## API

Administrator only. All routes require a Bearer token with the `admin` role.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/pilot/configurations` | Paginated list. |
| `POST` | `/api/admin/pilot/configurations` | Create a configuration. |
| `GET` | `/api/admin/pilot/configurations/:configurationId` | Read one. |
| `PATCH` | `/api/admin/pilot/configurations/:configurationId` | Update or activate. |

Participants can read the active configuration at `GET /api/pilot/configuration` without
seeing admin-only fields.

### Create example

```http
POST /api/admin/pilot/configurations
Authorization: Bearer <admin access token>
Content-Type: application/json

{
  "name": "Plateau Controlled Pilot",
  "country": "Nigeria",
  "state_or_region": "Plateau",
  "locations": ["Jos North", "Bokkos", "Riyom"],
  "start_date": "2026-11-01",
  "end_date": "2027-01-31",
  "is_active": true
}
```

Validation rejects an end date before the start date and requires a name of at least three
characters.

## Reusing the pilot in another region

No schema change is needed. Create a new configuration with a different `country` and
`state_or_region`, set its `locations`, and activate it. Produce categories are optional
and can be used to narrow the pilot catalogue.

## Operational notes

- Keep the active window aligned with the real field-testing dates; metrics use it.
- Pausing a pilot does not delete participants or feedback.
- Archiving is a status change only; historical data remains queryable by administrators.
- Readiness overrides belong to a specific configuration, so a new pilot starts with a
  clean evidence state.
