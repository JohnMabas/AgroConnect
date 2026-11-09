import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import {
  ApproveVerificationSchema,
  ListVerificationsQuerySchema,
  RejectVerificationSchema,
  SubmitVerificationSchema,
  UploadVerificationDocumentSchema,
  VerificationDocumentIdSchema,
  VerificationIdSchema,
} from "./verifications.validation.js";
import {
  addVerificationDocument,
  adminApproveVerification,
  adminListVerifications,
  adminRejectVerification,
  deleteVerificationDocument,
  downloadVerificationDocument,
  getMyVerificationStatus,
  getTrustProfile,
  getVerificationDetail,
  submitVerification,
} from "./verifications.service.js";

function zodErrorToFields(error: ZodError) {
  return error.errors.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

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
    errors: zodErrorToFields(error),
  });
}

function parseUuid(
  value: unknown,
  schema: typeof VerificationIdSchema,
  res: Response,
): string | undefined {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return undefined;
  }
  return parsed.data;
}

function handleServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  const error = err as Error & { code?: string };
  switch (error.code) {
    case "NOT_FOUND":
      res
        .status(404)
        .json({ success: false, error: { message: error.message } });
      return;
    case "FORBIDDEN":
      res
        .status(403)
        .json({ success: false, error: { message: error.message } });
      return;
    case "INVALID_OPERATION":
      res
        .status(422)
        .json({ success: false, error: { message: error.message } });
      return;
    case "CONFLICT":
      res
        .status(409)
        .json({ success: false, error: { message: error.message } });
      return;
    case "STORAGE_ERROR":
      res
        .status(500)
        .json({ success: false, error: { message: error.message } });
      return;
    default:
      next(err);
  }
}

function isAdmin(req: Request): boolean {
  return req.user?.roles?.includes("admin") ?? false;
}

export async function submitVerificationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = SubmitVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    res.status(201).json({
      success: true,
      message: "Verification request submitted.",
      data: {
        verification: await submitVerification(
          req.user!.sub,
          parsed.data.verification_type,
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getMyVerificationStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    res.json({
      success: true,
      data: await getMyVerificationStatus(req.user!.sub),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getVerificationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseUuid(req.params["id"], VerificationIdSchema, res);
    if (!id) return;

    res.json({
      success: true,
      data: {
        verification: await getVerificationDetail(
          id,
          req.user!.sub,
          isAdmin(req),
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function uploadVerificationDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseUuid(req.params["id"], VerificationIdSchema, res);
    if (!id) return;

    if (!req.file) {
      res.status(422).json({
        success: false,
        error: {
          message: "Upload a document using the 'document' field.",
        },
      });
      return;
    }

    const parsed = UploadVerificationDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    res.status(201).json({
      success: true,
      message: "Verification document uploaded.",
      data: {
        document: await addVerificationDocument(
          req.user!.sub,
          id,
          req.file,
          parsed.data,
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function deleteVerificationDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseUuid(req.params["id"], VerificationIdSchema, res);
    if (!id) return;
    const documentId = parseUuid(
      req.params["documentId"],
      VerificationDocumentIdSchema,
      res,
    );
    if (!documentId) return;

    await deleteVerificationDocument(req.user!.sub, id, documentId);
    res.json({
      success: true,
      message: "Verification document deleted.",
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function downloadVerificationDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const id = parseUuid(req.params["id"], VerificationIdSchema, res);
    if (!id) return;
    const documentId = parseUuid(
      req.params["documentId"],
      VerificationDocumentIdSchema,
      res,
    );
    if (!documentId) return;

    const document = await downloadVerificationDocument(
      req.user!.sub,
      id,
      documentId,
      isAdmin(req),
    );
    const safeFileName = document.originalFileName.replace(
      /["\\\r\n]/g,
      "_",
    );

    res.setHeader("Content-Type", document.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFileName}"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(document.buffer);
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function adminListVerificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = ListVerificationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    res.json({
      success: true,
      data: await adminListVerifications(parsed.data),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function adminGetVerificationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseUuid(req.params["id"], VerificationIdSchema, res);
    if (!id) return;

    res.json({
      success: true,
      data: {
        verification: await getVerificationDetail(id, req.user!.sub, true),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function adminApproveVerificationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseUuid(req.params["id"], VerificationIdSchema, res);
    if (!id) return;

    const parsed = ApproveVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    res.json({
      success: true,
      message: "Verification approved.",
      data: {
        verification: await adminApproveVerification(
          req.user!.sub,
          id,
          parsed.data.note,
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function adminRejectVerificationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseUuid(req.params["id"], VerificationIdSchema, res);
    if (!id) return;

    const parsed = RejectVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }

    res.json({
      success: true,
      message: "Verification rejected.",
      data: {
        verification: await adminRejectVerification(
          req.user!.sub,
          id,
          parsed.data.reason,
        ),
      },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}

export async function getTrustProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = parseUuid(req.params["userId"], VerificationIdSchema, res);
    if (!userId) return;

    res.json({
      success: true,
      data: { trust_profile: await getTrustProfile(userId) },
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
}
