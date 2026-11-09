import { Role, User } from "../database/models/index.js";
import type { NotificationType } from "../modules/notifications/notifications.types.js";
import { dispatchNotification } from "../modules/notifications/notifications.service.js";

export async function listAdminUserIds(): Promise<string[]> {
  const admins = await User.findAll({
    attributes: ["id"],
    include: [
      {
        model: Role,
        as: "roles",
        attributes: [],
        through: { attributes: [] },
        where: { name: "admin" },
        required: true,
      },
    ],
  });
  return admins.map((admin) => admin.id);
}

export interface AdminNotificationInput {
  notification_type: NotificationType;
  variables: Parameters<typeof dispatchNotification>[0]["variables"];
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  action_url?: string | null;
  dedupe_key_prefix: string;
}

export async function notifyAdmins(
  input: AdminNotificationInput,
): Promise<void> {
  const admins = await listAdminUserIds();
  await Promise.all(
    admins.map(async (adminId) => {
      try {
        await dispatchNotification({
          user_id: adminId,
          notification_type: input.notification_type,
          variables: input.variables,
          related_entity_type: input.related_entity_type ?? null,
          related_entity_id: input.related_entity_id ?? null,
          action_url: input.action_url ?? null,
          dedupe_key: `${input.dedupe_key_prefix}:${adminId}`,
        });
      } catch (error) {
        console.error("Admin notification dispatch failed:", error);
      }
    }),
  );
}
