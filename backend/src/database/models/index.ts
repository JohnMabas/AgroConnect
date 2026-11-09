import { AgentActivityLog } from "./agent-activity-log.model.js";
import { BuyerRequest } from "./buyer-request.model.js";
import { Conversation } from "./conversation.model.js";
import { ConversationParticipant } from "./conversation-participant.model.js";
import { CooperativeAgentAssignment } from "./cooperative-agent-assignment.model.js";
import { CooperativeMembership } from "./cooperative-membership.model.js";
import { CooperativeProfile } from "./cooperative-profile.model.js";
import { Delivery } from "./delivery.model.js";
import { DeliveryHistory } from "./delivery-history.model.js";
import { EmailVerificationToken } from "./email-verification-token.model.js";
import { FarmerProfile } from "./farmer-profile.model.js";
import { InventoryAdjustment } from "./inventory-adjustment.model.js";
import { InventoryReservation } from "./inventory-reservation.model.js";
import { MarketInsight } from "./market-insight.model.js";
import { MarketObservation } from "./market-observation.model.js";
import { MarketPrice } from "./market-price.model.js";
import { Message } from "./message.model.js";
import { Notification } from "./notification.model.js";
import { NotificationDelivery } from "./notification-delivery.model.js";
import { NotificationPreference } from "./notification-preference.model.js";
import { Offer } from "./offer.model.js";
import { OfferEvent } from "./offer-event.model.js";
import { Order } from "./order.model.js";
import { OrderEvent } from "./order-event.model.js";
import { OrderItem } from "./order-item.model.js";
import { Payment } from "./payment.model.js";
import { PaymentWebhookEvent } from "./payment-webhook-event.model.js";
import { Refund } from "./refund.model.js";
import { Review } from "./review.model.js";
import { ReviewHistory } from "./review-history.model.js";
import { ReviewReport } from "./review-report.model.js";
import { PhoneOtp } from "./phone-otp.model.js";
import { ProduceCategory } from "./produce-category.model.js";
import { ProduceListing } from "./produce-listing.model.js";
import { ProduceListingImage } from "./produce-listing-image.model.js";
import { ProduceType } from "./produce-type.model.js";
import { RefreshToken } from "./refresh-token.model.js";
import { Role } from "./role.model.js";
import { TransporterProfile } from "./transporter-profile.model.js";
import { UserPassword } from "./user-password.model.js";
import { UserProfile } from "./user-profile.model.js";
import { UserRole } from "./user-role.model.js";
import { User } from "./user.model.js";
import { Verification } from "./verification.model.js";
import { VerificationDocument } from "./verification-document.model.js";
import { VerificationHistory } from "./verification-history.model.js";

// Phase 2 associations
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: "user_id",
  otherKey: "role_id",
  as: "roles",
  timestamps: true,
});

Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: "role_id",
  otherKey: "user_id",
  as: "users",
  timestamps: true,
});

User.hasMany(UserRole, {
  foreignKey: "user_id",
  as: "user_roles",
  onDelete: "CASCADE",
});

UserRole.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

Role.hasMany(UserRole, {
  foreignKey: "role_id",
  as: "user_roles",
  onDelete: "CASCADE",
});

UserRole.belongsTo(Role, {
  foreignKey: "role_id",
  as: "role",
});

// Phase 3 associations
User.hasOne(UserPassword, {
  foreignKey: "user_id",
  as: "password",
  onDelete: "CASCADE",
});

UserPassword.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(PhoneOtp, {
  foreignKey: "user_id",
  as: "phone_otps",
  onDelete: "CASCADE",
});

PhoneOtp.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(EmailVerificationToken, {
  foreignKey: "user_id",
  as: "email_verification_tokens",
  onDelete: "CASCADE",
});

EmailVerificationToken.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(RefreshToken, {
  foreignKey: "user_id",
  as: "refresh_tokens",
  onDelete: "CASCADE",
});

RefreshToken.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// Phase 4 associations
User.hasOne(UserProfile, {
  foreignKey: "user_id",
  as: "profile",
  onDelete: "CASCADE",
});

UserProfile.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasOne(FarmerProfile, {
  foreignKey: "user_id",
  as: "farmer_profile",
  onDelete: "CASCADE",
});

FarmerProfile.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(CooperativeProfile, {
  foreignKey: "registered_by_user_id",
  as: "cooperatives",
});

CooperativeProfile.belongsTo(User, {
  foreignKey: "registered_by_user_id",
  as: "registered_by",
});

CooperativeProfile.hasMany(CooperativeMembership, {
  foreignKey: "cooperative_id",
  as: "memberships",
  onDelete: "CASCADE",
});

CooperativeMembership.belongsTo(CooperativeProfile, {
  foreignKey: "cooperative_id",
  as: "cooperative",
});

CooperativeMembership.belongsTo(User, {
  foreignKey: "farmer_user_id",
  as: "farmer",
});

// A farmer profile has many cooperative membership records
FarmerProfile.hasMany(CooperativeMembership, {
  foreignKey: "farmer_user_id",
  as: "memberships",
});

CooperativeMembership.belongsTo(FarmerProfile, {
  foreignKey: "farmer_user_id",
  as: "farmer_profile",
});

CooperativeProfile.hasMany(CooperativeAgentAssignment, {
  foreignKey: "cooperative_id",
  as: "agent_assignments",
  onDelete: "CASCADE",
});

CooperativeAgentAssignment.belongsTo(CooperativeProfile, {
  foreignKey: "cooperative_id",
  as: "cooperative",
});

CooperativeAgentAssignment.belongsTo(User, {
  foreignKey: "agent_user_id",
  as: "agent",
});

AgentActivityLog.belongsTo(User, {
  foreignKey: "agent_user_id",
  as: "agent",
});

AgentActivityLog.belongsTo(User, {
  foreignKey: "farmer_user_id",
  as: "farmer",
});

// Phase 5 associations
ProduceCategory.hasMany(ProduceType, {
  foreignKey: "category_id",
  as: "produce_types",
  onDelete: "CASCADE",
});

ProduceType.belongsTo(ProduceCategory, {
  foreignKey: "category_id",
  as: "category",
});

ProduceListing.belongsTo(User, {
  foreignKey: "farmer_user_id",
  as: "farmer",
});

ProduceListing.belongsTo(ProduceType, {
  foreignKey: "produce_type_id",
  as: "produce_type",
});

User.hasMany(ProduceListing, {
  foreignKey: "farmer_user_id",
  as: "listings",
});

ProduceListing.hasMany(ProduceListingImage, {
  foreignKey: "listing_id",
  as: "images",
  onDelete: "CASCADE",
});

ProduceListingImage.belongsTo(ProduceListing, {
  foreignKey: "listing_id",
  as: "listing",
});

ProduceListing.hasMany(InventoryAdjustment, {
  foreignKey: "listing_id",
  as: "inventory_adjustments",
  onDelete: "CASCADE",
});

InventoryAdjustment.belongsTo(ProduceListing, {
  foreignKey: "listing_id",
  as: "listing",
});

// Phase 6 associations
BuyerRequest.belongsTo(User, {
  foreignKey: "buyer_user_id",
  as: "buyer",
});

User.hasMany(BuyerRequest, {
  foreignKey: "buyer_user_id",
  as: "buyer_requests",
  onDelete: "CASCADE",
});

BuyerRequest.belongsTo(ProduceType, {
  foreignKey: "produce_type_id",
  as: "produce_type",
});

ProduceType.hasMany(BuyerRequest, {
  foreignKey: "produce_type_id",
  as: "buyer_requests",
});

BuyerRequest.belongsTo(ProduceCategory, {
  foreignKey: "produce_category_id",
  as: "produce_category",
});

ProduceCategory.hasMany(BuyerRequest, {
  foreignKey: "produce_category_id",
  as: "buyer_requests",
});

// Phase 7 associations
Conversation.belongsTo(User, {
  foreignKey: "created_by_user_id",
  as: "created_by",
});

User.hasMany(Conversation, {
  foreignKey: "created_by_user_id",
  as: "created_conversations",
  onDelete: "CASCADE",
});

Conversation.belongsTo(ProduceListing, {
  foreignKey: "listing_id",
  as: "listing",
});

ProduceListing.hasMany(Conversation, {
  foreignKey: "listing_id",
  as: "conversations",
});

Conversation.belongsTo(BuyerRequest, {
  foreignKey: "buyer_request_id",
  as: "buyer_request",
});

BuyerRequest.hasMany(Conversation, {
  foreignKey: "buyer_request_id",
  as: "conversations",
});

Conversation.belongsToMany(User, {
  through: ConversationParticipant,
  foreignKey: "conversation_id",
  otherKey: "user_id",
  as: "participants",
  timestamps: true,
});

User.belongsToMany(Conversation, {
  through: ConversationParticipant,
  foreignKey: "user_id",
  otherKey: "conversation_id",
  as: "conversations",
  timestamps: true,
});

Conversation.hasMany(ConversationParticipant, {
  foreignKey: "conversation_id",
  as: "participant_records",
  onDelete: "CASCADE",
});

ConversationParticipant.belongsTo(Conversation, {
  foreignKey: "conversation_id",
  as: "conversation",
});

ConversationParticipant.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(ConversationParticipant, {
  foreignKey: "user_id",
  as: "conversation_participations",
  onDelete: "CASCADE",
});

Conversation.hasMany(Message, {
  foreignKey: "conversation_id",
  as: "messages",
  onDelete: "CASCADE",
});

Message.belongsTo(Conversation, {
  foreignKey: "conversation_id",
  as: "conversation",
});

Message.belongsTo(User, {
  foreignKey: "sender_user_id",
  as: "sender",
});

User.hasMany(Message, {
  foreignKey: "sender_user_id",
  as: "sent_messages",
  onDelete: "CASCADE",
});

// Phase 8 associations
Offer.belongsTo(ProduceListing, {
  foreignKey: "listing_id",
  as: "listing",
});

ProduceListing.hasMany(Offer, {
  foreignKey: "listing_id",
  as: "offers",
});

Offer.belongsTo(BuyerRequest, {
  foreignKey: "buyer_request_id",
  as: "buyer_request",
});

BuyerRequest.hasMany(Offer, {
  foreignKey: "buyer_request_id",
  as: "offers",
});

Offer.belongsTo(Conversation, {
  foreignKey: "conversation_id",
  as: "conversation",
});

Conversation.hasMany(Offer, {
  foreignKey: "conversation_id",
  as: "offers",
});

Offer.belongsTo(User, {
  foreignKey: "buyer_id",
  as: "buyer",
});

User.hasMany(Offer, {
  foreignKey: "buyer_id",
  as: "buyer_offers",
});

Offer.belongsTo(User, {
  foreignKey: "farmer_id",
  as: "farmer",
});

User.hasMany(Offer, {
  foreignKey: "farmer_id",
  as: "farmer_offers",
});

Offer.belongsTo(User, {
  foreignKey: "created_by",
  as: "creator",
});

Offer.belongsTo(Offer, {
  foreignKey: "parent_offer_id",
  as: "parent_offer",
});

Offer.hasMany(Offer, {
  foreignKey: "parent_offer_id",
  as: "counteroffers",
});

Offer.belongsTo(Offer, {
  foreignKey: "root_offer_id",
  as: "root_offer",
});

Offer.hasMany(OfferEvent, {
  foreignKey: "offer_id",
  as: "events",
  onDelete: "CASCADE",
});

OfferEvent.belongsTo(Offer, {
  foreignKey: "offer_id",
  as: "offer",
});

OfferEvent.belongsTo(User, {
  foreignKey: "actor_user_id",
  as: "actor",
});

// Phase 9 associations
Order.belongsTo(Offer, {
  foreignKey: "offer_id",
  as: "offer",
});

Offer.hasOne(Order, {
  foreignKey: "offer_id",
  as: "order",
});

Order.belongsTo(ProduceListing, {
  foreignKey: "listing_id",
  as: "listing",
});

ProduceListing.hasMany(Order, {
  foreignKey: "listing_id",
  as: "orders",
});

Order.belongsTo(User, {
  foreignKey: "buyer_id",
  as: "buyer",
});

User.hasMany(Order, {
  foreignKey: "buyer_id",
  as: "buyer_orders",
});

Order.belongsTo(User, {
  foreignKey: "farmer_id",
  as: "farmer",
});

User.hasMany(Order, {
  foreignKey: "farmer_id",
  as: "farmer_orders",
});

Order.hasOne(OrderItem, {
  foreignKey: "order_id",
  as: "item",
  onDelete: "CASCADE",
});

OrderItem.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order",
});

OrderItem.belongsTo(ProduceListing, {
  foreignKey: "listing_id",
  as: "listing",
});

Order.hasMany(OrderEvent, {
  foreignKey: "order_id",
  as: "events",
  onDelete: "CASCADE",
});

OrderEvent.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order",
});

OrderEvent.belongsTo(User, {
  foreignKey: "actor_user_id",
  as: "actor",
});

Order.hasOne(InventoryReservation, {
  foreignKey: "order_id",
  as: "reservation",
  onDelete: "CASCADE",
});

InventoryReservation.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order",
});

InventoryReservation.belongsTo(ProduceListing, {
  foreignKey: "listing_id",
  as: "listing",
});

ProduceListing.hasMany(InventoryReservation, {
  foreignKey: "listing_id",
  as: "reservations",
});

Order.hasMany(Payment, {
  foreignKey: "order_id",
  as: "payments",
  onDelete: "CASCADE",
});

Payment.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order",
});

Order.hasMany(Refund, {
  foreignKey: "order_id",
  as: "refunds",
  onDelete: "CASCADE",
});

Refund.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order",
});

Payment.hasMany(Refund, {
  foreignKey: "payment_id",
  as: "refunds",
  onDelete: "RESTRICT",
});

Refund.belongsTo(Payment, {
  foreignKey: "payment_id",
  as: "payment",
});

Refund.belongsTo(User, {
  foreignKey: "requested_by_user_id",
  as: "requested_by",
});

// Phase 10 associations
User.hasOne(TransporterProfile, {
  foreignKey: "user_id",
  as: "transporter_profile",
  onDelete: "CASCADE",
});

TransporterProfile.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

TransporterProfile.belongsTo(User, {
  foreignKey: "approved_by_user_id",
  as: "approved_by",
});

Order.hasMany(Delivery, {
  foreignKey: "order_id",
  as: "deliveries",
  onDelete: "CASCADE",
});

Delivery.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order",
});

Delivery.belongsTo(User, {
  foreignKey: "buyer_id",
  as: "buyer",
});

Delivery.belongsTo(User, {
  foreignKey: "farmer_id",
  as: "farmer",
});

Delivery.belongsTo(User, {
  foreignKey: "transporter_id",
  as: "transporter",
});

Delivery.belongsTo(User, {
  foreignKey: "created_by_user_id",
  as: "creator",
});

User.hasMany(Delivery, {
  foreignKey: "transporter_id",
  as: "transport_deliveries",
});

Delivery.hasMany(DeliveryHistory, {
  foreignKey: "delivery_id",
  as: "history",
  onDelete: "CASCADE",
});

DeliveryHistory.belongsTo(Delivery, {
  foreignKey: "delivery_id",
  as: "delivery",
});

DeliveryHistory.belongsTo(User, {
  foreignKey: "actor_user_id",
  as: "actor",
});

// Phase 11 associations
User.hasMany(Notification, {
  foreignKey: "user_id",
  as: "notifications",
  onDelete: "CASCADE",
});

Notification.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

Notification.hasMany(NotificationDelivery, {
  foreignKey: "notification_id",
  as: "deliveries",
  onDelete: "CASCADE",
});

NotificationDelivery.belongsTo(Notification, {
  foreignKey: "notification_id",
  as: "notification",
});

NotificationDelivery.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasOne(NotificationPreference, {
  foreignKey: "user_id",
  as: "notification_preference",
  onDelete: "CASCADE",
});

NotificationPreference.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// Phase 12 associations
Review.belongsTo(User, {
  foreignKey: "reviewer_id",
  as: "reviewer",
});

Review.belongsTo(User, {
  foreignKey: "reviewed_user_id",
  as: "reviewed_user",
});

User.hasMany(Review, {
  foreignKey: "reviewer_id",
  as: "given_reviews",
});

User.hasMany(Review, {
  foreignKey: "reviewed_user_id",
  as: "received_reviews",
});

Review.belongsTo(Order, {
  foreignKey: "order_id",
  as: "order",
});

Review.belongsTo(Delivery, {
  foreignKey: "delivery_id",
  as: "delivery",
});

Review.belongsTo(User, {
  foreignKey: "hidden_by_user_id",
  as: "hidden_by",
});

Review.hasMany(ReviewReport, {
  foreignKey: "review_id",
  as: "reports",
  onDelete: "CASCADE",
});

ReviewReport.belongsTo(Review, {
  foreignKey: "review_id",
  as: "review",
});

ReviewReport.belongsTo(User, {
  foreignKey: "reporter_id",
  as: "reporter",
});

ReviewReport.belongsTo(User, {
  foreignKey: "reviewed_by",
  as: "reviewed_by_user",
});

Review.hasMany(ReviewHistory, {
  foreignKey: "review_id",
  as: "history",
  onDelete: "CASCADE",
});

ReviewHistory.belongsTo(Review, {
  foreignKey: "review_id",
  as: "review",
});

ReviewHistory.belongsTo(ReviewReport, {
  foreignKey: "report_id",
  as: "report",
});

ReviewHistory.belongsTo(User, {
  foreignKey: "actor_user_id",
  as: "actor",
});

Verification.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(Verification, {
  foreignKey: "user_id",
  as: "verifications",
  onDelete: "CASCADE",
});

Verification.belongsTo(User, {
  foreignKey: "reviewed_by",
  as: "reviewed_by_user",
});

Verification.hasMany(VerificationDocument, {
  foreignKey: "verification_id",
  as: "documents",
  onDelete: "CASCADE",
});

VerificationDocument.belongsTo(Verification, {
  foreignKey: "verification_id",
  as: "verification",
});

VerificationDocument.belongsTo(User, {
  foreignKey: "uploaded_by_user_id",
  as: "uploaded_by",
});

Verification.hasMany(VerificationHistory, {
  foreignKey: "verification_id",
  as: "history",
  onDelete: "CASCADE",
});

VerificationHistory.belongsTo(Verification, {
  foreignKey: "verification_id",
  as: "verification",
});

VerificationHistory.belongsTo(User, {
  foreignKey: "actor_user_id",
  as: "actor",
});

// Phase 13 associations
MarketObservation.belongsTo(User, {
  foreignKey: "submitted_by_user_id",
  as: "submitted_by",
});

User.hasMany(MarketObservation, {
  foreignKey: "submitted_by_user_id",
  as: "market_observations",
  onDelete: "CASCADE",
});

MarketObservation.belongsTo(User, {
  foreignKey: "reviewed_by_user_id",
  as: "reviewed_by",
});

MarketObservation.belongsTo(CooperativeProfile, {
  foreignKey: "cooperative_id",
  as: "cooperative",
});

CooperativeProfile.hasMany(MarketObservation, {
  foreignKey: "cooperative_id",
  as: "market_observations",
});

MarketObservation.belongsTo(ProduceType, {
  foreignKey: "produce_type_id",
  as: "produce_type",
});

ProduceType.hasMany(MarketObservation, {
  foreignKey: "produce_type_id",
  as: "market_observations",
});

MarketObservation.belongsTo(ProduceCategory, {
  foreignKey: "produce_category_id",
  as: "produce_category",
});

ProduceCategory.hasMany(MarketObservation, {
  foreignKey: "produce_category_id",
  as: "market_observations",
});

MarketPrice.belongsTo(ProduceType, {
  foreignKey: "produce_type_id",
  as: "produce_type",
});

ProduceType.hasMany(MarketPrice, {
  foreignKey: "produce_type_id",
  as: "market_prices",
});

MarketPrice.belongsTo(ProduceCategory, {
  foreignKey: "produce_category_id",
  as: "produce_category",
});

ProduceCategory.hasMany(MarketPrice, {
  foreignKey: "produce_category_id",
  as: "market_prices",
});

MarketPrice.belongsTo(MarketObservation, {
  foreignKey: "market_observation_id",
  as: "market_observation",
});

MarketObservation.hasOne(MarketPrice, {
  foreignKey: "market_observation_id",
  as: "market_price",
});

MarketPrice.belongsTo(User, {
  foreignKey: "created_by_user_id",
  as: "created_by",
});

MarketInsight.belongsTo(ProduceType, {
  foreignKey: "produce_type_id",
  as: "produce_type",
});

ProduceType.hasMany(MarketInsight, {
  foreignKey: "produce_type_id",
  as: "market_insights",
});

MarketInsight.belongsTo(ProduceCategory, {
  foreignKey: "produce_category_id",
  as: "produce_category",
});

ProduceCategory.hasMany(MarketInsight, {
  foreignKey: "produce_category_id",
  as: "market_insights",
});

export {
  AgentActivityLog,
  BuyerRequest,
  Conversation,
  ConversationParticipant,
  CooperativeAgentAssignment,
  CooperativeMembership,
  CooperativeProfile,
  Delivery,
  DeliveryHistory,
  EmailVerificationToken,
  FarmerProfile,
  InventoryAdjustment,
  InventoryReservation,
  MarketInsight,
  MarketObservation,
  MarketPrice,
  Message,
  Notification,
  NotificationDelivery,
  NotificationPreference,
  Offer,
  OfferEvent,
  Order,
  OrderEvent,
  OrderItem,
  Payment,
  PaymentWebhookEvent,
  Refund,
  Review,
  ReviewHistory,
  ReviewReport,
  PhoneOtp,
  ProduceCategory,
  ProduceListing,
  ProduceListingImage,
  ProduceType,
  RefreshToken,
  Role,
  TransporterProfile,
  User,
  UserPassword,
  UserProfile,
  UserRole,
  Verification,
  VerificationDocument,
  VerificationHistory,
};
export { sequelize } from "../sequelize.js";
