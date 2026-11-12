import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { resolveTelecomActor, refreshTelecomActor } from "./telecom.actor.service.js";
import { handleTelecomInput, startTelecomMenu } from "./telecom.flows.js";
import {
  createVoiceCallSession,
  expireVoiceSessionIfNeeded,
  findVoiceCallEvent,
  findVoiceCallSession,
  markWebhookEvent,
  recordWebhookEvent,
  saveVoiceTurn,
  voiceCallbackEventKey,
} from "./telecom.sessions.service.js";
import { VoiceCallbackSchema } from "./telecom.validation.js";
import { buildVoiceHangupXml, buildVoiceMenuXml } from "./telecom.xml.js";
import type { TelecomActor } from "./telecom.types.js";

function xml(res: Response, body: string): void {
  res.status(200).type("application/xml").send(body);
}

function callbackUrl(req: Request): string {
  const base =
    env.VOICE_CALLBACK_URL ??
    `${req.protocol}://${req.get("host") ?? "localhost"}/api/voice`;
  try {
    const url = new URL(base);
    const secret = env.VOICE_CALLBACK_SECRET ?? env.TELECOM_CALLBACK_SECRET;
    if (secret) url.searchParams.set("secret", secret);
    return url.toString();
  } catch {
    return base;
  }
}

export async function voiceCallbackHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = VoiceCallbackSchema.safeParse(req.body);
  if (!parsed.success) {
    xml(res, buildVoiceHangupXml("Invalid request."));
    return;
  }

  const input = parsed.data;
  const existingSession = await findVoiceCallSession(input.sessionId);
  const eventKey = voiceCallbackEventKey(
    input.sessionId,
    input.digits,
    input.isActive,
  );

  const { event, duplicate } = await recordWebhookEvent({
    channel: "voice",
    eventKey,
    providerSessionId: input.sessionId,
    payload: input,
    metadata: {
      destination_number: input.destinationNumber,
      direction: input.direction,
    },
  });

  if (duplicate) {
    const cached = await findVoiceCallEvent(eventKey);
    if (cached) {
      xml(res, cached.response_xml);
      return;
    }
    xml(res, buildVoiceHangupXml("Duplicate request."));
    return;
  }

  try {
    let session = existingSession;
    let actor: TelecomActor;

    if (!session) {
      actor = await resolveTelecomActor(input.callerNumber);
      session = await createVoiceCallSession({
        providerSessionId: input.sessionId,
        callerNumber: input.callerNumber,
        destinationNumber: input.destinationNumber,
        direction: input.direction,
        userId: actor.userId,
        language: actor.language,
      });
    } else {
      actor = session.user_id
        ? await refreshTelecomActor(session.user_id, session.caller_number)
        : await resolveTelecomActor(session.caller_number);
      actor = { ...actor, language: session.language };
    }

    if (!input.isActive) {
      if (session.status === "active") {
        await session.update({
          status: "completed",
          ended_at: new Date(),
          last_activity_at: new Date(),
        });
      }
      await markWebhookEvent(event, "processed");
      xml(res, buildVoiceHangupXml("Thank you for calling AgroConnect. Goodbye."));
      return;
    }

    if (await expireVoiceSessionIfNeeded(session)) {
      await markWebhookEvent(event, "processed");
      xml(res, buildVoiceHangupXml("This call session has expired. Please dial again."));
      return;
    }

    actor = { ...actor, language: session.language };
    const flow = input.digits.length === 0
      ? await startTelecomMenu(actor, "voice")
      : await handleTelecomInput(
          actor,
          "voice",
          session.menu_key,
          session.context,
          input.digits,
          input.sessionId,
        );

    const responseXml = buildVoiceMenuXml({
      message: flow.message,
      end: flow.end,
      callbackUrl: callbackUrl(req),
    });

    await saveVoiceTurn({
      session,
      eventKey,
      digits: input.digits,
      menuKey: flow.menuKey,
      context: flow.context,
      action: flow.end ? "hangup" : "get_digits",
      responseXml,
      end: flow.end,
      metadata: { input_mode: flow.inputMode ?? "single" },
    });
    await markWebhookEvent(event, "processed");

    xml(res, responseXml);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice processing failed.";
    await markWebhookEvent(event, "failed", message.slice(0, 500));
    xml(
      res,
      buildVoiceHangupXml("Service temporarily unavailable. Please try again later."),
    );
  }
}
