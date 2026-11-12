import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { resolveTelecomActor, refreshTelecomActor } from "./telecom.actor.service.js";
import {
  handleTelecomInput,
  startTelecomMenu,
} from "./telecom.flows.js";
import {
  createUssdSession,
  expireUssdSessionIfNeeded,
  findUssdSession,
  findUssdSessionEvent,
  markWebhookEvent,
  recordWebhookEvent,
  saveUssdTurn,
  ussdEventKey,
} from "./telecom.sessions.service.js";
import { UssdCallbackSchema } from "./telecom.validation.js";
import type { TelecomActor } from "./telecom.types.js";
import { UssdSession } from "../../database/models/index.js";
import { buildUssdSessionData } from "./telecom.admin.types.js";

function plain(res: Response, status: number, body: string): void {
  res.status(status).type("text/plain").send(body);
}

function truncate(value: string): string {
  return value.slice(0, env.USSD_MAX_RESPONSE_LENGTH);
}

function responseText(type: "CON" | "END", text: string): string {
  return `${type} ${truncate(text)}`;
}

export async function ussdCallbackHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = UssdCallbackSchema.safeParse(req.body);
  if (!parsed.success) {
    plain(res, 400, "END Invalid request.");
    return;
  }

  const input = parsed.data;
  const lastInput = input.text.split("*").pop() ?? "";
  const eventKey = ussdEventKey(input.sessionId, input.text);

  const { event, duplicate } = await recordWebhookEvent({
    channel: "ussd",
    eventKey,
    providerSessionId: input.sessionId,
    payload: input,
    metadata: {
      network_code: input.networkCode,
      service_code: input.serviceCode,
    },
  });

  if (duplicate) {
    const cached = await findUssdSessionEvent(eventKey);
    if (cached) {
      plain(res, 200, responseText(cached.response_type, cached.response_text));
      return;
    }
    plain(res, 200, "END Duplicate request.");
    return;
  }

  let session = await findUssdSession(input.sessionId);
  let actor: TelecomActor;

  try {
    if (!session) {
      actor = await resolveTelecomActor(input.phoneNumber);
      session = await createUssdSession({
        providerSessionId: input.sessionId,
        phoneNumber: input.phoneNumber,
        networkCode: input.networkCode,
        serviceCode: input.serviceCode,
        userId: actor.userId,
        language: actor.language,
      });
    } else {
      actor = session.user_id
        ? await refreshTelecomActor(session.user_id, session.phone_number)
        : await resolveTelecomActor(session.phone_number);
      actor = { ...actor, language: session.language };

      if (await expireUssdSessionIfNeeded(session)) {
        const text = "Session expired. Please dial again.";
        await markWebhookEvent(event, "processed");
        plain(res, 200, responseText("END", text));
        return;
      }
    }

    actor = { ...actor, language: session.language };
    const flow = input.text.length === 0
      ? await startTelecomMenu(actor, "ussd")
      : await handleTelecomInput(
          actor,
          "ussd",
          session.menu_key,
          session.context,
          lastInput,
          input.sessionId,
        );

    const type: "CON" | "END" = flow.end ? "END" : "CON";
    const text = truncate(flow.message);

    await saveUssdTurn({
      session,
      eventKey,
      input: lastInput,
      menuKey: flow.menuKey,
      context: flow.context,
      language: flow.language,
      responseType: type,
      responseText: text,
      metadata: { input_mode: flow.inputMode ?? "single" },
    });
    await markWebhookEvent(event, "processed");

    plain(res, 200, responseText(type, text));
  } catch (err) {
    const message = err instanceof Error ? err.message : "USSD processing failed.";
    await markWebhookEvent(event, "failed", message.slice(0, 500));
    plain(res, 200, responseText("END", "Service temporarily unavailable. Please try again later."));
  }
}

function paramId(req: Request): string | null {
  const value = req.params.id;
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

export async function getUssdSessionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const id = paramId(req);
  if (!id) {
    res.status(400).json({
      success: false,
      error: { message: "Invalid USSD session ID." },
    });
    return;
  }
  const session = await UssdSession.findByPk(id);
  if (!session) {
    res.status(404).json({
      success: false,
      error: { message: "USSD session not found." },
    });
    return;
  }
  if (session.user_id !== req.user?.sub) {
    res.status(403).json({
      success: false,
      error: { message: "You do not have access to this USSD session." },
    });
    return;
  }
  res.json({ success: true, data: { session: buildUssdSessionData(session) } });
}

export async function terminateUssdSessionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const id = paramId(req);
  if (!id) {
    res.status(400).json({
      success: false,
      error: { message: "Invalid USSD session ID." },
    });
    return;
  }
  const session = await UssdSession.findByPk(id);
  if (!session) {
    res.status(404).json({
      success: false,
      error: { message: "USSD session not found." },
    });
    return;
  }
  if (session.user_id !== req.user?.sub) {
    res.status(403).json({
      success: false,
      error: { message: "You do not have access to this USSD session." },
    });
    return;
  }
  if (session.status === "active") {
    await session.update({
      status: "completed",
      ended_at: new Date(),
      last_activity_at: new Date(),
    });
  }
  res.json({
    success: true,
    message: "USSD session terminated.",
    data: { session: buildUssdSessionData(session) },
  });
}
