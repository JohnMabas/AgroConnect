# Phase 18 — Pilot success metrics

## Endpoint

`GET /api/admin/pilot/configurations/:configurationId/metrics`

Administrator only. The response is derived from existing tables; no synthetic users or
transactions are inserted.

## Time window

Metrics use the configuration's `start_date` and `end_date` (inclusive UTC day boundaries).
If a date is absent, that side of the window is unbounded. The response reports the
effective window and the `Africa/Lagos` timezone label. Current-state counts (active
listings, active agents, participation) are not date-windowed.

## Definitions

### Farmers

| Metric | Source |
| --- | --- |
| `registered` | All `farmer_profiles` rows. |
| `verified` | Farmer profiles with `verification_status = 'verified'`. |
| `active` | Distinct farmers with a listing, offer or order created in the window. |
| `received_enquiries` | Distinct farmers receiving offers in the window. |
| `completed_transactions` | Distinct farmers with delivered/completed orders in the window. |
| `via_ussd` | Distinct USSD session users in the window. |
| `via_voice` | Distinct voice session users in the window. |

### Buyers

| Metric | Source |
| --- | --- |
| `registered` | Users with the `buyer` role. |
| `active` | Distinct buyers creating a buyer request, offer or order in the window. |
| `requests_created` | Buyer requests created in the window. |
| `offers_made` | Offers created in the window. |
| `offers_accepted` | Offers with `status = 'accepted'` created in the window. |
| `completed_transactions` | Distinct buyers with delivered/completed orders in the window. |

### Marketplace

| Metric | Source |
| --- | --- |
| `active_listings` | Published listings with available quantity > 0 (current). |
| `available_quantity` | Sum of available quantity on published listings (current). |
| `total_offers` | Offers created in the window. |
| `accepted_offers` | Accepted offers created in the window. |
| `completed_orders` | Delivered/completed orders created in the window. |
| `paid_transaction_value` | Sum of paid delivered/completed order value in the window. |
| `average_order_value` | Paid transaction value / completed orders. |
| `order_completion_rate` | Completed orders / all orders created in the window. |
| `payment_success_rate` | Successful payments / (successful + failed + abandoned) in the window. |
| `reservation_expiry_rate` | Expired reservations / all reservations created in the window. |

### Accessibility

| Metric | Source |
| --- | --- |
| `ussd_sessions_started` | USSD sessions started in the window. |
| `ussd_sessions_completed` | USSD sessions with `status = 'completed'` in the window. |
| `ussd_listing_flow_started` | Distinct sessions with an event whose `menu_key` starts `farmer_sell` in the window. |
| `ussd_listing_flow_completed` | Distinct sessions with a `farmer_sell_confirm` event and `response_type = 'END'` in the window. |
| `ussd_listing_completion_rate` | Completed listing flows / started listing flows. |
| `voice_calls_completed` | Voice sessions with `status = 'completed'` in the window. |
| `registration_completion_rate` | Active users created / all users created in the window. |
| `support_requests` | Telecom support requests created in the window. |
| `pilot_feedback_received` | Pilot feedback created in the window. |

### Trust and safety

| Metric | Source |
| --- | --- |
| `active_cooperative_agents` | Agent profiles with `status = 'active'` (current). |
| `active_agent_relationships` | Farmer-agent relationships with `status = 'active'` (current). |
| `consent_revocations` | Consent records with `action = 'consent_revoked'` in the window. |
| `complaints_submitted` | Farmer complaints created in the window. |
| `complaints_resolved` | Complaints with `resolved_at` in the window and status resolved/dismissed. |
| `feedback_critical_open` | Critical feedback not resolved/closed in the window. |

### Participation

Counts of `invited`, `approved`, `active`, `suspended` and `removed` participants for the
configuration (current state).

## Interpretation rules

- Zero is a valid value, not an error.
- A small sample can produce a 100% or 0% rate; report the underlying counts.
- Do not compare test-mode payment volume with live volume.
- Do not describe sandbox USSD/voice sessions as live carrier usage.
- Record the observation date and configuration window with every reported metric.
