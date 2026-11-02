import { EmailVerificationToken } from "./email-verification-token.model.js";
import { PhoneOtp } from "./phone-otp.model.js";
import { RefreshToken } from "./refresh-token.model.js";
import { Role } from "./role.model.js";
import { UserPassword } from "./user-password.model.js";
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

export {
  EmailVerificationToken,
  PhoneOtp,
  RefreshToken,
  Role,
  User,
  UserPassword,
  UserRole,
};
export { sequelize } from "../sequelize.js";
