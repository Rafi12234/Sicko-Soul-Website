import "dotenv/config";

import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import mariadb from "mariadb";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const databaseHost = requiredEnv("DATABASE_HOST");
const databaseUser = requiredEnv("DATABASE_USER");
const databasePassword = requiredEnv("DATABASE_PASSWORD");
const databaseName = requiredEnv("DATABASE_NAME");

const databasePort = Number(process.env.DATABASE_PORT ?? "3306");

if (!Number.isInteger(databasePort) || databasePort <= 0) {
  throw new Error("DATABASE_PORT must be a valid positive integer.");
}

const connection = await mariadb.createConnection({
  host: databaseHost,
  port: databasePort,
  user: databaseUser,
  password: databasePassword,
  database: databaseName,
  multipleStatements: true,
});
try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS sicko_schema_migrations (
      migration_id VARCHAR(36) NOT NULL,
      migration_name VARCHAR(255) NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

      PRIMARY KEY (migration_id),
      UNIQUE KEY uq_sicko_schema_migration_name (migration_name)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci
  `);

  const migrationsRoot = path.resolve("prisma/migrations");

  const entries = await readdir(migrationsRoot, {
    withFileTypes: true,
  });

  const migrations = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migrationName of migrations) {
    const migrationFile = path.join(
      migrationsRoot,
      migrationName,
      "migration.sql",
    );

    const sql = await readFile(migrationFile, "utf8");

    const checksum = createHash("sha256")
      .update(sql)
      .digest("hex");

    const existing = await connection.query(
      `
        SELECT checksum
        FROM sicko_schema_migrations
        WHERE migration_name = ?
        LIMIT 1
      `,
      [migrationName],
    );

    if (existing.length > 0) {
      if (existing[0].checksum !== checksum) {
        throw new Error(
          `Migration ${migrationName} was already applied but its checksum changed.`,
        );
      }

      console.log(`Already applied: ${migrationName}`);
      continue;
    }

    console.log(`Applying migration: ${migrationName}`);

    await connection.query(sql);

    await connection.query(
      `
        INSERT INTO sicko_schema_migrations
          (migration_id, migration_name, checksum)
        VALUES (?, ?, ?)
      `,
      [randomUUID(), migrationName, checksum],
    );

    console.log(`Applied migration: ${migrationName}`);
  }

  console.log("Production migrations completed.");
} finally {
  await connection.end();
}