import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";
import {
  registerUser,
  resendPhoneOtp,
  verifyUserPhone,
} from "../auth/auth.service.js";
import {
  createBuyerRequest,
  getMyBuyerRequests,
  listOpenBuyerRequests,
} from "../buyer-requests/buyer-requests.service.js";
import {
  createFarmerProfile,
  getMyFarmerProfile,
} from "../farmers/farmers.service.js";
import {
  normalizeLanguage,
  translate,
} from "../localization/localization.messages.js";
import { listLanguages } from "../localization/localization.service.js";
import {
  createListing,
  getMyListings,
  listPublishedListings,
  publishListing,
} from "../listings/listings.service.js";
import { listMarketPrices } from "../market/market.prices.service.js";
import { resolveMarketScope } from "../market/market.scope.js";
import { dispatchNotification } from "../notifications/notifications.service.js";
import { acceptOffer, listOffers, rejectOffer } from "../offers/offers.service.js";
import type { OfferData } from "../offers/offers.types.js";
import { listOrders } from "../orders/orders.service.js";
import { listTypes } from "../produce/produce.service.js";
import { updateLanguagePreference } from "../localization/localization.service.js";
import { createTelecomSupportRequest } from "./telecom.support.service.js";
import {
  normalizeTelecomPhone,
  primaryTelecomRole,
  refreshTelecomActor,
} from "./telecom.actor.service.js";
import type {
  TelecomActor,
  TelecomChannel,
  TelecomFlowResult,
} from "./telecom.types.js";

interface ProduceOption {
  id: string;
  name: string;
}

const UNIT_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "kg", label: "kg" },
  { code: "bag", label: "bag" },
  { code: "tonne", label: "tonne" },
  { code: "bunch", label: "bunch" },
];

const GUEST_MENU_KEYS = new Set(["main", "language", "register_name", "register_otp"]);

function t(
  key: string,
  actor: TelecomActor,
  variables: Record<string, unknown> = {},
  critical = false,
): string {
  return translate(key, actor.language, variables, { critical });
}

function result(
  menuKey: string,
  context: Record<string, unknown>,
  message: string,
  end = false,
  inputMode: "single" | "number" = "single",
): TelecomFlowResult {
  return { menuKey, context, message, end, inputMode };
}

function menuLimit(): number {
  return Math.max(1, Math.min(env.TELECOM_MAX_MENU_OPTIONS, 5));
}

function joinMenu(title: string, lines: string[], back = true): string {
  return [title, ...lines, back ? "0. Back" : "0. Exit"].join("\n");
}

function withInvalid(
  actor: TelecomActor,
  base: TelecomFlowResult,
): TelecomFlowResult {
  return {
    ...base,
    message: `${t("common.invalid_option", actor)}\n${base.message}`,
  };
}

function numberInput(value: string): number | null {
  const normalized = value.replace(/,/g, ".").trim();
  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function produceOptions(context: Record<string, unknown>): ProduceOption[] {
  const value = context.produce_options;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ProduceOption =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as ProduceOption).id === "string" &&
      typeof (item as ProduceOption).name === "string",
  );
}

function offerOptions(context: Record<string, unknown>): string[] {
  const value = context.offer_options;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function languageOptions(context: Record<string, unknown>): string[] {
  const value = context.language_options;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

async function loadProduceOptions(): Promise<ProduceOption[]> {
  const types = await listTypes();
  return types.slice(0, menuLimit()).map((type) => ({
    id: type.id,
    name: type.name,
  }));
}

function languageMenu(actor: TelecomActor): TelecomFlowResult {
  const languages = listLanguages().slice(0, menuLimit());
  const context = { language_options: languages.map((item) => item.code) };
  const lines = languages.map(
    (item, index) => `${index + 1}. ${item.native_name}`,
  );
  return result(
    "language",
    context,
    joinMenu(t("language.prompt", actor), lines),
  );
}

function mainMenu(actor: TelecomActor, channel: TelecomChannel): TelecomFlowResult {
  const lines: string[] = [];
  if (actor.status === "suspended") {
    lines.push(t("menu.option.support", actor));
    return result("main", {}, joinMenu(t("menu.title", actor), lines));
  }

  if (actor.status === "guest") {
    if (channel === "ussd") lines.push(t("menu.option.register", actor));
    lines.push(t("menu.option.market", actor));
    lines.push(t("menu.option.language", actor));
    lines.push(t("menu.option.support", actor));
    return result("main", {}, joinMenu(t("menu.guest", actor), lines));
  }

  if (actor.status === "pending") {
    lines.push(t("menu.option.verify", actor));
    lines.push(t("menu.option.resend_otp", actor));
    lines.push(t("menu.option.language", actor));
    lines.push(t("menu.option.support", actor));
    return result("main", {}, joinMenu(t("menu.pending", actor), lines));
  }

  const role = primaryTelecomRole(actor.roles);
  if (role === "farmer") {
    lines.push(t("menu.option.sell", actor));
    lines.push(t("menu.option.my_listings", actor));
    lines.push(t("menu.option.buyer_requests", actor));
    lines.push(t("menu.option.offers", actor));
    lines.push(t("menu.option.orders", actor));
    lines.push(t("menu.option.market", actor));
    lines.push(t("menu.option.language", actor));
    lines.push(t("menu.option.support", actor));
    return result("main", {}, joinMenu(t("menu.farmer", actor), lines));
  }

  if (role === "buyer") {
    lines.push(t("menu.option.browse", actor));
    lines.push(t("menu.option.create_request", actor));
    lines.push(t("menu.option.my_requests", actor));
    lines.push(t("menu.option.offers", actor));
    lines.push(t("menu.option.orders", actor));
    lines.push(t("menu.option.market", actor));
    lines.push(t("menu.option.language", actor));
    lines.push(t("menu.option.support", actor));
    return result("main", {}, joinMenu(t("menu.buyer", actor), lines));
  }

  lines.push(t("menu.option.market", actor));
  lines.push(t("menu.option.language", actor));
  lines.push(t("menu.option.support", actor));
  return result("main", {}, joinMenu(t("menu.guest", actor), lines));
}

async function produceMenu(
  actor: TelecomActor,
  menuKey: string,
  titleKey: string,
  context: Record<string, unknown> = {},
): Promise<TelecomFlowResult> {
  const options = await loadProduceOptions();
  if (options.length === 0) {
    return result(
      menuKey,
      { ...context, produce_options: [] },
      `${t("common.service_unavailable", actor)}\n${t("menu.option.exit", actor)}`,
      true,
    );
  }
  const lines = options.map((item, index) => `${index + 1}. ${item.name}`);
  return result(
    menuKey,
    { ...context, produce_options: options },
    joinMenu(t(titleKey, actor), lines),
  );
}

function selectedProduce(
  context: Record<string, unknown>,
  input: string,
): ProduceOption | null {
  const index = Number(input) - 1;
  const options = produceOptions(context);
  if (!Number.isInteger(index) || index < 0 || index >= options.length) {
    return null;
  }
  return options[index] ?? null;
}

function selectedLanguage(
  context: Record<string, unknown>,
  input: string,
): string | null {
  const index = Number(input) - 1;
  const options = languageOptions(context);
  if (!Number.isInteger(index) || index < 0 || index >= options.length) {
    return null;
  }
  return options[index] ?? null;
}

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

async function createSupportRequest(
  actor: TelecomActor,
  channel: TelecomChannel,
  message: string,
  providerSessionId: string,
): Promise<TelecomFlowResult> {
  try {
    await createTelecomSupportRequest({
      userId: actor.userId,
      phoneNumber: normalizeTelecomPhone(actor.phoneNumber),
      channel,
      language: actor.language,
      message,
      providerSessionId,
    });
    if (actor.userId) {
      void dispatchNotification({
        user_id: actor.userId,
        notification_type: "telecom_support_requested",
        variables: { message: message.slice(0, 200) },
        related_entity_type: "telecom_support_request",
        dedupe_key: `telecom-support:${providerSessionId}`,
        allow_external: true,
        force_sms: false,
      });
    }
    return result(
      "main",
      {},
      t("support.received", actor, {}, true),
      true,
    );
  } catch {
    return result(
      "main",
      {},
      t("support.failed", actor, {}, true),
      true,
    );
  }
}

async function ensureFarmerProfile(actor: TelecomActor): Promise<void> {
  if (!actor.userId) return;
  try {
    await getMyFarmerProfile(actor.userId);
    return;
  } catch (err) {
    if ((err as { code?: string }).code !== "NOT_FOUND") throw err;
  }

  const farmName = actor.displayName
    ? `${actor.displayName.slice(0, 180)} Farm`
    : "AgroConnect Farm";
  try {
    await createFarmerProfile(actor.userId, { farm_name: farmName });
  } catch (err) {
    if ((err as { code?: string }).code !== "DUPLICATE_PROFILE") throw err;
  }
}

function notifyOfferCounterpart(
  actor: TelecomActor,
  offer: OfferData,
  type: "offer_accepted" | "offer_rejected",
): void {
  const counterpartId =
    offer.created_by !== actor.userId
      ? offer.created_by
      : offer.recipient_user_id;
  if (!counterpartId || counterpartId === actor.userId) return;

  void dispatchNotification({
    user_id: counterpartId,
    notification_type: type,
    variables: {
      actor_name: actor.displayName,
      offer_number: offer.offer_number,
      quantity: offer.quantity,
      unit: offer.unit,
    },
    related_entity_type: "offer",
    related_entity_id: offer.id,
    dedupe_key: `telecom-${type}:${offer.id}`,
    allow_external: true,
  });
}

async function showMyListings(actor: TelecomActor): Promise<TelecomFlowResult> {
  if (!actor.userId) return mainMenu(actor, "ussd");
  const page = await getMyListings(actor.userId, 1, menuLimit());
  if (page.listings.length === 0) {
    return result("main", {}, `${t("my_listings.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
  }
  const lines = page.listings.map((item, index) => {
    const qty = Number(item.available_quantity ?? item.quantity);
    return `${index + 1}. ${item.title} - ${qty} ${item.unit} - ${formatCurrency(Number(item.price_per_unit), item.currency)}`;
  });
  return result("main", {}, joinMenu(t("my_listings.header", actor), lines, false), true);
}

async function showOpenBuyerRequests(actor: TelecomActor): Promise<TelecomFlowResult> {
  const page = await listOpenBuyerRequests({ page: 1, limit: menuLimit(), sort: "newest" });
  if (page.requests.length === 0) {
    return result("main", {}, `${t("buyer_requests.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
  }
  const lines = page.requests.map((item, index) => {
    const produce = item.produce_type?.name ?? item.produce_category?.name ?? "Produce";
    return `${index + 1}. ${produce} - ${item.requested_quantity} ${item.unit}`;
  });
  return result("main", {}, joinMenu(t("buyer_requests.header", actor), lines, false), true);
}

async function showMyBuyerRequests(actor: TelecomActor): Promise<TelecomFlowResult> {
  if (!actor.userId) return mainMenu(actor, "ussd");
  const page = await getMyBuyerRequests(actor.userId, { page: 1, limit: menuLimit() });
  if (page.requests.length === 0) {
    return result("main", {}, `${t("my_requests.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
  }
  const lines = page.requests.map((item, index) => {
    const produce = item.produce_type?.name ?? item.produce_category?.name ?? "Produce";
    return `${index + 1}. ${produce} - ${item.requested_quantity} ${item.unit} - ${item.status}`;
  });
  return result("main", {}, joinMenu(t("my_requests.header", actor), lines, false), true);
}

async function showOffers(
  actor: TelecomActor,
  channel: TelecomChannel,
  role: "farmer" | "buyer",
): Promise<TelecomFlowResult> {
  if (!actor.userId) return mainMenu(actor, channel);
  const page = await listOffers(actor.userId, {
    page: 1,
    limit: menuLimit(),
    status: "pending",
    direction: "received",
    sort: "newest",
  });
  if (page.offers.length === 0) {
    return result("main", {}, `${t("offers.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
  }
  const contextWithOffers = { offer_options: page.offers.map((item) => item.id) };
  const lines = page.offers.map((item, index) => {
    return `${index + 1}. ${item.offer_number} - ${item.quantity} ${item.unit} - ${formatCurrency(Number(item.unit_price), item.currency)}`;
  });
  const menuKey = role === "farmer" ? "farmer_offer_action" : "buyer_offer_action";
  return result(menuKey, contextWithOffers, joinMenu(t("offers.header", actor), lines));
}

async function showOrders(actor: TelecomActor): Promise<TelecomFlowResult> {
  if (!actor.userId) return mainMenu(actor, "ussd");
  const page = await listOrders(actor.userId, { page: 1, limit: menuLimit(), sort: "newest" });
  if (page.orders.length === 0) {
    return result("main", {}, `${t("orders.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
  }
  const lines = page.orders.map((item, index) => {
    return `${index + 1}. ${item.order_number} - ${item.status} - ${formatCurrency(Number(item.total_amount), item.currency)}`;
  });
  return result("main", {}, joinMenu(t("orders.header", actor), lines, false), true);
}

async function handleOfferDecision(
  actor: TelecomActor,
  menuKey: string,
  context: Record<string, unknown>,
  input: string,
  channel: TelecomChannel,
  prefix: "farmer" | "buyer",
): Promise<TelecomFlowResult | null> {
  if (menuKey === `${prefix}_offer_decision`) {
    if (input === "0") return mainMenu(actor, channel);
    if (input === "1") {
      return result(
        `${prefix}_offer_confirm_accept`,
        context,
        t("offers.confirm_accept", actor, {}, true),
      );
    }
    if (input === "2") {
      const offerId =
        typeof context.selected_offer_id === "string"
          ? context.selected_offer_id
          : null;
      if (!offerId) return mainMenu(actor, channel);
      try {
        const offer = await rejectOffer(actor.userId!, offerId);
        notifyOfferCounterpart(actor, offer, "offer_rejected");
        return result("main", {}, t("offers.rejected", actor, {}, true), true);
      } catch {
        return result("main", {}, t("offers.failed", actor, {}, true), true);
      }
    }
    return withInvalid(
      actor,
      result(menuKey, context, t("common.invalid_option", actor), false),
    );
  }

  if (menuKey === `${prefix}_offer_confirm_accept`) {
    if (input === "0" || input === "2") {
      return result(
        `${prefix}_offer_decision`,
        context,
        `${t("offers.action", actor)}\n1. Accept\n2. Reject\n0. Back`,
      );
    }
    if (input !== "1") {
      return withInvalid(
        actor,
        result(menuKey, context, t("common.invalid_option", actor), false),
      );
    }
    const offerId =
      typeof context.selected_offer_id === "string"
        ? context.selected_offer_id
        : null;
    if (!offerId) return mainMenu(actor, channel);
    try {
      const offer = await acceptOffer(actor.userId!, offerId);
      notifyOfferCounterpart(actor, offer, "offer_accepted");
      return result("main", {}, t("offers.accepted", actor, {}, true), true);
    } catch {
      return result("main", {}, t("offers.failed", actor, {}, true), true);
    }
  }

  return null;
}

async function handleFarmerInput(
  actor: TelecomActor,
  menuKey: string,
  context: Record<string, unknown>,
  input: string,
  channel: TelecomChannel,
): Promise<TelecomFlowResult> {
  if (!actor.userId) return mainMenu(actor, channel);

  if (menuKey === "farmer_sell_select") {
    const produce = selectedProduce(context, input);
    if (!produce) return withInvalid(actor, await produceMenu(actor, menuKey, "listing.select_type"));
    return result(
      "farmer_sell_quantity",
      { ...context, produce },
      t("listing.quantity", actor),
      false,
      "number",
    );
  }

  if (menuKey === "farmer_sell_quantity") {
    const quantity = numberInput(input);
    if (quantity === null || quantity <= 0) {
      return withInvalid(
        actor,
        result("farmer_sell_quantity", context, t("listing.quantity", actor), false, "number"),
      );
    }
    const lines = UNIT_OPTIONS.map((item, index) => `${index + 1}. ${item.label}`);
    return result(
      "farmer_sell_unit",
      { ...context, quantity },
      joinMenu(t("listing.unit", actor), lines),
    );
  }

  if (menuKey === "farmer_sell_unit") {
    const index = Number(input) - 1;
    const unit = UNIT_OPTIONS[index];
    if (!unit) {
      const lines = UNIT_OPTIONS.map((item, i) => `${i + 1}. ${item.label}`);
      return withInvalid(actor, result("farmer_sell_unit", context, joinMenu(t("listing.unit", actor), lines)));
    }
    return result(
      "farmer_sell_price",
      { ...context, unit: unit.code },
      t("listing.price", actor),
      false,
      "number",
    );
  }

  if (menuKey === "farmer_sell_price") {
    const price = numberInput(input);
    if (price === null || price <= 0) {
      return withInvalid(
        actor,
        result("farmer_sell_price", context, t("listing.price", actor), false, "number"),
      );
    }
    return result(
      "farmer_sell_location",
      { ...context, price },
      t("listing.location", actor),
    );
  }

  if (menuKey === "farmer_sell_location") {
    const location = input.trim().slice(0, 150);
    if (location.length < 2) {
      return withInvalid(
        actor,
        result("farmer_sell_location", context, t("listing.location", actor), false),
      );
    }
    const produce = context.produce as ProduceOption | undefined;
    const quantity = Number(context.quantity ?? 0);
    const unit = String(context.unit ?? "kg");
    const price = Number(context.price ?? 0);
    const summary = [
      `${produce?.name ?? "Produce"}: ${quantity} ${unit}`,
      `${formatCurrency(price, "NGN")} per ${unit}`,
      `${t("listing.location_label", actor)}: ${location}`,
    ].join("\n");
    return result(
      "farmer_sell_confirm",
      { ...context, location },
      `${t("listing.confirm", actor)}\n${summary}`,
    );
  }

  if (menuKey === "farmer_sell_confirm") {
    if (input === "2" || input === "0") return mainMenu(actor, channel);
    if (input !== "1") return withInvalid(actor, result("farmer_sell_confirm", context, t("common.invalid_option", actor), false));
    const produce = context.produce as ProduceOption | undefined;
    const quantity = Number(context.quantity ?? 0);
    const unit = String(context.unit ?? "kg");
    const price = Number(context.price ?? 0);
    const location = String(context.location ?? "").trim();
    if (!produce) return mainMenu(actor, channel);
    try {
      await ensureFarmerProfile(actor);
      const listing = await createListing(actor.userId, {
        produce_type_id: produce.id,
        title: `${produce.name} - ${quantity} ${unit}`.slice(0, 300),
        quantity,
        unit,
        price_per_unit: price,
        currency: "NGN",
        collection_location: location || null,
      });
      await publishListing(actor.userId, listing.id);
      void dispatchNotification({
        user_id: actor.userId,
        notification_type: "telecom_listing_published",
        variables: { produce_name: produce.name, quantity, unit },
        related_entity_type: "produce_listing",
        related_entity_id: listing.id,
        dedupe_key: `telecom-listing:${listing.id}`,
        allow_external: true,
        force_sms: true,
      });
      return result("main", {}, t("listing.published", actor, {}, true), true);
    } catch {
      return result("main", {}, t("listing.failed", actor, {}, true), true);
    }
  }

  if (menuKey === "farmer_listings") {
    if (input === "0") return mainMenu(actor, channel);
    const page = await getMyListings(actor.userId, 1, menuLimit());
    if (page.listings.length === 0) {
      return result("main", {}, `${t("my_listings.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
    }
    const lines = page.listings.map((item, index) => {
      const qty = Number(item.available_quantity ?? item.quantity);
      return `${index + 1}. ${item.title} - ${qty} ${item.unit} - ${formatCurrency(Number(item.price_per_unit), item.currency)}`;
    });
    return result("main", {}, joinMenu(t("my_listings.header", actor), lines), true);
  }

  if (menuKey === "farmer_buyer_requests") {
    if (input === "0") return mainMenu(actor, channel);
    const page = await listOpenBuyerRequests({ page: 1, limit: menuLimit(), sort: "newest" });
    if (page.requests.length === 0) {
      return result("main", {}, `${t("buyer_requests.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
    }
    const lines = page.requests.map((item, index) => {
      const produce = item.produce_type?.name ?? item.produce_category?.name ?? "Produce";
      return `${index + 1}. ${produce} - ${item.requested_quantity} ${item.unit}`;
    });
    return result("main", {}, joinMenu(t("buyer_requests.header", actor), lines), true);
  }

  if (menuKey === "farmer_offers" || menuKey === "buyer_offers") {
    if (input === "0") return mainMenu(actor, channel);
    if (menuKey === "farmer_offers") {
      const page = await listOffers(actor.userId, {
        page: 1,
        limit: menuLimit(),
        status: "pending",
        direction: "received",
        sort: "newest",
      });
      if (page.offers.length === 0) {
        return result("main", {}, `${t("offers.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
      }
      const contextWithOffers = { ...context, offer_options: page.offers.map((item) => item.id) };
      const lines = page.offers.map((item, index) => {
        return `${index + 1}. ${item.offer_number} - ${item.quantity} ${item.unit} - ${formatCurrency(Number(item.unit_price), item.currency)}`;
      });
      return result(
        "farmer_offer_action",
        contextWithOffers,
        joinMenu(t("offers.header", actor), lines),
      );
    }
  }

  if (menuKey === "farmer_offer_action") {
    if (input === "0") return mainMenu(actor, channel);
    const offers = offerOptions(context);
    const index = Number(input) - 1;
    const offerId = offers[index];
    if (!offerId) return withInvalid(actor, result(menuKey, context, t("common.invalid_option", actor), false));
    return result(
      "farmer_offer_decision",
      { ...context, selected_offer_id: offerId },
      `${t("offers.action", actor)}\n1. Accept\n2. Reject\n0. Back`,
    );
  }

  const farmerDecision = await handleOfferDecision(
    actor,
    menuKey,
    context,
    input,
    channel,
    "farmer",
  );
  if (farmerDecision) return farmerDecision;

  if (menuKey === "farmer_orders" || menuKey === "buyer_orders") {
    if (input === "0") return mainMenu(actor, channel);
    const page = await listOrders(actor.userId, { page: 1, limit: menuLimit(), sort: "newest" });
    if (page.orders.length === 0) {
      return result("main", {}, `${t("orders.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
    }
    const lines = page.orders.map((item, index) => {
      return `${index + 1}. ${item.order_number} - ${item.status} - ${formatCurrency(Number(item.total_amount), item.currency)}`;
    });
    return result("main", {}, joinMenu(t("orders.header", actor), lines), true);
  }

  return mainMenu(actor, channel);
}

async function handleBuyerInput(
  actor: TelecomActor,
  menuKey: string,
  context: Record<string, unknown>,
  input: string,
  channel: TelecomChannel,
): Promise<TelecomFlowResult> {
  if (!actor.userId) return mainMenu(actor, channel);

  if (menuKey === "buyer_browse_select") {
    const produce = selectedProduce(context, input);
    if (!produce) return withInvalid(actor, await produceMenu(actor, menuKey, "menu.option.browse"));
    const page = await listPublishedListings({
      page: 1,
      limit: menuLimit(),
      produceTypeId: produce.id,
      currency: "NGN",
      sort: "newest",
    });
    if (page.listings.length === 0) {
      return result("main", {}, `${t("browse.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
    }
    const lines = page.listings.map((item, index) => {
      return `${index + 1}. ${item.title} - ${item.available_quantity} ${item.unit} - ${formatCurrency(Number(item.price_per_unit), item.currency)}`;
    });
    return result("main", {}, joinMenu(t("browse.header", actor), lines), true);
  }

  if (menuKey === "buyer_request_select") {
    const produce = selectedProduce(context, input);
    if (!produce) return withInvalid(actor, await produceMenu(actor, menuKey, "menu.option.create_request"));
    return result(
      "buyer_request_quantity",
      { ...context, produce },
      t("listing.quantity", actor),
      false,
      "number",
    );
  }

  if (menuKey === "buyer_request_quantity") {
    const quantity = numberInput(input);
    if (quantity === null || quantity <= 0) {
      return withInvalid(actor, result(menuKey, context, t("listing.quantity", actor), false, "number"));
    }
    const lines = UNIT_OPTIONS.map((item, index) => `${index + 1}. ${item.label}`);
    return result(
      "buyer_request_unit",
      { ...context, quantity },
      joinMenu(t("listing.unit", actor), lines),
    );
  }

  if (menuKey === "buyer_request_unit") {
    const index = Number(input) - 1;
    const unit = UNIT_OPTIONS[index];
    if (!unit) {
      const lines = UNIT_OPTIONS.map((item, i) => `${i + 1}. ${item.label}`);
      return withInvalid(actor, result(menuKey, context, joinMenu(t("listing.unit", actor), lines)));
    }
    const produce = context.produce as ProduceOption | undefined;
    const quantity = Number(context.quantity ?? 0);
    return result(
      "buyer_request_confirm",
      { ...context, unit: unit.code },
      `${t("listing.confirm", actor)}\n${produce?.name ?? "Produce"}: ${quantity} ${unit.code}\n1. Confirm\n2. Cancel`,
    );
  }

  if (menuKey === "buyer_request_confirm") {
    if (input === "2" || input === "0") return mainMenu(actor, channel);
    if (input !== "1") return withInvalid(actor, result(menuKey, context, t("common.invalid_option", actor), false));
    const produce = context.produce as ProduceOption | undefined;
    const quantity = Number(context.quantity ?? 0);
    const unit = String(context.unit ?? "kg");
    if (!produce) return mainMenu(actor, channel);
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    try {
      await createBuyerRequest(actor.userId, {
        produce_type_id: produce.id,
        requested_quantity: quantity,
        unit,
        currency: "NGN",
        expiry_date: expiry,
      });
      return result("main", {}, "Buyer request created. Farmers can now respond.", true);
    } catch {
      return result("main", {}, "Could not create buyer request. Please try again.", true);
    }
  }

  if (menuKey === "buyer_my_requests") {
    if (input === "0") return mainMenu(actor, channel);
    const page = await getMyBuyerRequests(actor.userId, { page: 1, limit: menuLimit() });
    if (page.requests.length === 0) {
      return result("main", {}, `${t("my_requests.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
    }
    const lines = page.requests.map((item, index) => {
      const produce = item.produce_type?.name ?? item.produce_category?.name ?? "Produce";
      return `${index + 1}. ${produce} - ${item.requested_quantity} ${item.unit} - ${item.status}`;
    });
    return result("main", {}, joinMenu(t("my_requests.header", actor), lines), true);
  }

  if (menuKey === "buyer_offers") {
    if (input === "0") return mainMenu(actor, channel);
    const page = await listOffers(actor.userId, {
      page: 1,
      limit: menuLimit(),
      status: "pending",
      direction: "received",
      sort: "newest",
    });
    if (page.offers.length === 0) {
      return result("main", {}, `${t("offers.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
    }
    const contextWithOffers = { ...context, offer_options: page.offers.map((item) => item.id) };
    const lines = page.offers.map((item, index) => {
      return `${index + 1}. ${item.offer_number} - ${item.quantity} ${item.unit} - ${formatCurrency(Number(item.unit_price), item.currency)}`;
    });
    return result("buyer_offer_action", contextWithOffers, joinMenu(t("offers.header", actor), lines));
  }

  if (menuKey === "buyer_offer_action") {
    if (input === "0") return mainMenu(actor, channel);
    const offers = offerOptions(context);
    const index = Number(input) - 1;
    const offerId = offers[index];
    if (!offerId) return withInvalid(actor, result(menuKey, context, t("common.invalid_option", actor), false));
    return result(
      "buyer_offer_decision",
      { ...context, selected_offer_id: offerId },
      `${t("offers.action", actor)}\n1. Accept\n2. Reject\n0. Back`,
    );
  }

  const buyerDecision = await handleOfferDecision(
    actor,
    menuKey,
    context,
    input,
    channel,
    "buyer",
  );
  if (buyerDecision) return buyerDecision;

  if (menuKey === "buyer_orders") {
    if (input === "0") return mainMenu(actor, channel);
    const page = await listOrders(actor.userId, { page: 1, limit: menuLimit(), sort: "newest" });
    if (page.orders.length === 0) {
      return result("main", {}, `${t("orders.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
    }
    const lines = page.orders.map((item, index) => {
      return `${index + 1}. ${item.order_number} - ${item.status} - ${formatCurrency(Number(item.total_amount), item.currency)}`;
    });
    return result("main", {}, joinMenu(t("orders.header", actor), lines), true);
  }

  return mainMenu(actor, channel);
}

async function handleMarketInput(
  actor: TelecomActor,
  menuKey: string,
  context: Record<string, unknown>,
  input: string,
  channel: TelecomChannel,
): Promise<TelecomFlowResult> {
  if (menuKey === "market_select") {
    if (input === "0") return mainMenu(actor, channel);
    const produce = selectedProduce(context, input);
    if (!produce) return withInvalid(actor, await produceMenu(actor, menuKey, "market.select_type"));
    const scope = await resolveMarketScope(
      actor.userId ?? "00000000-0000-0000-0000-000000000000",
      actor.roles,
    );
    const resultData = await listMarketPrices(
      {
        page: 1,
        limit: 1,
        produce_type_id: produce.id,
        currency: "NGN",
        sort: "newest",
      },
      scope,
    );
    const summary = resultData.summary ?? resultData.groups[0];
    if (!summary) {
      return result("main", {}, `${t("market.empty", actor)}\n${t("menu.option.exit", actor)}`, true);
    }
    const message = t(
      "market.result",
      actor,
      {
        name: produce.name,
        average: formatCurrency(Number(summary.average_price), summary.currency),
        unit: summary.unit,
      },
    );
    return result("main", {}, `${message}\n${t("menu.option.exit", actor)}`, true);
  }
  return mainMenu(actor, channel);
}

async function handleRegistrationInput(
  actor: TelecomActor,
  menuKey: string,
  context: Record<string, unknown>,
  input: string,
  channel: TelecomChannel,
): Promise<TelecomFlowResult> {
  if (menuKey === "register_name") {
    if (channel !== "ussd") return mainMenu(actor, channel);
    const name = input.trim();
    if (name.length < 2) {
      return withInvalid(actor, result("register_name", context, t("register.name_prompt", actor), false));
    }
    const password = `${randomBytes(24).toString("base64url")}aA1!`;
    try {
      const registration = await registerUser({
        display_name: name,
        phone_number: actor.phoneNumber,
        password,
        password_confirm: password,
      });
      return result(
        "register_otp",
        { registration_user_id: registration.user.id },
        t("register.otp_prompt", actor),
        false,
        "number",
      );
    } catch (err) {
      const code = (err as { code?: string }).code;
      const message =
        code === "DUPLICATE_CONTACT"
          ? t("register.exists", actor)
          : t("register.failed", actor, {}, true);
      return result("main", {}, `${message}\n${t("menu.option.exit", actor)}`, true);
    }
  }

  if (menuKey === "register_otp") {
    const userId =
      actor.userId ??
      (typeof context.registration_user_id === "string"
        ? context.registration_user_id
        : null);
    if (!userId) return mainMenu(actor, channel);
    try {
      await verifyUserPhone(userId, input.trim());
      const refreshed = await refreshTelecomActor(userId, actor.phoneNumber);
      if (refreshed.userId) {
        void dispatchNotification({
          user_id: refreshed.userId,
          notification_type: "telecom_registration_verified",
          variables: {},
          related_entity_type: "user",
          related_entity_id: refreshed.userId,
          dedupe_key: `telecom-registration:${refreshed.userId}`,
          allow_external: true,
          force_sms: true,
        });
      }
      return result(
        "main",
        {},
        `${t("register.complete", actor, {}, true)}\n${mainMenu(refreshed, channel).message}`,
        false,
      );
    } catch {
      return result(
        "register_otp",
        context,
        t("register.otp_invalid", actor, {}, true),
        false,
        "number",
      );
    }
  }

  return mainMenu(actor, channel);
}

export async function startTelecomMenu(
  actor: TelecomActor,
  channel: TelecomChannel,
): Promise<TelecomFlowResult> {
  return mainMenu(actor, channel);
}

export async function handleTelecomInput(
  actorInput: TelecomActor,
  channel: TelecomChannel,
  menuKey: string,
  context: Record<string, unknown>,
  input: string,
  providerSessionId: string,
): Promise<TelecomFlowResult> {
  let actor = actorInput;
  const trimmed = input.trim();

  if (menuKey === "language") {
    const code = selectedLanguage(context, trimmed);
    if (!code) return withInvalid(actor, languageMenu(actor));
    if (actor.userId) {
      try {
        await updateLanguagePreference(actor.userId, code);
      } catch {
        // Language can still be used for this session.
      }
    }
    actor = { ...actor, language: normalizeLanguage(code) };
    return {
      ...mainMenu(actor, channel),
      language: actor.language,
      message: `${t("language.saved", actor)}\n${mainMenu(actor, channel).message}`,
    };
  }

  if (menuKey === "register_name" || menuKey === "register_otp") {
    return handleRegistrationInput(actor, menuKey, context, trimmed, channel);
  }

  if (menuKey === "support_message") {
    if (channel !== "ussd") return mainMenu(actor, channel);
    if (trimmed.length < 3) {
      return withInvalid(actor, result("support_message", context, t("support.prompt", actor), false));
    }
    return createSupportRequest(
      actor,
      channel,
      trimmed.slice(0, env.TELECOM_SUPPORT_MESSAGE_MAX_LENGTH),
      providerSessionId,
    );
  }

  if (menuKey === "main") {
    if (trimmed === "0") {
      return result("main", {}, t("common.exit", actor), true);
    }

    if (actor.status === "suspended") {
      if (trimmed === "1") {
        return createSupportRequest(
          actor,
          channel,
          "Suspended account support request",
          providerSessionId,
        );
      }
      return withInvalid(actor, mainMenu(actor, channel));
    }

    if (actor.status === "guest") {
      if (channel === "ussd") {
        if (trimmed === "1") {
          return result("register_name", {}, t("register.name_prompt", actor), false);
        }
        if (trimmed === "2") return produceMenu(actor, "market_select", "market.select_type");
        if (trimmed === "3") return languageMenu(actor);
        if (trimmed === "4") {
          return result("support_message", {}, t("support.prompt", actor), false);
        }
      } else {
        if (trimmed === "1") return produceMenu(actor, "market_select", "market.select_type");
        if (trimmed === "2") return languageMenu(actor);
        if (trimmed === "3") {
          return createSupportRequest(actor, channel, "Voice support callback requested", providerSessionId);
        }
      }
      return withInvalid(actor, mainMenu(actor, channel));
    }

    if (actor.status === "pending") {
      if (trimmed === "1") {
        return result("register_otp", {}, t("register.otp_prompt", actor), false, "number");
      }
      if (trimmed === "2") {
        try {
          if (actor.userId) await resendPhoneOtp(actor.userId);
          return {
            ...mainMenu(actor, channel),
            message: `${t("pending.resent", actor)}\n${mainMenu(actor, channel).message}`,
          };
        } catch {
          return mainMenu(actor, channel);
        }
      }
      if (trimmed === "3") return languageMenu(actor);
      if (trimmed === "4") {
        if (channel === "voice") {
          return createSupportRequest(actor, channel, "Voice support callback requested", providerSessionId);
        }
        return result("support_message", {}, t("support.prompt", actor), false);
      }
      return withInvalid(actor, mainMenu(actor, channel));
    }

    const role = primaryTelecomRole(actor.roles);
    if (role === "farmer") {
      if (trimmed === "1") return produceMenu(actor, "farmer_sell_select", "listing.select_type");
      if (trimmed === "2") return showMyListings(actor);
      if (trimmed === "3") return showOpenBuyerRequests(actor);
      if (trimmed === "4") return showOffers(actor, channel, "farmer");
      if (trimmed === "5") return showOrders(actor);
      if (trimmed === "6") return produceMenu(actor, "market_select", "market.select_type");
      if (trimmed === "7") return languageMenu(actor);
      if (trimmed === "8") {
        if (channel === "voice") {
          return createSupportRequest(actor, channel, "Voice support callback requested", providerSessionId);
        }
        return result("support_message", {}, t("support.prompt", actor), false);
      }
      return withInvalid(actor, mainMenu(actor, channel));
    }

    if (role === "buyer") {
      if (trimmed === "1") return produceMenu(actor, "buyer_browse_select", "menu.option.browse");
      if (trimmed === "2") return produceMenu(actor, "buyer_request_select", "menu.option.create_request");
      if (trimmed === "3") return showMyBuyerRequests(actor);
      if (trimmed === "4") return showOffers(actor, channel, "buyer");
      if (trimmed === "5") return showOrders(actor);
      if (trimmed === "6") return produceMenu(actor, "market_select", "market.select_type");
      if (trimmed === "7") return languageMenu(actor);
      if (trimmed === "8") {
        if (channel === "voice") {
          return createSupportRequest(actor, channel, "Voice support callback requested", providerSessionId);
        }
        return result("support_message", {}, t("support.prompt", actor), false);
      }
      return withInvalid(actor, mainMenu(actor, channel));
    }

    return withInvalid(actor, mainMenu(actor, channel));
  }

  if (menuKey.startsWith("farmer_")) {
    return handleFarmerInput(actor, menuKey, context, trimmed, channel);
  }
  if (menuKey.startsWith("buyer_")) {
    return handleBuyerInput(actor, menuKey, context, trimmed, channel);
  }
  if (menuKey.startsWith("market_")) {
    return handleMarketInput(actor, menuKey, context, trimmed, channel);
  }

  if (GUEST_MENU_KEYS.has(menuKey)) return mainMenu(actor, channel);
  return mainMenu(actor, channel);
}
