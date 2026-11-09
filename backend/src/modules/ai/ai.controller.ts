import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import * as v from "./ai.validation.js";
import * as assistant from "./assistant.service.js";
import { approveKnowledge as approveKnowledgeRecord, archiveKnowledge as archiveKnowledgeRecord, createKnowledge as addKnowledge, getKnowledge, listAdminKnowledge, rejectKnowledge as rejectKnowledgeRecord, searchApprovedKnowledge, updateKnowledge as editKnowledge } from "./knowledge.service.js";
import { completeRecommendation as completeRecommendationRecord, dismissRecommendation as dismissRecommendationRecord, generateRecommendations, listRecommendations } from "./recommendations.service.js";
import { assessUserIntegrity, getIntegrityAssessment, getIntegrityStats, listIntegrityAssessments, reviewIntegrityAssessment } from "./integrity.service.js";
import { getAIConfigurationData, getAIFeatureFlags, updateAIConfiguration } from "./ai.config.service.js";
import { getKnowledgeCounts } from "./knowledge.service.js";
import { getAIProvider } from "./ai.provider.js";
import { getAIUsageTotalsSince, listAIUsage } from "./ai.usage.service.js";

function auth(req: Request): string { if (!req.user) throw Object.assign(new Error("Authentication required."), { code: "UNAUTHORIZED" }); return req.user.sub; }
function parse<T extends ZodTypeAny>(schema: T, value: unknown): T["_output"] { const result = schema.safeParse(value); if (!result.success) throw Object.assign(new Error(result.error.errors.map((x) => x.message).join(" ")), { code: "VALIDATION_ERROR", fields: result.error.errors }); return result.data as T["_output"]; }
function id(value: unknown): string { return parse(v.AIConversationIdSchema, value); }
function sendError(err: unknown, res: Response, next: NextFunction): void { const e = err as Error & { code?: string; fields?: unknown }; const map: Record<string, number> = { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, VALIDATION_ERROR: 422, FEATURE_DISABLED: 503, DAILY_LIMIT_REACHED: 429 }; const status = e.code ? map[e.code] : undefined; if (status !== undefined) { res.status(status).json({ success: false, error: { message: e.message, ...(e.fields ? { fields: e.fields } : {}) } }); return; } next(err); }
async function run(req: Request, res: Response, next: NextFunction, fn: () => Promise<unknown>, status = 200): Promise<void> { try { auth(req); res.status(status).json({ success: true, data: await fn() }); } catch (e) { sendError(e, res, next); } }

export const createChat = (req: Request, res: Response, next: NextFunction) => run(req,res,next,() => { const raw = req.body as Record<string, unknown>; const body = parse(v.SendConversationMessageSchema, { message: raw.message, context: raw.context }); const options = parse(v.CreateConversationSchema, { title: raw.title, category: raw.category }); return assistant.createAndAnswer(auth(req), { ...body, ...options }, req.user!.roles); }, 201);
export const sendChatMessage = (req: Request, res: Response, next: NextFunction) => run(req,res,next,() => assistant.answerConversation(auth(req), id(req.params.conversationId), parse(v.SendConversationMessageSchema, req.body), req.user!.roles));
export const listChats = (req: Request, res: Response, next: NextFunction) => run(req,res,next,() => assistant.listConversations(auth(req), parse(v.ConversationListQuerySchema, req.query)));
export const getChat = (req: Request, res: Response, next: NextFunction) => run(req,res,next,() => assistant.getConversation(auth(req), id(req.params.id)));
export const listChatMessages = (req: Request, res: Response, next: NextFunction) => run(req,res,next,() => { const q = parse(v.ConversationListQuerySchema, req.query); return assistant.listConversationMessages(auth(req), id(req.params.id), q.page ?? 1, q.limit ?? 20); });
export const deleteChat = (req: Request, res: Response, next: NextFunction) => run(req,res,next,async () => { await assistant.deleteConversation(auth(req), id(req.params.id)); return { deleted: true }; });

export const recommendations = (req: Request,res: Response,next: NextFunction) => run(req,res,next,async () => { const user = auth(req); await generateRecommendations(user, parse(v.GenerateRecommendationsSchema, req.query)); return listRecommendations(user, parse(v.RecommendationListQuerySchema, req.query)); });
export const recommendation = (req: Request,res: Response,next: NextFunction) => run(req,res,next,async () => { const rows = await listRecommendations(auth(req), { page: 1, limit: 100, status: "active" }); const found = rows.recommendations.find((x) => x.id === id(req.params.id)); if (!found) throw Object.assign(new Error("Recommendation not found."), { code: "NOT_FOUND" }); return found; });
export const dismissRecommendation = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => dismissRecommendationRecord(auth(req), id(req.params.id)));
export const completeRecommendation = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => completeRecommendationRecord(auth(req), id(req.params.id)));
export const myIntegrity = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => listIntegrityAssessments({ page: 1, limit: 100, subject_user_id: auth(req), sort: "newest" }));

export const knowledge = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => searchApprovedKnowledge(parse(v.SearchKnowledgeQuerySchema, req.query)));
export const knowledgeById = (req: Request,res: Response,next: NextFunction) => run(req,res,next,async () => { const row = await getKnowledge(id(req.params.id)); if (row.approval_status !== "approved" && !req.user!.roles.includes("admin")) throw Object.assign(new Error("Knowledge record not found."), { code: "NOT_FOUND" }); return row; });
export const createKnowledge = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => addKnowledge(auth(req), parse(v.CreateKnowledgeSchema, req.body)), 201);
export const adminKnowledge = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => listAdminKnowledge(parse(v.AdminKnowledgeListQuerySchema, req.query)));
export const updateKnowledge = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => editKnowledge(id(req.params.id), parse(v.UpdateKnowledgeSchema, req.body)));
export const approveKnowledge = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => approveKnowledgeRecord(auth(req), id(req.params.id)));
export const rejectKnowledge = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => rejectKnowledgeRecord(auth(req), id(req.params.id), parse(v.RejectKnowledgeSchema, req.body).reason));
export const archiveKnowledge = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => archiveKnowledgeRecord(id(req.params.id)));

export const listIntegrity = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => listIntegrityAssessments(parse(v.IntegrityListQuerySchema, req.query)));
export const assessIntegrity = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => assessUserIntegrity(auth(req), id(req.params.userId), parse(v.AssessUserIntegritySchema, req.body)));
export const integrity = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => getIntegrityAssessment(id(req.params.id)));
export const reviewIntegrity = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => reviewIntegrityAssessment(auth(req), id(req.params.id), parse(v.ReviewIntegritySchema, req.body)));
export const resolveIntegrity = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => reviewIntegrityAssessment(auth(req), id(req.params.id), parse(v.ReviewIntegritySchema, { ...(req.body as Record<string, unknown>), action: "resolve" })));
export const falsePositiveIntegrity = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => reviewIntegrityAssessment(auth(req), id(req.params.id), parse(v.ReviewIntegritySchema, { ...(req.body as Record<string, unknown>), action: "mark_false_positive" })));
export const getConfig = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => getAIConfigurationData());
export const updateConfig = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => updateAIConfiguration(auth(req), parse(v.UpdateAIConfigurationSchema, req.body)));
export const usage = (req: Request,res: Response,next: NextFunction) => run(req,res,next,() => listAIUsage(parse(v.AIUsageQuerySchema, req.query)));
export const health = (req: Request,res: Response,next: NextFunction) => run(req,res,next,async () => { const [flags, knowledgeCounts, integrity, usage] = await Promise.all([getAIFeatureFlags(), getKnowledgeCounts(), getIntegrityStats(), getAIUsageTotalsSince(new Date(Date.now() - 86_400_000))]); const provider = getAIProvider(); return { provider: provider.name, model: provider.model, provider_configured: provider.configured, feature_flags: flags, knowledge: knowledgeCounts, integrity, usage_last_24_hours: usage, checked_at: new Date() }; });
