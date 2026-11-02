import * as createRoles from "./20261102000001-create-roles.js";
import * as createUsers from "./20261102000002-create-users.js";
import * as createUserRoles from "./20261102000003-create-user-roles.js";
import * as createUserPasswords from "./20261102000004-create-user-passwords.js";
import * as createPhoneOtps from "./20261102000005-create-phone-otps.js";
import * as createEmailVerificationTokens from "./20261102000006-create-email-verification-tokens.js";
import * as createRefreshTokens from "./20261102000007-create-refresh-tokens.js";

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
];
