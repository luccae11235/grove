import { PostgresObservabilityRepository } from "../postgresRepository.js";
import { parseArguments } from "./arguments.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for observability retention.");
const arguments_ = parseArguments(process.argv.slice(2));
const apply = arguments_.apply === true;
if (apply && arguments_.confirm !== "DELETE:observability-retention") {
  throw new Error("Deletion requires --confirm DELETE:observability-retention.");
}
const now = new Date();
const rawCutoff = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000);
const cutoff = new Date(Date.UTC(
  rawCutoff.getUTCFullYear(),
  rawCutoff.getUTCMonth(),
  rawCutoff.getUTCDate(),
));
const repository = new PostgresObservabilityRepository(databaseUrl);

try {
  const result = apply
    ? await repository.applyRetention(cutoff)
    : await repository.inspectRetention(cutoff);
  process.stdout.write(`${JSON.stringify({
    apply,
    cutoff: cutoff.toISOString(),
    ...result,
  }, null, 2)}\n`);
} finally {
  await repository.close();
}
