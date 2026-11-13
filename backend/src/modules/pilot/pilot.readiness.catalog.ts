/**
 * Phase 18 — evidence-based pilot readiness catalogue.
 *
 * This file is intentionally free of database and environment imports so the
 * status vocabulary and module list can be unit tested without a database.
 * Runtime configuration is merged in by pilot.readiness.service.ts.
 */

export type ImplementationStatus =
  | "implemented"
  | "partial"
  | "not_implemented";

export type TestingStatus =
  | "implemented_not_tested"
  | "testing_in_progress"
  | "passed"
  | "blocked"
  | "sandbox_tested_only";

export type IntegrationStatus =
  | "integrated"
  | "sandbox_only"
  | "not_configured"
  | "blocked";

export type PilotReadinessStatus =
  | "not_implemented"
  | "implemented_not_tested"
  | "testing_in_progress"
  | "passed"
  | "blocked"
  | "sandbox_tested_only"
  | "prepared_awaiting_provider_approval"
  | "ready_for_controlled_pilot";

export type ReadinessCategory =
  | "core"
  | "marketplace"
  | "payments"
  | "accessibility"
  | "trust"
  | "security";

export interface ReadinessModuleDefinition {
  key: string;
  name: string;
  category: ReadinessCategory;
  critical: boolean;
  implementation_status: ImplementationStatus;
  testing_status: TestingStatus;
  integration_status: IntegrationStatus;
  pilot_readiness: PilotReadinessStatus;
  evidence: string[];
  known_issues: string[];
  dependencies: string[];
}

export interface ReadinessRuntimeConfig {
  node_env: string;
  paystack_configured: boolean;
  paystack_mode: string;
  paystack_webhook_secret_configured: boolean;
  sms_provider: string;
  email_provider: string;
  ai_provider: string;
  telecom_enabled: boolean;
  ussd_enabled: boolean;
  voice_enabled: boolean;
  africastalking_environment: string;
  ussd_service_code_configured: boolean;
  ussd_callback_secret_configured: boolean;
  voice_number_configured: boolean;
  voice_callback_secret_configured: boolean;
  database_ssl_enabled: boolean;
  frontend_url_configured: boolean;
}

export const READINESS_STATUSES: readonly PilotReadinessStatus[] = [
  "not_implemented",
  "implemented_not_tested",
  "testing_in_progress",
  "passed",
  "blocked",
  "sandbox_tested_only",
  "prepared_awaiting_provider_approval",
  "ready_for_controlled_pilot",
];

const TEST_EVIDENCE = {
  auth: "backend/tests/auth.test.ts",
  phase4: "backend/tests/phase4.test.ts",
  phase5: "backend/tests/phase5.test.ts",
  phase6: "backend/tests/phase6.test.ts",
  phase7: "backend/tests/phase7.test.ts",
  phase8: "backend/tests/phase8.test.ts",
  phase9: "backend/tests/phase9.test.ts",
  phase10: "backend/tests/phase10.test.ts",
  phase11: "backend/tests/phase11.test.ts",
  phase12: "backend/tests/phase12.test.ts",
  phase13: "backend/tests/phase13.test.ts",
  phase14: "backend/tests/phase14.test.ts",
  phase16: "backend/tests/phase16.test.ts",
  phase17: "backend/tests/phase17.test.ts",
  phase18: "backend/tests/phase18.test.ts",
};

export const READINESS_MODULES: readonly ReadinessModuleDefinition[] = [
  {
    key: "registration_authentication",
    name: "Registration and authentication",
    category: "core",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/auth",
      "backend/src/services/token.service.ts",
      "backend/src/middleware/authenticate.ts",
      TEST_EVIDENCE.auth,
    ],
    known_issues: [
      "Automated tests exist but must be executed against an isolated test database before pilot sign-off.",
    ],
    dependencies: ["PostgreSQL", "SMS/email verification providers"],
  },
  {
    key: "farmer_profiles",
    name: "Farmer profiles",
    category: "core",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/farmers",
      "backend/src/modules/profiles",
      TEST_EVIDENCE.phase4,
    ],
    known_issues: [],
    dependencies: ["Authentication"],
  },
  {
    key: "buyer_profiles",
    name: "Buyer profiles",
    category: "core",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/profiles",
      "backend/src/modules/buyer-requests",
      TEST_EVIDENCE.phase4,
    ],
    known_issues: [
      "Buyers use the shared user profile model; no separate buyer business profile model exists.",
    ],
    dependencies: ["Authentication"],
  },
  {
    key: "produce_listings_inventory",
    name: "Produce listings and inventory",
    category: "marketplace",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/listings",
      "backend/src/modules/produce",
      "backend/src/database/migrations/20261104000003-create-produce-listings.ts",
      TEST_EVIDENCE.phase5,
    ],
    known_issues: [
      "Image uploads use local filesystem storage in development; Render's filesystem is ephemeral.",
    ],
    dependencies: ["Produce catalogue", "Object storage for production images"],
  },
  {
    key: "buyer_requests",
    name: "Buyer requests",
    category: "marketplace",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/buyer-requests",
      TEST_EVIDENCE.phase6,
    ],
    known_issues: [],
    dependencies: ["Produce catalogue", "Authentication"],
  },
  {
    key: "farmer_buyer_messaging",
    name: "Farmer–buyer messaging",
    category: "marketplace",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/messaging",
      "backend/src/realtime",
      TEST_EVIDENCE.phase7,
    ],
    known_issues: [
      "Socket.IO real-time delivery depends on a single backend instance unless a shared adapter is configured.",
    ],
    dependencies: ["Authentication", "WebSocket or polling fallback"],
  },
  {
    key: "offers_negotiations",
    name: "Offers and negotiations",
    category: "marketplace",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/offers",
      TEST_EVIDENCE.phase8,
    ],
    known_issues: [],
    dependencies: ["Listings", "Buyer requests", "Messaging"],
  },
  {
    key: "orders_reservations",
    name: "Orders and inventory reservations",
    category: "marketplace",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/orders",
      "backend/src/database/migrations/20261108000002-create-inventory-reservations.ts",
      TEST_EVIDENCE.phase9,
    ],
    known_issues: [
      "Concurrent reservation and offer acceptance behaviour must be load-tested before a public pilot.",
    ],
    dependencies: ["Offers", "Listings", "Background expiry worker"],
  },
  {
    key: "paystack_payments",
    name: "Paystack payments",
    category: "payments",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "sandbox_only",
    pilot_readiness: "sandbox_tested_only",
    evidence: [
      "backend/src/modules/payments",
      "backend/src/integrations/payments/paystack.client.ts",
      "backend/src/integrations/payments/paystack.signature.ts",
      TEST_EVIDENCE.phase9,
    ],
    known_issues: [
      "Live Paystack keys, settlement arrangement and marketplace/subaccount approval are external prerequisites.",
      "Payment success is only applied after independent backend verification or a valid signed webhook.",
    ],
    dependencies: ["Paystack account approval", "Public HTTPS webhook URL"],
  },
  {
    key: "transport_delivery",
    name: "Transport and delivery",
    category: "marketplace",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/deliveries",
      "backend/src/modules/transporters",
      TEST_EVIDENCE.phase10,
    ],
    known_issues: [
      "Transporter identity and vehicle verification require an operational review before assignment.",
    ],
    dependencies: ["Orders", "Verified transporters"],
  },
  {
    key: "notifications",
    name: "Notifications",
    category: "core",
    critical: false,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/notifications",
      TEST_EVIDENCE.phase11,
    ],
    known_issues: [
      "SMS and email delivery depend on Africa's Talking and Brevo credentials; dev adapters only log.",
    ],
    dependencies: ["Africa's Talking", "Brevo"],
  },
  {
    key: "reviews_verification",
    name: "Reviews and verification",
    category: "trust",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/reviews",
      "backend/src/modules/verifications",
      TEST_EVIDENCE.phase12,
    ],
    known_issues: [
      "Identity document review is an administrative process and needs pilot staffing.",
    ],
    dependencies: ["Private document storage", "Administrator review capacity"],
  },
  {
    key: "market_intelligence",
    name: "Market intelligence",
    category: "marketplace",
    critical: false,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/market",
      TEST_EVIDENCE.phase13,
    ],
    known_issues: [
      "Price insights depend on verified market observations; an empty pilot dataset shows no prices.",
    ],
    dependencies: ["Market observations from cooperatives or administrators"],
  },
  {
    key: "integrity_ai",
    name: "Integrity AI",
    category: "trust",
    critical: false,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/ai/integrity.service.ts",
      "backend/src/modules/ai/recommendations.service.ts",
      TEST_EVIDENCE.phase14,
    ],
    known_issues: [
      "Integrity AI is advisory only; it never performs business-changing actions automatically.",
    ],
    dependencies: ["Configured AI provider", "Administrator review"],
  },
  {
    key: "agroconnect_ai_assistant",
    name: "AgroConnect AI Assistant",
    category: "core",
    critical: false,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/ai/assistant.service.ts",
      TEST_EVIDENCE.phase14,
    ],
    known_issues: [
      "AI provider may run in deterministic dev mode until a production model is approved.",
    ],
    dependencies: ["Configured AI provider"],
  },
  {
    key: "farmer_protection",
    name: "Farmer protection",
    category: "trust",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/farmer-protection",
      "docs/phase16-farmer-protection.md",
      TEST_EVIDENCE.phase16,
    ],
    known_issues: [
      "Complaint investigation and evidence review require trained pilot administrators.",
    ],
    dependencies: ["Cooperative verification", "Administrator capacity"],
  },
  {
    key: "cooperative_agent_management",
    name: "Cooperative and agent management",
    category: "trust",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/modules/cooperatives",
      "backend/src/modules/agents",
      "backend/src/modules/farmer-protection",
      TEST_EVIDENCE.phase16,
    ],
    known_issues: [
      "Only verified cooperatives may nominate agents; independent agent registration is not supported by design.",
    ],
    dependencies: ["Cooperative verification", "Administrator approval"],
  },
  {
    key: "ussd_access",
    name: "USSD access",
    category: "accessibility",
    critical: false,
    implementation_status: "implemented",
    testing_status: "sandbox_tested_only",
    integration_status: "sandbox_only",
    pilot_readiness: "prepared_awaiting_provider_approval",
    evidence: [
      "backend/src/modules/telecom",
      "docs/phase17-telecom-localization.md",
      TEST_EVIDENCE.phase17,
    ],
    known_issues: [
      "No live short code has been provisioned or approved.",
      "Sandbox simulator success does not prove live carrier integration.",
    ],
    dependencies: [
      "Africa's Talking short-code approval",
      "Public HTTPS callback URL",
      "Callback secret or IP allowlist",
    ],
  },
  {
    key: "voice_ivr_access",
    name: "Voice/IVR access",
    category: "accessibility",
    critical: false,
    implementation_status: "implemented",
    testing_status: "sandbox_tested_only",
    integration_status: "sandbox_only",
    pilot_readiness: "prepared_awaiting_provider_approval",
    evidence: [
      "backend/src/modules/telecom/voice.controller.ts",
      "backend/src/modules/telecom/telecom.flows.ts",
      TEST_EVIDENCE.phase17,
    ],
    known_issues: [
      "Voice is keypad-driven IVR. No speech recognition or Hausa voice synthesis is implemented.",
      "No live voice number has been provisioned or approved.",
    ],
    dependencies: [
      "Africa's Talking voice number approval",
      "Public HTTPS callback URL",
      "Reviewed localized voice prompts",
    ],
  },
  {
    key: "security_deployment",
    name: "Security and deployment",
    category: "security",
    critical: true,
    implementation_status: "implemented",
    testing_status: "testing_in_progress",
    integration_status: "integrated",
    pilot_readiness: "testing_in_progress",
    evidence: [
      "backend/src/middleware",
      "backend/src/config/env.ts",
      "render.yaml",
      "docs/security.md",
      "docs/deployment.md",
      TEST_EVIDENCE.phase18,
    ],
    known_issues: [
      "Production environment variables, CORS, HTTPS, health checks and provider credentials must be verified on Render before pilot traffic.",
      "Automated security checks do not replace an independent penetration test.",
    ],
    dependencies: ["Render deployment", "Aiven PostgreSQL", "Provider approvals"],
  },
];

export function readinessModuleKeys(): string[] {
  return READINESS_MODULES.map((module) => module.key);
}
