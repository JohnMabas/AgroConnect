import { sequelize } from "./sequelize.js";

export { getSafeDatabaseErrorMessage } from "./errors.js";

export type DatabaseStatus = "up" | "down";

export interface DatabaseHealth {
  status: DatabaseStatus;
}

export async function testDatabaseConnection(): Promise<void> {
  await sequelize.authenticate();
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    await sequelize.query("SELECT 1");
    return { status: "up" };
  } catch {
    return { status: "down" };
  }
}

export async function closeDatabase(): Promise<void> {
  await sequelize.close();
}
