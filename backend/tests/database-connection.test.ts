import { Sequelize } from "sequelize";
import { describe, expect, it } from "vitest";
import { createSequelizeOptions } from "../src/database/config.js";
import { testDatabaseConnection } from "../src/database/connection.js";

describe("database connectivity", () => {
  it("connects to the configured PostgreSQL test database", async () => {
    await expect(testDatabaseConnection()).resolves.toBeUndefined();
  });

  it("fails with invalid database connection settings", async () => {
    const options = createSequelizeOptions({
      NODE_ENV: "test",
      DB_SSL: false,
      DB_PORT: 1,
      DB_HOST: "127.0.0.1",
      DB_NAME: "agroconnect_test",
      DB_USER: "postgres",
      DB_PASSWORD: "postgres",
    });

    const invalidSequelize = new Sequelize({
      ...options,
      dialectOptions: {
        connectionTimeoutMillis: 1_500,
      },
    });

    try {
      await expect(invalidSequelize.authenticate()).rejects.toBeTruthy();
    } finally {
      await invalidSequelize.close();
    }
  });
});
