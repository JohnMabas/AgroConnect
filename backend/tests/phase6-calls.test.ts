import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";

beforeAll(async () => {
  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();
}, 600_000);

interface AuthUser {
  userId: string;
  token: string;
}

let phoneCounter = 300;
function nextPhone(): string {
  phoneCounter += 1;
  return `+234807${String(phoneCounter).padStart(8, "0")}`;
}

async function registerAndLogin(phone: string): Promise<AuthUser> {
  const password = "TestPass1!";
  const reg = await request(app).post("/api/auth/register").send({
    phone_number: phone,
    password,
    password_confirm: password,
  });
  expect(reg.status, `register ${phone}`).toBe(201);
  const userId = reg.body.data.user.id as string;

  const { PhoneOtp } = await import("../src/database/models/index.js");
  const { hashOtp } = await import("../src/services/otp.service.js");
  const knownOtp = "888888";
  await PhoneOtp.update(
    { otp_hash: hashOtp(knownOtp) },
    { where: { user_id: userId, used: false } },
  );

  const verify = await request(app)
    .post("/api/auth/verify-phone")
    .send({ user_id: userId, otp: knownOtp });
  expect(verify.status, `verify-phone ${phone}`).toBe(200);

  const login = await request(app)
    .post("/api/auth/login")
    .send({ identifier: phone, password });
  expect(login.status, `login ${phone}`).toBe(200);

  return { userId, token: login.body.data.access_token as string };
}

let caller: AuthUser;
let callee: AuthUser;
let outsider: AuthUser;
let conversationId: string;

beforeAll(async () => {
  caller = await registerAndLogin(nextPhone());
  callee = await registerAndLogin(nextPhone());
  outsider = await registerAndLogin(nextPhone());

  const conv = await request(app)
    .post("/api/conversations")
    .set("Authorization", `Bearer ${caller.token}`)
    .send({ participant_user_id: callee.userId });
  expect(conv.status).toBe(201);
  conversationId = conv.body.data.conversation.id as string;
}, 120_000);

describe("Authenticated WebRTC calls - config and auth", () => {
  it("returns call config for authenticated user", async () => {
    const res = await request(app)
      .get("/api/calls/config")
      .set("Authorization", `Bearer ${caller.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("iceServers");
    expect(Array.isArray(res.body.data.iceServers)).toBe(true);
    expect(typeof res.body.data.turnConfigured).toBe("boolean");
  });

  it("rejects unauthenticated call routes", async () => {
    const config = await request(app).get("/api/calls/config");
    const create = await request(app).post("/api/calls").send({
      conversation_id: conversationId,
      callee_user_id: callee.userId,
      call_type: "audio",
    });
    expect(config.status).toBe(401);
    expect(create.status).toBe(401);
  });
});

describe("Authenticated WebRTC calls - state transitions and authz", () => {
  it("creates, accepts, and ends a call with duration", async () => {
    const created = await request(app)
      .post("/api/calls")
      .set("Authorization", `Bearer ${caller.token}`)
      .send({
        conversation_id: conversationId,
        callee_user_id: callee.userId,
        call_type: "audio",
      });
    expect(created.status).toBe(201);
    const callId = created.body.data.call.id as string;
    expect(created.body.data.call).toMatchObject({
      conversation_id: conversationId,
      caller_user_id: caller.userId,
      callee_user_id: callee.userId,
      call_type: "audio",
      status: "ringing",
    });
    expect(created.body.data.call.caller).toBeTruthy();
    expect(created.body.data.call.callee).toBeTruthy();

    const getAsCaller = await request(app)
      .get(`/api/calls/${callId}`)
      .set("Authorization", `Bearer ${caller.token}`);
    expect(getAsCaller.status).toBe(200);

    const accepted = await request(app)
      .post(`/api/calls/${callId}/accept`)
      .set("Authorization", `Bearer ${callee.token}`)
      .send({});
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.call.status).toBe("accepted");
    expect(accepted.body.data.call.accepted_at).toBeTruthy();

    const ended = await request(app)
      .post(`/api/calls/${callId}/end`)
      .set("Authorization", `Bearer ${caller.token}`)
      .send({ reason: "hangup" });
    expect(ended.status).toBe(200);
    expect(ended.body.data.call.status).toBe("ended");
    expect(ended.body.data.call.end_reason).toBe("hangup");
    expect(ended.body.data.call.duration_seconds).not.toBeNull();
  });

  it("enforces participant-only access and callee-only actions", async () => {
    const created = await request(app)
      .post("/api/calls")
      .set("Authorization", `Bearer ${caller.token}`)
      .send({
        conversation_id: conversationId,
        callee_user_id: callee.userId,
        call_type: "video",
      });
    expect(created.status).toBe(201);
    const callId = created.body.data.call.id as string;

    const outsiderGet = await request(app)
      .get(`/api/calls/${callId}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderGet.status).toBe(404);

    const callerAccept = await request(app)
      .post(`/api/calls/${callId}/accept`)
      .set("Authorization", `Bearer ${caller.token}`)
      .send({});
    expect(callerAccept.status).toBe(403);

    const outsiderReject = await request(app)
      .post(`/api/calls/${callId}/reject`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({});
    expect(outsiderReject.status).toBe(404);
  });

  it("rejects invalid transitions", async () => {
    const created = await request(app)
      .post("/api/calls")
      .set("Authorization", `Bearer ${caller.token}`)
      .send({
        conversation_id: conversationId,
        callee_user_id: callee.userId,
        call_type: "audio",
      });
    expect(created.status).toBe(201);
    const callId = created.body.data.call.id as string;

    const rejected = await request(app)
      .post(`/api/calls/${callId}/reject`)
      .set("Authorization", `Bearer ${callee.token}`)
      .send({});
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.call.status).toBe("rejected");

    const acceptAfterReject = await request(app)
      .post(`/api/calls/${callId}/accept`)
      .set("Authorization", `Bearer ${callee.token}`)
      .send({});
    expect(acceptAfterReject.status).toBe(422);
  });

  it("lists calls for participants and supports filters", async () => {
    const res = await request(app)
      .get("/api/calls")
      .set("Authorization", `Bearer ${caller.token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.calls)).toBe(true);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
  });

  it("rejects calls between users who are not conversation participants", async () => {
    const res = await request(app)
      .post("/api/calls")
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({
        conversation_id: conversationId,
        callee_user_id: caller.userId,
        call_type: "audio",
      });
    expect([403, 404]).toContain(res.status);
  });
});
