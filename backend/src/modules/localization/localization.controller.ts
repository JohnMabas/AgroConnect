import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import {
  LanguageCatalogQuerySchema,
  UpdateLanguagePreferenceSchema,
} from "./localization.validation.js";
import {
  getLanguagePreference,
  getLocalizedMessages,
  listLanguages,
  updateLanguagePreference,
} from "./localization.service.js";

function zodErrorToFields(err: ZodError) {
  return err.errors.map((error) => ({
    field: error.path.join("."),
    message: error.message,
  }));
}

function requireAuth(req: Request, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { message: "Authentication required." },
    });
    return false;
  }
  return true;
}

function handleServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  const error = err as Error & { code?: string };
  if (error.code === "INVALID_LANGUAGE") {
    res.status(422).json({ success: false, error: { message: error.message } });
    return;
  }
  next(err);
}

export function listLanguagesHandler(
  _req: Request,
  res: Response,
): void {
  res.json({
    success: true,
    data: {
      default_language: "en",
      languages: listLanguages(),
    },
  });
}

export function getMessagesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const parsed = LanguageCatalogQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }
    res.json({
      success: true,
      data: getLocalizedMessages(parsed.data.language),
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyLanguageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    res.json({
      success: true,
      data: {
        language: await getLanguagePreference(req.user!.sub),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMyLanguageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = UpdateLanguagePreferenceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }
    res.json({
      success: true,
      message: "Language preference updated.",
      data: {
        language: await updateLanguagePreference(
          req.user!.sub,
          parsed.data.preferred_language,
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
