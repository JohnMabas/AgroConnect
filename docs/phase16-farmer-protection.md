# Phase 16 — Farmer protection and cooperative-only agents

Phase 16 adds explicit, revocable farmer consent for cooperative agents, approval-gated
actions, append-only audit trails, complaints with private evidence, transparent order
fees, and administrative oversight. Existing Phase 1–15 modules remain authoritative for
auth, payments, notifications, offers, orders, storage and Integrity AI.

## Core rules

- Agents belong to an approved cooperative. A cooperative administrator invites an agent,
  and an administrator verifies the profile before activation.
- An agent never gains access to a farmer's account implicitly. A farmer must grant a
  relationship and the specific permissions the agent may use.
- Sensitive actions require a farmer approval request. Nothing is applied until the farmer
  approves, and the result is written to the audit trail.
- Audit records (`agent_activity_logs`, `farmer_consent_records`,
  `complaint_investigations`) are append-only at the database layer.
- Payment destination changes are not supported by the approval workflow.

## Agent permissions

`view_farm_profile`, `manage_listings`, `respond_to_offers`, `coordinate_orders`,
`view_earnings`, `contact_buyers`, `share_market_info`.

## Approval action types

`listing_price_change`, `listing_quantity_change`, `listing_publish`,
`offer_acceptance`, `offer_rejection`, `order_cancellation`, `fee_disclosure`,
`payment_destination_change` (rejected as unsupported).

## API groups

| Group | Purpose |
| --- | --- |
| `POST /api/cooperatives/:id/agents/invite` | Invite an agent to an approved cooperative. |
| `GET /api/cooperatives/:id/agents/profiles` | List the cooperative's agent profiles. |
| `GET /api/cooperatives/:id/agents/:agentProfileId/verifications` | View verification history (owner/admin). |
| `GET /api/cooperatives/:id/relationships` | View farmer relationships for the cooperative. |
| `GET /api/cooperatives/:id/audit` | View the cooperative's append-only audit trail. |
| `GET /api/agents/me/relationships`, `POST /api/agents/relationships` | Agent relationship requests. |
| `GET /api/agents/me/approvals`, `POST /api/agents/approvals` | Agent approval requests. |
| `GET /api/agents/me/audit` | Agent-scoped audit trail. |
| `GET/POST /api/farmers/me/agent-relationships` | Farmer relationships. |
| `POST /api/farmers/me/agent-relationships/:relationshipId/consent` | Grant explicit consent and permissions. |
| `POST /api/farmers/me/agent-relationships/:relationshipId/revoke` | Revoke consent immediately. |
| `GET /api/farmers/me/consent-records` | Immutable consent history. |
| `GET /api/farmers/me/approvals` | Pending and historical approvals. |
| `POST /api/farmers/me/approvals/:approvalId/approve` | Approve and apply an action. |
| `POST /api/farmers/me/approvals/:approvalId/reject` | Reject without applying an action. |
| `GET /api/farmers/me/audit` | Farmer-scoped audit trail. |
| `POST/GET /api/farmers/me/complaints` | Submit and list complaints. |
| `GET /api/farmers/me/complaints/:complaintId` | Complaint detail, evidence and investigations. |
| `POST /api/farmers/me/complaints/:complaintId/evidence` | Upload private evidence (`document` field). |
| `GET /api/farmers/me/complaints/:complaintId/evidence/:evidenceId/download` | Download evidence with ownership checks. |
| `GET /api/orders/:id/fee-disclosures` | Transparent, farmer-approved order fees. |
| `GET /api/admin/farmer-protection/agents` | Admin agent review queue. |
| `POST /api/admin/farmer-protection/agents/:agentProfileId/verify` | Approve or reject an agent. |
| `POST /api/admin/farmer-protection/agents/:agentProfileId/suspend` | Suspend an agent and active relationships. |
| `GET /api/admin/farmer-protection/complaints` | Admin complaint queue. |
| `PATCH /api/admin/farmer-protection/complaints/:complaintId` | Update status, priority, assignment and resolution. |
| `POST /api/admin/farmer-protection/complaints/:complaintId/investigations` | Add an append-only investigation note. |
| `GET /api/admin/farmer-protection/audit` | Cross-entity audit review. |

Integrity AI remains available through the existing
`POST /api/admin/ai/integrity/assess/:userId` endpoint. Phase 16 adds risk categories
(`unauthorized_access`, `approval_bypass`, `price_manipulation`,
`quantity_manipulation`, `payment_destination_manipulation`, `consent_violation`,
`cooperative_misconduct`).

## Migration

`20261115000001-create-phase16-farmer-protection` creates ten tables, extends existing
cooperative and integrity enums, extends `agent_activity_logs`, and installs append-only
triggers. Added PostgreSQL enum values are intentionally retained on rollback because
removing them is unsafe.
