/**
 * Phase 7 — Messaging, Read Receipts, and Realtime Delivery
 *
 * Requires an isolated PostgreSQL test database.
 * Run with:
 *   TEST_DATABASE_URL=... TEST_DB_SSL=false npm test
 */

import { createServer, type Server as HttpServer } from "node:http";
import express, { type Request } from "express";
import request from "supertest";
import { io as ioClient, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { runMigrationsUp } from "../src/database/migrator.js";
import { runSeedersUp } from "../src/database/seeder.js";
import { sequelize } from "../src/database/sequelize.js";
import { createSocketServer, stopSocketServer } from "../src/realtime/socket.js";
import { createFixedWindowLimiter } from "../src/modules/messaging/messaging.rate-limit.js";

// ─── DB reset ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await sequelize.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  await runSeedersUp();
}, 600_000);

// ─── Helpers ───────────────────────────────────────────────────────────────────

interface AuthUser {
  userId: string;
  token: string;
}

interface ConversationPayload {
  id: string;
  created_by_user_id: string;
  listing_id: string | null;
  buyer_request_id: string | null;
  status: string;
  participants: Array<{
    user_id: string;
    display_name: string | null;
    last_read_at: string | null;
  }>;
  listing?: { id: string; title: string; farmer_user_id: string };
  last_message?: MessagePayload;
  unread_count: number;
}

interface MessagePayload {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  content: string;
  status: string;
  delivered_at: string | null;
  read_at: string | null;
  sender?: { id: string; display_name: string | null };
}

interface SocketAck {
  success: boolean;
  data?: {
    message?: MessagePayload;
    message_ids?: string[];
    status?: string;
    conversation_id?: string;
    participant_user_ids?: string[];
  };
  error?: { code: string; message: string };
}

let phoneCounter = 0;
function nextPhone(): string {
  phoneCounter += 1;
  return `+234805${String(phoneCounter).padStart(8, "0")}`;
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

async function registerFarmerAndLogin(phone: string): Promise<AuthUser> {
  const auth = await registerAndLogin(phone);

  const res = await request(app)
    .post("/api/farmers/profile")
    .set("Authorization", `Bearer ${auth.token}`)
    .send({
      farm_name: `Farm of ${phone}`,
      farming_experience_years: 3,
    });
  expect(res.status, `create farmer profile for ${phone}`).toBe(201);

  return auth;
}

async function getFirstProduceTypeId(): Promise<string> {
  const res = await request(app).get("/api/produce/types");
  expect(res.status).toBe(200);
  return res.body.data.types[0].id as string;
}

async function createPublishedListing(
  token: string,
  produceTypeId: string,
): Promise<string> {
  const created = await request(app)
    .post("/api/listings")
    .set("Authorization", `Bearer ${token}`)
    .send({
      produce_type_id: produceTypeId,
      title: "Phase 7 Messaging Listing",
      quantity: 100,
      unit: "kg",
      price_per_unit: 250,
      currency: "NGN",
      country: "Nigeria",
      state_or_region: "Plateau",
      local_government_area: "Jos North",
      community: "Bukuru",
    });
  expect(created.status).toBe(201);
  const listingId = created.body.data.listing.id as string;

  const published = await request(app)
    .patch(`/api/listings/${listingId}/publish`)
    .set("Authorization", `Bearer ${token}`);
  expect(published.status).toBe(200);

  return listingId;
}

function createConversationRequest(
  token: string,
  participantUserId: string,
  context: { listing_id?: string; buyer_request_id?: string } = {},
) {
  return request(app)
    .post("/api/conversations")
    .set("Authorization", `Bearer ${token}`)
    .send({
      participant_user_id: participantUserId,
      ...context,
    });
}

async function sendRestMessage(
  token: string,
  conversationId: string,
  content: string,
) {
  return request(app)
    .post(`/api/conversations/${conversationId}/messages`)
    .set("Authorization", `Bearer ${token}`)
    .send({ content });
}

let farmer: AuthUser;
let buyer: AuthUser;
let outsider: AuthUser;
let statusPartner: AuthUser;
let listingId: string;
let baseConversationId: string;

beforeAll(async () => {
  farmer = await registerFarmerAndLogin(nextPhone());
  buyer = await registerAndLogin(nextPhone());
  outsider = await registerAndLogin(nextPhone());
  statusPartner = await registerAndLogin(nextPhone());

  const { User } = await import("../src/database/models/index.js");
  const farmerUser = await User.findByPk(farmer.userId);
  const buyerUser = await User.findByPk(buyer.userId);
  const outsiderUser = await User.findByPk(outsider.userId);
  await farmerUser!.update({ display_name: "Phase 7 Farmer" });
  await buyerUser!.update({ display_name: "Phase 7 Buyer" });
  await outsiderUser!.update({ display_name: "Phase 7 Outsider" });

  listingId = await createPublishedListing(
    farmer.token,
    await getFirstProduceTypeId(),
  );

  const base = await createConversationRequest(
    farmer.token,
    buyer.userId,
  );
  expect(base.status).toBe(201);
  baseConversationId = base.body.data.conversation.id as string;
}, 120_000);

// ─── Authentication ───────────────────────────────────────────────────────────

describe("Phase 7 authentication", () => {
  it("rejects unauthenticated conversation list, create, and unread count requests", async () => {
    const list = await request(app).get("/api/conversations");
    const create = await request(app).post("/api/conversations").send({
      participant_user_id: buyer.userId,
    });
    const unread = await request(app).get("/api/messages/unread-count");

    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
    expect(unread.status).toBe(401);
  });
});

// ─── Conversation creation ────────────────────────────────────────────────────

describe("POST /api/conversations", () => {
  it("rejects creating a conversation with yourself", async () => {
    const res = await createConversationRequest(farmer.token, farmer.userId);
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("validates the participant UUID", async () => {
    const res = await createConversationRequest(farmer.token, "not-a-uuid");
    expect(res.status).toBe(422);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "participant_user_id" }),
      ]),
    );
  });

  it("returns 404 when the recipient does not exist", async () => {
    const res = await createConversationRequest(
      farmer.token,
      "00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 for a duplicate participant/context pair", async () => {
    const res = await createConversationRequest(farmer.token, buyer.userId);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already exists/i);
  });

  it("creates a listing-context conversation for the listing owner and buyer", async () => {
    const res = await createConversationRequest(buyer.token, farmer.userId, {
      listing_id: listingId,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.conversation).toMatchObject({
      listing_id: listingId,
      status: "active",
    });
    expect(res.body.data.conversation.listing).toMatchObject({
      id: listingId,
      farmer_user_id: farmer.userId,
    });
    expect(
      res.body.data.conversation.participants.map(
        (participant: { user_id: string }) => participant.user_id,
      ).sort(),
    ).toEqual([farmer.userId, buyer.userId].sort());
  });

  it("returns 409 for a duplicate listing-context conversation", async () => {
    const res = await createConversationRequest(farmer.token, buyer.userId, {
      listing_id: listingId,
    });
    expect(res.status).toBe(409);
  });

  it("rejects a listing context that excludes the listing owner", async () => {
    const res = await createConversationRequest(outsider.token, buyer.userId, {
      listing_id: listingId,
    });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/listing owner/i);
  });
});

// ─── Access control and listing ───────────────────────────────────────────────

describe("Conversation access control", () => {
  it("lists only conversations the user participates in", async () => {
    const res = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(200);
    const ids = res.body.data.conversations.map(
      (conversation: ConversationPayload) => conversation.id,
    );
    expect(ids).toContain(baseConversationId);
  });

  it("returns 404 when a non-participant requests a conversation", async () => {
    const get = await request(app)
      .get(`/api/conversations/${baseConversationId}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    const messages = await request(app)
      .get(`/api/conversations/${baseConversationId}/messages`)
      .set("Authorization", `Bearer ${outsider.token}`);
    const send = await sendRestMessage(
      outsider.token,
      baseConversationId,
      "Should not be allowed",
    );
    const read = await request(app)
      .patch(`/api/conversations/${baseConversationId}/read`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({});

    expect(get.status).toBe(404);
    expect(messages.status).toBe(404);
    expect(send.status).toBe(404);
    expect(read.status).toBe(404);
  });
});

// ─── Messages, unread counts, and read receipts ───────────────────────────────

describe("Messages and read receipts", () => {
  let sentMessageId: string;

  it("sends a message, trims content, and returns sent status", async () => {
    const res = await sendRestMessage(
      farmer.token,
      baseConversationId,
      "  Hello buyer, is the produce still available?  ",
    );

    expect(res.status).toBe(201);
    expect(res.body.data.message).toMatchObject({
      conversation_id: baseConversationId,
      sender_user_id: farmer.userId,
      content: "Hello buyer, is the produce still available?",
      status: "sent",
      message_type: "text",
    });
    expect(res.body.data.message.sender).toMatchObject({
      id: farmer.userId,
      display_name: "Phase 7 Farmer",
    });
    sentMessageId = res.body.data.message.id as string;
  });

  it("rejects blank, empty, and over-length messages", async () => {
    const blank = await sendRestMessage(
      farmer.token,
      baseConversationId,
      "   ",
    );
    const empty = await sendRestMessage(
      farmer.token,
      baseConversationId,
      "",
    );
    const tooLong = await sendRestMessage(
      farmer.token,
      baseConversationId,
      "a".repeat(4001),
    );

    expect(blank.status).toBe(422);
    expect(empty.status).toBe(422);
    expect(tooLong.status).toBe(422);
  });

  it("rejects sending a message as another user", async () => {
    const res = await request(app)
      .post(`/api/conversations/${baseConversationId}/messages`)
      .set("Authorization", `Bearer ${farmer.token}`)
      .send({
        content: "Impersonated message",
        sender_user_id: buyer.userId,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/another user/i);
  });

  it("returns conversation history to both participants with sender details", async () => {
    const buyerHistory = await request(app)
      .get(`/api/conversations/${baseConversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`);
    const farmerHistory = await request(app)
      .get(`/api/conversations/${baseConversationId}/messages`)
      .set("Authorization", `Bearer ${farmer.token}`);

    expect(buyerHistory.status).toBe(200);
    expect(farmerHistory.status).toBe(200);
    expect(
      buyerHistory.body.data.messages.map(
        (message: MessagePayload) => message.id,
      ),
    ).toContain(sentMessageId);
    expect(buyerHistory.body.data.total).toBeGreaterThanOrEqual(1);
    expect(buyerHistory.body.data.messages[0].sender).toBeDefined();
  });

  it("tracks unread counts for recipients and not for the sender", async () => {
    const buyerConversation = await request(app)
      .get(`/api/conversations/${baseConversationId}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    const farmerConversation = await request(app)
      .get(`/api/conversations/${baseConversationId}`)
      .set("Authorization", `Bearer ${farmer.token}`);
    const unread = await request(app)
      .get("/api/messages/unread-count")
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(buyerConversation.body.data.conversation.unread_count).toBeGreaterThanOrEqual(1);
    expect(buyerConversation.body.data.conversation.last_message.content).toBe(
      "Hello buyer, is the produce still available?",
    );
    expect(farmerConversation.body.data.conversation.unread_count).toBe(0);
    expect(unread.status).toBe(200);
    expect(unread.body.data.total_unread).toBeGreaterThanOrEqual(1);
    expect(
      unread.body.data.conversations.find(
        (entry: { conversation_id: string }) =>
          entry.conversation_id === baseConversationId,
      ).unread_count,
    ).toBeGreaterThanOrEqual(1);
  });

  it("marks a conversation read and clears the recipient's unread count", async () => {
    const mark = await request(app)
      .patch(`/api/conversations/${baseConversationId}/read`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ message_id: sentMessageId });
    expect(mark.status).toBe(200);
    expect(mark.body.data.message_ids).toContain(sentMessageId);
    expect(mark.body.data.reader_user_id).toBe(buyer.userId);

    const conversation = await request(app)
      .get(`/api/conversations/${baseConversationId}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(conversation.body.data.conversation.unread_count).toBe(0);

    const history = await request(app)
      .get(`/api/conversations/${baseConversationId}/messages`)
      .set("Authorization", `Bearer ${buyer.token}`);
    const readMessage = history.body.data.messages.find(
      (message: MessagePayload) => message.id === sentMessageId,
    );
    expect(readMessage.status).toBe("read");
    expect(readMessage.read_at).not.toBeNull();
  });

  it("supports message pagination", async () => {
    await sendRestMessage(farmer.token, baseConversationId, "Second message");

    const res = await request(app)
      .get(`/api/conversations/${baseConversationId}/messages?limit=1&page=1&order=desc`)
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.messages).toHaveLength(1);
    expect(res.body.data.limit).toBe(1);
    expect(res.body.data.total).toBeGreaterThanOrEqual(2);
    expect(res.body.data.total_pages).toBeGreaterThanOrEqual(2);
  });
});

// ─── Conversation status transitions ─────────────────────────────────────────

describe("Conversation status transitions", () => {
  let conversationId: string;

  beforeAll(async () => {
    const res = await createConversationRequest(
      farmer.token,
      statusPartner.userId,
    );
    expect(res.status).toBe(201);
    conversationId = res.body.data.conversation.id as string;
  });

  it("archives a conversation and blocks messaging while archived", async () => {
    const archive = await request(app)
      .patch(`/api/conversations/${conversationId}/archive`)
      .set("Authorization", `Bearer ${farmer.token}`);
    const send = await sendRestMessage(
      farmer.token,
      conversationId,
      "Archived conversation message",
    );
    const archivedList = await request(app)
      .get("/api/conversations?status=archived")
      .set("Authorization", `Bearer ${farmer.token}`);
    const activeList = await request(app)
      .get("/api/conversations?status=active")
      .set("Authorization", `Bearer ${farmer.token}`);

    expect(archive.status).toBe(200);
    expect(archive.body.data.conversation.status).toBe("archived");
    expect(send.status).toBe(422);
    expect(
      archivedList.body.data.conversations.map(
        (conversation: ConversationPayload) => conversation.id,
      ),
    ).toContain(conversationId);
    expect(
      activeList.body.data.conversations.map(
        (conversation: ConversationPayload) => conversation.id,
      ),
    ).not.toContain(conversationId);
  });

  it("requires unarchiving before blocking", async () => {
    const blocked = await request(app)
      .patch(`/api/conversations/${conversationId}/block`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(blocked.status).toBe(422);

    const unarchive = await request(app)
      .patch(`/api/conversations/${conversationId}/unarchive`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(unarchive.status).toBe(200);
    expect(unarchive.body.data.conversation.status).toBe("active");
  });

  it("blocks messaging, requires unblocking before unarchive, then unblocks", async () => {
    const block = await request(app)
      .patch(`/api/conversations/${conversationId}/block`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(block.status).toBe(200);
    expect(block.body.data.conversation.status).toBe("blocked");

    const send = await sendRestMessage(
      farmer.token,
      conversationId,
      "Blocked conversation message",
    );
    expect(send.status).toBe(422);

    const unarchive = await request(app)
      .patch(`/api/conversations/${conversationId}/unarchive`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(unarchive.status).toBe(422);

    const unblock = await request(app)
      .patch(`/api/conversations/${conversationId}/unblock`)
      .set("Authorization", `Bearer ${farmer.token}`);
    expect(unblock.status).toBe(200);
    expect(unblock.body.data.conversation.status).toBe("active");

    const sendAfterUnblock = await sendRestMessage(
      farmer.token,
      conversationId,
      "Conversation reopened",
    );
    expect(sendAfterUnblock.status).toBe(201);
  });
});

// ─── Realtime Socket.IO ───────────────────────────────────────────────────────

function connectSocket(
  socketUrl: string,
  token?: string,
): Promise<Socket> {
  const socket = ioClient(socketUrl, {
    auth: token ? { token } : {},
    transports: ["websocket"],
    reconnection: false,
    forceNew: true,
  });

  return new Promise<Socket>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Timed out connecting to Socket.IO test server."));
    }, 8_000);

    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once("connect_error", (error: Error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(error);
    });
  });
}

function emitWithAck(
  socket: Socket,
  event: string,
  payload: unknown,
): Promise<SocketAck> {
  return new Promise<SocketAck>((resolve, reject) => {
    socket.timeout(8_000).emit(
      event,
      payload,
      (error: Error | null, response: SocketAck) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(response);
      },
    );
  });
}

function waitForEvent<T>(
  socket: Socket,
  event: string,
  timeoutMs = 8_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for socket event "${event}".`));
    }, timeoutMs);

    const handler = (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    };

    socket.once(event, handler);
  });
}

describe("Socket.IO realtime messaging", () => {
  let httpServer: HttpServer;
  let socketUrl: string;
  let farmerSocket: Socket;
  let buyerSocket: Socket;
  let outsiderSocket: Socket;

  beforeAll(async () => {
    httpServer = createServer(app);
    createSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", resolve);
    });

    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind Socket.IO test server.");
    }
    socketUrl = `http://127.0.0.1:${address.port}`;

    farmerSocket = await connectSocket(socketUrl, farmer.token);
    buyerSocket = await connectSocket(socketUrl, buyer.token);
    outsiderSocket = await connectSocket(socketUrl, outsider.token);
  }, 30_000);

  afterAll(async () => {
    farmerSocket?.disconnect();
    buyerSocket?.disconnect();
    outsiderSocket?.disconnect();
    await stopSocketServer();
  });

  it("rejects connections without a token and with an invalid token", async () => {
    await expect(connectSocket(socketUrl)).rejects.toThrow();
    await expect(connectSocket(socketUrl, "invalid-token")).rejects.toThrow();
  });

  it("lets participants join the conversation room and rejects outsiders", async () => {
    const joined = await emitWithAck(buyerSocket, "conversation:join", {
      conversation_id: baseConversationId,
    });
    const rejected = await emitWithAck(outsiderSocket, "conversation:join", {
      conversation_id: baseConversationId,
    });

    expect(joined.success).toBe(true);
    expect(joined.data?.participant_user_ids).toEqual(
      expect.arrayContaining([farmer.userId, buyer.userId]),
    );
    expect(rejected.success).toBe(false);
    expect(rejected.error?.code).toBe("NOT_FOUND");
  });

  it("persists and broadcasts a socket message before acknowledging", async () => {
    const realtime = waitForEvent<{ message: MessagePayload }>(
      buyerSocket,
      "message:new",
    );

    const ack = await emitWithAck(farmerSocket, "message:send", {
      conversation_id: baseConversationId,
      content: "Realtime hello",
    });
    const event = await realtime;

    expect(ack.success).toBe(true);
    expect(ack.data?.message).toMatchObject({
      conversation_id: baseConversationId,
      sender_user_id: farmer.userId,
      content: "Realtime hello",
      status: "sent",
    });
    expect(event.message.id).toBe(ack.data?.message?.id);
  });

  it("rejects socket messages from non-participants and blank content", async () => {
    const outsiderSend = await emitWithAck(outsiderSocket, "message:send", {
      conversation_id: baseConversationId,
      content: "Outsider message",
    });
    const blankSend = await emitWithAck(farmerSocket, "message:send", {
      conversation_id: baseConversationId,
      content: "   ",
    });

    expect(outsiderSend.success).toBe(false);
    expect(outsiderSend.error?.code).toBe("NOT_FOUND");
    expect(blankSend.success).toBe(false);
    expect(blankSend.error?.code).toBe("VALIDATION_ERROR");
  });

  it("broadcasts delivery acknowledgements", async () => {
    const sent = await emitWithAck(farmerSocket, "message:send", {
      conversation_id: baseConversationId,
      content: "Please acknowledge delivery",
    });
    const messageId = sent.data?.message?.id as string;

    const deliveredEvent = waitForEvent<{
      message_id: string;
      status: string;
    }>(farmerSocket, "message:delivered");

    const delivered = await emitWithAck(buyerSocket, "message:delivered", {
      conversation_id: baseConversationId,
      message_id: messageId,
    });
    const event = await deliveredEvent;

    expect(delivered.success).toBe(true);
    expect(delivered.data?.status).toBe("delivered");
    expect(event.message_id).toBe(messageId);
    expect(event.status).toBe("delivered");
  });

  it("broadcasts read receipts with the updated message ids", async () => {
    const sent = await emitWithAck(farmerSocket, "message:send", {
      conversation_id: baseConversationId,
      content: "Please mark this read",
    });
    const messageId = sent.data?.message?.id as string;

    const readEvent = waitForEvent<{
      conversation_id: string;
      reader_user_id: string;
      message_ids: string[];
    }>(farmerSocket, "message:read");

    const read = await emitWithAck(buyerSocket, "message:read", {
      conversation_id: baseConversationId,
      message_id: messageId,
    });
    const event = await readEvent;

    expect(read.success).toBe(true);
    expect(read.data?.message_ids).toContain(messageId);
    expect(event.conversation_id).toBe(baseConversationId);
    expect(event.reader_user_id).toBe(buyer.userId);
    expect(event.message_ids).toContain(messageId);
  });
});

// ─── Rate limiter factory ────────────────────────────────────────────────────

describe("Messaging rate limiter", () => {
  it("limits after the configured number of requests when enabled", async () => {
    const limitedApp = express();
    limitedApp.use((req: Request, _res, next) => {
      req.user = { sub: "rate-limit-test-user", roles: [] };
      next();
    });
    limitedApp.get(
      "/limited",
      createFixedWindowLimiter({
        windowMs: 60_000,
        limit: 2,
        message: "Too many test requests.",
        enabled: true,
      }),
      (_req, res) => {
        res.json({ success: true });
      },
    );

    const first = await request(limitedApp).get("/limited");
    const second = await request(limitedApp).get("/limited");
    const third = await request(limitedApp).get("/limited");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.error.message).toBe("Too many test requests.");
  });
});
