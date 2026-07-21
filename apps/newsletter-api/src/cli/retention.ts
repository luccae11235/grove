import { PostgresNewsletterRepository } from "../postgresRepository.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the retention report.");
const apply = process.argv.includes("--apply");
const confirmationIndex = process.argv.indexOf("--confirm");
const confirmation = confirmationIndex >= 0 ? process.argv[confirmationIndex + 1] : undefined;
if (apply && confirmation !== "DELETE:newsletter-retention") {
  throw new Error("Deletion requires --confirm DELETE:newsletter-retention.");
}

const now = new Date();
const pendingBefore = subtractDays(now, 30);
const eventsBefore = subtractDays(now, 400);
const repository = new PostgresNewsletterRepository(databaseUrl);
try {
  const result = apply
    ? await repository.applyRetention(pendingBefore, eventsBefore)
    : await repository.inspectRetention(pendingBefore, eventsBefore);
  process.stdout.write(`${JSON.stringify({
    mode: apply ? "applied" : "dry-run",
    policy: {
      pendingBefore: pendingBefore.toISOString(),
      eventsBefore: eventsBefore.toISOString(),
    },
    affected: result,
  }, null, 2)}\n`);
} finally {
  await repository.close();
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}
