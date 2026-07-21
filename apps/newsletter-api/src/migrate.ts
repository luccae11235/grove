import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

export async function runMigrations(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required to run newsletter migrations.");
  const sql = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  const directory = fileURLToPath(new URL("../migrations/", import.meta.url));
  const migrations = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    for (const name of migrations) {
      const applied = await sql<{ migration_name: string }[]>`
        SELECT migration_name FROM schema_migrations WHERE migration_name = ${name}
      `;
      if (applied.length) continue;
      const source = await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8");
      await sql.begin(async (transaction) => {
        await transaction.unsafe(source);
        await transaction`
          INSERT INTO schema_migrations (migration_name) VALUES (${name})
          ON CONFLICT (migration_name) DO NOTHING
        `;
      });
      process.stdout.write(`${JSON.stringify({ event: "migration_applied", migration: name })}\n`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await runMigrations();
}
