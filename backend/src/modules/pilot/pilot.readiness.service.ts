import { env } from "../../config/env.js";
import { PilotConfiguration } from "../../database/models/index.js";
import {
  READINESS_MODULES,
  type IntegrationStatus,
  type PilotReadinessStatus,
  type ReadinessModuleDefinition,
  type ReadinessRuntimeConfig,
  type TestingStatus,
} from "./pilot.readiness.catalog.js";
import { toPilotConfigurationData } from "./pilot.serializers.js";
import type {
  LaunchRecommendation,
  PilotConfigurationData,
  PilotReadinessReport,
  ReadinessModuleData,
} from "./pilot.types.js";
import type { PilotReadinessOverride } from "../../database/models/pilot-configuration.model.js";

const PASSING: PilotReadinessStatus[] = [
  "passed",
  "ready_for_controlled_pilot",
];

const TERMINAL_BLOCKERS: PilotReadinessStatus[] = [
  "not_implemented",
  "blocked",
];

export function getReadinessRuntimeConfig(): ReadinessRuntimeConfig {
  return {
    node_env: env.NODE_ENV,
    paystack_configured: Boolean(env.PAYSTACK_SECRET_KEY),
    paystack_mode: env.PAYSTACK_MODE,
    paystack_webhook_secret_configured: Boolean(
      env.PAYSTACK_WEBHOOK_SIGNING_SECRET,
    ),
    sms_provider: env.SMS_PROVIDER,
    email_provider: env.EMAIL_PROVIDER,
    ai_provider: env.AI_PROVIDER,
    telecom_enabled: env.TELECOM_ENABLED,
    ussd_enabled: env.USSD_ENABLED,
    voice_enabled: env.VOICE_ENABLED,
    africastalking_environment: env.AFRICASTALKING_ENVIRONMENT,
    ussd_service_code_configured: Boolean(env.USSD_SERVICE_CODE),
    ussd_callback_secret_configured: Boolean(
      env.USSD_CALLBACK_SECRET ?? env.TELECOM_CALLBACK_SECRET,
    ),
    voice_number_configured: Boolean(env.VOICE_NUMBER),
    voice_callback_secret_configured: Boolean(
      env.VOICE_CALLBACK_SECRET ?? env.TELECOM_CALLBACK_SECRET,
    ),
    database_ssl_enabled: env.DB_SSL,
    frontend_url_configured: Boolean(env.FRONTEND_URL),
  };
}

interface RuntimeAdjustment {
  testing_status?: TestingStatus;
  integration_status?: IntegrationStatus;
  pilot_readiness?: PilotReadinessStatus;
  notes: string[];
}

function runtimeAdjustment(
  module: ReadinessModuleDefinition,
  runtime: ReadinessRuntimeConfig,
): RuntimeAdjustment {
  const notes: string[] = [];

  switch (module.key) {
    case "paystack_payments": {
      if (!runtime.paystack_configured) {
        notes.push("PAYSTACK_SECRET_KEY is not configured.");
        return {
          testing_status: "blocked",
          integration_status: "blocked",
          pilot_readiness: "blocked",
          notes,
        };
      }
      if (runtime.paystack_mode !== "live") {
        notes.push(
          "Paystack is running in test mode. Test-mode success does not prove live settlement.",
        );
        return {
          testing_status: "sandbox_tested_only",
          integration_status: "sandbox_only",
          pilot_readiness: "sandbox_tested_only",
          notes,
        };
      }
      notes.push(
        "Live Paystack keys detected. Marketplace/settlement approval and finance sign-off are still required.",
      );
      if (!runtime.paystack_webhook_secret_configured) {
        notes.push(
          "PAYSTACK_WEBHOOK_SIGNING_SECRET is not configured; webhook authenticity cannot be proven.",
        );
      }
      return {
        integration_status: "integrated",
        pilot_readiness: "prepared_awaiting_provider_approval",
        notes,
      };
    }
    case "ussd_access": {
      if (!runtime.telecom_enabled || !runtime.ussd_enabled) {
        notes.push("USSD is disabled by runtime configuration.");
        return {
          testing_status: "blocked",
          integration_status: "blocked",
          pilot_readiness: "blocked",
          notes,
        };
      }
      if (
        runtime.africastalking_environment !== "production" ||
        !runtime.ussd_service_code_configured
      ) {
        notes.push(
          "USSD is running in sandbox or no service code is provisioned.",
        );
        if (!runtime.ussd_callback_secret_configured) {
          notes.push("No USSD callback secret is configured.");
        }
        return {
          testing_status: "sandbox_tested_only",
          integration_status: "sandbox_only",
          pilot_readiness: "prepared_awaiting_provider_approval",
          notes,
        };
      }
      notes.push(
        "Production USSD settings detected. Live carrier approval and a real-device test are still required.",
      );
      return {
        integration_status: "integrated",
        pilot_readiness: "sandbox_tested_only",
        notes,
      };
    }
    case "voice_ivr_access": {
      if (!runtime.telecom_enabled || !runtime.voice_enabled) {
        notes.push("Voice/IVR is disabled by runtime configuration.");
        return {
          testing_status: "blocked",
          integration_status: "blocked",
          pilot_readiness: "blocked",
          notes,
        };
      }
      if (
        runtime.africastalking_environment !== "production" ||
        !runtime.voice_number_configured
      ) {
        notes.push(
          "Voice is running in sandbox or no voice number is provisioned.",
        );
        if (!runtime.voice_callback_secret_configured) {
          notes.push("No voice callback secret is configured.");
        }
        return {
          testing_status: "sandbox_tested_only",
          integration_status: "sandbox_only",
          pilot_readiness: "prepared_awaiting_provider_approval",
          notes,
        };
      }
      notes.push(
        "Production voice settings detected. Carrier approval and a real-device call test are still required.",
      );
      return {
        integration_status: "integrated",
        pilot_readiness: "sandbox_tested_only",
        notes,
      };
    }
    case "notifications": {
      if (
        runtime.sms_provider === "dev" ||
        runtime.email_provider === "dev"
      ) {
        notes.push(
          "SMS and/or email provider is set to the development adapter; messages are only logged.",
        );
        return {
          testing_status: "implemented_not_tested",
          integration_status: "not_configured",
          pilot_readiness: "implemented_not_tested",
          notes,
        };
      }
      return { notes };
    }
    case "agroconnect_ai_assistant":
    case "integrity_ai": {
      if (runtime.ai_provider === "dev") {
        notes.push("AI provider is running in deterministic development mode.");
        return {
          integration_status: "sandbox_only",
          pilot_readiness: "sandbox_tested_only",
          notes,
        };
      }
      return { notes };
    }
    case "security_deployment": {
      if (
        runtime.node_env === "production" &&
        (!runtime.database_ssl_enabled || !runtime.frontend_url_configured)
      ) {
        notes.push(
          "Production deployment is missing database SSL or FRONTEND_URL configuration.",
        );
        return {
          testing_status: "blocked",
          integration_status: "not_configured",
          pilot_readiness: "blocked",
          notes,
        };
      }
      if (runtime.node_env !== "production") {
        notes.push(
          "Not running in production. Render, HTTPS, CORS and provider credentials are unverified.",
        );
      }
      return { notes };
    }
    default:
      return { notes };
  }
}

function isReadinessStatus(value: unknown): value is PilotReadinessStatus {
  return (
    value === "not_implemented" ||
    value === "implemented_not_tested" ||
    value === "testing_in_progress" ||
    value === "passed" ||
    value === "blocked" ||
    value === "sandbox_tested_only" ||
    value === "prepared_awaiting_provider_approval" ||
    value === "ready_for_controlled_pilot"
  );
}

function isTestingStatus(value: unknown): value is TestingStatus {
  return (
    value === "implemented_not_tested" ||
    value === "testing_in_progress" ||
    value === "passed" ||
    value === "blocked" ||
    value === "sandbox_tested_only"
  );
}

function isIntegrationStatus(value: unknown): value is IntegrationStatus {
  return (
    value === "integrated" ||
    value === "sandbox_only" ||
    value === "not_configured" ||
    value === "blocked"
  );
}

function applyOverride(
  module: ReadinessModuleData,
  override: PilotReadinessOverride,
): ReadinessModuleData {
  const next: ReadinessModuleData = {
    ...module,
    evidence: [...module.evidence],
    known_issues: [...module.known_issues],
    override,
    source: "admin_review",
  };

  if (isTestingStatus(override.testing_status)) {
    next.testing_status = override.testing_status;
  }
  if (isIntegrationStatus(override.integration_status)) {
    next.integration_status = override.integration_status;
  }
  if (isReadinessStatus(override.pilot_readiness)) {
    next.pilot_readiness = override.pilot_readiness;
  }
  if (Array.isArray(override.known_issues)) {
    next.known_issues.push(...override.known_issues);
  }
  if (Array.isArray(override.evidence)) {
    next.evidence.push(...override.evidence);
  }
  if (override.notes) {
    next.runtime_notes.push(`Admin review: ${override.notes}`);
  }
  return next;
}

export function buildReadinessReport(
  configuration: PilotConfigurationData | null,
  runtime: ReadinessRuntimeConfig = getReadinessRuntimeConfig(),
): PilotReadinessReport {
  const modules: ReadinessModuleData[] = READINESS_MODULES.map((definition) => {
    const adjustment = runtimeAdjustment(definition, runtime);
    const base: ReadinessModuleData = {
      ...definition,
      evidence: [...definition.evidence],
      known_issues: [...definition.known_issues],
      dependencies: [...definition.dependencies],
      testing_status: adjustment.testing_status ?? definition.testing_status,
      integration_status:
        adjustment.integration_status ?? definition.integration_status,
      pilot_readiness:
        adjustment.pilot_readiness ?? definition.pilot_readiness,
      runtime_notes: adjustment.notes,
      override: null,
      source: "catalog",
    };
    const override = configuration?.readiness_overrides?.[definition.key];
    return override && typeof override === "object"
      ? applyOverride(base, override)
      : base;
  });

  const countsByReadiness: Record<string, number> = {};
  const countsByTesting: Record<string, number> = {};
  const countsByIntegration: Record<string, number> = {};
  for (const module of modules) {
    countsByReadiness[module.pilot_readiness] =
      (countsByReadiness[module.pilot_readiness] ?? 0) + 1;
    countsByTesting[module.testing_status] =
      (countsByTesting[module.testing_status] ?? 0) + 1;
    countsByIntegration[module.integration_status] =
      (countsByIntegration[module.integration_status] ?? 0) + 1;
  }

  const criticalModules = modules.filter((module) => module.critical);
  const criticalBlockers = criticalModules
    .filter((module) => !PASSING.includes(module.pilot_readiness))
    .map((module) => module.key);
  const providerApprovals = modules
    .filter(
      (module) =>
        module.pilot_readiness ===
        "prepared_awaiting_provider_approval",
    )
    .map((module) => module.key);

  let launchRecommendation: LaunchRecommendation = "INTERNAL_TESTING_READY";
  let recommendationReason =
    "Critical modules are implemented but have not all passed evidence review.";

  if (
    criticalModules.some((module) =>
      TERMINAL_BLOCKERS.includes(module.pilot_readiness),
    )
  ) {
    launchRecommendation = "NOT_READY";
    recommendationReason =
      "At least one critical module is not implemented or is blocked.";
  } else if (
    criticalModules.length > 0 &&
    criticalModules.every((module) =>
      PASSING.includes(module.pilot_readiness),
    )
  ) {
    launchRecommendation = "CONTROLLED_PILOT_READY";
    recommendationReason =
      "Every critical module has recorded passing evidence or an explicit controlled-pilot approval.";
  }

  return {
    generated_at: new Date(),
    pilot_configuration: configuration,
    launch_recommendation: launchRecommendation,
    recommendation_reason: recommendationReason,
    summary: {
      total_modules: modules.length,
      critical_modules: criticalModules.length,
      counts_by_readiness: countsByReadiness,
      counts_by_testing: countsByTesting,
      counts_by_integration: countsByIntegration,
      critical_blockers: criticalBlockers,
      modules_awaiting_provider_approval: providerApprovals,
    },
    modules,
  };
}

export async function getActivePilotConfigurationRow(): Promise<
  PilotConfiguration | null
> {
  return PilotConfiguration.findOne({
    where: { is_active: true },
    order: [["created_at", "DESC"]],
  });
}

export async function getPilotReadinessReport(): Promise<PilotReadinessReport> {
  const row = await getActivePilotConfigurationRow();
  return buildReadinessReport(
    row ? toPilotConfigurationData(row) : null,
  );
}
