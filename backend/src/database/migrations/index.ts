import * as createRoles from "./20261102000001-create-roles.js";
import * as createUsers from "./20261102000002-create-users.js";
import * as createUserRoles from "./20261102000003-create-user-roles.js";
import * as createUserPasswords from "./20261102000004-create-user-passwords.js";
import * as createPhoneOtps from "./20261102000005-create-phone-otps.js";
import * as createEmailVerificationTokens from "./20261102000006-create-email-verification-tokens.js";
import * as createRefreshTokens from "./20261102000007-create-refresh-tokens.js";
import * as createUserProfiles from "./20261103000001-create-user-profiles.js";
import * as createFarmerProfiles from "./20261103000002-create-farmer-profiles.js";
import * as createCooperativeProfiles from "./20261103000003-create-cooperative-profiles.js";
import * as createCooperativeMemberships from "./20261103000004-create-cooperative-memberships.js";
import * as createCooperativeAgentAssignments from "./20261103000005-create-cooperative-agent-assignments.js";
import * as createAgentActivityLogs from "./20261103000006-create-agent-activity-logs.js";
import * as createProduceCategories from "./20261104000001-create-produce-categories.js";
import * as createProduceTypes from "./20261104000002-create-produce-types.js";
import * as createProduceListings from "./20261104000003-create-produce-listings.js";
import * as createProduceListingImages from "./20261104000004-create-produce-listing-images.js";
import * as createInventoryAdjustments from "./20261104000005-create-inventory-adjustments.js";
import * as produceCatalogueHardening from "./20261104000006-produce-catalogue-hardening.js";
import * as createBuyerRequests from "./20261105000001-create-buyer-requests.js";
import * as createConversations from "./20261106000001-create-conversations.js";
import * as createConversationParticipants from "./20261106000002-create-conversation-participants.js";
import * as createMessages from "./20261106000003-create-messages.js";
import * as createOffers from "./20261107000001-create-offers.js";
import * as createOrders from "./20261108000001-create-orders.js";
import * as createInventoryReservations from "./20261108000002-create-inventory-reservations.js";
import * as createPayments from "./20261108000003-create-payments.js";
import * as createTransporterProfiles from "./20261109000001-create-transporter-profiles.js";
import * as createDeliveries from "./20261109000002-create-deliveries.js";
import * as createDeliveryHistory from "./20261109000003-create-delivery-history.js";
import * as createNotifications from "./20261110000001-create-notifications.js";
import * as createNotificationDeliveries from "./20261110000002-create-notification-deliveries.js";
import * as createNotificationPreferences from "./20261110000003-create-notification-preferences.js";
import * as createReviews from "./20261112000001-create-reviews.js";
import * as createVerifications from "./20261112000002-create-verifications.js";
import * as addPhase12NotificationPreferences from "./20261112000003-add-phase12-notification-preferences.js";
import * as createMarketIntelligence from "./20261113000001-create-market-intelligence.js";
import * as createAiIntegrityRecommendations from "./20261114000001-create-ai-integrity-recommendations.js";
import * as createPhase16FarmerProtection from "./20261115000001-create-phase16-farmer-protection.js";
import * as createPhase17TelecomLocalization from "./20261116000001-create-phase17-telecom-localization.js";
import * as createPhase18PilotReadiness from "./20261117000001-create-phase18-pilot-readiness.js";

export const migrations = [
  { name: "20261102000001-create-roles", ...createRoles },
  { name: "20261102000002-create-users", ...createUsers },
  { name: "20261102000003-create-user-roles", ...createUserRoles },
  { name: "20261102000004-create-user-passwords", ...createUserPasswords },
  { name: "20261102000005-create-phone-otps", ...createPhoneOtps },
  {
    name: "20261102000006-create-email-verification-tokens",
    ...createEmailVerificationTokens,
  },
  { name: "20261102000007-create-refresh-tokens", ...createRefreshTokens },
  { name: "20261103000001-create-user-profiles", ...createUserProfiles },
  { name: "20261103000002-create-farmer-profiles", ...createFarmerProfiles },
  {
    name: "20261103000003-create-cooperative-profiles",
    ...createCooperativeProfiles,
  },
  {
    name: "20261103000004-create-cooperative-memberships",
    ...createCooperativeMemberships,
  },
  {
    name: "20261103000005-create-cooperative-agent-assignments",
    ...createCooperativeAgentAssignments,
  },
  {
    name: "20261103000006-create-agent-activity-logs",
    ...createAgentActivityLogs,
  },
  {
    name: "20261104000001-create-produce-categories",
    ...createProduceCategories,
  },
  {
    name: "20261104000002-create-produce-types",
    ...createProduceTypes,
  },
  {
    name: "20261104000003-create-produce-listings",
    ...createProduceListings,
  },
  {
    name: "20261104000004-create-produce-listing-images",
    ...createProduceListingImages,
  },
  {
    name: "20261104000005-create-inventory-adjustments",
    ...createInventoryAdjustments,
  },
  {
    name: "20261104000006-produce-catalogue-hardening",
    ...produceCatalogueHardening,
  },
  {
    name: "20261105000001-create-buyer-requests",
    ...createBuyerRequests,
  },
  {
    name: "20261106000001-create-conversations",
    ...createConversations,
  },
  {
    name: "20261106000002-create-conversation-participants",
    ...createConversationParticipants,
  },
  {
    name: "20261106000003-create-messages",
    ...createMessages,
  },
  {
    name: "20261107000001-create-offers",
    ...createOffers,
  },
  {
    name: "20261108000001-create-orders",
    ...createOrders,
  },
  {
    name: "20261108000002-create-inventory-reservations",
    ...createInventoryReservations,
  },
  {
    name: "20261108000003-create-payments",
    ...createPayments,
  },
  {
    name: "20261109000001-create-transporter-profiles",
    ...createTransporterProfiles,
  },
  {
    name: "20261109000002-create-deliveries",
    ...createDeliveries,
  },
  {
    name: "20261109000003-create-delivery-history",
    ...createDeliveryHistory,
  },
  {
    name: "20261110000001-create-notifications",
    ...createNotifications,
  },
  {
    name: "20261110000002-create-notification-deliveries",
    ...createNotificationDeliveries,
  },
  {
    name: "20261110000003-create-notification-preferences",
    ...createNotificationPreferences,
  },
  {
    name: "20261112000001-create-reviews",
    ...createReviews,
  },
  {
    name: "20261112000002-create-verifications",
    ...createVerifications,
  },
  {
    name: "20261112000003-add-phase12-notification-preferences",
    ...addPhase12NotificationPreferences,
  },
  {
    name: "20261113000001-create-market-intelligence",
    ...createMarketIntelligence,
  },
  {
    name: "20261114000001-create-ai-integrity-recommendations",
    ...createAiIntegrityRecommendations,
  },
  {
    name: "20261115000001-create-phase16-farmer-protection",
    ...createPhase16FarmerProtection,
  },
  {
    name: "20261116000001-create-phase17-telecom-localization",
    ...createPhase17TelecomLocalization,
  },
  {
    name: "20261117000001-create-phase18-pilot-readiness",
    ...createPhase18PilotReadiness,
  },
];
