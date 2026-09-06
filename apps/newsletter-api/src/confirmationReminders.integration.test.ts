import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import postgres from "postgres";
import { runMigrations } from "./migrate.js";
import { confirmationReminders } from "./confirmationReminders.js";
import type { NewsletterProvider, ConfirmationMessage } from "./provider.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
test("reminder preview, concurrent runs, expired links, suppression and uncertain sends", { skip: !databaseUrl }, async () => {
  const admin = postgres(databaseUrl!, { max: 1 });
  const schema = `reminders_${randomUUID().replaceAll("-", "")}`;
  await admin.unsafe(`CREATE SCHEMA "${schema}"`);
  const url = new URL(databaseUrl!);
  url.searchParams.set("options", `-c search_path=${schema}`);
  const sql = postgres(url.toString(), { max: 4 });
  const messages: ConfirmationMessage[] = [];
  let fail = false;
  const provider = { async sendConfirmation(message: ConfirmationMessage) {
    messages.push(message);
    if (fail) throw new Error("timeout");
    return "provider-id";
  } } as NewsletterProvider;
  try {
    await runMigrations(url.toString());
    for (const [email, status, expiry] of [
      ["expired@example.com", "pending", "-2 days"],
      ["valid@example.com", "pending", "2 days"],
      ["blocked@example.com", "suppressed", "-2 days"],
    ]) {
      const id = randomUUID();
      await sql`INSERT INTO newsletter_subscribers
        (subscriber_id,email,status,locale,source,consent_requested_at,created_at,updated_at)
        VALUES (${id},${email},${status},'pt-BR','test',now()-interval '10 days',now()-interval '10 days',now())`;
      await sql`INSERT INTO newsletter_subscription_actions
        (action_id,subscriber_id,action_type,token_hash,requested_at,expires_at)
        VALUES (${randomUUID()},${id},'confirm',${randomUUID()},now()-interval '10 days',now()+${expiry}::interval)`;
    }
    const options = { batch: "test", limit: 50, maxReminders: 1, webUrl: "https://aflora.example", apply: false };
    assert.equal((await confirmationReminders(sql,provider,options)).length,1);
    assert.equal(messages.length,0);
    await Promise.all([
      confirmationReminders(sql,provider,{...options,apply:true}),
      confirmationReminders(sql,provider,{...options,apply:true}),
    ]);
    assert.equal(messages.length,1);
    assert.equal(messages[0].email,"expired@example.com");
    assert.equal(messages[0].reminder,true);
    assert.equal((await confirmationReminders(sql,provider,{...options,apply:true})).length,0);
    await sql`UPDATE newsletter_subscription_actions SET expires_at=now()-interval '1 day',requested_at=now()-interval '8 days'`;
    fail=true;
    const uncertain = await confirmationReminders(sql,provider,{...options,batch:"second",maxReminders:2,apply:true,emails:["expired@example.com"]});
    assert.equal(uncertain[0].state,"unknown");
    await sql`UPDATE newsletter_subscription_actions SET expires_at=now()-interval '1 day',requested_at=now()-interval '8 days'`;
    const retry = await confirmationReminders(sql,provider,{...options,batch:"third",maxReminders:3,apply:true,emails:["expired@example.com"]});
    assert.equal(retry.length,0);
    assert.equal(messages.length,2);
  } finally {
    await sql.end();
    await admin.unsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});
