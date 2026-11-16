# AGROCONNECT FRONTEND DEVELOPMENT SKILLS
## Complete Frontend Architecture, Design System, Implementation & Integration Guide

**Project:** AgroConnect  
**Tagline:** Connecting Agriculture. Empowering Markets.  
**Frontend:** Next.js, React, TypeScript and Tailwind CSS  
**Backend:** Node.js, Express.js and TypeScript  
**Database:** Aiven PostgreSQL  
**Deployment:** Vercel for frontend and Render for backend  
**Development Approach:** Incremental Frontend–Backend Integration

---

# 1. ROLE AND RESPONSIBILITIES

Act as a Senior Frontend Engineer, Product Designer and UI/UX Specialist working on AgroConnect.

Your responsibilities include:

- Building a professional agricultural marketplace.
- Creating clean, accessible and responsive interfaces.
- Implementing all required frontend pages.
- Connecting every feature to the existing backend.
- Testing frontend and backend integration after every phase.
- Maintaining consistent design across the application.
- Protecting user data and respecting backend permissions.
- Writing maintainable, reusable and scalable code.

You must understand the product before implementing features.

Do not build a generic AI-generated website.

Build a real product with a recognizable identity, clear user journeys and professional visual quality.

---

# 2. PROJECT OVERVIEW

AgroConnect is an agricultural marketplace connecting:

1. Farmers.
2. Buyers.
3. Agricultural cooperatives.
4. Cooperative agents.
5. Transporters.

The platform helps farmers reach buyers, allows buyers to discover agricultural produce, enables cooperatives to support their members, and helps coordinate transportation and delivery.

The initial pilot region is Plateau State, Nigeria.

The long-term vision is to expand across Nigeria and internationally.

### Product vision

Create a trusted digital agricultural marketplace that makes agricultural trade easier, more transparent and accessible.

### Main problems AgroConnect addresses

- Farmers struggle to find reliable buyers.
- Buyers struggle to find reliable produce suppliers.
- Farmers have limited access to market information.
- Negotiations and transactions are often difficult to coordinate.
- Perishable produce can be wasted.
- Farmers may have limited internet access or digital literacy.
- Trust, accountability and transportation remain challenges.

### Product features

- Farmer and buyer registration.
- Cooperative registration and verification.
- Cooperative agent management.
- Produce marketplace.
- Inventory management.
- Buyer requests.
- Farmer–buyer messaging.
- Offers and negotiations.
- Orders and reservations.
- Paystack payments.
- Transport and delivery.
- Notifications.
- Ratings and reviews.
- User verification.
- Market intelligence.
- Integrity AI.
- AgroConnect AI Assistant.
- Farmer protection.
- USSD and voice accessibility.

Do not claim a feature is live until its backend integration is implemented and tested.

---

# 3. DEVELOPMENT PRINCIPLES

Follow these principles throughout the project.

1. Inspect existing code before making changes.
2. Preserve working functionality.
3. Read the root `skills.md` before frontend implementation.
4. Use this `frontend/skills.md` as the frontend development guide.
5. Inspect backend API contracts before connecting features.
6. Never invent backend endpoints.
7. Never connect the frontend directly to PostgreSQL.
8. Never expose backend secrets in frontend code.
9. Build reusable components.
10. Use TypeScript properly.
11. Make every implemented interaction functional.
12. Test each feature against the backend before moving forward.
13. Do not create fake successful transactions.
14. Do not use fake production data.
15. Keep the application simple and understandable.
16. Do not introduce unnecessary libraries or infrastructure.
17. Do not rebuild existing functionality without a clear reason.

---

# 4. TECHNOLOGY STACK

Use the existing project configuration wherever possible.

### Frontend

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- Lucide React icons.
- Next.js Image.
- React Hook Form where appropriate.
- Zod for validation where appropriate.

### Backend

- Node.js.
- Express.js.
- TypeScript.
- Existing REST API.
- Existing authentication system.

### Database

- Aiven PostgreSQL.
- Existing Sequelize models and migrations.

### Deployment

- Vercel for the frontend.
- Render for the backend.

Do not introduce:

- A second database.
- Firebase.
- Supabase.
- MongoDB.
- Unnecessary microservices.
- Unnecessary state management libraries.
- A replacement authentication provider.

Reuse the existing architecture.

---

# 5. BRAND IDENTITY AND DESIGN SYSTEM

## 5.1 Brand colors

Use the following AgroConnect palette.

| Name | Hex | Purpose |
|---|---|---|
| Agro Green | #176B45 | Primary brand |
| Fresh Green | #8BC34A | Secondary accent |
| Harvest Gold | #E9A23B | Highlights |
| Deep Navy | #18324B | Headings and text |
| Soft Background | #F5F7F2 | Main backgrounds |
| White | #FFFFFF | Surfaces |

Use supporting neutral colors for:

- Muted text.
- Borders.
- Disabled elements.
- Form backgrounds.
- Dividers.
- Status indicators.

Keep the colors consistent throughout the application.

## 5.2 Typography

Use:

- Manrope for headings.
- Inter for body text.

Establish a consistent typography scale.

Headings should have clear hierarchy.

Body text must remain readable on mobile screens.

Avoid unnecessarily large headings and excessively small supporting text.

## 5.3 The soft faded appearance

AgroConnect must have a consistent faded, calm and elegant appearance.

The design should feel:

- Clean.
- Soft.
- Premium.
- Modern.
- Natural.
- Professional.
- Trustworthy.

Use:

- Soft off-white backgrounds.
- Muted green surfaces.
- Subtle gold accents.
- Slightly desaturated agricultural photographs.
- Gentle image overlays.
- Light borders.
- Subtle shadows.
- Muted secondary text.
- Smooth transitions.
- Balanced whitespace.
- Consistent spacing.

The faded appearance must never make text difficult to read.

Do not apply excessive opacity to important content.

Do not blur the entire interface.

Maintain strong accessibility contrast.

## 5.4 Visual elements to avoid

Do not use:

- Excessive gradients.
- Glassmorphism everywhere.
- Oversized rounded cards.
- Random floating decorations.
- Unnecessary animation.
- Too many badges.
- Too many icons.
- Identical card layouts everywhere.
- Fake statistics.
- Fake testimonials.
- Fake transaction histories.
- Generic AI dashboard templates.
- Cartoon illustrations as the main visual identity.

Every section must have a clear purpose.

---

# 6. PHOTOGRAPHY AND VISUAL ASSETS

Authentic agricultural photography is a major part of the AgroConnect identity.

Use properly licensed photographs from approved sources such as Unsplash, Pexels, user-provided photographs or other legitimate image providers.

### Preferred photographs

- African farmers working on farms.
- Nigerian farmers harvesting produce.
- Maize farms.
- Rice farms.
- Tomato production.
- Potato harvesting.
- Fresh vegetables.
- Agricultural markets.
- Produce transportation.
- Cooperative farming activities.
- Farmers and buyers working together.

### Photography rules

1. Use realistic photographs.
2. Prefer African agricultural environments where relevant.
3. Avoid stereotypical or disrespectful representations.
4. Do not use unrelated business stock images.
5. Avoid obviously artificial AI-generated farmer photographs.
6. Check licensing requirements.
7. Do not scrape images from websites.
8. Do not depend on unreliable hotlinked images.
9. Use Next.js Image optimization.
10. Provide descriptive alt text.
11. Use appropriate image aspect ratios.
12. Implement image fallbacks.

### Image treatment

Use subtle desaturation, soft overlays and natural color grading where appropriate.

Do not make photographs excessively faded or visually unclear.

### Important image sections

- Homepage hero.
- Marketplace produce listings.
- Farmer profiles.
- Cooperative information.
- Buyer-facing sections.
- Transport and delivery sections.

---

# 7. FRONTEND ARCHITECTURE

Use a maintainable structure that fits the existing Next.js application.

Suggested structure:

```text
frontend/
├── public/
│   ├── images/
│   ├── icons/
│   └── logo/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── marketplace/
│   │   ├── how-it-works/
│   │   ├── farmers/
│   │   ├── buyers/
│   │   ├── cooperatives/
│   │   ├── register/
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── admin/
│   │   └── ...
│   ├── components/
│   │   ├── layout/
│   │   ├── navigation/
│   │   ├── home/
│   │   ├── marketplace/
│   │   ├── authentication/
│   │   ├── cooperative/
│   │   ├── dashboard/
│   │   ├── forms/
│   │   ├── ui/
│   │   └── shared/
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── marketplace.service.ts
│   │   ├── cooperative.service.ts
│   │   └── ...
│   ├── hooks/
│   ├── context/
│   ├── types/
│   ├── lib/
│   └── styles/
├── .env.local
├── .env.example
├── skills.md
└── ...
```

This structure is a guide, not permission to move or delete existing files unnecessarily.

Use clear naming conventions.

Keep components focused and reusable.

Avoid enormous components containing unrelated functionality.

---

# 8. NAVIGATION AND ROUTE STRUCTURE

Build a consistent navigation system.

## Public routes

```text
/
 /marketplace
 /how-it-works
 /farmers
 /buyers
 /cooperatives
 /register
 /register/farmer
 /register/buyer
 /register/cooperative
 /register/transporter
 /login
```

## Farmer routes

```text
/dashboard/farmer
/dashboard/farmer/produce
/dashboard/farmer/produce/new
/dashboard/farmer/requests
/dashboard/farmer/messages
/dashboard/farmer/offers
/dashboard/farmer/orders
/dashboard/farmer/payments
/dashboard/farmer/deliveries
/dashboard/farmer/notifications
/dashboard/farmer/profile
/dashboard/farmer/agent-permissions
```

## Buyer routes

```text
/dashboard/buyer
/dashboard/buyer/marketplace
/dashboard/buyer/requests
/dashboard/buyer/requests/new
/dashboard/buyer/messages
/dashboard/buyer/offers
/dashboard/buyer/orders
/dashboard/buyer/payments
/dashboard/buyer/deliveries
/dashboard/buyer/notifications
/dashboard/buyer/profile
```

## Cooperative routes

```text
/dashboard/cooperative
/dashboard/cooperative/profile
/dashboard/cooperative/members
/dashboard/cooperative/agents
/dashboard/cooperative/invitations
/dashboard/cooperative/verification
/dashboard/cooperative/activity
/dashboard/cooperative/settings
```

## Transporter routes

```text
/dashboard/transporter
/dashboard/transporter/available-deliveries
/dashboard/transporter/my-deliveries
/dashboard/transporter/history
/dashboard/transporter/profile
/dashboard/transporter/notifications
```

## Admin routes

```text
/admin
/admin/users
/admin/cooperatives
/admin/agents
/admin/verifications
/admin/complaints
/admin/listings
/admin/orders
/admin/deliveries
/admin/integrity
/admin/analytics
/admin/settings
```

Only implement routes supported by the current project and backend capabilities.

Build these routes progressively according to the development roadmap.

Do not create empty pages simply to make the route list appear complete.

---

# 9. GLOBAL LAYOUT AND SHARED COMPONENTS

Create reusable components.

### Public layout

- Navbar.
- Mobile navigation.
- Footer.
- Main container.
- Page heading.
- Breadcrumbs where appropriate.

### Dashboard layout

- Sidebar.
- Responsive mobile sidebar.
- Header.
- User profile menu.
- Notifications indicator.
- Main content area.

### Shared UI components

- Buttons.
- Inputs.
- Selects.
- Textareas.
- Checkboxes.
- Radio buttons.
- Dialogs.
- Dropdowns.
- Tabs.
- Tables.
- Pagination.
- Badges.
- Toast messages.
- Loading indicators.
- Empty states.
- Error states.
- Confirmation dialogs.

All components must follow the AgroConnect design system.

Do not introduce a different visual style for each dashboard.

---

# 10. REQUIRED PUBLIC PAGES

## 10.1 Homepage

Route: `/`

Sections:

1. Navigation.
2. Hero section.
3. Agricultural photograph.
4. Platform introduction.
5. Farmers section.
6. Buyers section.
7. Cooperatives section.
8. Transporters section.
9. How it works.
10. Marketplace preview.
11. Farmer protection.
12. Rural accessibility.
13. Final call to action.
14. Footer.

Suggested headline:

**Connecting Farmers to Better Market Opportunities.**

Supporting text:

AgroConnect brings farmers, buyers, cooperatives and transporters together in one trusted agricultural marketplace.

Buttons:

- Explore Marketplace.
- Join AgroConnect.

Do not use fake user statistics or testimonials.

## 10.2 Marketplace

Route: `/marketplace`

Features:

- Search.
- Produce categories.
- Location filtering.
- Price filtering.
- Sorting.
- Pagination.
- Listing cards.
- Listing detail pages.
- Farmer information where public and authorized.
- Availability information.

Use real backend data.

## 10.3 How It Works

Route: `/how-it-works`

Explain:

- Registration.
- Listing produce.
- Discovering produce.
- Buyer requests.
- Messaging.
- Negotiation.
- Orders.
- Payments.
- Reservations.
- Delivery.

## 10.4 Farmers

Route: `/farmers`

Explain:

- Access to buyers.
- Produce listings.
- Inventory.
- Negotiations.
- Orders.
- Payments.
- Market intelligence.
- Farmer protection.
- Cooperative support.
- USSD and voice accessibility where available.

## 10.5 Buyers

Route: `/buyers`

Explain:

- Produce discovery.
- Supplier connections.
- Buyer requests.
- Negotiations.
- Orders.
- Payments.
- Delivery coordination.

## 10.6 Cooperatives

Route: `/cooperatives`

Explain:

- Cooperative registration.
- Cooperative verification.
- Member management.
- Agent invitations.
- Farmer support.
- Cooperative accountability.
- Farmer consent.

Provide a clear Register Cooperative CTA.

---

# 11. REGISTRATION AND AUTHENTICATION

Registration must integrate with the actual backend authentication system.

## 11.1 Registration selection

Route: `/register`

Display four options:

- Farmer.
- Buyer.
- Cooperative.
- Transporter.

Each must navigate to its appropriate registration page.

## 11.2 Farmer registration

Route: `/register/farmer`

Collect information supported by the backend:

- Full name.
- Phone number.
- Email address.
- Password.
- State.
- LGA.
- Community.
- Farming category.
- Terms acceptance.

Support phone or email registration according to existing backend requirements.

Integrate OTP or email verification where supported.

## 11.3 Buyer registration

Route: `/register/buyer`

Collect:

- Full name.
- Phone number.
- Email.
- Password.
- Business name where applicable.
- Buyer category.
- Location.
- Terms acceptance.

## 11.4 Cooperative registration

Route: `/register/cooperative`

This is a dedicated and important part of AgroConnect.

Collect:

- Cooperative name.
- Registration number where applicable.
- Agricultural focus.
- State.
- LGA.
- Community.
- Office address.
- Administrator's full name.
- Administrator's phone.
- Administrator's email.
- Administrator's position.
- Supporting documents where supported.
- Terms and consent.

Application statuses:

- Pending.
- Under review.
- Approved.
- Rejected.

The interface must show the real status returned by the backend.

Do not automatically approve cooperatives.

### Cooperative access rules

- Independent agents cannot register themselves as AgroConnect cooperative agents.
- Agents must be invited or nominated by an approved cooperative.
- AgroConnect must verify the cooperative and agent according to the backend rules.
- Cooperative administrators cannot automatically access every member's account.
- Farmers must give individual consent before an agent can assist them.
- Farmers can revoke access.
- Removing an agent must not delete farmer accounts or records.

## 11.5 Transporter registration

Route: `/register/transporter`

Collect:

- Full name.
- Phone number.
- Email.
- Password.
- Vehicle type.
- Service locations.
- Delivery capacity.
- Other information required by the backend.

## 11.6 Login

Route: `/login`

Features:

- Login form.
- Validation.
- Password visibility.
- Loading state.
- Error messages.
- Authentication.
- Redirect based on authorized role.

Do not invent password recovery or authentication features that are absent from the backend.

---

# 12. ROLE-BASED DASHBOARDS

All dashboard data must be authorized and loaded from the backend.

## 12.1 Farmer dashboard

Route: `/dashboard/farmer`

Include:

- Overview.
- My produce.
- Add produce.
- Inventory.
- Buyer requests.
- Messages.
- Offers.
- Orders.
- Payments.
- Deliveries.
- Notifications.
- Profile.
- Farmer-agent permissions.
- Pending action approvals.

Farmers must retain control over their accounts and produce.

## 12.2 Buyer dashboard

Route: `/dashboard/buyer`

Include:

- Overview.
- Marketplace.
- Buyer requests.
- Create request.
- Messages.
- Offers.
- Orders.
- Payments.
- Deliveries.
- Notifications.
- Profile.

## 12.3 Cooperative dashboard

Route: `/dashboard/cooperative`

Include:

- Overview.
- Cooperative profile.
- Verification status.
- Members.
- Agent invitations.
- Active agents.
- Farmer-agent relationships where authorized.
- Activity records.
- Notifications.
- Settings.

A cooperative must not automatically gain access to private farmer information.

## 12.4 Transporter dashboard

Route: `/dashboard/transporter`

Include:

- Overview.
- Available delivery requests.
- Assigned deliveries.
- Delivery history.
- Delivery status.
- Profile.
- Notifications.

## 12.5 Admin dashboard

Route: `/admin`

Include only features authorized by the actual backend.

Potential sections:

- Overview.
- Users.
- Cooperatives.
- Agents.
- Verifications.
- Complaints.
- Listings.
- Orders.
- Deliveries.
- Integrity alerts.
- Analytics.
- Settings.

Admin authorization must be enforced by the backend.

---

# 13. MARKETPLACE AND PRODUCE MANAGEMENT

The marketplace must use real backend data.

### Marketplace features

- Search produce.
- Filter by category.
- Filter by location.
- Filter by price.
- Sort results.
- View listing details.
- View available quantities.
- View units.
- View seller information where permitted.

### Farmer listing management

Allow farmers to:

- Create listings.
- Upload produce images.
- Select produce.
- Enter quantity.
- Select unit.
- Enter price.
- Set location.
- Edit listings where authorized.
- View inventory.
- View reserved quantities.
- View sold quantities.
- Withdraw listings where authorized.

Never allow the frontend to bypass inventory rules.

Respect the backend's reservation expiry and stock-release rules.

Do not show expired or unavailable produce as purchasable.

---

# 14. BUYER REQUESTS

Implement:

- Create buyer request.
- Select produce.
- Enter quantity.
- Select unit.
- Enter target price where supported.
- Select delivery location.
- Set required date.
- View active requests.
- Edit or cancel where permitted.
- Discover matching requests.

Use real backend request and response structures.

---

# 15. MESSAGING

Implement farmer–buyer communication using the existing backend messaging system.

Features:

- Conversation list.
- Message history.
- Send messages.
- Unread count.
- Read receipts where supported.
- Real-time updates through existing Socket.IO functionality.
- Reconnection handling.
- Empty and error states.

Persist messages through the backend.

Do not depend on browser-only state as the permanent message history.

Respect conversation participant permissions.

---

# 16. OFFERS AND NEGOTIATIONS

Implement:

- Send offer.
- View offer details.
- View offer history.
- Accept offer.
- Reject offer.
- Withdraw offer.
- Submit counteroffer.
- Display offer status.

Respect backend offer states:

- Pending.
- Countered.
- Accepted.
- Rejected.
- Withdrawn.
- Expired.

Do not allow invalid actions on expired or terminal offers.

Offer acceptance must follow the backend workflow for order creation.

---

# 17. ORDERS, RESERVATIONS AND PAYMENTS

Implement:

- Order details.
- Order history.
- Reservation information.
- Payment status.
- Payment initiation.
- Paystack checkout redirection.
- Payment verification display.
- Payment history.
- Refund status where authorized.

Use Paystack's hosted checkout as implemented by the backend.

Never claim payment succeeded based only on a browser redirect.

Only show successful payment after backend verification.

Do not expose Paystack secret keys in the frontend.

Never collect card PINs or sensitive payment credentials in AgroConnect forms.

Display accurate prices, quantities, currencies and payment statuses.

Support the backend's late-payment and reservation-expiry handling.

Do not represent Paystack as an escrow service.

---

# 18. TRANSPORT AND DELIVERY

Implement:

- Delivery overview.
- Delivery request information.
- Available deliveries.
- Assigned deliveries.
- Delivery status.
- Delivery history.
- Pickup and destination information.
- Delivery confirmation where authorized.

Respect the backend delivery lifecycle.

Do not allow transporters to mark deliveries completed if the backend requires buyer or admin confirmation.

---

# 19. NOTIFICATIONS

Implement:

- Notification list.
- Unread count.
- Read one notification.
- Read all.
- Notification preferences where supported.
- Related action links.

Support notification types:

- Offers.
- Messages.
- Orders.
- Payments.
- Reservations.
- Deliveries.
- Verification.
- Cooperative access.
- Farmer approvals.
- System announcements.

The frontend must display actual notification data.

---

# 20. RATINGS, REVIEWS AND VERIFICATION

Implement:

- Review submission.
- Review display.
- Rating summary.
- Review history.
- Report review.
- Verification status.
- Verification submission where supported.
- Admin review interface where authorized.

Respect backend rules.

Do not allow reviews for transactions that are not eligible.

Do not display unapproved verification as approved.

---

# 21. MARKET INTELLIGENCE AND AI

## Market intelligence

Display backend-provided:

- Produce price trends.
- Regional prices.
- Supply information.
- Demand information.
- Transaction analytics.
- Market insights.

Clearly distinguish asking prices from completed transaction prices.

Always display currency, unit, location and period.

Do not invent statistics.

## AgroConnect AI Assistant

Create a clean chat interface.

Support:

- Questions about using AgroConnect.
- Agricultural questions.
- Crop production information.
- Soil and fertilizer guidance.
- Pest and disease information.
- Harvest and storage advice.
- Market intelligence explanations.

Display sources when supplied by the backend.

Handle loading, errors and unavailable AI service gracefully.

Do not expose private user data or AI provider credentials.

## Integrity AI

Create authorized admin interfaces for:

- Risk alerts.
- Suspicious activity details.
- Evidence.
- Review status.
- Investigation history.

Do not display unverified risk alerts as proven misconduct.

Do not provide frontend controls that bypass backend review requirements.

---

# 22. FARMER PROTECTION AND COOPERATIVE AGENT MANAGEMENT

The frontend must enforce the user experience of AgroConnect's farmer protection system.

Features where supported:

- View cooperative agent relationship.
- View permissions.
- Approve sensitive actions.
- Reject action requests.
- Revoke agent access.
- View agent activity.
- Submit complaints.
- View complaint status.

Important rules:

- Agents only operate through approved cooperatives.
- Farmers control their own accounts.
- Agents cannot change passwords, OTPs or PINs.
- Agents cannot redirect farmer payments.
- Agents cannot withdraw farmer funds.
- Agents cannot accept or reject offers without required farmer approval.
- Agents cannot access unrelated farmers.
- Cooperative membership alone does not give agents account access.

Frontend controls must reflect the backend's actual authorization rules.

---

# 23. USSD AND VOICE ACCESSIBILITY

Create information pages or interface sections explaining AgroConnect's USSD and voice access where appropriate.

Where backend integration exists, display supported features and statuses.

Do not pretend a USSD session or voice service is live when it is not connected.

Support local-language settings only where translations have been reviewed and made available.

Do not expose phone numbers or private information unnecessarily.

---

# 24. MANDATORY FRONTEND–BACKEND INTEGRATION WORKFLOW

This is one of the most important requirements of AgroConnect development.

**Never build the entire frontend first and postpone backend integration until the end.**

Every phase must be built, connected, tested and reviewed before moving to the next phase.

Follow this exact workflow:

## Step 1: Inspect the backend

Before building a feature:

- Inspect backend routes.
- Inspect controllers.
- Inspect services.
- Inspect database models.
- Inspect authentication.
- Inspect role permissions.
- Inspect request validation.
- Inspect response formats.

Identify the exact backend functionality available.

If a required backend feature is missing, report it.

Do not invent an endpoint.

## Step 2: Build the frontend feature

Create the required page, forms, components and interactions.

Follow the design system.

## Step 3: Connect to the actual backend

Use real API routes and actual response structures.

Handle:

- Request methods.
- Headers.
- Authentication.
- Validation.
- File uploads.
- Error responses.
- Loading states.

## Step 4: Run both applications

Start the backend and frontend separately.

Example:

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Use the actual project scripts if they differ.

## Step 5: Test the feature in the browser

Perform the actual user journey.

Examples:

- Register a farmer and verify the result.
- Log in and open the farmer dashboard.
- Create a produce listing and confirm it is saved.
- Create a buyer request and verify it appears.
- Send a message and verify it persists.
- Submit a cooperative application and check its status.
- Initiate a Paystack test payment and verify through the backend.

## Step 6: Inspect errors and fix them

Check:

- Browser console.
- Network requests.
- Backend logs.
- CORS.
- API URL.
- Authentication.
- Validation.
- Database persistence.
- Permissions.
- Response parsing.

Do not hide errors by showing fake success messages.

## Step 7: Provide a testing report

At the end of each phase, report:

1. Pages implemented.
2. Components created.
3. Backend endpoints integrated.
4. Successful integration tests.
5. Database persistence tests.
6. Role and permission tests.
7. Mobile tests.
8. Bugs found and fixed.
9. Remaining problems.
10. Manual instructions for the developer.

## Step 8: Wait for review

Do not automatically start the next phase.

Allow the developer to inspect and test the current implementation.

The development rule is:

**Build → Connect → Run → Test → Fix → Review → Continue.**

---

# 25. API CLIENT AND ENVIRONMENT CONFIGURATION

Use environment variables for backend configuration.

Local frontend `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Use the actual backend port.

Production frontend environment:

```env
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-BACKEND-URL/api
```

Use the actual deployed backend URL.

Never expose:

- Database credentials.
- Paystack secret keys.
- Brevo API keys.
- Africa's Talking API keys.
- JWT signing secrets.
- AI provider keys.

These belong on the backend.

Create reusable API service functions.

Use consistent error handling.

Respect the existing authentication mechanism.

If authentication uses cookies, configure credentials and CORS correctly.

If authentication uses tokens, follow the backend's existing token lifecycle and storage strategy.

Do not introduce a new authentication system.

For FormData uploads, do not manually force the `Content-Type: application/json` header.

Use the format expected by the backend.

---

# 26. RESPONSIVE DESIGN

Every implemented page must work on:

- Mobile phones.
- Tablets.
- Laptops.
- Desktop screens.

Mobile is particularly important.

Ensure:

- Responsive navigation.
- Proper mobile menu.
- Readable text.
- Comfortable touch targets.
- Proper image cropping.
- Responsive forms.
- Dashboard navigation that works on mobile.
- Tables that remain usable on smaller screens.
- No horizontal overflow.

Test at multiple screen widths.

---

# 27. ACCESSIBILITY

Implement:

- Semantic HTML.
- Proper heading hierarchy.
- Accessible navigation.
- Keyboard navigation.
- Visible focus indicators.
- Proper form labels.
- Useful validation messages.
- Appropriate contrast.
- Image alt text.
- Accessible dialogs.
- Reduced-motion support.

Do not sacrifice accessibility for visual appearance.

---

# 28. LOADING, EMPTY, ERROR AND SUCCESS STATES

Every data-driven page must handle all important UI states.

### Loading

Use clean skeletons or loading indicators.

### Empty

Explain when no listings, messages, offers or notifications exist.

Provide an appropriate next action.

### Error

Display understandable error messages.

Do not expose raw stack traces or internal server details.

### Success

Display confirmation only after the backend confirms the operation.

### Unauthorized

Redirect or display an appropriate access-denied message.

### Offline or network failure

Explain the issue and allow safe retry where appropriate.

---

# 29. SECURITY AND DATA PRIVACY

The frontend must follow these rules:

- Protect authenticated routes.
- Use backend authorization as the final authority.
- Do not trust user-supplied role values.
- Do not expose private records.
- Do not expose secrets.
- Validate input.
- Prevent unauthorized actions.
- Respect farmer ownership.
- Respect cooperative and agent permissions.
- Do not display private contact information without authorization.
- Do not trust browser redirects as payment confirmation.
- Do not store sensitive credentials in local storage.
- Handle session expiry safely.

Frontend restrictions do not replace backend security.

---

# 30. PERFORMANCE AND SEO

Implement:

- Next.js Image optimization.
- Appropriate font loading.
- Server components by default where appropriate.
- Client components only when interaction requires them.
- Lazy loading where appropriate.
- Reusable code.
- Optimized images.
- Metadata.
- Open Graph information.
- SEO-friendly page titles.
- Descriptive page descriptions.

Avoid unnecessary dependencies and excessive client-side JavaScript.

---

# 31. TESTING REQUIREMENTS

At the end of every phase:

Run applicable checks:

```bash
npm run lint
npm run build
```

Run TypeScript checks using the project's configured command.

Run available automated tests.

Manually test all important user journeys in the browser.

Where appropriate, verify backend database persistence.

Never report a successful test that was not executed.

### Required testing categories

- Navigation.
- Form validation.
- Authentication.
- API integration.
- Authorization.
- Role permissions.
- File uploads.
- Responsive layout.
- Error handling.
- Loading and empty states.
- Database persistence.
- Payment verification where applicable.

---

# 32. FRONTEND DEVELOPMENT ROADMAP

Build AgroConnect incrementally in the following phases.

Each phase must follow the mandatory frontend–backend integration workflow.

## FRONTEND PHASE 1 — FOUNDATION AND DESIGN SYSTEM

Build:

- Existing project inspection.
- Design system.
- Typography.
- Global styles.
- Soft faded visual identity.
- Navbar.
- Mobile navigation.
- Footer.
- Homepage.
- Public layout.
- Authentic agricultural photographs.
- Basic SEO.
- Shared UI components.

Test:

- Homepage.
- Navigation.
- Responsive layouts.
- Image loading.
- Existing application functionality.

Do not begin Phase 2 until Phase 1 is reviewed.

## FRONTEND PHASE 2 — AUTHENTICATION AND REGISTRATION

Build:

- Registration selection.
- Farmer registration.
- Buyer registration.
- Cooperative registration.
- Transporter registration.
- Login.
- OTP or email verification where supported.
- Authentication state.
- Protected routes.
- Logout.

Test:

- Real registrations.
- Verification.
- Login.
- Invalid credentials.
- Duplicate accounts.
- Session handling.
- Role-based redirects.

Cooperative applications must follow the backend verification process.

## FRONTEND PHASE 3 — USER DASHBOARDS AND PROFILES

Build:

- Farmer dashboard.
- Buyer dashboard.
- Cooperative dashboard.
- Transporter dashboard.
- Profile pages.
- Dashboard navigation.
- User account settings where supported.

Test:

- Role-specific access.
- Real dashboard data.
- Profile updates.
- Unauthorized access.

## FRONTEND PHASE 4 — MARKETPLACE AND INVENTORY

Build:

- Marketplace.
- Search.
- Filters.
- Produce categories.
- Listing details.
- Farmer listing management.
- Add and edit produce.
- Inventory overview.
- Image uploads.

Test:

- Real database listings.
- Create listing.
- Update listing.
- Inventory quantities.
- Availability.
- Expired reservations.
- Unauthorized listing changes.

## FRONTEND PHASE 5 — BUYER REQUESTS

Build:

- Create buyer request.
- Request discovery.
- Request details.
- Request management.
- Matching produce and requests.

Test:

- Create request.
- Validation.
- Search and filters.
- Update and cancellation.
- Expiry behaviour.

## FRONTEND PHASE 6 — MESSAGING AND COMMUNICATION

Build:

- Conversation list.
- Chat interface.
- Message history.
- Send messages.
- Unread indicators.
- Real-time updates.

Test:

- Message persistence.
- Socket.IO connection.
- Reconnection.
- Read status.
- Conversation access permissions.

## FRONTEND PHASE 7 — OFFERS, ORDERS AND PAYMENTS

Build:

- Offers.
- Counteroffers.
- Offer history.
- Orders.
- Reservations.
- Paystack checkout.
- Payment status.
- Order history.

Test:

- Offer lifecycle.
- Accepted offers.
- Order creation.
- Reservation behaviour.
- Paystack test checkout.
- Backend payment verification.
- Duplicate payment events.
- Failed and expired payments.

Never use live payment credentials during development testing.

## FRONTEND PHASE 8 — DELIVERY AND NOTIFICATIONS

Build:

- Delivery requests.
- Available deliveries.
- Assigned deliveries.
- Delivery status.
- Delivery history.
- Notification center.
- Notification preferences.

Test:

- Delivery assignment.
- Status transitions.
- Buyer confirmation.
- Notification delivery and read state.

## FRONTEND PHASE 9 — INTELLIGENCE, TRUST AND FARMER PROTECTION

Build:

- Market intelligence.
- Price trends.
- Ratings and reviews.
- Verification status.
- Integrity AI admin interface.
- AgroConnect AI Assistant.
- Farmer-agent permissions.
- Farmer approvals.
- Complaints.
- Cooperative agent activity.

Test:

- Real analytics data.
- Review eligibility.
- Verification permissions.
- AI responses.
- Farmer consent.
- Agent restrictions.
- Complaint access.
- Admin authorization.

## FRONTEND PHASE 10 — FINAL TESTING AND POLISH

Complete:

- Full responsive review.
- Accessibility review.
- Performance optimization.
- SEO review.
- Error handling.
- Authentication review.
- Security review.
- End-to-end testing.
- Deployment preparation.
- Final UI consistency review.

Test complete farmer, buyer, cooperative and transporter journeys.

Do not claim production readiness without actual deployment and verification.

---

# 33. PHASE COMPLETION REPORT FORMAT

At the end of every phase, provide the following report:

## Phase completed

State the phase number and name.

## Frontend implementation

List all pages and components created or updated.

## Backend integration

List actual endpoints integrated and what they do.

## Testing results

| Test | Result |
|---|---|
| Frontend rendering | Passed / Failed / Not tested |
| Backend connection | Passed / Failed / Blocked |
| Database persistence | Passed / Failed / Not tested |
| Authentication | Passed / Failed / Not applicable |
| Role permissions | Passed / Failed / Not tested |
| Mobile responsiveness | Passed / Failed / Not tested |
| Production build | Passed / Failed / Not tested |

## Remaining issues

List unresolved issues honestly.

## Manual testing instructions

Give exact steps to reproduce and test the feature.

## Next phase

State the next phase without automatically implementing it.

Classify features as:

- Implemented and integration-tested.
- Implemented but not integration-tested.
- Frontend complete, backend unavailable.
- Blocked.
- Not implemented.

---

# 34. FINAL RULES

1. Follow the AgroConnect brand identity.
2. Maintain the soft faded design throughout the application.
3. Use authentic agricultural photographs.
4. Keep interfaces simple and professional.
5. Do not create generic AI-looking interfaces.
6. Do not invent backend APIs.
7. Connect features to the real backend as they are built.
8. Test each feature before proceeding.
9. Preserve existing working functionality.
10. Respect cooperative-only agent registration.
11. Respect farmer consent and ownership.
12. Protect payment information.
13. Never fake successful operations.
14. Do not claim untested features are complete.
15. Do not automatically proceed to the next phase.

## THE AGROCONNECT DEVELOPMENT RULE

**Design → Build → Connect to Backend → Run → Test → Fix → Review → Continue.**

The goal is not simply to build a beautiful website.

The goal is to build a complete, reliable, professional and genuinely functional agricultural marketplace.

Every phase must contribute to that goal.