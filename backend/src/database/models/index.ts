import { AgentActivityLog } from "./agent-activity-log.model.js";
import { CooperativeAgentAssignment } from "./cooperative-agent-assignment.model.js";
import { CooperativeMembership } from "./cooperative-membership.model.js";
import { CooperativeProfile } from "./cooperative-profile.model.js";
import { EmailVerificationToken } from "./email-verification-token.model.js";
import { FarmerProfile } from "./farmer-profile.model.js";
import { PhoneOtp } from "./phone-otp.model.js";
import { RefreshToken } from "./refresh-token.model.js";
import { Role } from "./role.model.js";
import { UserPassword } from "./user-password.model.js";
import { UserProfile } from "./user-profile.model.js";
import { UserRole } from "./user-role.model.js";
import { User } from "./user.model.js";

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

export {
  AgentActivityLog,
  CooperativeAgentAssignment,
  CooperativeMembership,
  CooperativeProfile,
  EmailVerificationToken,
  FarmerProfile,
  PhoneOtp,
  RefreshToken,
  Role,
  User,
  UserPassword,
  UserProfile,
  UserRole,
};
export { sequelize } from "../sequelize.js";
