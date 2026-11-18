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

let phoneCounter = 100;
function nextPhone(): string {
  phoneCounter += 1;
  return `+234806${String(phoneCounter).padStart(8, "0")}`;
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

function pngBuffer(): Buffer {
  // Minimal valid PNG header + IHDR chunk is complex; use a tiny 1x1 PNG.
  return Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108020000009077" +
      "53de0000000c49444154789c6360000000020001e221bc330000000049454e44ae426082",
    "hex",
  );
}

function jpegBuffer(): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.alloc(16, 0),
    Buffer.from([0xff, 0xd9]),
  ]);
}

function wavBuffer(): Buffer {
  const header = Buffer.alloc(44, 0);
  header.write("RIFF", 0);
  header.writeUInt32LE(36, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(8000, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write("data", 36);
  header.writeUInt32LE(0, 40);
  return header;
}

let userA: AuthUser;
let userB: AuthUser;
let outsider: AuthUser;
let conversationId: string;

beforeAll(async () => {
  userA = await registerAndLogin(nextPhone());
  userB = await registerAndLogin(nextPhone());
  outsider = await registerAndLogin(nextPhone());

  const conv = await request(app)
    .post("/api/conversations")
    .set("Authorization", `Bearer ${userA.token}`)
    .send({ participant_user_id: userB.userId });
  expect(conv.status).toBe(201);
  conversationId = conv.body.data.conversation.id as string;
}, 120_000);

describe("Phase 6 message media attachments", () => {
  it("preserves JSON text messaging and returns attachments array", async () => {
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ content: "plain text" });

    expect(res.status).toBe(201);
    expect(res.body.data.message).toMatchObject({
      conversation_id: conversationId,
      sender_user_id: userA.userId,
      content: "plain text",
      message_type: "text",
      status: "sent",
    });
    expect(res.body.data.message.attachments).toEqual([]);
  });

  it("uploads image attachment via multipart and returns API download_url", async () => {
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${userB.token}`)
      .field("content", "look")
      .attach("attachments", pngBuffer(), {
        filename: "photo.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(201);
    const msg = res.body.data.message;
    expect(msg.content).toBe("look");
    expect(msg.attachments).toHaveLength(1);
    expect(msg.attachments[0]).toMatchObject({
      message_id: msg.id,
      conversation_id: conversationId,
      attachment_type: "image",
      mime_type: "image/png",
      file_name: "photo.png",
    });
    expect(msg.attachments[0].download_url).toBe(
      `/api/conversations/${conversationId}/messages/${msg.id}/attachments/${msg.attachments[0].id}/download`,
    );
    expect(msg.attachments[0].download_url).not.toContain("private-uploads");
  });

  it("uploads audio-only message with empty content", async () => {
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${userA.token}`)
      .attach("attachments", wavBuffer(), {
        filename: "voice.wav",
        contentType: "audio/wav",
      });

    expect(res.status).toBe(201);
    const msg = res.body.data.message;
    expect(msg.content).toBe("");
    expect(msg.attachments).toHaveLength(1);
    expect(msg.attachments[0].attachment_type).toBe("audio");
    expect(["audio", "media"]).toContain(msg.message_type);
  });

  it("downloads attachment for participant with correct headers", async () => {
    const sent = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${userA.token}`)
      .attach("attachments", jpegBuffer(), {
        filename: "img.jpg",
        contentType: "image/jpeg",
      });
    expect(sent.status).toBe(201);
    const msg = sent.body.data.message;
    const attachment = msg.attachments[0];

    const download = await request(app)
      .get(attachment.download_url)
      .set("Authorization", `Bearer ${userB.token}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(download.status).toBe(200);
    expect(String(download.headers["content-type"])).toContain("image/jpeg");
    expect(String(download.headers["content-disposition"])).toContain("inline");
    expect(Buffer.isBuffer(download.body)).toBe(true);
    expect(download.body.length).toBeGreaterThan(0);
  });

  it("returns 404 for non-participant download attempts", async () => {
    const sent = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${userA.token}`)
      .attach("attachments", pngBuffer(), {
        filename: "secret.png",
        contentType: "image/png",
      });
    expect(sent.status).toBe(201);
    const attachment = sent.body.data.message.attachments[0];

    const res = await request(app)
      .get(attachment.download_url)
      .set("Authorization", `Bearer ${outsider.token}`);

    expect(res.status).toBe(404);
  });

  it("rejects fake/unsupported attachment content with 422", async () => {
    const res = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${userA.token}`)
      .attach("attachments", Buffer.from("not-an-image"), {
        filename: "fake.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(422);
  });

  it("rejects more than 5 attachments", async () => {
    let req = request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${userA.token}`)
      .field("content", "many");
    for (let i = 0; i < 6; i += 1) {
      req = req.attach("attachments", pngBuffer(), {
        filename: `p${i}.png`,
        contentType: "image/png",
      });
    }
    const res = await req;
    expect(res.status).toBe(422);
  });
});
