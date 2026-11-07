import { Role, User } from "../database/models/index.js";

/**
 * Fetch the current role names for a user from the database.
 *
 * Both the HTTP authentication middleware and Socket.IO authentication use
 * this helper so role changes are reflected immediately on every connection.
 */
export async function fetchUserRoles(userId: string): Promise<string[]> {
  try {
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: "roles", attributes: ["name"] }],
    });
    if (!user) return [];

    const rolesAny = (user as unknown as { roles?: Array<{ name: string }> })
      .roles;
    if (!Array.isArray(rolesAny)) return [];
    return rolesAny.map((role) => role.name);
  } catch {
    return [];
  }
}
