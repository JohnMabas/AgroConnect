import type { QueryInterface } from "sequelize";
import { SequelizeStorage, Umzug } from "umzug";
import { migrations } from "./migrations/index.js";
import { sequelize } from "./sequelize.js";

const migrationLogger = {
  info: () => undefined,
  warn: (message: Record<string, unknown>) => console.warn(message),
  error: (message: Record<string, unknown>) => console.error(message),
  debug: () => undefined,
};

let migrator: Umzug<QueryInterface> | undefined;

function getMigrator(): Umzug<QueryInterface> {
  if (migrator === undefined) {
    migrator = new Umzug<QueryInterface>({
      migrations,
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: migrationLogger,
    });
  }

  return migrator;
}

export async function runMigrationsUp(): Promise<string[]> {
  const executed = await getMigrator().up();
  return executed.map((migration) => migration.name);
}

export async function runMigrationsDown(): Promise<string[]> {
  const executed = await getMigrator().down();
  return executed.map((migration) => migration.name);
}

export async function runMigrationsDownAll(): Promise<string[]> {
  const executed = await getMigrator().down({ to: 0 });
  return executed.map((migration) => migration.name);
}

export async function getMigrationStatus(): Promise<{
  executed: string[];
  pending: string[];
}> {
  const runner = getMigrator();
  const [executed, pending] = await Promise.all([
    runner.executed(),
    runner.pending(),
  ]);

  return {
    executed: executed.map((migration) => migration.name),
    pending: pending.map((migration) => migration.name),
  };
}
