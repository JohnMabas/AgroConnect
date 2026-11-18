import { type QueryInterface } from "sequelize";
import type { MigrationParams } from "umzug";

export async function up({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.sequelize.query(
    'ALTER TYPE "enum_messages_message_type" ADD VALUE IF NOT EXISTS \'image\'',
  );
  await queryInterface.sequelize.query(
    'ALTER TYPE "enum_messages_message_type" ADD VALUE IF NOT EXISTS \'audio\'',
  );
  await queryInterface.sequelize.query(
    'ALTER TYPE "enum_messages_message_type" ADD VALUE IF NOT EXISTS \'media\'',
  );

  await queryInterface.removeConstraint("messages", "messages_content_length");
  await queryInterface.addConstraint("messages", {
    fields: ["content"],
    type: "check",
    name: "messages_content_length",
    where: queryInterface.sequelize.literal(
      "char_length(content) >= 0 AND char_length(content) <= 4000",
    ),
  });
}

export async function down({
  context: queryInterface,
}: MigrationParams<QueryInterface>): Promise<void> {
  await queryInterface.removeConstraint("messages", "messages_content_length");
  await queryInterface.addConstraint("messages", {
    fields: ["content"],
    type: "check",
    name: "messages_content_length",
    where: queryInterface.sequelize.literal(
      "char_length(content) > 0 AND char_length(content) <= 4000",
    ),
  });
}
