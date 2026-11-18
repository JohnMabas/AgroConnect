/**
 * Report-only script: lists message attachment rows whose files/objects cannot
 * be found in the configured storage driver. It never deletes DB rows or files.
 *
 * Usage (from backend/):
 *   npx tsx scripts/find-missing-attachments.ts
 *
 * Ensure DATABASE_URL / DB_* and STORAGE_DRIVER (+ Cloudinary/local vars) are
 * set in the environment or .env.
 */
import "../src/config/env.js";
import { MessageAttachment } from "../src/database/models/index.js";
import { sequelize } from "../src/database/sequelize.js";
import { messageStorage } from "../src/integrations/storage/index.js";

async function main(): Promise<void> {
  await sequelize.authenticate();

  const rows = await MessageAttachment.findAll({
    attributes: [
      "id",
      "message_id",
      "conversation_id",
      "storage_key",
      "resource_type",
      "public_id",
      "mime_type",
      "file_name",
      "created_at",
    ],
    order: [["created_at", "ASC"]],
  });

  const missing: Array<Record<string, unknown>> = [];
  for (const row of rows as any[]) {
    const mime = String(row.mime_type || "");
    const resourceType =
      row.resource_type ?? (mime.startsWith("image/") ? "image" : "video");
    const publicId = row.public_id ?? row.storage_key;
    let found = false;
    try {
      found = await messageStorage.exists(row.storage_key, {
        resourceType,
        publicId,
        mimeType: mime,
      });
    } catch (error: any) {
      missing.push({
        id: row.id,
        message_id: row.message_id,
        conversation_id: row.conversation_id,
        storage_key: row.storage_key,
        resource_type: resourceType,
        public_id: publicId,
        reason: `exists_check_error:${error?.code || error?.message || "unknown"}`,
      });
      continue;
    }
    if (!found) {
      missing.push({
        id: row.id,
        message_id: row.message_id,
        conversation_id: row.conversation_id,
        storage_key: row.storage_key,
        resource_type: resourceType,
        public_id: publicId,
        file_name: row.file_name,
        created_at: row.created_at,
        reason: "not_found",
      });
    }
  }

  console.log(
    `Scanned ${rows.length} attachment row(s). Missing: ${missing.length}.`,
  );
  for (const item of missing) {
    console.log(JSON.stringify(item));
  }
}

main()
  .catch((error) => {
    console.error("find-missing-attachments failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
      // ignore
    }
  });
