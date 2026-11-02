import * as createRoles from "./20261102000001-create-roles.js";
import * as createUsers from "./20261102000002-create-users.js";
import * as createUserRoles from "./20261102000003-create-user-roles.js";

export const migrations = [
  { name: "20261102000001-create-roles", ...createRoles },
  { name: "20261102000002-create-users", ...createUsers },
  { name: "20261102000003-create-user-roles", ...createUserRoles },
];
