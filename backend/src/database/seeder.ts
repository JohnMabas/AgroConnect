import type { QueryInterface } from "sequelize";
import { SequelizeStorage, Umzug } from "umzug";
import { seeders } from "./seeders/index.js";
import { sequelize } from "./sequelize.js";

const seederLogger = {
  info: () => undefined,
  warn: (message: Record<string, unknown>) => console.warn(message),
  error: (message: Record<string, unknown>) => console.error(message),
  debug: () => undefined,
};

let seeder: Umzug<QueryInterface> | undefined;

function getSeeder(): Umzug<QueryInterface> {
  if (seeder === undefined) {
    seeder = new Umzug<QueryInterface>({
      migrations: seeders,
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({
        sequelize,
        modelName: "SequelizeSeedMeta",
      }),
      logger: seederLogger,
    });
  }

  return seeder;
}

export async function runSeedersUp(): Promise<string[]> {
  const executed = await getSeeder().up();
  return executed.map((entry) => entry.name);
}

export async function runSeedersDown(): Promise<string[]> {
  const executed = await getSeeder().down();
  return executed.map((entry) => entry.name);
}

export async function runSeedersDownAll(): Promise<string[]> {
  const executed = await getSeeder().down({ to: 0 });
  return executed.map((entry) => entry.name);
}

export async function getSeederStatus(): Promise<{
  executed: string[];
  pending: string[];
}> {
  const runner = getSeeder();
  const [executed, pending] = await Promise.all([
    runner.executed(),
    runner.pending(),
  ]);

  return {
    executed: executed.map((entry) => entry.name),
    pending: pending.map((entry) => entry.name),
  };
}
