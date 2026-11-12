# AgroConnect — AI Agent Skills & Project Execution Guide

**Product Name:** AgroConnect  
**Primary Tagline:** Connecting Agriculture. Empowering Markets.  
**Secondary Tagline:** From Farm to Market, Connected.  
**Initial Pilot Location:** Plateau State, Nigeria  
**Product Direction:** A global agricultural marketplace and supply-chain coordination platform.

---

# 1. PROJECT OVERVIEW

## 1.1 What is AgroConnect?

AgroConnect is a digital agricultural marketplace and supply-chain coordination platform designed to connect farmers, buyers, cooperatives, transporters, and other agricultural stakeholders.

The platform aims to make agricultural trade more accessible, transparent, efficient, and reliable through technology.

AgroConnect will allow:

- Farmers to register and publish available agricultural produce.
- Buyers to discover farmers, compare produce, and find suppliers.
- Buyers to publish requests for agricultural products they need.
- Farmers and buyers to communicate and negotiate.
- Cooperatives to coordinate their members and aggregate produce.
- Transporters to offer transportation and delivery services.
- Administrators to manage verification, platform operations, reports, and disputes.
- Users to access relevant agricultural market information.

The first implementation will focus on connecting farmers with buyers in Plateau State, Nigeria.

However, the architecture must be designed with future expansion to other Nigerian states and international markets in mind.

## 1.2 Mission

Make agricultural trade more accessible, transparent, and efficient through technology.

## 1.3 Vision

Build a connected global agricultural ecosystem where farmers, buyers, cooperatives, transporters, and agricultural businesses can access better opportunities.

## 1.4 Core Promise

**Connect people, produce, and markets.**

## 1.5 Product Personality

AgroConnect should communicate:

- Trustworthiness
- Innovation
- Inclusiveness
- Accessibility
- Transparency
- Practicality
- Global ambition

## 1.6 Main Problems AgroConnect Intends to Solve

1. Farmers struggle to find reliable buyers for their produce.
2. Buyers struggle to discover reliable farmers and agricultural suppliers.
3. Agricultural trade often depends on disconnected communication channels.
4. Farmers and buyers may struggle to negotiate prices and quantities transparently.
5. Transportation and delivery coordination can be difficult.
6. Farmers may have limited access to useful market-price information.
7. Farmers without smartphones or reliable internet may be excluded from digital marketplaces.
8. Cooperatives may lack tools for coordinating members and aggregating produce.

AgroConnect should address these problems through practical, accessible, and trustworthy digital workflows.

---

# 2. IMPORTANT PRODUCT PRINCIPLES

Every feature and architectural decision must follow these principles.

### 2.1 Farmer Ownership

Farmers must retain ownership of their profiles, identities, produce listings, and agricultural records.

Cooperative agents may assist farmers but must not automatically receive unrestricted access to their accounts.

### 2.2 Accessibility and Inclusion

The platform must consider farmers who:

- Have smartphones.
- Use basic mobile phones.
- Have limited internet access.
- Have limited digital literacy.
- Prefer local languages.
- Need assistance from cooperative or community agents.

The product should progressively support web, mobile, USSD, voice/IVR, and agent-assisted workflows.

### 2.3 Transparency

Clearly communicate:

- Produce quantity.
- Measurement units.
- Location.
- Availability.
- Quality descriptions.
- Price.
- Currency.
- Transaction status.
- Delivery arrangements.

### 2.4 Trust

Verification must be based on evidence.

Never claim that a farmer, cooperative, product, or transporter has official government certification unless that certification has actually been established.

### 2.5 Global Readiness

Do not hardcode:

- Plateau State as the only location.
- Nigeria as the only country.
- NGN as the only currency.
- English as the only language.
- One measurement system.
- One produce category structure.

The initial pilot is local, but the product architecture should support future expansion.

### 2.6 User Control

Users must make important decisions themselves.

AI may provide recommendations, explanations, and assistance, but must not independently commit users to transactions.

---

# 3. INSTRUCTIONS FOR AI CODING AGENTS

This document is the primary project execution guide for every AI coding agent working on AgroConnect.

The agent must follow the instructions below.

## 3.1 Read Before Working

Before modifying the project, the agent MUST:

1. Read this entire `skills.md` file.
2. Read the root `README.md`.
3. Read relevant documentation inside `docs/`.
4. Inspect the existing project structure.
5. Inspect package manifests and dependencies.
6. Inspect existing frontend and backend implementations.
7. Inspect database configuration, migrations, and models.
8. Inspect existing tests.
9. Inspect deployment configuration.
10. Check the current Git branch and run `git status --short`.

The agent must understand the existing project before making changes.

## 3.2 Never Assume Features Exist

The agent must inspect the repository and classify functionality as:

- Implemented.
- Partially implemented.
- Scaffolded.
- Planned.
- Not implemented.

A folder, file, component, endpoint, or database model does not automatically mean the feature works.

## 3.3 Follow the Approved Development Phase

AgroConnect must be developed in clearly defined phases.

The agent must:

- Work only on the currently approved phase.
- Avoid implementing future phases prematurely.
- Avoid unnecessary dependencies.
- Avoid unrelated refactoring.
- Preserve existing user work.
- Ask before making risky or irreversible changes.
- Stop when the current phase is complete.
- Wait for explicit approval before beginning the next phase.

## 3.4 The Meaning of Continue

When the user says **continue**, the agent should continue the next unfinished task in the currently approved phase.

It must not automatically interpret "continue" as permission to begin another development phase.

## 3.5 No Fake Completion

The agent must never:

- Claim tests passed without running them.
- Claim an integration works without testing it.
- Claim a feature is complete when only its UI or backend scaffold exists.
- Claim the application is production-ready without evidence.
- Claim a provider integration works without end-to-end verification.
- Hide errors, failed tests, or incomplete work.

The agent must clearly report limitations and unfinished tasks.

---

# 4. DEVELOPMENT APPROVAL RULE

Every development phase must have:

1. A clearly defined goal.
2. Tasks to complete.
3. Non-goals describing what must not be implemented.
4. Expected deliverables.
5. Acceptance criteria.
6. Testing requirements.
7. An approval gate.

**IMPORTANT:** Completing one phase does not authorize the agent to start the next phase.

The agent must report the completed work and wait for the user's explicit approval.

## 2. Users, Roles, and Permissions

AgroConnect must support different types of users. Each user type has specific responsibilities and permissions.

### 2.1 Farmers

Farmers are the primary suppliers on the platform.

They should be able to:
- Register as individual farmers.
- Join an existing cooperative or apply to create one.
- Create and manage their farmer profile.
- Publish available agricultural produce.
- Set quantity, unit, location, availability date and expected price.
- Upload produce images where supported.
- Receive and respond to buyer messages.
- Review offers and negotiate with buyers.
- Accept or reject offers.
- Track orders and delivery progress.
- View their transaction history.
- Report problems and request support.

**Important:** Farmers must retain ownership and control of their profiles, produce information and harvest records, even when a cooperative agent assists them.

### 2.2 Buyers

Buyers include wholesalers, retailers, processors, restaurants and other organizations that purchase agricultural produce.

They should be able to:
- Register and manage buyer profiles.
- Discover available agricultural produce.
- Search and filter listings.
- View farmer and cooperative information.
- Contact farmers.
- Create purchase requests describing what they need.
- Send offers and counteroffers.
- Accept or reject offers.
- Track orders and delivery progress.
- Review completed transactions.
- Report problems.

### 2.3 Cooperatives

Cooperatives help farmers organize their activities and coordinate agricultural supply.

They should be able to:
- Apply for cooperative registration.
- Manage cooperative information.
- Request membership for farmers.
- Maintain a list of members.
- Coordinate member produce listings.
- Aggregate supply when farmers authorize it.
- Assist with market access.
- View cooperative-level activity and reports.

A cooperative must not automatically own the produce or personal records of its members.

### 2.4 Cooperative Agents

Agents help farmers who may not have smartphones, reliable internet access or the confidence to use digital platforms.

They should be able to:
- Register farmers with their permission.
- Help farmers publish produce listings.
- Assist with updating availability and quantities.
- Help farmers understand buyer offers.
- Support communication between farmers and buyers.
- Report problems to the cooperative or platform administrators.

Agents must have limited permissions. Their actions should be recorded so that farmers and administrators can understand who performed an action.

### 2.5 Transporters

Transporters provide transportation services for agricultural produce.

They should be able to:
- Register a transporter profile.
- Add available vehicles.
- Specify vehicle capacity and service areas.
- Set availability.
- Receive delivery requests.
- Submit transportation quotes.
- Accept or reject assignments.
- Update pickup and delivery statuses.
- Submit delivery evidence where required.

### 2.6 Administrators

Administrators manage platform operations and user trust.

They should be able to:
- Review registration and verification requests.
- Manage user accounts and roles.
- Review reported listings and accounts.
- Handle complaints and disputes.
- Monitor orders and platform activity.
- Manage produce categories and supported locations.
- Review audit logs.
- Suspend or restrict accounts when justified.

Administrative actions must be permission-controlled and auditable.

### 2.7 Future User Groups

The architecture should allow future support for:
- Agricultural processors.
- Retail chains.
- Restaurants and food businesses.
- Input suppliers.
- Agricultural organizations.
- Extension officers.
- Development organizations.

Do not build every future role in the initial pilot. Add roles when a real use case justifies them.

### 2.8 Permission Rules

- Users must only access information they are authorized to see.
- Farmers can manage their own profiles and listings.
- Buyers cannot modify another user's listings.
- Agents can only perform actions explicitly granted to them.
- Cooperative managers cannot access private farmer information without authorization.
- Transporters can access only delivery information needed for assigned jobs.
- Administrators must have defined permissions rather than unrestricted access by default.
- Authorization must be enforced by the backend, not only by frontend route protection.
- Test ownership and role permissions for every important operation.


## 3. Core Product Modules and Workflows

AgroConnect should be developed as a collection of connected modules within one modular application.

Do not build all modules at once. Follow the approved development phases.

### 3.1 Identity and Access Management

Responsibilities:
- User registration.
- Phone number verification.
- Login and logout.
- Session and token management.
- User profile management.
- Role-based access control.
- Account recovery and security.

The authentication system must securely manage OTP expiry, verification attempts, resend limits and session revocation.

### 3.2 Farmer and Cooperative Management

Responsibilities:
- Individual farmer registration.
- Cooperative registration and approval.
- Cooperative membership.
- Agent assignments.
- Farmer location and preferred language.
- Verification status.
- Duplicate account detection.

Farmer identity and harvest records must remain under farmer control.

### 3.3 Produce Listings and Inventory

Farmers must be able to publish produce they want to sell.

A produce listing should support relevant information such as:
- Produce category.
- Produce variety.
- Quantity available.
- Unit of measurement.
- Location.
- Collection point.
- Harvest or availability date.
- Quality description.
- Expected price.
- Currency.
- Images where supported.
- Listing status.

Possible listing statuses:

`DRAFT`, `AVAILABLE`, `PAUSED`, `PARTIALLY_RESERVED`, `SOLD`, `CLOSED`, `EXPIRED`.

The system must distinguish available quantity, reserved quantity and sold quantity.

### 3.4 Buyer Marketplace and Discovery

Buyers should be able to:
- Browse available produce.
- Search by produce name or category.
- Filter by location.
- Filter by quantity and unit.
- Compare available suppliers.
- Review listing details.
- Contact sellers.

Search results must use pagination and appropriate database indexes.

### 3.5 Buyer Demand Requests

Buyers should also be able to publish what they need.

Example:

A buyer needs 500 bags of potatoes in Jos within five days.

A buyer request should support:
- Produce and variety.
- Required quantity.
- Unit.
- Delivery or collection location.
- Required date.
- Optional target price.
- Additional requirements.
- Request status and expiry.

Farmers and cooperatives should be able to discover suitable requests and respond.

### 3.6 Conversations and Messaging

Messaging is a core AgroConnect feature.

The platform should allow buyers and farmers to communicate directly about produce listings and purchase requests.

Initial capabilities:
- Start a conversation from a listing or buyer request.
- Send and receive text messages.
- View conversation history.
- View unread message counts.
- Mark messages as read.
- Receive in-app notifications.
- Report inappropriate messages or users.

Security requirements:
- Only conversation participants can read or send messages.
- Authenticate users before allowing real-time connections.
- Verify conversation membership on every relevant operation.
- Store messages in the database before broadcasting them.
- Support message pagination.
- Protect against duplicate message submissions.
- Apply rate limits.
- Do not expose private contact information by default.
- Do not treat ordinary chat messages as confirmed offers or orders.
- Avoid logging private message content unnecessarily.

Start with a reliable REST API and polling if appropriate. Add Socket.IO or another real-time solution when the application requires it.

Future improvements may include:
- Image sharing.
- Voice messages.
- Language translation.
- SMS-assisted communication.
- USSD-assisted communication.
- AI-generated reply suggestions that users review before sending.

### 3.7 Offers and Negotiation

Offers must be structured records, not merely text messages.

An offer should contain:
- Listing reference.
- Buyer.
- Seller.
- Quantity.
- Unit.
- Unit price.
- Currency.
- Delivery terms.
- Expiry date.
- Optional notes.
- Offer status.

Supported actions:
- Create an offer.
- Accept an offer.
- Reject an offer.
- Submit a counteroffer.
- Expire an offer.
- View offer history.

An offer must not automatically become an order until the required acceptance and validation steps are completed.

### 3.8 Orders and Inventory Reservation

After an offer is accepted, AgroConnect can create an order.

The order module must support:
- Order creation.
- Order items.
- Agreed quantity and price.
- Buyer and seller references.
- Order status.
- Order history.
- Cancellation.
- Inventory reservation.
- Event history.

Important example:

A farmer lists 100 bags of potatoes. A buyer purchases 40 bags.

The system must reserve 40 bags and leave 60 available.

Inventory reservation must use database transactions and concurrency protection to prevent overselling.

### 3.9 Transport and Delivery Coordination

The transport module connects buyers, sellers and transporters.

It should support:
- Transporter profiles.
- Vehicle details.
- Vehicle capacity.
- Service areas.
- Availability.
- Delivery requests.
- Transportation quotes.
- Transporter assignment.
- Pickup status.
- In-transit status.
- Delivery status.
- Proof of delivery.
- Buyer confirmation.

Start with status-based delivery tracking. Do not implement live GPS tracking until there is a clear need and suitable infrastructure.

### 3.10 Notifications and Accessibility

Users should receive important updates about:
- New messages.
- New offers.
- Accepted or rejected offers.
- Order creation.
- Order status changes.
- Transport assignments.
- Delivery updates.
- Account verification.
- Disputes and support responses.

Start with in-app notifications.

Evaluate SMS, voice, IVR and USSD integrations based on actual provider availability, Nigerian coverage, pricing and reliability.

Critical workflows must not depend entirely on push notifications or reliable internet access.

### 3.11 Trust, Verification and Disputes

Responsibilities:
- User verification.
- Cooperative verification.
- Listing reports.
- Account reports.
- Complaint submission.
- Dispute management.
- Cancellation reasons.
- Administrative review.
- Audit history.

Never display an official verification claim unless the required verification process has actually been completed.

### 3.12 Market Prices and Analytics

AgroConnect may provide agricultural market information.

Price observations should record:
- Produce.
- Variety or grade where available.
- Quantity unit.
- Price.
- Currency.
- Market or location.
- Observation date.
- Source.
- Verification status.

Distinguish verified observations from user-submitted or estimated information.

Never invent market prices or present outdated observations as guaranteed current prices.

### 3.13 AI Assistance

AI should improve the platform without controlling important transactions.

Potential capabilities:
- Match buyers with suitable sellers.
- Help users search using natural language.
- Assist with produce listing descriptions.
- Summarize market-price observations.
- Support language translation.
- Assist with voice-based interaction.
- Provide logistics insights.

AI must not independently:
- Accept or reject offers.
- Change agreed prices.
- Reserve inventory.
- Create orders.
- Assign transporters.
- Resolve disputes.

Any consequential action must require explicit user confirmation.

The platform's essential marketplace features must continue working when AI services are unavailable.

## 4. Farmer-to-Buyer Transaction Workflow

The main AgroConnect workflow connects farmers who have produce with buyers who need agricultural products.

This workflow is central to the product and should guide the design of the database, API, frontend and testing strategy.

### 4.1 Example Scenario

A farmer in Plateau State has 100 bags of potatoes available.

A buyer in Abuja wants to purchase 60 bags.

AgroConnect should help both parties discover each other, communicate, negotiate, agree on a purchase, coordinate delivery and confirm completion.

### 4.2 Complete Workflow

**Step 1: Farmer registration**

The farmer registers on AgroConnect or receives assistance from an authorized cooperative agent.

The farmer completes the required profile information.

**Step 2: Farmer publishes produce**

The farmer creates a listing containing:
- Produce: Potatoes.
- Quantity: 100.
- Unit: Bags.
- Location: Plateau State.
- Availability: Ready for collection.
- Expected price: Set by the farmer.
- Additional quality and collection details.

**Step 3: Buyer discovers produce**

A buyer searches the marketplace for potatoes.

The buyer can filter by location, quantity and other relevant details.

**Step 4: Buyer starts a conversation**

The buyer opens the listing and starts a conversation with the farmer.

They discuss:
- Produce quality.
- Available quantity.
- Price.
- Collection location.
- Delivery arrangements.

**Step 5: Buyer submits an offer**

The buyer submits a structured offer to purchase 60 bags.

The farmer receives a notification.

**Step 6: Negotiation**

The farmer can accept, reject or counter the offer.

The system records each offer and its status.

**Step 7: Agreement**

The buyer and farmer reach an agreement.

The system validates the accepted offer and prepares the order.

**Step 8: Order creation and inventory reservation**

AgroConnect creates the order and reserves 60 bags.

The remaining available quantity is 40 bags.

The operation must be atomic so that another buyer cannot purchase the same reserved stock.

**Step 9: Transport coordination**

The buyer and farmer arrange collection or delivery.

They can request transportation quotes and select a suitable transporter.

**Step 10: Pickup and delivery**

The transporter updates the delivery status.

The system records relevant events and delivery evidence.

**Step 11: Completion**

The buyer confirms receipt, subject to the platform's defined completion rules.

The order is marked completed.

The platform retains an appropriate transaction history.

### 4.3 Transaction Lifecycle

Use explicit transaction states.

A simplified lifecycle is:

`PRODUCE_AVAILABLE → CONVERSATION → OFFER_RECEIVED → NEGOTIATION → AGREEMENT_CONFIRMED → ORDER_CREATED → TRANSPORT_ASSIGNED → IN_TRANSIT → DELIVERED → COMPLETED`

Possible exception states include:

`CANCELLED`, `DISPUTED`, `EXPIRED`.

Do not assume every transaction requires transportation through AgroConnect. Some buyers and sellers may arrange their own collection.

### 4.4 Important Business Rules

1. A conversation is not an offer.
2. An offer is not an order.
3. An order must only be created after the required agreement is confirmed.
4. A buyer cannot purchase more stock than is available.
5. Partial purchases must be supported.
6. Inventory reservation must be atomic.
7. Expired or cancelled reservations must be released according to defined rules.
8. Critical operations must be protected against duplicate submissions.
9. Every important order status change must be recorded.
10. Only authorized users can perform actions on a transaction.
11. Delivery evidence must be handled according to defined access rules.
12. Disputes must have a clear status and resolution process.

### 4.5 Example Order State Transitions

Do not allow arbitrary status changes.

For example:

- `PENDING` → `CONFIRMED`
- `PENDING` → `CANCELLED`
- `CONFIRMED` → `TRANSPORT_ASSIGNED`
- `TRANSPORT_ASSIGNED` → `IN_TRANSIT`
- `IN_TRANSIT` → `DELIVERED`
- `DELIVERED` → `COMPLETED`
- Eligible states → `DISPUTED`

The exact permitted transitions must be defined in the order service and tested.

### 4.6 Payment Is a Separate Concern

Do not claim that AgroConnect supports escrow, payment processing or automatic settlement unless a real payment provider has been integrated and tested.

Before implementing payments, define:
- Supported payment methods.
- Provider integration.
- Payment confirmation.
- Failed payment handling.
- Refund handling.
- Transaction reconciliation.
- Security requirements.
- Applicable legal and regulatory requirements.

Do not store sensitive payment credentials directly in the application.

### 4.7 Workflow Acceptance Criteria

The core workflow is not complete until:

- A farmer can publish produce.
- A buyer can discover the listing.
- The buyer can start a conversation.
- Both participants can exchange messages.
- The buyer can submit an offer.
- The farmer can respond to the offer.
- An accepted offer can create an order.
- Inventory is reserved correctly.
- Partial purchases work.
- Unauthorized users cannot access another user's transactions.
- Order status changes follow valid transitions.
- The transaction history is preserved.
- Relevant tests pass.

The workflow must be tested from beginning to end, not only as isolated API endpoints.

## 5. Technology Stack and System Architecture

AgroConnect should use a maintainable architecture that supports the initial Plateau State pilot and can grow as the platform expands.

### 5.1 Architecture Approach

Use a **modular monolith inside a monorepo**.

This means:
- The frontend and backend live in one repository.
- The backend is organized into independent business modules.
- Modules communicate through clearly defined services and interfaces.
- The application can be deployed as a small number of services.
- Shared code is placed in packages only when genuinely needed.

Do not begin with microservices.

A modular monolith is easier to develop, test, deploy and maintain during the early stages of AgroConnect.

Only consider separating services when real scale, reliability or team requirements justify it.

### 5.2 Frontend

Preferred technologies:
- Next.js with App Router.
- TypeScript.
- Tailwind CSS.
- Progressive Web App (PWA) capabilities where appropriate.

Frontend responsibilities:
- Public marketing website.
- Registration and login.
- Farmer dashboard.
- Buyer dashboard.
- Cooperative dashboard.
- Transporter dashboard.
- Administrator dashboard.
- Marketplace and search.
- Messaging interface.
- Offers and orders.
- Delivery tracking.
- Notifications.

Frontend requirements:
- Mobile-first responsive design.
- Reusable components.
- Clear loading, empty and error states.
- Accessible forms and navigation.
- Appropriate validation and feedback.
- Secure handling of authentication state.
- Role-aware navigation.
- No reliance on frontend-only authorization.

### 5.3 Backend

Preferred technologies:
- Node.js supported LTS version.
- Express.js.
- TypeScript.
- REST API.

The backend owns:
- Authentication.
- Authorization.
- Business rules.
- Data validation.
- Marketplace operations.
- Messaging permissions.
- Offer and order workflows.
- Inventory reservation.
- Delivery coordination.
- Notifications.
- Administrative operations.
- External service integrations.

Keep controllers thin. Business rules belong in services, and database access should follow consistent repository or data-access conventions.

### 5.4 Database

Use PostgreSQL as the primary relational database.

Responsibilities:
- User accounts and profiles.
- Roles and permissions.
- Farmer and cooperative records.
- Produce listings.
- Buyer requests.
- Conversations and messages.
- Offers and counteroffers.
- Orders and inventory.
- Transport and delivery records.
- Notifications.
- Verification and disputes.
- Market-price observations.
- Audit events.

Use:
- Database constraints.
- Foreign keys.
- Appropriate indexes.
- Transactions for critical operations.
- Migrations for schema changes.
- Consistent timestamps.
- Explicit units and currencies.

Consider PostGIS when geographic search requirements justify it.

Do not use automatic schema synchronization in production.

### 5.5 Redis and Background Jobs

Redis may be introduced when justified for:
- Caching.
- Rate limiting.
- Temporary verification data.
- Background job coordination.
- Queue processing.

BullMQ can be evaluated for:
- Notification delivery.
- Expiring offers.
- Reservation expiry.
- Scheduled cleanup.
- Other asynchronous tasks.

Do not introduce Redis merely because it is available. First identify the requirement it solves.

### 5.6 Authentication and Authorization

Use phone-number-based verification as the primary registration direction.

The implementation must support:
- Secure OTP generation and verification.
- OTP expiry.
- Attempt limits.
- Resend limits.
- Session or token lifecycle.
- Logout and revocation.
- Role-based permissions.
- Resource ownership checks.

Never trust a role or ownership value supplied only by the frontend.

### 5.7 File and Image Storage

When image or document uploads are introduced, use suitable object storage, such as an S3-compatible service.

Requirements:
- Validate file type and size.
- Use safe generated storage keys.
- Restrict upload permissions.
- Avoid exposing private documents publicly.
- Apply appropriate access controls.
- Do not store large uploaded files directly in PostgreSQL.

### 5.8 External Integrations

Keep third-party services behind adapters.

Potential integrations include:
- SMS providers.
- Voice and IVR providers.
- USSD providers.
- Maps and geolocation services.
- Payment providers.
- AI providers.
- Object storage.

Provider selection must consider:
- Nigerian coverage.
- Pricing.
- Reliability.
- Documentation.
- Security.
- Terms of service.
- Availability in the target deployment region.

Do not hard-code provider-specific logic throughout business modules.

### 5.9 API Documentation and Testing

Use OpenAPI/Swagger for API documentation.

Testing tools may include:
- Jest or Vitest.
- Supertest.
- Playwright.

Select compatible versions during project setup.

Testing must cover:
- Business logic.
- API validation.
- Authentication.
- Authorization.
- Database operations.
- Transaction workflows.
- Frontend interactions.
- Critical end-to-end user journeys.

### 5.10 Deployment

Aiven PostgreSQL is the approved database host. Render is the approved application hosting platform, using two separate Render Web Services: one for the backend and one for the frontend.

Do not use Railway, Neon, Supabase or Render PostgreSQL. Do not introduce Docker, Kubernetes or microservices.

The deployment setup must support:
- Separate development and production environments.
- Environment variables and secrets.
- PostgreSQL connectivity.
- Database migrations.
- Health checks.
- Application logs.
- Error monitoring.
- Backup and recovery procedures.

Do not commit production credentials, API keys, private certificates or `.env` files.

### 5.11 Technology Selection Rules

- Prefer stable, maintained technologies.
- Use supported Node.js LTS versions.
- Check compatibility before installing packages.
- Avoid unnecessary dependencies.
- Avoid microservices at the beginning.
- Avoid Kubernetes unless there is a justified operational need.
- Avoid vector databases until measured requirements justify them.
- Do not add infrastructure without explaining its purpose.
- Record important technical decisions in project documentation.

## 6. Repository Structure and Coding Conventions

AgroConnect should use a clean monorepo structure.

The structure below is the target architecture. Create directories gradually as the relevant development phases begin.

Do not create large numbers of empty folders just to match this example.

**Current approved structure:** the project uses separate `backend/` and `frontend/` applications at the repository root, as established in Phase 1. The `apps/` layout below is a future target only. Do not convert the project into a monorepo, npm workspace or shared-package setup unless the project owner explicitly approves it.

### 6.1 Target Repository Structure

```text
agroconnect/
├── skills.md
├── README.md
├── .gitignore
├── .editorconfig
├── .env.example
├── package.json
├── package-lock.json
├── tsconfig.base.json
│
├── apps/
│   ├── web/
│   │   ├── public/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (marketing)/
│   │       │   ├── (auth)/
│   │       │   ├── (dashboard)/
│   │       │   ├── farmer/
│   │       │   ├── buyer/
│   │       │   ├── cooperative/
│   │       │   ├── transporter/
│   │       │   └── admin/
│   │       ├── components/
│   │       ├── features/
│   │       ├── lib/
│   │       ├── hooks/
│   │       ├── styles/
│   │       └── types/
│   │
│   └── api/
│       ├── src/
│       │   ├── app.ts
│       │   ├── server.ts
│       │   ├── config/
│       │   ├── database/
│       │   │   ├── migrations/
│       │   │   ├── seeders/
│       │   │   └── connection.ts
│       │   ├── middleware/
│       │   ├── common/
│       │   ├── modules/
│       │   ├── integrations/
│       │   │   ├── sms/
│       │   │   ├── voice/
│       │   │   ├── ussd/
│       │   │   ├── maps/
│       │   │   ├── payments/
│       │   │   └── ai/
│       │   └── docs/
│       └── tests/
│
├── packages/
│   ├── contracts/
│   ├── config/
│   └── eslint-config/
│
├── docs/
│   ├── product/
│   ├── architecture/
│   ├── workflows/
│   ├── operations/
│   └── brand/
│
└── infrastructure/
    ├── railway/
    └── scripts/
```

### 6.2 Frontend Organization

Organize frontend code around features and reusable components.

Examples:
- Authentication components belong with authentication features.
- Marketplace components belong with marketplace features.
- Messaging components belong with messaging features.
- Shared buttons, inputs and layouts belong in reusable component directories.

Avoid putting the entire application inside one large component.

Avoid duplicating the same component or business logic across different dashboards.

### 6.3 Backend Module Organization

Backend modules should be organized by business responsibility.

Example:

```text
modules/
└── listings/
    ├── listings.routes.ts
    ├── listings.controller.ts
    ├── listings.service.ts
    ├── listings.repository.ts
    ├── listings.validation.ts
    ├── listings.types.ts
    └── listings.test.ts
```

Not every module must contain every file. Use the files that are useful for that module.

Responsibilities:

**Routes**
- Define API endpoints.
- Apply relevant middleware.
- Connect endpoints to controllers.

**Controllers**
- Receive HTTP requests.
- Extract validated input.
- Call services.
- Return appropriate responses.

**Services**
- Implement business rules.
- Coordinate operations.
- Enforce workflow rules.
- Manage transactions when required.

**Repositories**
- Handle database queries.
- Keep database access organized.
- Avoid placing business decisions inside database queries.

**Validation**
- Validate request bodies, query parameters and route parameters.
- Reject invalid or unexpected input.

**Types**
- Define relevant TypeScript types and interfaces.

**Tests**
- Test the module's expected behavior and failure cases.

### 6.4 Naming Conventions

Use consistent naming.

Examples:
- Files: `listings.service.ts`
- Classes: `ListingsService`
- Functions: `createListing`
- Variables: `availableQuantity`
- Constants: `MAX_OTP_ATTEMPTS`
- Database tables: choose one consistent naming convention.
- API routes: use predictable resource-based paths.

Avoid unclear abbreviations and inconsistent naming.

### 6.5 API Design

Use predictable REST endpoints.

Examples:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/verify-otp
POST   /api/v1/auth/login
POST   /api/v1/auth/logout

GET    /api/v1/listings
POST   /api/v1/listings
GET    /api/v1/listings/:id
PATCH  /api/v1/listings/:id

GET    /api/v1/conversations
POST   /api/v1/conversations
GET    /api/v1/conversations/:id/messages
POST   /api/v1/conversations/:id/messages

POST   /api/v1/offers
POST   /api/v1/offers/:id/accept
POST   /api/v1/offers/:id/reject
POST   /api/v1/offers/:id/counter

GET    /api/v1/orders
GET    /api/v1/orders/:id
```

These are illustrative routes. Final endpoint names and request/response contracts should be documented before implementation.

### 6.6 API Response Consistency

Use a consistent response format.

Example success response:

```json
{
  "success": true,
  "message": "Listing created successfully",
  "data": {
    "id": "listing-id"
  }
}
```

Example error response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "quantity",
      "message": "Quantity must be greater than zero"
    }
  ]
}
```

Do not expose internal stack traces, database credentials or sensitive implementation details in production responses.

### 6.7 Environment Configuration

Use environment variables for configuration.

Maintain an `.env.example` containing placeholder values and descriptions.

Examples of configuration categories:
- Application environment.
- API port.
- Database connection.
- Authentication secrets.
- OTP provider credentials.
- Object storage credentials.
- Redis connection.
- External service keys.

Never commit real credentials.

Validate required environment variables during application startup and fail clearly when critical configuration is missing.

## 7. Security, Privacy, Accessibility, and Quality Standards

Security, privacy and reliability must be considered throughout AgroConnect development, not added only before deployment.

### 7.1 Authentication Security

- Never store passwords in plain text if password authentication is introduced.
- Use an established password-hashing algorithm.
- Generate OTPs securely.
- Store OTP verification data safely.
- Set OTP expiry.
- Limit verification attempts.
- Limit resend requests.
- Prevent brute-force attempts.
- Use secure session or token handling.
- Support logout and session revocation.
- Never expose authentication secrets to the frontend.

### 7.2 Authorization

Every protected backend operation must check authorization.

Examples:
- A farmer can edit only their own listing.
- A buyer cannot change a seller's profile.
- A transporter cannot update an unrelated delivery.
- A cooperative agent cannot access every farmer account.
- A conversation cannot be read by someone who is not a participant.
- An administrator must have the permissions required for the action.

Do not rely on hidden frontend buttons as a security mechanism.

### 7.3 Input Validation

Validate all incoming data on the backend.

Examples:
- Phone numbers.
- Quantities.
- Units.
- Prices.
- Currency codes.
- Dates.
- Listing identifiers.
- Order identifiers.
- Message content.
- Uploaded files.

Reject invalid input before it reaches business logic or database operations.

Do not trust values simply because they came from the frontend.

### 7.4 Database Security and Integrity

- Use parameterized queries or safe ORM query methods.
- Apply database constraints.
- Use foreign keys where appropriate.
- Use transactions for critical operations.
- Protect against duplicate submissions.
- Prevent inventory overselling.
- Use migrations for schema changes.
- Avoid production schema synchronization.
- Restrict database access.
- Back up important data.
- Test recovery procedures.

### 7.5 Privacy

Collect only information necessary for the platform's operations.

Requirements:
- Protect phone numbers and personal details.
- Do not expose private contact information by default.
- Restrict access to private conversations.
- Protect identity and verification documents.
- Avoid logging OTPs, passwords, tokens or private message bodies.
- Define appropriate data retention policies.
- Provide clear account and data management processes.
- Review third-party data sharing.
- Consider applicable privacy and data-protection obligations before the pilot.

Do not claim legal or regulatory compliance without an appropriate review.

### 7.6 Transaction Integrity

Marketplace transactions require additional protection.

- Validate quantities on the backend.
- Validate prices and currency.
- Verify listing ownership.
- Check inventory before reservation.
- Use atomic database transactions.
- Prevent duplicate order creation.
- Validate every state transition.
- Record important transaction events.
- Handle cancellation and reservation expiry.
- Ensure failed operations do not leave inconsistent inventory.

### 7.7 Messaging Safety

- Authenticate every messaging request.
- Verify conversation membership.
- Validate message length and content.
- Apply rate limits.
- Prevent unauthorized message access.
- Provide a reporting mechanism.
- Avoid exposing private contact information.
- Keep offers and orders as separate structured records.
- Define how reported or abusive content is handled.

### 7.8 External Service Security

- Keep API keys on the backend.
- Use environment variables or an appropriate secrets manager.
- Apply timeouts.
- Handle provider failures.
- Avoid leaking credentials in error messages.
- Validate provider callbacks and webhooks.
- Verify webhook signatures when supported.
- Record integration failures without exposing secrets.

### 7.9 Frontend Accessibility

AgroConnect must be usable by people with different devices and levels of digital experience.

Requirements:
- Mobile-first layouts.
- Readable text.
- Clear labels.
- Keyboard navigation.
- Visible focus states.
- Accessible contrast.
- Screen-reader-friendly forms.
- Clear error messages.
- Large, understandable touch targets.
- Avoid relying on color alone to communicate status.
- Use plain language where possible.

### 7.10 Low-Connectivity Support

Design for users who may have:
- Slow internet.
- Intermittent connectivity.
- Low-end smartphones.
- Limited data.
- Limited digital literacy.

Consider:
- Lightweight pages.
- Compressed images.
- Clear retry behavior.
- Draft preservation where appropriate.
- Offline-friendly browsing where feasible.
- USSD and voice access.
- Cooperative agent assistance.

Do not claim offline functionality until it has been implemented and tested.

### 7.11 Internationalization

Avoid hard-coding one location or currency into core business logic.

Design for configurable:
- Countries.
- Regions.
- Languages.
- Currencies.
- Measurement units.
- Produce categories.
- Date and number formats.

The initial pilot can use Plateau State and Nigerian configurations without preventing future expansion.

### 7.12 Logging and Monitoring

Use structured application logs.

Log relevant events such as:
- Application startup.
- Failed authentication attempts.
- Database connection failures.
- Important transaction events.
- External provider failures.
- Background job failures.
- Administrative actions.

Do not log:
- Passwords.
- OTP values.
- Access tokens.
- Database credentials.
- Private message bodies without a justified and reviewed need.

### 7.13 Testing and Code Quality

Every feature must include appropriate testing.

Test:
- Expected success cases.
- Invalid input.
- Unauthorized access.
- Missing resources.
- Database failures.
- Duplicate requests.
- Concurrency where relevant.
- External service failures.

Before marking work complete, run the relevant:
- Tests.
- Type checks.
- Linter.
- Build.
- Migration checks where applicable.

Never claim a test passed unless it was actually run and passed.

### 7.14 Definition of Done

A task is complete only when:
- The requested behavior is implemented.
- The implementation follows project conventions.
- Validation is present.
- Authorization is enforced.
- Relevant tests are added or updated.
- Relevant tests have been run.
- Type checks, lint and build have been checked where configured.
- Database changes use migrations.
- Documentation is updated.
- No secrets or unrelated files are introduced.
- Git changes have been reviewed.
- Limitations and incomplete work are reported.

A feature that is only scaffolded must not be described as fully implemented.



## 8. Development Roadmap and Phase Approval Rules

AgroConnect must be developed in controlled phases.

The AI coding agent must follow the roadmap in order unless the project owner explicitly approves a change.

Do not attempt to implement the entire platform in one task.

Every phase must define:
- Goal.
- Tasks.
- Non-goals.
- Deliverables.
- Acceptance criteria.
- Tests.
- Approval gate.

### 8.1 Phase Execution Rules

1. Read the complete `skills.md` before starting work.
2. Read the README and relevant project documentation.
3. Inspect the existing repository before changing anything.
4. Check the current Git branch and working tree.
5. Identify the currently approved phase.
6. Do not assume that a planned feature already exists.
7. Do not skip unfinished phases.
8. Do not overwrite existing user work without permission.
9. Implement changes in small, reviewable steps.
10. Test the implementation.
11. Review the final Git diff.
12. Report what was completed and what remains.
13. Wait for explicit approval before beginning the next phase.

When the user says **"continue"**, continue with the next unfinished task in the currently approved phase.

Do not interpret "continue" as automatic permission to start a new phase.

### 8.2 Phase 0 — Discovery and Project Audit

**Goal:** Understand the existing project before making changes.

Tasks:
- Read `skills.md`.
- Read the README.
- Inspect the repository structure.
- Inspect Git status and current branch.
- Review package manifests and dependencies.
- Inspect frontend and backend implementations.
- Inspect database configuration and migrations.
- Review existing tests.
- Review deployment configuration.
- Identify implemented, partially implemented and missing features.
- Identify conflicts and technical risks.

Non-goals:
- No refactoring.
- No package installation.
- No destructive commands.
- No feature implementation.
- No changes to existing files.

Deliverables:
- Repository health report.
- Implementation inventory.
- Architecture summary.
- Dependency summary.
- Git status summary.
- Risk list.
- Recommended Phase 1 checklist.

Acceptance criteria:
- The existing project is understood.
- Existing work is identified.
- Missing requirements are documented.
- Risks and conflicts are reported.

**Approval gate:** Stop and wait for explicit approval before Phase 1.

### 8.3 Phase 1 — Monorepo and Development Foundation

**Goal:** Establish a clean development environment.

Tasks:
- Set up the monorepo.
- Configure workspaces.
- Organize frontend and backend applications.
- Configure TypeScript.
- Configure linting and formatting.
- Create environment examples.
- Add appropriate Git ignore rules.
- Establish basic startup and health-check behavior.
- Document setup instructions.

Non-goals:
- No marketplace features.
- No authentication implementation.
- No complete database model.
- No unnecessary packages or empty directories.

Acceptance criteria:
- Clean dependency installation.
- Frontend starts successfully.
- Backend starts successfully.
- Development scripts work.
- Basic checks run.
- No secrets are committed.

### 8.4 Phase 2 — Database Foundation

**Goal:** Establish reliable PostgreSQL connectivity and migration practices.

Tasks:
- Configure database connection.
- Establish migration tooling.
- Create the initial user and role schema where appropriate.
- Add basic constraints and indexes.
- Add development-only seeders where useful.
- Test database connection success and failure.
- Document migration commands.

Non-goals:
- No complete future database schema.
- No production schema synchronization.
- No unnecessary database tables.

Acceptance criteria:
- Database connection works.
- Initial migrations run successfully.
- Rollback is tested where supported.
- Database errors are handled safely.
- Production credentials are not required in source code.

### 8.5 Phase 3 — Authentication and Authorization

**Goal:** Implement secure identity and access management.

Tasks:
- Registration.
- Phone OTP verification.
- Login and logout.
- Session or token lifecycle.
- OTP expiry and attempt limits.
- Role-based access control.
- Resource ownership checks.
- Authentication tests.

Non-goals:
- No hardcoded production OTPs.
- No frontend-only authorization.
- No self-assigned administrator privileges.
- No claims of successful SMS delivery without real integration testing.

Acceptance criteria:
- Users can authenticate.
- Invalid and expired OTPs are rejected.
- Rate limits work.
- Unauthorized roles are blocked.
- Cross-user resource access is prevented.

### 8.6 Phase 4 — Profiles, Farmers, Cooperatives and Agents

**Goal:** Support the primary agricultural user groups.

Tasks:
- User profiles.
- Individual farmer registration.
- Cooperative registration and approval.
- Cooperative membership.
- Agent assignments.
- Preferred language and community information.
- Verification status.
- Duplicate detection.
- Relevant frontend screens and tests.

Non-goals:
- No unrestricted agent access.
- No false official verification.
- No automatic transfer of farmer ownership to cooperatives.

Acceptance criteria:
- Farmers manage their own profiles.
- Cooperative membership works.
- Agent permissions are limited.
- Important ownership rules are tested.

### 8.7 Phase 5 — Produce Catalogue and Listings

**Goal:** Allow farmers to publish and manage agricultural produce.

Tasks:
- Produce categories.
- Varieties where relevant.
- Listing creation and editing.
- Quantity and unit.
- Location and collection point.
- Availability date.
- Quality description.
- Expected price and currency.
- Listing status.
- Search, filters and pagination.
- Ownership validation.
- Relevant tests.

Non-goals:
- No unsupported certification claims.
- No incorrect inventory reservation implementation.
- No unnecessary image-storage infrastructure.

Acceptance criteria:
- Farmers can create and manage listings.
- Buyers can discover and view listings.
- Validation works.
- Ownership checks pass.

### 8.8 Phase 6 — Buyer Requests and Marketplace Discovery

**Goal:** Allow buyers to publish demand and discover suitable sellers.

Tasks:
- Buyer request creation.
- Required produce and quantity.
- Unit and location.
- Required date.
- Optional target price.
- Request status and expiry.
- Search and filtering.
- Seller discovery.
- Relevant tests.

Acceptance criteria:
- Buyers can manage requests.
- Eligible sellers can discover requests.
- Expired requests are handled correctly.

### 8.9 Phase 7 — Farmer–Buyer Conversations

**Goal:** Implement secure communication between marketplace participants.

Tasks:
- Conversation creation.
- Listing-linked conversations.
- Request-linked conversations where appropriate.
- Message sending and retrieval.
- Message history.
- Read and unread status.
- In-app notifications.
- Participant authorization.
- Reporting and moderation basics.
- Relevant frontend screens and tests.

Acceptance criteria:
- Buyers and farmers can exchange messages.
- Only participants can access conversations.
- Message history is persisted.
- Pagination and unread status work.
- Duplicate submissions are handled.
- Messaging tests pass.

### 8.10 Phase 8 — Offers and Negotiation

**Goal:** Support structured buyer and seller negotiations.

Tasks:
- Offer creation.
- Offer acceptance.
- Offer rejection.
- Counteroffers.
- Offer expiry.
- Offer history.
- Ownership and availability validation.
- Notifications.
- Tests for valid and invalid transitions.

Acceptance criteria:
- Offers are stored as structured records.
- Negotiation history is preserved.
- Expired offers are handled.
- Offer rules are enforced.
- Offers do not reserve stock prematurely.

### 8.11 Phase 9 — Orders and Inventory Reservation

**Goal:** Convert accepted offers into reliable orders.

Tasks:
- Order and order-item models.
- Accepted-offer-to-order workflow.
- Atomic inventory reservation.
- Partial purchases.
- Reservation expiry and release.
- Idempotency.
- Order history.
- Cancellation rules.
- Concurrent transaction tests.

Acceptance criteria:
- Orders are created correctly.
- Inventory cannot be oversold in tested scenarios.
- Partial purchases work.
- Duplicate order creation is prevented.
- Valid state transitions are enforced.
- Transaction history is preserved.

### 8.12 Phase 10 — Transport and Delivery

**Goal:** Coordinate transportation and delivery.

Tasks:
- Transporter profiles.
- Vehicle details and capacity.
- Service areas and availability.
- Delivery requests.
- Transport quotes.
- Assignment.
- Pickup and delivery status.
- Proof of delivery.
- Buyer confirmation.
- Relevant notifications and tests.

Non-goals:
- No live GPS tracking unless separately approved.
- No false delivery verification.

Acceptance criteria:
- Transport quotes and assignments work.
- Delivery status changes are validated.
- Only authorized users can update assignments.
- Evidence access is restricted.

### 8.13 Phase 11 — Notifications and Accessibility

**Goal:** Improve communication and support users with limited connectivity.

Tasks:
- In-app notifications.
- Unread notification status.
- Notification preferences where appropriate.
- Evaluate SMS and OTP providers.
- Evaluate voice, IVR and USSD.
- Add provider adapters where approved.
- Add retry and failure handling.
- Improve language and accessibility support.
- Test notification behavior.

Non-goals:
- No claims of live provider integration without end-to-end testing.
- No critical workflow that depends only on push notifications.

Acceptance criteria:
- In-app notifications work.
- Failures are observable.
- External channels are tested before being described as active.
- Assisted workflows are documented.

### 8.14 Phase 12 — Trust, Verification and Disputes

**Goal:** Improve safety and accountability.

Tasks:
- Verification workflow.
- Administrative review.
- Listing and account reports.
- Complaint categories.
- Dispute submission.
- Evidence handling.
- Dispute status and resolution.
- Audit logs.
- Cancellation reasons.
- Administrative permissions and tests.

Acceptance criteria:
- Administrative actions are authorized and auditable.
- Users can report problems.
- Disputes follow a defined workflow.
- Private evidence is protected.

### 8.15 Phase 13 — Market Prices and Analytics

**Goal:** Provide useful, traceable agricultural market information.

Tasks:
- Market-price observation model.
- Produce and unit definitions.
- Currency handling.
- Market and location.
- Observation date.
- Source attribution.
- Verification status.
- Historical comparisons.
- Basic analytics.
- Data quality checks.

Acceptance criteria:
- Observations are dated and sourced.
- Units and currencies are comparable.
- Freshness and confidence are clear.
- Estimated values are not presented as verified prices.

### 8.16 Phase 14 — AI Assistance

**Goal:** Introduce AI capabilities where they provide measurable value.

Initial priority:
- Deterministic buyer–seller matching.
- Explainable matching criteria.
- Recommendations based on relevant produce, quantity, location, availability and other appropriate listing information.

Future capabilities:
- Natural-language marketplace search.
- Listing-description assistance.
- Language translation.
- Voice assistance.
- Market-price summaries.
- Image assistance.
- Logistics insights.

Rules:
- AI must not directly control transactions.
- Consequential actions require user confirmation.
- AI outputs must be validated.
- AI must use authorized application data.
- The core platform must work without AI.
- Protect private data.
- Measure recommendation quality and fairness.
- Provide safe fallback behavior when providers fail.

Acceptance criteria:
- AI features are optional.
- Outputs are validated and appropriately grounded.
- Users remain in control.
- Provider failures do not break essential marketplace workflows.

### 8.17 Phase 15 — Pilot Readiness and Deployment

**Goal:** Prepare AgroConnect for a controlled pilot.

Tasks:
- End-to-end testing.
- Production configuration.
- Environment separation.
- Database migrations.
- Render deployment for the frontend and backend, with Aiven PostgreSQL.
- Secure secrets management.
- Health checks.
- Logging and monitoring.
- Backup and recovery.
- Security review.
- Regression tests.
- Pilot user testing.
- Support and incident documentation.
- Rollback planning.

Acceptance criteria:
- Deployment is repeatable.
- Critical user journeys pass end-to-end tests.
- Database migration procedures are documented.
- Backup and recovery have been considered and tested.
- Known limitations are documented.
- The pilot is not described as ready until the required checks pass.

### 8.18 Phase 16 — Expansion and Continuous Improvement

**Goal:** Expand based on evidence from the pilot.

Potential work:
- Additional Nigerian states.
- Additional countries.
- More languages.
- Cooperative improvements.
- Additional logistics capabilities.
- Payment options after appropriate review.
- Advanced marketplace matching.
- Improved offline support.
- Additional integrations.
- Advanced analytics.

Expansion decisions must be based on:
- Pilot feedback.
- Measured user outcomes.
- Operational readiness.
- Support requirements.
- Technical reliability.
- Actual user demand.

Do not expand merely because a feature has been built.

### 8.18.1 Phase 17 — USSD, Voice/IVR, Rural Access and Localization

**Goal:** Let users without smartphones or reliable data access the existing marketplace
through USSD and Voice/IVR, and support localized messages.

Implemented:
- Africa's Talking USSD callback at `POST /api/ussd` (`/callback` alias) with guest,
  pending, farmer and buyer menus.
- Voice/IVR callback at `POST /api/voice` (`/incoming`, `/events`, `/callback` aliases)
  returning Voice XML.
- Registration through USSD with SMS OTP verification; no PIN, card or bank data.
- Produce listing, offers, orders, market prices, language and support flows that reuse
  the existing backend services.
- Idempotent webhook handling through `telecom_webhook_events`, plus USSD/voice session
  and event tables.
- Callback security: shared secret, optional IP allowlist, rate limiting, channel
  switches, session TTL and response-length limits.
- Localization APIs under `/api/localization` and `PATCH /api/users/my-language`, with
  English fallback for critical messages unless the language is reviewed.
- Admin telecom APIs under `/api/admin/telecom` for sessions, support requests, webhook
  events and safe configuration.

Rules:
- USSD and Voice are entry points only; all business logic stays in the existing modules.
- Never invent short codes, voice numbers, prices, quantities or availability.
- Keep channels disabled until the provider approves the short code/voice number.
- Critical payment, consent, approval and safety messages require reviewed translations.
- Do not collect payment credentials over USSD or Voice.

Documentation: `docs/phase17-telecom-localization.md`.
Tests: `backend/tests/phase17.test.ts`.

### 8.19 Standard Phase Completion Report

At the end of every phase, provide:

1. Phase number and name.
2. Phase goal.
3. Features and behavior implemented.
4. Files created or modified.
5. Database migrations added.
6. API endpoints created or changed.
7. Frontend screens or components added.
8. Commands executed.
9. Tests run and their results.
10. Lint, type-check and build results.
11. Security considerations.
12. Known limitations.
13. Deferred work.
14. Git status and diff summary.
15. Acceptance criteria results.
16. Request for approval before starting the next phase.

Never report incomplete work as complete.

### 8.20 Approval Rule

The project owner controls phase progression.

After completing a phase:
- Present the completion report.
- Explain any unfinished acceptance criteria.
- Identify risks and recommended next steps.
- Wait for explicit approval.

Do not start the next phase until approval is received.


## 9. AI Coding Agent Instructions

Any AI coding assistant working on AgroConnect must follow this section.

The AI agent is expected to behave like a careful software engineer working on a real product, not a code generator that makes uncontrolled changes.

### 9.1 Before Starting Any Task

Before writing or modifying code, the AI agent must:

1. Read the complete root `skills.md`.
2. Read the root `README.md`.
3. Read relevant documentation inside `docs/`.
4. Inspect the existing repository structure.
5. Inspect the current Git branch.
6. Run `git status --short`.
7. Review the existing package manifests and dependencies.
8. Inspect relevant frontend and backend implementations.
9. Review existing database models and migrations.
10. Review relevant tests.
11. Identify the currently approved development phase.
12. Understand existing coding conventions before introducing new ones.

Do not assume that a feature is missing simply because it is not mentioned in the current task.

Inspect the project first.

### 9.2 Respect Existing Work

The AI agent must:
- Preserve existing user work.
- Avoid unnecessary rewrites.
- Avoid deleting files without permission.
- Avoid replacing working implementations without a clear reason.
- Avoid changing unrelated modules.
- Avoid installing unnecessary dependencies.
- Avoid introducing duplicate implementations.
- Explain potentially destructive changes before performing them.

Never overwrite `.env` files or other sensitive configuration.

Never commit secrets.

### 9.3 Follow the Approved Development Phase

The AI agent must work only within the currently approved phase.

For example:

If AgroConnect is currently in Phase 3, the agent must not begin building the messaging system from Phase 7.

If a task depends on a future phase, explain the dependency and request approval rather than silently implementing future functionality.

The agent must distinguish between:
- Already implemented features.
- Partially implemented features.
- Planned features.
- Missing features.
- Features that are only scaffolded.

### 9.4 Plan Before Implementation

Before making significant changes, provide a short implementation plan containing:

- The problem being solved.
- The expected behavior.
- Files likely to be created or modified.
- Database changes, if required.
- API changes, if required.
- Frontend changes, if required.
- Dependencies, if any.
- Security considerations.
- Testing strategy.
- Potential risks.

Ask for clarification or approval when an important product decision is missing.

Do not invent business rules that affect users or transactions.

### 9.5 Implementation Standards

When writing code:
- Use TypeScript consistently where the project has adopted it.
- Follow existing project conventions.
- Keep functions focused.
- Use meaningful names.
- Avoid unnecessary complexity.
- Separate business logic from HTTP controllers.
- Validate inputs.
- Enforce authorization on the backend.
- Handle errors explicitly.
- Avoid duplicated business logic.
- Write maintainable code.
- Document complicated decisions.
- Add tests for important behavior.

Do not create large files containing unrelated responsibilities.

Do not use placeholder implementations and describe them as production-ready.

### 9.6 Dependency Management

Before adding a package:
1. Explain why it is needed.
2. Check whether an existing dependency already solves the problem.
3. Check compatibility with the current Node.js version.
4. Prefer maintained packages.
5. Avoid unnecessary dependencies.
6. Update the relevant package manifest and lockfile.
7. Verify installation and build behavior.

Do not change major dependency versions without a clear reason.

### 9.7 Database Change Rules

When modifying the database:
- Use migrations.
- Preserve existing data.
- Add appropriate constraints.
- Add indexes where useful.
- Consider rollback behavior.
- Avoid destructive migrations without explicit approval.
- Use transactions for operations that must succeed or fail together.
- Keep development seed data separate from production data.

Never use automatic production schema synchronization.

### 9.8 Testing Before Reporting Completion

After implementing a task, run the relevant checks.

Examples:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Only run commands that actually exist in the project. Inspect the available scripts first.

For database-related work, run relevant migration and database tests.

For API work, test both successful and unsuccessful requests.

For frontend work, test important interactions and responsive behavior.

For critical workflows, use end-to-end tests where practical.

If a test cannot be run, state why.

Never claim that tests passed when they were not executed.

### 9.9 Review Before Finishing

Before reporting completion:

1. Review changed files.
2. Inspect `git diff`.
3. Run `git status --short`.
4. Check for accidental file changes.
5. Check for exposed secrets.
6. Check for unfinished placeholders.
7. Check for unrelated modifications.
8. Confirm that documentation is updated.
9. Confirm that acceptance criteria are satisfied.

Do not automatically commit or push changes unless the user requests it.

### 9.10 Communication Rules

The AI agent must:
- Explain technical decisions clearly.
- Use simple language when teaching.
- Explain unfamiliar concepts.
- Provide commands that can be copied and executed.
- Avoid pretending that an integration is working.
- Report errors honestly.
- Identify incomplete work.
- Explain trade-offs.
- Ask only necessary questions.
- Stop when approval is required.

When the user asks for an explanation, teach the concept instead of only providing code.

When the user asks for implementation, implement the approved scope instead of giving only theoretical advice.

---

## 10. Testing Strategy and Quality Assurance

Testing must be part of every development phase.

AgroConnect must be reliable enough to handle real agricultural users, produce listings, negotiations and orders.

### 10.1 Unit Testing

Test individual functions and services.

Examples:
- OTP expiry calculations.
- Quantity validation.
- Price calculations.
- Listing status changes.
- Offer expiry.
- Inventory calculations.
- Permission checks.
- Order state transitions.

Unit tests should be fast and focused.

### 10.2 Integration Testing

Test how application modules work together.

Examples:
- Authentication with PostgreSQL.
- Farmer registration with profile creation.
- Listing creation with database persistence.
- Conversation creation with participant permissions.
- Offer acceptance with order creation.
- Order creation with inventory reservation.
- Delivery updates with order history.

Use an appropriate test database.

Do not run destructive tests against production data.

### 10.3 API Testing

Test:
- Successful requests.
- Invalid request bodies.
- Missing fields.
- Invalid identifiers.
- Unauthorized requests.
- Forbidden requests.
- Missing resources.
- Duplicate requests.
- Database failures.
- External provider failures.

Ensure that HTTP status codes and error responses are consistent.

### 10.4 Frontend Testing

Test:
- Registration and login.
- Navigation.
- Form validation.
- Marketplace search.
- Listing creation.
- Listing editing.
- Messaging.
- Offers.
- Orders.
- Responsive layouts.
- Loading states.
- Empty states.
- Error states.

Important interfaces should work on mobile devices and smaller screens.

### 10.5 End-to-End Testing

The most important end-to-end journey is:

1. A farmer registers.
2. The farmer creates a produce listing.
3. A buyer registers.
4. The buyer discovers the listing.
5. The buyer starts a conversation.
6. The farmer and buyer exchange messages.
7. The buyer submits an offer.
8. The farmer accepts or counters the offer.
9. An agreement is reached.
10. An order is created.
11. Inventory is reserved correctly.
12. Transportation is arranged when needed.
13. Delivery is recorded.
14. The buyer confirms receipt.
15. The transaction is completed.

This journey must be tested before claiming that the core marketplace is ready for a pilot.

### 10.6 Security Testing

Test for:
- Unauthorized access.
- Insecure direct object references (IDOR).
- Role escalation.
- OTP brute-force attempts.
- Invalid authentication.
- Cross-user data access.
- Unauthorized conversation access.
- Unauthorized order changes.
- Inventory manipulation.
- Malicious or invalid uploads.
- Unsafe webhook handling.

### 10.7 Performance Testing

As usage grows, evaluate:
- Database query performance.
- Marketplace search performance.
- Pagination.
- API response times.
- Concurrent inventory reservations.
- Messaging load.
- Background job processing.
- Image delivery performance.

Do not introduce complex infrastructure without measured evidence that it is needed.

### 10.8 Quality Gate

A feature must not be marked complete until:
- Its expected behavior works.
- Its failure cases are handled.
- Relevant tests pass.
- Authorization is verified.
- Data integrity is protected.
- Documentation is updated.
- Known limitations are reported.

---

## 11. Product Success Metrics

AgroConnect must measure whether it is solving real agricultural problems.

Do not measure success only through website visits or the number of registered accounts.

### 11.1 Farmer Metrics

Track:
- Number of registered farmers.
- Number of active farmers.
- Number of farmers publishing listings.
- Number of active produce listings.
- Percentage of listings that receive buyer interest.
- Time taken for farmers to find buyers.
- Number of completed farmer transactions.
- Repeat farmer activity.

### 11.2 Buyer Metrics

Track:
- Number of registered buyers.
- Number of active buyers.
- Number of buyer requests.
- Number of buyers discovering suitable suppliers.
- Number of buyer conversations.
- Number of submitted offers.
- Number of completed purchases.
- Repeat buyer activity.

### 11.3 Marketplace Metrics

Track:
- Active listings.
- Listing views.
- Buyer-to-seller conversations.
- Conversations that lead to offers.
- Offers accepted.
- Offers converted into orders.
- Completed orders.
- Average time from listing to first buyer contact.
- Average time from offer to agreement.
- Cancellation rate.

### 11.4 Logistics Metrics

Track:
- Delivery requests.
- Transport quotes.
- Successful transporter assignments.
- Completed deliveries.
- Failed deliveries.
- Average delivery time.
- Delivery disputes.
- Proof-of-delivery completion.

### 11.5 Accessibility Metrics

Track:
- Farmers using agent-assisted registration.
- Farmers using low-connectivity channels.
- Users successfully completing important tasks on mobile devices.
- USSD or voice workflow completion when those channels are implemented.
- User-reported accessibility problems.

### 11.6 Trust and Safety Metrics

Track:
- Verification requests.
- Verification completion time.
- Reported accounts.
- Reported listings.
- Disputes opened.
- Disputes resolved.
- Average dispute resolution time.
- Repeated cancellation or abuse patterns.

### 11.7 AI Metrics

When AI features are introduced, measure:
- Recommendation relevance.
- Recommendation-to-conversation rate.
- Recommendation-to-order conversion.
- User acceptance of AI suggestions.
- User corrections.
- Translation correction rate.
- Assistant completion rate.
- AI latency.
- AI errors.
- AI usage cost.
- Provider failure and fallback rate.
- Fairness across different locations and user groups.

### 11.8 Measuring Real Impact

The most important questions are:

- Are farmers finding more buyers?
- Are buyers finding suitable suppliers?
- Are users completing transactions successfully?
- Is it easier to coordinate agricultural trade?
- Are transportation arrangements improving?
- Are users returning to the platform?
- Can farmers with limited internet access participate?

Use pilot feedback and real usage data to decide what should be improved next.

Do not invent metrics or claim positive impact without evidence.

---

## 12. AgroConnect Brand Identity and User Experience

AgroConnect must have a recognizable and consistent identity.

The brand should communicate trust, agricultural opportunity, accessibility and technology.

### 12.1 Brand Name

**AgroConnect**

### 12.2 Primary Tagline

**Connecting Agriculture. Empowering Markets.**

### 12.3 Secondary Tagline

**From Farm to Market, Connected.**

### 12.4 Mission

Make agricultural trade more accessible, transparent and efficient through technology.

### 12.5 Vision

Build a connected global agricultural ecosystem where farmers and markets can access better opportunities.

### 12.6 Core Brand Promise

Connect people, produce and markets.

### 12.7 Brand Personality

AgroConnect should feel:
- Trustworthy.
- Innovative.
- Inclusive.
- Practical.
- Professional.
- Accessible.
- Global.

Avoid a brand identity that feels overly complicated, childish or difficult to understand.

### 12.8 Brand Colors

Use the following initial color palette consistently.

| Color | Hex | Intended use |
|---|---|---|
| Agro Green | `#176B45` | Primary brand color |
| Fresh Green | `#8BC34A` | Supporting agricultural color |
| Harvest Gold | `#E9A23B` | Accent and highlights |
| Deep Navy | `#18324B` | Text and strong contrast |
| Soft Background | `#F5F7F2` | Background surfaces |

Check text and interface contrast before using colors in production.

Do not communicate important statuses through color alone.

### 12.9 Typography

Preferred fonts:
- Manrope for headings.
- Inter for body text.

Typography should be readable on small screens.

Use consistent font sizes, weights, spacing and line heights.

### 12.10 Logo Direction

The logo should be distinctive and recognizable.

Preferred direction:
- An AgroConnect monogram based on the letter A.
- A subtle leaf or agricultural reference.
- A connection point or network element.
- A clean wordmark.
- A version suitable for an application icon.
- A version suitable for light and dark backgrounds.

Avoid copying existing agricultural brands.

### 12.11 Website Hero Section

Primary heading:

**Connecting Agriculture. Empowering Markets.**

Supporting description:

"Bringing farmers, buyers and transporters together to make agricultural trade simpler, smarter and more accessible."

Primary call to action:
- Get Started.

Secondary call to action:
- Explore Marketplace.

Only display calls to action that lead to real implemented functionality.

### 12.12 User Experience Principles

The interface must:
- Be mobile-first.
- Use clear navigation.
- Make important actions easy to find.
- Use plain language.
- Display quantities and measurement units clearly.
- Display prices and currencies clearly.
- Provide useful validation messages.
- Show loading and empty states.
- Show helpful error messages.
- Support accessible forms.
- Avoid unnecessary visual complexity.

Farmers should be able to publish produce without navigating a complicated process.

Buyers should be able to discover available produce without unnecessary steps.

### 12.13 Brand Communication

Describe AgroConnect honestly.

Use phrases such as:
- "We are building AgroConnect."
- "Our goal is to connect farmers and buyers."
- "The initial pilot focuses on Plateau State, Nigeria."
- "We are developing tools to improve agricultural trade."

Do not claim that features are live when they are still planned.

Do not claim that AgroConnect is already operating globally.

Do not claim that a domain, social media account or trademark is available until it has been checked and confirmed.

The illustrative domain `www.agroconnect.com` and social handle `@AgroConnect` must not be treated as verified active accounts.

---

## 13. Documentation Requirements

Documentation must evolve with the application.

The root `skills.md` is the main product and AI development instruction document.

The README should explain how developers can understand, install and run the project.

### 13.1 README.md

The README should contain:
- Project name.
- Project description.
- Mission and purpose.
- Main product capabilities.
- Technology stack.
- Repository structure.
- Prerequisites.
- Installation instructions.
- Environment setup.
- Development commands.
- Testing commands.
- Deployment overview.
- Contribution guidance.

Keep setup instructions accurate.

### 13.2 Product Documentation

Use `docs/product/` for:
- Product requirements.
- User personas.
- User stories.
- Functional requirements.
- Non-functional requirements.
- Product decisions.
- Pilot scope.

### 13.3 Architecture Documentation

Use `docs/architecture/` for:
- System architecture.
- Database design.
- API design.
- Authentication architecture.
- Authorization rules.
- Module boundaries.
- Integration decisions.
- Architecture decision records.

### 13.4 Workflow Documentation

Use `docs/workflows/` for:
- Farmer registration.
- Cooperative registration.
- Produce listing.
- Buyer discovery.
- Conversations.
- Offers and negotiation.
- Orders.
- Inventory reservation.
- Transport and delivery.
- Disputes.

### 13.5 Operations Documentation

Use `docs/operations/` for:
- Local setup.
- Environment configuration.
- Deployment.
- Database migrations.
- Backups.
- Recovery.
- Monitoring.
- Incident handling.
- Troubleshooting.

### 13.6 Brand Documentation

Use `docs/brand/` for:
- Logo guidelines.
- Color palette.
- Typography.
- Brand voice.
- Marketing copy.
- Interface design guidelines.

### 13.7 Keep Documentation Updated

Whenever a significant feature or technical decision changes:
- Update the relevant documentation.
- Update API documentation.
- Update setup instructions if necessary.
- Record important architectural decisions.
- Remove outdated instructions when appropriate.

Do not allow documentation to describe behavior that the application does not implement.

---

## 14. Final Product Rules and Non-Negotiable Principles

These rules apply to every development phase.

### 14.1 Farmer Ownership

Farmers must retain ownership and control of their profiles and harvest records.

Cooperative agents can assist but must not gain unrestricted control.

### 14.2 Transparency

Display clear information about:
- Produce quantities.
- Measurement units.
- Prices.
- Currency.
- Availability.
- Quality descriptions.
- Delivery arrangements.
- Verification status.

Do not misrepresent information.

### 14.3 User Choice

AgroConnect should connect agricultural participants and provide better market access.

Do not force users into one intermediary, transporter or transaction arrangement.

### 14.4 Trust and Accountability

Important activities must be traceable.

This includes:
- Verification decisions.
- Listing changes.
- Offer decisions.
- Order transitions.
- Inventory reservations.
- Transport assignments.
- Delivery updates.
- Administrative actions.

### 14.5 Global Architecture

The initial pilot is Plateau State, Nigeria.

However, avoid hard-coding:
- Plateau State.
- Nigeria.
- NGN.
- Nigerian phone-number formats.
- One language.
- One measurement system.

Use configurable country, region, currency, language and unit information.

Support the initial Nigerian requirements while keeping future expansion possible.

Do not claim that the platform is globally ready until international requirements have been implemented and tested.

### 14.6 AI Must Support Human Decisions

AI can provide information, suggestions and assistance.

AI must not independently make consequential commercial decisions.

Users remain responsible for confirming important actions.

### 14.7 Build in Phases

Do not build every feature at once.

Complete and validate each phase before moving forward.

### 14.8 No Fake Functionality

Never:
- Fake successful authentication.
- Fake payment confirmation.
- Fake SMS delivery.
- Fake verification.
- Fake delivery confirmation.
- Fake market prices.
- Fake AI results.
- Pretend an API is connected when it is not.
- Describe a scaffold as a completed feature.

Use clearly identified development mocks when necessary.

### 14.9 Protect User Data

Protect personal information, messages, account credentials and transaction records.

Never commit secrets or expose private data unnecessarily.

### 14.10 Maintainable Engineering

Choose simple solutions that can be understood, tested and maintained.

Avoid unnecessary complexity.

Do not introduce technology simply because it is popular.

---

## 15. First Task for Any New AI Coding Agent

When an AI coding agent first enters the AgroConnect repository, its first assignment is:

**PHASE 0 — DISCOVERY AND PROJECT AUDIT**

The agent must not immediately start implementing features.

### Required First Actions

1. Read the complete root `skills.md`.
2. Read `README.md`.
3. Inspect the repository structure.
4. Inspect the current Git branch.
5. Run `git status --short`.
6. Inspect the root and application package manifests.
7. Identify the frontend framework and implementation status.
8. Identify the backend framework and implementation status.
9. Inspect the database connection and migration setup.
10. Review existing authentication and authorization.
11. Review existing API endpoints.
12. Review existing frontend pages and components.
13. Review existing tests.
14. Review environment examples and deployment configuration.
15. Compare the current implementation with the AgroConnect roadmap.

### Required Discovery Report

The agent must report:

**1. Project overview**
- What currently exists.
- What technologies are being used.
- How the application is organized.

**2. Implementation inventory**
- Fully implemented features.
- Partially implemented features.
- Scaffolded features.
- Missing features.

**3. Architecture assessment**
- Frontend architecture.
- Backend architecture.
- Database architecture.
- API organization.
- External integrations.

**4. Git and repository health**
- Current branch.
- Working tree status.
- Existing uncommitted changes.
- Important repository issues.

**5. Risks and problems**
- Security problems.
- Architecture problems.
- Database problems.
- Missing tests.
- Configuration problems.
- Deployment problems.
- Technical debt.

**6. Missing decisions**
- Product questions.
- Technical questions.
- Business rules requiring clarification.

**7. Recommended next steps**
- Recommended Phase 1 checklist.
- Dependencies.
- Risks.
- Expected deliverables.
- Acceptance criteria.

### Phase 0 Restrictions

During the discovery phase, the agent must not:
- Modify files.
- Install packages.
- Refactor existing code.
- Delete files.
- Change database schemas.
- Change deployment settings.
- Begin Phase 1.
- Make destructive changes.

The agent must provide its discovery report and wait for explicit approval.

### Final Instruction

AgroConnect is intended to become a real agricultural marketplace and supply-chain coordination platform, beginning with a controlled pilot in Plateau State, Nigeria.

Build it carefully.

Prioritize real user problems, farmer ownership, buyer access, reliable communication, secure transactions, accessibility and maintainable engineering.

Do not rush to build every proposed feature.

Deliver working, tested functionality phase by phase.

**AgroConnect — Connecting Agriculture. Empowering Markets.**

**From Farm to Market, Connected.**

---

# 16. Phase 1 — Project Structure and Initial Setup

Phase 1 establishes the project foundation only. It does not include authentication, dashboards, marketplace features, database connections or infrastructure services.

## 16.1 Approved Structure

```text
AgroConnect/
├── backend/
├── frontend/
├── .gitignore
├── README.md
└── skills.md
```

The frontend and backend are separate applications. Do not introduce a monorepo, npm workspaces or shared packages unless a future phase is explicitly approved to do so.

## 16.2 Phase 1 Technology Decisions

Frontend:
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- ESLint
- `src/` directory
- npm

Backend:
- Node.js
- Express.js
- TypeScript
- dotenv
- npm

## 16.3 Phase 1 Backend Requirements

- Express application configuration lives in `backend/src/app.ts`.
- Server startup lives in `backend/src/server.ts`.
- `GET /api/health` must return a successful JSON health response.
- JSON request middleware must be enabled.
- Unknown routes must return a JSON `404` response.
- Errors must pass through centralized error-handling middleware.
- Configuration must come from environment variables with safe development defaults.

## 16.4 Phase 1 Restrictions

- Do not add PostgreSQL, Redis, Docker or other infrastructure dependencies.
- Do not implement authentication, registration, dashboards or marketplace functionality.
- Do not build future-phase features early.
- Do not commit real environment secrets.
- Preserve existing user work and inspect files before modifying them.

## 16.5 Coding Rules for Future AI Agents

Every AI agent working on AgroConnect must:

1. Read project documentation before changing code.
2. Work only on the approved development phase.
3. Use TypeScript.
4. Keep frontend and backend separate.
5. Validate inputs and permissions.
6. Write tests for implemented functionality.
7. Avoid unnecessary dependencies.
8. Never expose secrets.
9. Review changes before finishing.
10. Wait for approval before starting another phase.

## 16.6 Phase 1 Completion

Phase 1 is complete when:

- The frontend starts successfully on port 3000.
- The backend starts successfully on port 5000.
- `GET /api/health` responds successfully.
- Frontend and backend TypeScript checks pass.
- Lint commands pass.
- The frontend production build succeeds.
- Git status and changes have been reviewed.

Do not start Phase 2 until explicit approval is received.
---

# 17. Phase 2 — Database Foundation Conventions

Phase 2 establishes the PostgreSQL foundation. These conventions are now part of the project and must be followed in later phases.

## 17.1 Approved Infrastructure

- Database host: Aiven PostgreSQL only.
- Application host: Render, with separate backend and frontend Web Services.
- Do not use Railway, Neon, Supabase or Render PostgreSQL.
- Do not introduce Docker, Kubernetes, Redis or microservices.

## 17.2 Backend Database Structure

- Shared Sequelize instance: `backend/src/database/sequelize.ts`.
- Connection and TLS resolution: `backend/src/database/config.ts`.
- Connection health and shutdown helpers: `backend/src/database/connection.ts`.
- Models: `backend/src/database/models/`.
- Migrations: `backend/src/database/migrations/`.
- Seeders: `backend/src/database/seeders/`.
- Migration runner: Umzug via `backend/src/database/migrator.ts`.
- Seeder runner: Umzug via `backend/src/database/seeder.ts`.

Do not create a second Sequelize instance. Do not use `sequelize.sync()` for schema changes. Use migrations for every schema change.

## 17.3 Database and Security Rules

- Connect with `DATABASE_URL` by default. Individual `DB_*` variables are for local development only.
- Never hardcode or commit database credentials.
- Aiven connections must use TLS.
- Prefer certificate verification with the Aiven CA certificate via `DB_SSL_CA_PATH`.
- `DB_SSL_VERIFY` defaults to true. Never silently use `rejectUnauthorized: false`; disabling verification must be explicit and is not recommended for production.
- `sslmode=require` encrypts but does not provide the same verification as `verify-ca` or `verify-full`.
- Never log passwords, connection strings or certificate contents.
- Database health must be real. `/api/health` returns 200 only when the database is reachable, otherwise 503.
- The backend tests the database connection during startup and closes the pool during SIGINT/SIGTERM shutdown.

## 17.4 Phase 2 Schema

Only these tables exist in Phase 2:

- `users`
- `roles`
- `user_roles`

Users may register with a phone number only, an email address only, or both. At least one contact method is enforced by application validation and a database check constraint. Phone numbers are normalized to E.164; emails are trimmed and lowercased. Nullable contact columns are unique when present.

Initial roles: `farmer`, `buyer`, `cooperative`, `transporter`, `admin`. The role seeder is idempotent and must not create users or administrators.

## 17.5 Database Commands

```bash
npm run db:migrate
npm run db:migrate:undo
npm run db:migrate:undo:all
npm run db:migrate:status
npm run db:seed
npm run db:seed:undo
npm run db:seed:undo:all
npm run db:seed:status
```

These commands build the backend first and then execute the compiled runner.

## 17.6 Testing Rules

- Use an isolated PostgreSQL test database.
- `TEST_DATABASE_URL` is required and its database name must include `test`.
- Never run destructive tests against Aiven production data.
- Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` before reporting completion.
- Do not claim live Aiven or Render verification unless it was actually performed.

## 17.7 Phase 2 Non-Goals

Phase 2 does not include registration endpoints, OTP, login/logout, authentication, JWT/sessions, RBAC middleware, profiles, listings, buyer requests, messaging, offers, orders, inventory, transport, payments, Redis, AI or USSD/SMS/IVR workflows. Those belong to later approved phases.

Do not start Phase 3 until explicit approval is received.



# PART B: AGROCONNECT FRONTEND DEVELOPMENT SKILLS

# 1. ROLE AND RESPONSIBILITY

You are the Senior Frontend Engineer responsible for building the complete AgroConnect frontend.

Your responsibility is to transform the AgroConnect product vision and existing backend APIs into a modern, responsive, accessible, secure, and production-quality web application.

You must follow the existing backend architecture and integrate with its actual API endpoints.

You are not building a separate product. You are building the frontend of the existing AgroConnect platform.

## Core responsibilities

- Build a beautiful and professional user interface.
- Create responsive pages for desktop, tablet, and mobile.
- Integrate the frontend with the existing backend.
- Implement authentication and role-based experiences.
- Build marketplace, produce listings, buyer requests, messaging, offers, orders, payments, deliveries, notifications, analytics, and AI features.
- Use reusable components.
- Maintain clean and scalable code.
- Ensure that all buttons, forms, navigation links, and interactions work.
- Handle loading, success, empty, and error states properly.

# 2. PROJECT IDENTITY

## Product name

AgroConnect

## Main tagline

Connecting Agriculture. Empowering Markets.

## Secondary tagline

From Farm to Market, Connected.

## Product vision

AgroConnect is a global agricultural marketplace connecting farmers, buyers, cooperatives, transporters, and other agricultural participants.

The platform helps farmers find buyers, allows buyers to discover agricultural produce, supports direct communication and negotiation, facilitates transactions, and provides agricultural knowledge and market intelligence.

The frontend must communicate:

- Trust
- Simplicity
- Accessibility
- Transparency
- Professionalism
- Agricultural innovation
- Global opportunities

Do not make the platform look like an ordinary e-commerce template.

It should look like a modern global agritech platform.

# 3. FRONTEND TECHNOLOGY STACK

Use the following technologies:

- Next.js with App Router
- React
- TypeScript
- Tailwind CSS
- Lucide React icons
- React Hook Form for complex forms
- Zod for validation
- TanStack Query for server-state management where appropriate
- Recharts for analytics and charts where appropriate
- Socket.IO Client for real-time messaging and notifications
- Native Fetch API or a reusable API client for backend communication

Use the versions already installed in the project where possible.

Do not unnecessarily replace existing dependencies or upgrade packages.

Do not introduce another frontend framework.

# 4. BRAND IDENTITY AND DESIGN SYSTEM

Use the official AgroConnect color palette.

## Primary colors

- Agro Green: #176B45
- Fresh Green: #8BC34A
- Harvest Gold: #E9A23B
- Deep Navy: #18324B
- Soft Background: #F5F7F2
- White: #FFFFFF

## Typography

- Headings: Manrope
- Body text: Inter

Use Next.js font optimization where appropriate.

## Design direction

The interface must be:

- Clean and minimal.
- Modern and professional.
- Visually attractive without being overcrowded.
- Easy to navigate.
- Consistent across all pages.
- Mobile-first.
- Accessible.

Use generous whitespace, clear typography, subtle borders, soft shadows, rounded cards, and consistent spacing.

Avoid excessive gradients, unnecessary animations, oversized text, cluttered dashboards, and too many colors.

Use the green palette for primary actions and important agricultural elements.

Use harvest gold sparingly for highlights and important indicators.

Use subtle animations for hover states, transitions, dropdowns, and loading feedback.

Animations must not interfere with accessibility or performance.

# 5. IMPORTANT DEVELOPMENT RULES

1. Inspect the existing frontend before writing code.
2. Preserve the existing Next.js project structure.
3. Do not restart the project from scratch.
4. Do not delete completed work without a clear reason.
5. Do not modify the backend unnecessarily.
6. Follow the existing backend API contracts.
7. Never invent API endpoints or response structures.
8. If an API endpoint is missing, document it and report the backend dependency.
9. Use reusable components.
10. Use TypeScript throughout.
11. Avoid unnecessary packages.
12. Keep code modular and maintainable.
13. Do not hardcode fake user data into production functionality.
14. Do not use mock data when a working backend endpoint is available.
15. Do not expose secret keys or private environment variables.
16. Never trust frontend payment confirmation.
17. Implement real validation and error handling.
18. Test every major feature before declaring it complete.

# 6. FRONTEND PROJECT STRUCTURE

Organize the frontend cleanly.

Recommended structure:

frontend/
├── public/
│   ├── images/
│   ├── icons/
│   └── logos/
│
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── page.tsx
│   │   │   ├── about/
│   │   │   ├── how-it-works/
│   │   │   ├── marketplace/
│   │   │   └── contact/
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── verify/
│   │   │   └── forgot-password/
│   │   │
│   │   ├── dashboard/
│   │   ├── marketplace/
│   │   ├── listings/
│   │   ├── buyer-requests/
│   │   ├── messages/
│   │   ├── offers/
│   │   ├── orders/
│   │   ├── deliveries/
│   │   ├── notifications/
│   │   ├── market-intelligence/
│   │   ├── ai-assistant/
│   │   ├── profile/
│   │   ├── settings/
│   │   └── admin/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── navigation/
│   │   ├── forms/
│   │   ├── marketplace/
│   │   ├── listings/
│   │   ├── messaging/
│   │   ├── offers/
│   │   ├── orders/
│   │   ├── deliveries/
│   │   ├── notifications/
│   │   ├── analytics/
│   │   └── ai/
│   │
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── socket.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── listing.service.ts
│   │   ├── buyer-request.service.ts
│   │   ├── messaging.service.ts
│   │   ├── offer.service.ts
│   │   ├── order.service.ts
│   │   ├── payment.service.ts
│   │   ├── delivery.service.ts
│   │   ├── notification.service.ts
│   │   ├── analytics.service.ts
│   │   └── ai.service.ts
│   │
│   ├── types/
│   ├── providers/
│   ├── styles/
│   └── middleware.ts
│
├── .env.local
└── package.json

Adapt this structure to the existing project rather than forcing a destructive reorganization.

# 7. BACKEND INTEGRATION RULES

The frontend must communicate with the backend through HTTP APIs.

Never connect directly to PostgreSQL.

## Environment variables

Create or maintain:

NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

Use the actual backend port and URL discovered in the existing project.

For production, configure the deployed backend URL through the frontend hosting environment.

Never put private API keys in NEXT_PUBLIC variables.

## API client

Create a reusable API client in:

src/lib/api.ts

It must support:

- GET
- POST
- PUT
- PATCH
- DELETE
- JSON responses
- Appropriate request headers
- Authentication credentials
- Consistent error handling
- Request timeouts where appropriate
- File uploads using FormData without manually setting its Content-Type header

Use the backend's actual authentication method.

If the backend uses secure HttpOnly cookies, use credentials appropriately.

If the backend uses access and refresh tokens, implement the existing backend's token lifecycle securely. Do not invent a new authentication system.

Never store sensitive long-lived tokens in localStorage.

Create service functions for each backend feature instead of scattering fetch calls throughout components.

# 8. AUTHENTICATION AND USER ONBOARDING

Build a simple, professional authentication experience.

Support the existing backend registration options:

- Phone number registration.
- Email registration.
- Phone and email when supported.

Registration must follow the backend verification process.

## Required pages

- Login
- Registration
- Phone OTP verification
- Email verification
- Forgot password
- Reset password

## Registration experience

Collect only information required by the backend.

Allow users to select their appropriate role:

- Farmer
- Buyer
- Transporter
- Cooperative
- Agent, where authorized

Do not allow public users to assign themselves administrator privileges.

## Authentication requirements

- Connect forms to real backend endpoints.
- Validate fields.
- Show useful error messages.
- Show loading states.
- Prevent duplicate submissions.
- Handle expired OTPs.
- Support OTP resend cooldowns.
- Support logout.
- Handle expired sessions.
- Redirect users appropriately after login.
- Protect authenticated pages.

Do not invent authentication routes. Inspect the backend first.

# 9. ROLE-BASED DASHBOARDS

Build dashboard experiences based on authenticated user roles.

Do not show every user the same dashboard.

## Farmer dashboard

Display:

- Welcome message.
- Total active listings.
- Available produce.
- Reserved stock.
- Sold produce.
- Incoming offers.
- Recent orders.
- Buyer messages.
- Notifications.
- Market insights.
- Recommended buyers and opportunities.

Quick actions:

- Add produce.
- Manage listings.
- View buyer requests.
- Check offers.
- Open messages.

## Buyer dashboard

Display:

- Welcome message.
- Active buyer requests.
- Incoming farmer offers.
- Recent orders.
- Saved or shortlisted listings, if supported.
- Messages.
- Payment history.
- Recommended farmers.
- Market insights.

Quick actions:

- Browse marketplace.
- Create buyer request.
- Contact farmer.
- Review offers.
- View orders.

## Transporter dashboard

Display:

- Assigned deliveries.
- Pending delivery requests.
- Accepted deliveries.
- Completed deliveries.
- Delivery history.
- Availability status.

Quick actions:

- View assigned deliveries.
- Accept eligible deliveries.
- Update delivery status.

## Cooperative and agent dashboard

Display:

- Authorized farmers.
- Farmer activity.
- Relevant listings.
- Assigned tasks.
- Verification assistance.
- Regional market information.

Respect the backend's permission boundaries.

Agents must not gain unrestricted access to farmer accounts.

## Admin dashboard

Display:

- User statistics.
- Farmer and buyer activity.
- Marketplace statistics.
- Orders and payment summaries.
- Delivery activity.
- Pending verifications.
- Review reports.
- Integrity AI assessments.
- Knowledge source management.
- System notifications.

Admin routes must be protected by backend authorization, not just hidden in the frontend.

# 10. PUBLIC WEBSITE AND HOMEPAGE

Create a polished public-facing homepage.

The homepage should explain AgroConnect clearly to first-time visitors.

## Navigation

Include:

- AgroConnect logo.
- Home.
- About.
- How it works.
- Marketplace.
- Contact.
- Login.
- Join AgroConnect.

Make the navigation responsive with a mobile menu.

## Hero section

Main heading:

"Connecting Agriculture. Empowering Markets."

Supporting text:

"AgroConnect brings farmers, buyers, and agricultural businesses together through a smarter, more connected marketplace."

Primary CTA:

"Explore Marketplace"

Secondary CTA:

"Join AgroConnect"

Use authentic agricultural imagery where available.

## Homepage sections

1. Hero section.
2. Trusted agricultural marketplace introduction.
3. How AgroConnect works.
4. Benefits for farmers.
5. Benefits for buyers.
6. Marketplace produce preview.
7. Buyer requests preview.
8. Market intelligence introduction.
9. AgroConnect AI Assistant introduction.
10. Call-to-action section.
11. Footer.

Do not invent customer testimonials, partner logos, user counts, or platform statistics.

Use genuine backend data for live statistics. If no data is available, show descriptive content rather than fabricated numbers.

# 11. PRODUCE MARKETPLACE

Build a modern agricultural marketplace.

## Marketplace features

- Browse produce listings.
- Search by produce name.
- Filter by category.
- Filter by location.
- Filter by price range.
- Filter by quantity.
- Filter by availability.
- Sort results.
- Pagination.
- View produce details.

## Listing cards

Each card should display available information:

- Produce image.
- Produce name.
- Price.
- Quantity available.
- Unit.
- Location.
- Farmer information.
- Verification indicator when approved.
- Availability status.

## Produce details

Display:

- Produce images.
- Description.
- Quality or grade when available.
- Available quantity.
- Price and currency.
- Farmer profile.
- Location.
- Harvest or freshness information when available.
- Contact farmer.
- Make an offer.

Only show actions allowed by the backend and user's permissions.

# 12. FARMER LISTINGS AND INVENTORY

Farmers must be able to manage produce listings.

Build:

- Create listing.
- Edit listing.
- View listing.
- Pause listing.
- Reactivate listing.
- Delete or archive where supported.
- Manage inventory.
- View reserved quantity.
- View sold quantity.

The inventory interface must distinguish:

- Available stock.
- Reserved stock.
- Sold stock.

Never calculate or modify authoritative inventory independently in the frontend.

The backend is the source of truth.

When a reservation expires, refresh the relevant inventory data from the backend.

Do not show expired or unavailable produce as purchasable.

# 13. BUYER REQUESTS

Create a buyer request section.

Buyers should be able to:

- Browse buyer requests.
- Search requests.
- Filter by produce.
- Filter by location.
- View quantities.
- View target prices where available.
- Create requests.
- Edit eligible requests.
- Pause requests.
- Reopen requests.
- Cancel requests.
- View offers received.

Farmers should be able to:

- Discover relevant buyer requests.
- View request details.
- Contact the buyer.
- Submit an offer.

Respect the buyer request status and backend authorization.

# 14. MESSAGING AND COMMUNICATION

Build a modern messaging experience using the existing backend messaging APIs and Socket.IO implementation.

## Messaging interface

Desktop:

- Left sidebar: conversation list.
- Center: active conversation.
- Right sidebar: relevant listing or buyer request information, where available.

Mobile:

- Conversation list page.
- Individual conversation page.

Features:

- Send messages.
- Receive messages in real time.
- View conversation history.
- Unread message count.
- Read receipts where supported.
- Conversation timestamps.
- Message loading states.
- Reconnection handling.
- Empty conversation state.

Persist messages through the backend.

Socket.IO should provide real-time updates, not replace PostgreSQL as the source of truth.

Do not create duplicate conversations unnecessarily.

# 15. OFFERS AND NEGOTIATIONS

Build an offer management interface.

Users should be able to:

- Create an offer.
- View received offers.
- View sent offers.
- Accept offers.
- Reject offers.
- Withdraw eligible offers.
- Submit counteroffers.
- View offer history.

Display:

- Produce or buyer request.
- Quantity.
- Unit price.
- Total amount.
- Currency.
- Delivery details.
- Offer status.
- Expiry time.
- Offer history.

Use clear status labels:

- Pending
- Countered
- Accepted
- Rejected
- Withdrawn
- Expired

Only show actions that the backend permits.

Do not assume an accepted offer means an order has been paid.

# 16. ORDERS AND PAYMENTS

Create a complete order management interface.

## Order pages

- My orders.
- Order details.
- Order history.
- Payment details.
- Payment result.

Display:

- Order number.
- Produce.
- Quantity.
- Agreed price.
- Total.
- Currency.
- Buyer and farmer details according to permissions.
- Reservation information.
- Order status.
- Payment status.
- Delivery status when applicable.

## Paystack integration

Use the backend Paystack integration.

The frontend must:

1. Request payment initialization from the backend.
2. Receive the actual Paystack authorization URL.
3. Redirect the user to Paystack hosted checkout.
4. Handle the return/callback page.
5. Ask the backend to verify payment.
6. Display the verified result.

Never:

- Put the Paystack secret key in the frontend.
- Trust a successful redirect as proof of payment.
- Mark an order paid directly from the browser.
- Calculate the authoritative payment amount in the frontend.
- Simulate a successful transaction.

The backend must remain responsible for payment initialization, verification, webhooks, and order updates.

Display clear payment states:

- Pending
- Processing
- Successful
- Failed
- Refunded
- Partially refunded

# 17. TRANSPORT AND DELIVERY

Build delivery management interfaces.

Buyers and farmers should be able to see relevant delivery information for their orders.

Transporters should see assigned deliveries.

Display:

- Delivery number.
- Related order.
- Pickup location.
- Destination.
- Produce.
- Quantity.
- Delivery fee.
- Assigned transporter.
- Current delivery status.
- Delivery history.

Support the actual backend status transitions.

Do not display fake live GPS tracking.

If live location tracking is not implemented, show the delivery status timeline instead.

# 18. NOTIFICATIONS

Build an in-app notification center.

Display notifications for:

- New offers.
- Accepted or rejected offers.
- Counteroffers.
- New messages.
- New orders.
- Payment results.
- Reservation expiry.
- Delivery updates.
- Verification updates.
- Important account announcements.

Features:

- Unread count.
- Mark as read.
- Mark all as read.
- Delete where supported.
- Notification history.
- Relevant links to the related resource.

Use Socket.IO for real-time updates when supported.

Persisted notifications must load from the backend.

# 19. MARKET INTELLIGENCE AND ANALYTICS

Create a clean analytics interface.

Display available backend analytics such as:

- Produce price trends.
- Regional price comparisons.
- Supply levels.
- Buyer demand.
- Completed transactions.
- Produce demand by location.
- Marketplace activity.

Use charts only when actual data is available.

Clearly distinguish:

- Asking prices.
- Completed transaction prices.
- Verified market observations.

Always display relevant:

- Currency.
- Unit.
- Location.
- Date range.
- Number of observations.

Do not mix incompatible units or currencies.

Do not fabricate market prices or trends.

Show a useful empty state when there is insufficient data.

# 20. AGROCONNECT AI ASSISTANT

Build a conversational AI assistant.

This is a core AgroConnect feature.

The assistant must allow users to ask questions about:

1. AgroConnect platform usage.
2. Agricultural knowledge.
3. Market intelligence.
4. General relevant agricultural questions.

## Interface

Create:

- Chat interface.
- Message bubbles.
- User and assistant identification.
- Message input.
- Send button.
- Loading indicator.
- Conversation history.
- New conversation button.
- Delete conversation action.
- Suggested questions.

Suggested questions:

- How do I create a produce listing?
- How can I find buyers?
- How do I make an offer?
- What is the best time to plant maize?
- How can I improve tomato production?
- What causes common crop diseases?
- What are current market trends for maize?

## Assistant behavior

The frontend must connect to the existing backend AI assistant APIs.

Display:

- Assistant responses.
- Source references where returned.
- Relevant market data.
- Loading and failure states.
- Follow-up conversations.

Do not create a separate AI provider integration in the browser.

Never expose AI provider API keys.

The backend must handle knowledge retrieval, AI provider calls, permissions, and agricultural safety.

Do not present uncertain agricultural advice as guaranteed fact.

# 21. PROFILES AND SETTINGS

Build profile pages for:

- Farmers.
- Buyers.
- Transporters.
- Cooperatives.
- Agents.

Display available profile information.

Allow authorized users to edit their own profile.

Include:

- Personal details.
- Contact details.
- Profile image.
- Location.
- Business information where applicable.
- Verification status.
- Ratings and reviews.
- Account settings.
- Notification preferences.

Verification indicators must come from approved backend records.

Do not display users as verified merely because they uploaded documents.

# 22. RATINGS, REVIEWS AND TRUST

Build review interfaces.

Features:

- Display average ratings.
- Display review counts.
- Display individual reviews.
- Submit eligible reviews.
- Edit eligible reviews.
- Report inappropriate reviews.
- Display moderation status only where appropriate.

Use actual completed transaction eligibility returned by the backend.

Keep verification badges separate from rating scores.

# 23. ADMIN INTERFACE

Build an organized admin dashboard.

Include sections for:

- Users.
- Farmers.
- Buyers.
- Cooperatives.
- Transporters.
- Listings.
- Buyer requests.
- Orders.
- Payments.
- Deliveries.
- Verifications.
- Reviews and reports.
- Integrity AI assessments.
- AI knowledge sources.
- Platform analytics.

Admin operations must use protected backend endpoints.

Do not implement frontend-only admin authorization.

Use confirmation dialogs for sensitive actions.

# 24. FORMS AND VALIDATION

All forms must have proper validation.

Use React Hook Form and Zod where appropriate.

Requirements:

- Required field validation.
- Email validation.
- Phone number validation.
- Quantity validation.
- Price validation.
- File validation.
- Useful field-level error messages.
- Loading state during submission.
- Disabled submission while processing.
- Success and failure feedback.

Never trust frontend validation alone. The backend must validate all submitted data.

# 25. RESPONSIVE DESIGN

AgroConnect must work properly on:

- Desktop.
- Laptop.
- Tablet.
- Mobile phones.

Mobile design is especially important because many farmers and buyers will access the platform through smartphones.

Requirements:

- Responsive navigation.
- Touch-friendly controls.
- Readable typography.
- Responsive tables.
- Mobile-friendly dashboards.
- Responsive forms.
- Proper image sizing.
- No horizontal overflow.
- Accessible mobile menus.

Do not simply shrink the desktop layout. Design appropriate mobile experiences.

# 26. ACCESSIBILITY

Follow accessibility best practices.

Implement:

- Semantic HTML.
- Proper heading hierarchy.
- Accessible labels.
- Keyboard navigation.
- Visible focus states.
- Accessible dialogs.
- Sufficient color contrast.
- Alternative text for meaningful images.
- Screen-reader-friendly status messages.

Do not use color alone to communicate important statuses.

# 27. LOADING, EMPTY, ERROR AND SUCCESS STATES

Every major data-driven page must handle four states.

## Loading

Use skeleton loaders or clear loading indicators.

## Empty

Show helpful messages and appropriate next actions.

Example:

"You haven't created any produce listings yet."

Button: "Create Your First Listing"

## Error

Show understandable errors with a retry action where appropriate.

Do not expose backend stack traces or internal server details.

## Success

Show clear confirmation after successful operations.

Avoid excessive notifications and unnecessary popups.

# 28. SECURITY REQUIREMENTS

- Never expose backend secrets.
- Never expose Paystack secret keys.
- Never expose Brevo or Africa's Talking credentials.
- Never expose database credentials.
- Do not trust frontend role information.
- Respect backend authorization.
- Sanitize and safely render user-generated content.
- Avoid unsafe HTML rendering.
- Validate file uploads.
- Handle expired sessions.
- Avoid leaking private user information.
- Do not put sensitive information in URLs.
- Do not store long-lived sensitive tokens in localStorage.
- Use HTTPS in production.
- Follow the backend's CORS and cookie configuration.

# 29. PERFORMANCE AND SEO

Implement:

- Next.js image optimization.
- Lazy loading where appropriate.
- Server Components by default.
- Client Components only where interaction requires them.
- Pagination for large datasets.
- Efficient data fetching.
- Avoid unnecessary re-renders.
- Metadata for public pages.
- Search-friendly page titles.
- Descriptive page metadata.
- Proper loading and error boundaries.

Do not turn the entire application into Client Components unnecessarily.

# 30. TESTING REQUIREMENTS

Test:

- Public navigation.
- Authentication flows.
- Registration and verification.
- Login and logout.
- Protected pages.
- Role-based dashboards.
- Marketplace search and filters.
- Produce listing management.
- Buyer requests.
- Messaging.
- Offers.
- Orders.
- Paystack checkout and verification flow.
- Deliveries.
- Notifications.
- Market intelligence.
- AI assistant.
- Responsive layouts.

Use the existing test framework if present.

Mock external services in tests.

Never use real payment credentials or make real payments during automated tests.

# 31. FRONTEND DEVELOPMENT PHASES

Follow these phases in order.

Do not attempt to build the entire frontend in one operation.

## FRONTEND PHASE 1: FOUNDATION AND DESIGN SYSTEM

Build:

- Frontend architecture.
- Brand styles.
- Typography.
- Color system.
- Global CSS.
- Responsive layout foundation.
- Reusable UI components.
- Buttons.
- Inputs.
- Cards.
- Modals.
- Dropdowns.
- Toast notifications.
- Navigation.
- Footer.
- Public homepage.

Integrate no unnecessary backend features at this stage.

Completion requirements:

- Frontend runs successfully.
- Homepage looks polished.
- Design system is consistent.
- Layout works on mobile and desktop.
- Existing project work is preserved.

## FRONTEND PHASE 2: AUTHENTICATION AND ONBOARDING

Build:

- Registration.
- Login.
- Phone OTP verification.
- Email verification.
- Forgot password.
- Reset password.
- Session management.
- Protected routes.
- Role selection and onboarding.

Connect all flows to actual backend authentication endpoints.

## FRONTEND PHASE 3: PROFILES AND DASHBOARDS

Build:

- User profiles.
- Profile editing.
- Farmer dashboard.
- Buyer dashboard.
- Transporter dashboard.
- Cooperative/agent dashboard.
- Admin dashboard foundation.
- Account settings.

Use actual authenticated user data.

## FRONTEND PHASE 4: MARKETPLACE AND INVENTORY

Build:

- Marketplace.
- Produce listing cards.
- Search.
- Filters.
- Sorting.
- Produce details.
- Create listing.
- Edit listing.
- Inventory management.
- Listing status management.

Connect to the existing backend listing and inventory APIs.

## FRONTEND PHASE 5: BUYER REQUESTS AND DISCOVERY

Build:

- Buyer request marketplace.
- Buyer request creation.
- Request management.
- Request details.
- Farmer discovery.
- Relevant search and filters.

Connect to existing buyer request APIs.

## FRONTEND PHASE 6: MESSAGING AND COMMUNICATION

Build:

- Conversation list.
- Chat interface.
- Real-time messages.
- Message history.
- Unread counts.
- Read receipts where supported.
- Mobile messaging experience.

Connect to the existing messaging APIs and Socket.IO.

## FRONTEND PHASE 7: OFFERS, ORDERS AND PAYMENTS

Build:

- Offer management.
- Counteroffers.
- Offer history.
- Accept and reject actions.
- Order management.
- Order details.
- Payment initialization.
- Paystack hosted checkout.
- Payment verification.
- Payment result pages.

Use the backend as the source of truth for all payment and order statuses.

## FRONTEND PHASE 8: DELIVERY, NOTIFICATIONS, ANALYTICS, AI AND FINAL POLISH

Build:

- Delivery management.
- Delivery status timeline.
- Notification center.
- Market intelligence.
- Ratings and reviews.
- Verification interfaces.
- AgroConnect AI Assistant.
- Admin management features.
- Responsive and accessibility improvements.
- Final testing and optimization.

Only implement features whose backend APIs are available. Record any missing dependencies clearly.

# 32. REQUIRED WORKFLOW FOR EVERY PHASE

Before starting a phase:

1. Read this frontend skills document.
2. Inspect the current frontend structure.
3. Review the relevant backend endpoints and models.
4. Identify available API routes and response formats.
5. Identify missing backend dependencies.
6. Prepare an implementation plan.
7. Implement only the requested phase.
8. Test the implementation.
9. Fix errors before proceeding.
10. Document what was completed.

At the end of every phase, report:

- Features implemented.
- Pages created.
- Components created.
- Backend APIs connected.
- Environment variables required.
- Tests performed.
- Known issues.
- Missing backend dependencies.
- Recommended next phase.

Do not claim a feature is complete if it only has a visual design without working functionality.

# 33. FINAL EXPECTATIONS

The finished AgroConnect frontend must:

- Look like a professional global agricultural technology platform.
- Be simple enough for ordinary farmers and buyers.
- Be visually clean and consistent.
- Work on desktop and mobile.
- Connect properly to the existing backend.
- Support all implemented user roles.
- Support real marketplace activity.
- Support communication and negotiations.
- Support orders and Paystack payments.
- Support delivery management.
- Support notifications.
- Support agricultural market intelligence.
- Support the AgroConnect AI Assistant.
- Follow security and accessibility standards.
- Be maintainable and ready for production deployment.

# FINAL INSTRUCTION TO THE AI AGENT

You are working on the existing AgroConnect project.

The backend has already been developed through its own implementation phases. Do not rebuild it or replace its architecture.

Your immediate responsibility is to start FRONTEND PHASE 1.

Before coding, inspect the existing frontend, preserve the existing Next.js foundation and homepage, and understand the current backend integration requirements.

Build a clean, premium, modern AgroConnect interface using the official brand identity.

Work phase by phase. Do not skip phases, invent backend endpoints, use fake production data, or claim incomplete functionality is finished.

Prioritize excellent UI/UX, real functionality, maintainable code, and reliable backend integration.
