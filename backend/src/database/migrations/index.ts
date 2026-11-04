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
];
