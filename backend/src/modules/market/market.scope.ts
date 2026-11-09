import {
  CooperativeAgentAssignment,
  CooperativeProfile,
} from "../../database/models/index.js";
import type { MarketAccessScope } from "./market.types.js";

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

export async function resolveMarketScope(
  userId: string,
  roles: string[],
): Promise<MarketAccessScope> {
  const isAdmin = roles.includes("admin");
  if (isAdmin) {
    return { user_id: userId, is_admin: true, allowed_states: null };
  }

  if (!roles.includes("cooperative_agent")) {
    return { user_id: userId, is_admin: false, allowed_states: null };
  }

  const assignments = await CooperativeAgentAssignment.findAll({
    where: { agent_user_id: userId, status: "active" },
    include: [
      {
        model: CooperativeProfile,
        as: "cooperative",
        required: true,
      },
    ],
  });

  if (assignments.length === 0) {
    throw serviceError(
      "Active cooperative assignment required to access regional market analytics.",
      "FORBIDDEN",
    );
  }

  const states = assignments
    .map((assignment) => {
      const cooperative = assignment.get("cooperative") as
        | CooperativeProfile
        | undefined;
      return cooperative?.state_or_region?.trim().toLowerCase() ?? null;
    })
    .filter((state): state is string => state !== null && state.length > 0);

  return {
    user_id: userId,
    is_admin: false,
    allowed_states: states.length > 0 ? [...new Set(states)] : null,
  };
}

export function assertStateAllowed(
  scope: MarketAccessScope,
  stateOrRegion: string | undefined | null,
): void {
  if (
    scope.allowed_states === null ||
    stateOrRegion === undefined ||
    stateOrRegion === null ||
    stateOrRegion.trim() === ""
  ) {
    return;
  }

  if (!scope.allowed_states.includes(stateOrRegion.trim().toLowerCase())) {
    throw serviceError(
      "You do not have access to market data for this region.",
      "FORBIDDEN",
    );
  }
}

export function assertStatesAllowed(
  scope: MarketAccessScope,
  statesOrRegions: string[] | undefined,
): void {
  if (scope.allowed_states === null || statesOrRegions === undefined) {
    return;
  }

  for (const state of statesOrRegions) {
    assertStateAllowed(scope, state);
  }
}
