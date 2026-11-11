import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";
import {
  AddInvestigationNoteSchema,
  AgentStatusActionSchema,
  CreateApprovalSchema,
  CreateComplaintSchema,
  CreateRelationshipSchema,
  ComplaintEvidenceSchema,
  DecideApprovalSchema,
  GrantConsentSchema,
  InviteAgentSchema,
  ListQuerySchema,
  RevokeRelationshipSchema,
  UpdateComplaintSchema,
  VerifyAgentSchema,
} from "./farmer-protection.validation.js";
import {
  addComplaintEvidence,
  addComplaintInvestigation,
  adminListAgentProfiles,
  adminListComplaints,
  adminReviewAgentVerification,
  adminSuspendAgent,
  adminUpdateComplaint,
  createComplaint,
  createRelationship,
  decideApproval,
  getComplaint,
  grantConsent,
  inviteAgent,
  listAgentApprovals,
  listAgentRelationships,
  listAgentVerifications,
  listAuditLogs,
  listConsentRecords,
  listCooperativeAgentProfiles,
  listCooperativeAuditLogs,
  listCooperativeRelationships,
  listFarmerApprovals,
  listFarmerComplaints,
  listFarmerRelationships,
  listOrderFeeDisclosures,
  readComplaintEvidence,
  requestApproval,
  revokeRelationship,
} from "./farmer-protection.service.js";

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

function parseQuery(req: Request, res: Response) {
  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return undefined;
  }
  return parsed.data;
}

function param(req: Request, name: string): string {
  return String(req.params[name] ?? "");
}

function clientContext(req: Request) {
  return {
    ip: req.ip ?? req.socket.remoteAddress ?? null,
    userAgent: req.get("user-agent") ?? null,
  };
}

function isAdmin(req: Request): boolean {
  return req.user?.roles?.includes("admin") ?? false;
}

// ─── Cooperative agent management ────────────────────────────────────────────

export async function inviteAgentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = InviteAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const profile = await inviteAgent(
      req.user!.sub,
      param(req, "id"),
      parsed.data,
    );
    res.status(201).json({
      success: true,
      message: "Agent invited. Verification is required before activation.",
      data: { agent: profile },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listCooperativeAgentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseQuery(req, res);
    if (!query) return;
    const result = await listCooperativeAgentProfiles(
      req.user!.sub,
      param(req, "id"),
      query.page,
      query.limit,
      query.status,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listAgentVerificationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const records = await listAgentVerifications(
      param(req, "agentProfileId"),
      req.user!.sub,
      isAdmin(req),
    );
    res.json({ success: true, data: { verifications: records } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminListAgentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseQuery(req, res);
    if (!query) return;
    const verificationStatus = req.query["verification_status"] as
      | string
      | undefined;
    const result = await adminListAgentProfiles(
      query.page,
      query.limit,
      query.status,
      verificationStatus,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminVerifyAgentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = VerifyAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const agent = await adminReviewAgentVerification(
      req.user!.sub,
      param(req, "agentProfileId"),
      parsed.data.status,
      parsed.data.notes,
    );
    res.json({
      success: true,
      message: `Agent verification ${parsed.data.status}.`,
      data: { agent },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminSuspendAgentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = AgentStatusActionSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const agent = await adminSuspendAgent(
      req.user!.sub,
      param(req, "agentProfileId"),
      parsed.data.reason,
    );
    res.json({
      success: true,
      message: "Agent suspended.",
      data: { agent },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Relationships and consent ───────────────────────────────────────────────

export async function createFarmerRelationshipHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = CreateRelationshipSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const relationship = await createRelationship(
      req.user!.sub,
      "farmer",
      parsed.data,
    );
    res.status(201).json({
      success: true,
      message: "Agent relationship requested.",
      data: { relationship },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function createAgentRelationshipHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = CreateRelationshipSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const relationship = await createRelationship(
      req.user!.sub,
      "agent",
      parsed.data,
    );
    res.status(201).json({
      success: true,
      message: "Farmer consent requested.",
      data: { relationship },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listFarmerRelationshipsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const relationships = await listFarmerRelationships(req.user!.sub);
    res.json({ success: true, data: { relationships } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listAgentRelationshipsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const relationships = await listAgentRelationships(req.user!.sub);
    res.json({ success: true, data: { relationships } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listCooperativeRelationshipsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseQuery(req, res);
    if (!query) return;
    const result = await listCooperativeRelationships(
      req.user!.sub,
      param(req, "id"),
      query.page,
      query.limit,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function grantConsentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = GrantConsentSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const relationship = await grantConsent(
      req.user!.sub,
      param(req, "relationshipId"),
      parsed.data,
      clientContext(req),
    );
    res.json({
      success: true,
      message: "Consent granted. The agent can now act only within the permissions you approved.",
      data: { relationship },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function revokeRelationshipHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = RevokeRelationshipSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const relationship = await revokeRelationship(
      req.user!.sub,
      param(req, "relationshipId"),
      parsed.data.reason,
      clientContext(req),
    );
    res.json({
      success: true,
      message: "Consent revoked. The agent no longer has access.",
      data: { relationship },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listConsentRecordsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const records = await listConsentRecords(req.user!.sub);
    res.json({ success: true, data: { consent_records: records } });
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Approvals ───────────────────────────────────────────────────────────────

export async function requestApprovalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = CreateApprovalSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const approval = await requestApproval(req.user!.sub, parsed.data);
    res.status(201).json({
      success: true,
      message: "Farmer approval requested. No action will be applied without consent.",
      data: { approval },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listFarmerApprovalsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const approvals = await listFarmerApprovals(
      req.user!.sub,
      req.query["status"] as string | undefined,
    );
    res.json({ success: true, data: { approvals } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listAgentApprovalsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const approvals = await listAgentApprovals(
      req.user!.sub,
      req.query["status"] as string | undefined,
    );
    res.json({ success: true, data: { approvals } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function approveHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = DecideApprovalSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const approval = await decideApproval(
      req.user!.sub,
      param(req, "approvalId"),
      "approve",
      parsed.data.note,
    );
    res.json({
      success: true,
      message: approval.failure_reason
        ? "Approval recorded, but the action could not be applied."
        : "Approval granted and the action was applied.",
      data: { approval },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function rejectHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = DecideApprovalSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const approval = await decideApproval(
      req.user!.sub,
      param(req, "approvalId"),
      "reject",
      parsed.data.note,
    );
    res.json({
      success: true,
      message: "Approval rejected. No action was applied.",
      data: { approval },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Complaints ──────────────────────────────────────────────────────────────

export async function createComplaintHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = CreateComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const complaint = await createComplaint(req.user!.sub, parsed.data);
    res.status(201).json({
      success: true,
      message: "Complaint submitted.",
      data: { complaint },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listFarmerComplaintsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseQuery(req, res);
    if (!query) return;
    const result = await listFarmerComplaints(
      req.user!.sub,
      query.page,
      query.limit,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getFarmerComplaintHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const complaint = await getComplaint(
      req.user!.sub,
      param(req, "complaintId"),
      false,
    );
    res.json({ success: true, data: { complaint } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function addEvidenceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    if (!req.file) {
      res.status(422).json({
        success: false,
        error: { message: "Upload one evidence file using the 'document' field." },
      });
      return;
    }
    const parsed = ComplaintEvidenceSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const evidence = await addComplaintEvidence(
      req.user!.sub,
      param(req, "complaintId"),
      req.file,
      parsed.data.description,
    );
    res.status(201).json({
      success: true,
      message: "Evidence added.",
      data: { evidence },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function downloadEvidenceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const { buffer, evidence } = await readComplaintEvidence(
      req.user!.sub,
      param(req, "complaintId"),
      param(req, "evidenceId"),
      isAdmin(req),
    );
    res.setHeader("Content-Type", evidence.file_type);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(evidence.original_file_name)}"`,
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(buffer);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminListComplaintsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseQuery(req, res);
    if (!query) return;
    const result = await adminListComplaints(
      query.page,
      query.limit,
      query.status,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminGetComplaintHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const complaint = await getComplaint(
      req.user!.sub,
      param(req, "complaintId"),
      true,
    );
    res.json({ success: true, data: { complaint } });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminUpdateComplaintHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = UpdateComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    const complaint = await adminUpdateComplaint(
      req.user!.sub,
      param(req, "complaintId"),
      parsed.data,
    );
    res.json({
      success: true,
      message: "Complaint updated.",
      data: { complaint },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminAddInvestigationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const parsed = AddInvestigationNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res, parsed.error);
      return;
    }
    await addComplaintInvestigation(
      req.user!.sub,
      param(req, "complaintId"),
      parsed.data.action,
      parsed.data.notes,
      parsed.data.decision,
    );
    const complaint = await getComplaint(
      req.user!.sub,
      param(req, "complaintId"),
      true,
    );
    res.status(201).json({
      success: true,
      message: "Investigation note added.",
      data: { complaint },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Audit and fee disclosures ───────────────────────────────────────────────

export async function listFarmerAuditHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseQuery(req, res);
    if (!query) return;
    const result = await listAuditLogs(
      { farmer_user_id: req.user!.sub },
      query.page,
      query.limit,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listAgentAuditHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseQuery(req, res);
    if (!query) return;
    const result = await listAuditLogs(
      { agent_user_id: req.user!.sub },
      query.page,
      query.limit,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listCooperativeAuditHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseQuery(req, res);
    if (!query) return;
    const result = await listCooperativeAuditLogs(
      req.user!.sub,
      param(req, "id"),
      query.page,
      query.limit,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function adminListAuditHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const query = parseQuery(req, res);
    if (!query) return;
    const where: Record<string, unknown> = {};
    for (const key of [
      "cooperative_id",
      "agent_user_id",
      "farmer_user_id",
      "action",
    ]) {
      const value = req.query[key];
      if (typeof value === "string" && value.trim()) {
        where[key] = value.trim();
      }
    }
    const result = await listAuditLogs(
      where as Parameters<typeof listAuditLogs>[0],
      query.page,
      query.limit,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listOrderFeeDisclosuresHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireAuth(req, res)) return;
    const orderId = req.params["orderId"] ?? req.params["id"];
    const disclosures = await listOrderFeeDisclosures(
      req.user!.sub,
      String(orderId ?? ""),
      isAdmin(req),
    );
    res.json({ success: true, data: { fee_disclosures: disclosures } });
  } catch (err) {
    handleError(err, res, next);
  }
}
