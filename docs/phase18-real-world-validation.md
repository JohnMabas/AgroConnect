# Phase 18 — Real-world validation

## Principle

Real-world validation means observing real participants using the system under realistic
conditions and recording what happened. It does not mean inventing success stories,
seeding fake users, or treating a sandbox callback as live integration.

## Validation scenarios

| Scenario | Evidence required |
| --- | --- |
| Farmer registers and completes a profile | User ID, timestamp, profile state, any support contact. |
| Farmer publishes a real listing | Listing ID, quantity, price, publish timestamp. |
| Buyer finds a listing and makes an offer | Offer ID, listing ID, buyer/seller references. |
| Offer accepted and order created | Order ID, reservation state, notification record. |
| Test-mode payment completes | Payment reference, verification result, explicit test-mode label. |
| Delivery or pickup completes | Order state, delivery record, participant confirmation. |
| USSD listing flow completes | Session ID, event `farmer_sell_confirm`, `END` response, created listing ID. |
| Voice market-price flow completes | Call session ID, menu path, language. |
| Farmer protection complaint is filed | Complaint ID, category, triage state. |
| Pilot feedback is submitted and resolved | Feedback number, status history, resolution note. |

## Acceptance targets

These are targets to review, not claims about current results. Record actual values.

- A participant can complete registration without administrator intervention.
- A farmer can publish a listing on a realistic connection.
- A buyer can make an offer and the farmer can respond.
- Order and reservation states are consistent after payment and expiry.
- Test-mode payment confirmation is verified server-side, not trusted from the client.
- USSD and voice flows are labelled as sandbox until provider approval.
- Critical feedback is acknowledged within the agreed support window.
- No participant data is exposed to another participant.

## Evidence review

For each scenario:

1. Attach the identifier and timestamp.
2. State whether the environment was local, Render, test-mode or live.
3. State whether the provider was mocked, sandbox or live.
4. Record the observed result, including failures.
5. Link the evidence to the readiness module it supports.
6. Have a second administrator review critical evidence.

## What does not count as validation

- Unit tests alone.
- Mocked providers presented as live integrations.
- A developer-created test account presented as a farmer.
- Screenshots without identifiers or timestamps.
- A successful sandbox callback presented as carrier approval.
- A test-mode payment presented as proof of settlement.

## Post-validation decision

After the controlled pilot, review metrics, incidents, feedback, unresolved risks and
provider approvals. Only then decide whether to expand, continue, pause or stop. Expansion
is not automatic.
