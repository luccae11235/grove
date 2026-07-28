import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { IdentityLink } from "./domain.js";

const payloadSchema = z.object({
  version: z.literal(1),
  subscriberId: z.string().uuid(),
  expiresAt: z.number().int().positive(),
  nonce: z.string().uuid(),
});

export function verifyIdentityLinkToken(
  token: string,
  secret: string,
  now: Date,
): IdentityLink | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const parsed = payloadSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (parsed.expiresAt * 1000 <= now.getTime()) return null;
    return {
      subscriberId: parsed.subscriberId,
      expiresAt: new Date(parsed.expiresAt * 1000),
      nonce: parsed.nonce,
    };
  } catch {
    return null;
  }
}
