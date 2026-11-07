import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import { ListReservationsQuerySchema } from "./orders.validation.js";
import { listReservations } from "./orders.service.js";

function zodErrorToFields(err: ZodError) {
  return err.errors.map((error) => ({
    field: error.path.join("."),
    message: error.message,
  }));
}

export async function listReservationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Authentication required." },
      });
      return;
    }

    const parsed = ListReservationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await listReservations(req.user.sub, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    const error = err as Error & { code?: string };
    if (error.code === "NOT_FOUND") {
      res
        .status(404)
        .json({ success: false, error: { message: error.message } });
      return;
    }
    next(err);
  }
}
