# Phase 18 — Field-testing support

## Purpose

Field testing validates real user journeys in Plateau State with real devices, real
networks and real participants. It does not replace automated tests and it does not prove
live payment or telecom integration.

## Preconditions

Do not begin field testing until:

1. Database integration tests have been executed against an isolated test database and
   their results recorded in [evidence and test results](./phase18-evidence-and-test-results.md).
2. An active pilot configuration exists with the real dates and locations.
3. Every participant has a recorded consent version.
4. Support contacts and escalation paths are staffed.
5. Test-mode Paystack is clearly communicated as test mode.
6. USSD/voice are described as sandbox unless a provider has approved a live short code or
   number.

## Device and network matrix

Record the actual device and network used; do not invent a matrix.

| Dimension | Examples |
| --- | --- |
| Device class | Android smartphone, feature phone, shared device |
| Network | 4G, 3G, 2G/EDGE, intermittent data |
| Channel | Web app, USSD, voice/IVR |
| User type | Farmer, buyer, cooperative agent, transporter |
| Language | English and reviewed local-language options only |

## Suggested field scripts

### Farmer listing and buyer response

1. Register or log in.
2. Complete farmer profile.
3. Create and publish a listing with a real quantity the farmer is willing to sell.
4. Receive an offer from a buyer.
5. Accept or reject the offer.
6. Observe order, reservation and notification behaviour.
7. Submit pilot feedback about anything confusing or broken.

### Buyer request and offer

1. Create a buyer request with a real need.
2. Review matching listings.
3. Make an offer.
4. Follow the order state.
5. Do not use real card data in test mode.

### USSD listing (sandbox only unless approved)

1. Dial the approved test code or use the provider simulator.
2. Start the sell flow.
3. Complete the listing.
4. Confirm the created listing appears in the web app.
5. Record the session reference and any failed step.

### Voice/IVR (sandbox only unless approved)

1. Call the approved test number or simulator.
2. Navigate with keypad input.
3. Complete a read-only flow such as market prices.
4. Record the call reference and language behaviour.

## Data capture

For every field session record:

- date, time and location;
- participant reference (not a phone number in public notes);
- channel and device/network;
- exact steps performed;
- expected and actual result;
- screenshots or session references where safe;
- whether payment was test mode;
- whether telecom was sandbox or live;
- feedback reference or incident reference.

## Safety and ethics

- Do not pressure farmers to list produce they do not have.
- Do not run real-money payments without explicit approval and informed consent.
- Do not record unnecessary personal data.
- Stop a session immediately if a participant is confused, distressed or exposed to risk.
- Escalate fraud, coercion or threats to the formal complaint process.

## Exit criteria

Field testing is complete only when the team has enough evidence to review every critical
readiness module, unresolved critical feedback is triaged, and the pilot lead has signed
off the evidence register. The launch gate remains separate.
