import { Role } from "./role.model.js";
import { UserRole } from "./user-role.model.js";
import { User } from "./user.model.js";

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

export { Role, User, UserRole };
export { sequelize } from "../sequelize.js";
