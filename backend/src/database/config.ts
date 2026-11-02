import { readFileSync } from "node:fs";
import type { Options } from "sequelize";

export interface DatabaseSslOptions {
  ca?: string;
  rejectUnauthorized?: boolean;
  servername?: string;
}

export interface DatabaseConfigSource {
  NODE_ENV: string;
  DATABASE_URL?: string | undefined;
  DB_SSL: boolean;
  DB_SSL_CA_PATH?: string | undefined;
  DB_SSL_VERIFY?: boolean | undefined;
  /** Original hostname when the connection host has been replaced with a
   *  resolved IPv4 address. Used as the TLS SNI servername so certificate
   *  verification still works against the hostname in the certificate. */
  DB_SSL_SERVERNAME?: string | undefined;
  DB_HOST?: string | undefined;
  DB_PORT: number;
  DB_NAME?: string | undefined;
  DB_USER?: string | undefined;
  DB_PASSWORD?: string | undefined;
}

export interface ResolvedDatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: false | DatabaseSslOptions;
  insecureSsl: boolean;
}

const POSTGRES_PROTOCOLS = ["postgres:", "postgresql:"];

function requireValue(value: string | undefined, label: string): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Database configuration is incomplete: ${label} is required. Set DATABASE_URL or the individual DB_* variables.`,
    );
  }

  return value;
}

function parseDatabaseUrl(databaseUrl: string): {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
} {
  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error(
      "Database configuration is invalid: DATABASE_URL is not a valid PostgreSQL connection URL.",
    );
  }

  if (!POSTGRES_PROTOCOLS.includes(url.protocol)) {
    throw new Error(
      "Database configuration is invalid: DATABASE_URL must use the postgres:// or postgresql:// protocol.",
    );
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const port = url.port === "" ? 5432 : Number(url.port);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      "Database configuration is invalid: DATABASE_URL contains an invalid port.",
    );
  }

  return {
    host: requireValue(url.hostname, "the database host"),
    port,
    database: requireValue(database, "the database name"),
    username: requireValue(
      decodeURIComponent(url.username),
      "the database username",
    ),
    password: decodeURIComponent(url.password),
  };
}

function resolveConnection(source: DatabaseConfigSource): {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
} {
  if (source.DATABASE_URL !== undefined) {
    return parseDatabaseUrl(source.DATABASE_URL);
  }

  return {
    host: requireValue(source.DB_HOST, "DB_HOST"),
    port: source.DB_PORT,
    database: requireValue(source.DB_NAME, "DB_NAME"),
    username: requireValue(source.DB_USER, "DB_USER"),
    password: source.DB_PASSWORD ?? "",
  };
}

function resolveSsl(
  source: DatabaseConfigSource,
  host: string,
): { ssl: false | DatabaseSslOptions; insecureSsl: boolean } {
  if (!source.DB_SSL) {
    if (source.DB_SSL_CA_PATH !== undefined) {
      throw new Error(
        "Database configuration is invalid: DB_SSL_CA_PATH is set but DB_SSL is false.",
      );
    }

    return { ssl: false, insecureSsl: false };
  }

  const verifyCertificate = source.DB_SSL_VERIFY ?? true;

  if (!verifyCertificate) {
    return {
      ssl: { rejectUnauthorized: false },
      insecureSsl: true,
    };
  }

  const caPath = source.DB_SSL_CA_PATH;

  if (caPath === undefined) {
    throw new Error(
      "Database configuration is invalid: DB_SSL_CA_PATH is required when DB_SSL is enabled and certificate verification is on. Provide the Aiven CA certificate path, or explicitly set DB_SSL_VERIFY=false to use encryption without certificate verification.",
    );
  }

  let ca: string;

  try {
    ca = readFileSync(caPath, "utf8");
  } catch {
    throw new Error(
      "Database configuration is invalid: the Aiven CA certificate could not be read from DB_SSL_CA_PATH.",
    );
  }

  return {
    ssl: {
      ca,
      rejectUnauthorized: true,
      // Use DB_SSL_SERVERNAME when the connection host has been replaced with a
      // pre-resolved IPv4 address (to avoid IPv6 Happy Eyeballs timeouts). Fall
      // back to the connection host if no override is set.
      servername: source.DB_SSL_SERVERNAME ?? host,
    },
    insecureSsl: false,
  };
}

export function resolveDatabaseConfig(
  source: DatabaseConfigSource,
): ResolvedDatabaseConfig {
  const connection = resolveConnection(source);
  const { ssl, insecureSsl } = resolveSsl(source, connection.host);

  return {
    ...connection,
    ssl,
    insecureSsl,
  };
}

export function toSequelizeOptions(
  config: ResolvedDatabaseConfig,
): Options {
  return {
    dialect: "postgres",
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    logging: false,
    benchmark: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30_000,
      idle: 10_000,
    },
    ...(config.ssl === false
      ? {}
      : {
          dialectOptions: {
            ssl: config.ssl,
          },
        }),
  };
}

export function createSequelizeOptions(
  source: DatabaseConfigSource,
): Options {
  return toSequelizeOptions(resolveDatabaseConfig(source));
}
