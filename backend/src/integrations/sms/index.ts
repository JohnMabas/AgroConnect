import { env } from "../../config/env.js";
import { DevSmsAdapter } from "./dev-sms.adapter.js";
import type { SmsProvider } from "./sms-provider.interface.js";

let _smsProvider: SmsProvider | undefined;

export function getSmsProvider(): SmsProvider {
  if (_smsProvider === undefined) {
    const provider = env.SMS_PROVIDER.toLowerCase();

    switch (provider) {
      case "dev":
        if (env.NODE_ENV === "production") {
          throw new Error(
            "SMS_PROVIDER=dev cannot be used in production. Configure a real SMS provider.",
          );
        }
        _smsProvider = new DevSmsAdapter();
        break;

      // Future providers can be added here:
      // case "africas-talking":
      //   _smsProvider = new AfricasTalkingAdapter({ apiKey: env.SMS_API_KEY! });
      //   break;

      default:
        throw new Error(
          `Unknown SMS_PROVIDER: "${env.SMS_PROVIDER}". Supported values: dev.`,
        );
    }
  }

  return _smsProvider;
}

// Exported for testing — allows injecting a mock provider.
export function setSmsProvider(provider: SmsProvider): void {
  _smsProvider = provider;
}
