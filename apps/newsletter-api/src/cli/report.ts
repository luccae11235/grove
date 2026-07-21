import { PostgresNewsletterRepository } from "../postgresRepository.js";

const issueIndex = process.argv.indexOf("--issue");
const issueId = issueIndex >= 0 ? process.argv[issueIndex + 1] : undefined;
if (!issueId) throw new Error("Usage: pnpm newsletter:report --issue <issue-id>");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the newsletter report.");
const repository = new PostgresNewsletterRepository(databaseUrl);
try {
  const metrics = await repository.getIssueMetrics(issueId);
  process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
} finally {
  await repository.close();
}
