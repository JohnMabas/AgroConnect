import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import {
  AddPilotParticipantSchema,
  CreatePilotConfigurationSchema,
  CreatePilotFeedbackSchema,
  ListPilotConfigurationsSchema,
  ListPilotFeedbackSchema,
  ListPilotParticipantsSchema,
  ReadinessOverrideSchema,
  UpdatePilotConfigurationSchema,
  UpdatePilotFeedbackSchema,
  UpdatePilotParticipantSchema,
} from "./pilot.validation.js";
import {
  addPilotParticipant,
  createPilotConfiguration,
  getActivePilotConfiguration,
  getMyPilotFeedback,
  getMyPilotParticipation,
  getPilotConfiguration,
  getPilotFeedback,
  getPilotMetrics,
  getReadinessReport,
  listMyPilotFeedback,
  listPilotConfigurations,
  listPilotFeedback,
  listPilotParticipants,
  submitPilotFeedback,
  updatePilotConfiguration,
  updatePilotFeedback,
  updatePilotParticipant,
  updateReadinessOverride,
} from "./pilot.service.js";

function requireAuth(req: Request, res: Response): boolean {
  if (!req.user) {
    res
      .status(401)
      .json({ success: false, error: { message: "Authentication required." } });
    return false;
  }
  return true;
}

function validationError(res: Response, error: ZodError): void {
  res.status(422).json({
    success: false,
    message: "Validation failed.",
    errors: error.errors.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

function handleError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  const error = err as Error & { code?: string; status?: number };
  const status =
    error.status ??
    (error.code === "NOT_FOUND"
      ? 404
      : error.code === "FORBIDDEN"
        ? 403
        : error.code === "CONFLICT"
          ? 409
          : error.code === "INVALID_OPERATION"
            ? 422
            : 500);
  if (status >= 500) {
    next(err);
    return;
  }
  res.status(status).json({
    success: false,
    error: { message: error.message },
  });
}

function param(req: Request, name: string): string {
  return String(req.params[name] ?? "");
}

// ─── Admin: readiness ───────────────────────────────────────────────────────

export async function adminGetReadinessHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const report = await getReadinessReport();
    res.json({ success: true, data: report });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminUpdateReadinessHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = ReadinessOverrideSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const report = await updateReadinessOverride(
      param(req, "configurationId"),
      param(req, "moduleKey"),
      parsed.data,
      req.user!.sub,
    );
    res.json({ success: true, data: report });
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Admin: pilot configurations ────────────────────────────────────────────

export async function adminListConfigurationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = ListPilotConfigurationsSchema.safeParse(req.query);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const result = await listPilotConfigurations(parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminCreateConfigurationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = CreatePilotConfigurationSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const configuration = await createPilotConfiguration(
      parsed.data,
      req.user!.sub,
    );
    res.status(201).json({ success: true, data: { configuration } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminGetConfigurationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const configuration = await getPilotConfiguration(
      param(req, "configurationId"),
    );
    res.json({ success: true, data: { configuration } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminUpdateConfigurationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = UpdatePilotConfigurationSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const configuration = await updatePilotConfiguration(
      param(req, "configurationId"),
      parsed.data,
    );
    res.json({ success: true, data: { configuration } });
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Admin: participants ────────────────────────────────────────────────────

export async function adminListParticipantsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = ListPilotParticipantsSchema.safeParse(req.query);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const result = await listPilotParticipants(
      param(req, "configurationId"),
      parsed.data,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminAddParticipantHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = AddPilotParticipantSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const participant = await addPilotParticipant(
      param(req, "configurationId"),
      parsed.data,
      req.user!.sub,
    );
    res.status(201).json({ success: true, data: { participant } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminUpdateParticipantHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = UpdatePilotParticipantSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const participant = await updatePilotParticipant(
      param(req, "configurationId"),
      param(req, "participantId"),
      parsed.data,
      req.user!.sub,
    );
    res.json({ success: true, data: { participant } });
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Admin: metrics and feedback ────────────────────────────────────────────

export async function adminGetMetricsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const metrics = await getPilotMetrics(param(req, "configurationId"));
    res.json({ success: true, data: metrics });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminListFeedbackHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = ListPilotFeedbackSchema.safeParse(req.query);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const result = await listPilotFeedback(parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminGetFeedbackHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const feedback = await getPilotFeedback(param(req, "feedbackId"));
    res.json({ success: true, data: { feedback } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminUpdateFeedbackHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = UpdatePilotFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const feedback = await updatePilotFeedback(
      param(req, "feedbackId"),
      parsed.data,
    );
    res.json({ success: true, data: { feedback } });
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Participant: active pilot and feedback ─────────────────────────────────

export async function getMyParticipationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const participation = await getMyPilotParticipation(req.user!.sub);
    res.json({ success: true, data: participation });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getActiveConfigurationHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const configuration = await getActivePilotConfiguration();
    res.json({ success: true, data: { configuration } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function submitFeedbackHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = CreatePilotFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const feedback = await submitPilotFeedback(req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data: { feedback } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listMyFeedbackHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = ListPilotFeedbackSchema.safeParse(req.query);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const result = await listMyPilotFeedback(req.user!.sub, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getMyFeedbackHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const feedback = await getMyPilotFeedback(
      req.user!.sub,
      param(req, "feedbackId"),
    );
    res.json({ success: true, data: { feedback } });
  } catch (err) {
    handleError(err, res, next);
  }
}
