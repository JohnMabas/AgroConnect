import { Sequelize } from "sequelize";
import { env } from "../config/env.js";
import {
  resolveDatabaseConfig,
  toSequelizeOptions,
} from "./config.js";

const databaseConfig = resolveDatabaseConfig(env);

if (databaseConfig.insecureSsl && env.NODE_ENV !== "test") {
  console.warn(
    "Database TLS certificate verification is disabled because DB_SSL_VERIFY=false. This is not recommended for production.",
  );
}

export const sequelize = new Sequelize(toSequelizeOptions(databaseConfig));
