export type TelecomChannel = "ussd" | "voice";

export type TelecomActorStatus =
  | "guest"
  | "pending"
  | "active"
  | "suspended";

export interface TelecomActor {
  userId: string | null;
  roles: string[];
  status: TelecomActorStatus;
  displayName: string | null;
  phoneNumber: string;
  language: string;
}

export interface TelecomFlowResult {
  menuKey: string;
  context: Record<string, unknown>;
  message: string;
  end: boolean;
  inputMode?: "single" | "number";
  language?: string;
  metadata?: Record<string, unknown>;
}

export interface UssdCallbackInput {
  sessionId: string;
  phoneNumber: string;
  networkCode?: string | null;
  serviceCode?: string | null;
  text: string;
}

export interface VoiceCallbackInput {
  sessionId: string;
  callerNumber: string;
  destinationNumber?: string | null;
  direction?: string | null;
  isActive: boolean;
  digits: string;
}
