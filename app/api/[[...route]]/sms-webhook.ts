// app/api/sms-webhook.ts
import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { accounts, transactions } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import {
  parseBankMessage,
  parseWebhookJsonBody,
} from "@/lib/bank-message-parser";

const app = new Hono();

const payloadSchema = z.object({
  message: z.string().min(1),
  secret: z.string().min(1),
  sender: z.string().optional(),
  title: z.string().optional(),
  date: z.string().optional(),
});

app.post("/", async (c) => {
  const rawText = await c.req.text().catch(() => "");
  const json = parseWebhookJsonBody(rawText);
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const { message, sender, secret, title, date: providedDate } = parsed.data;

  // Secret check to prevent unauthorized requests
  if (
    !process.env.SMS_WEBHOOK_SECRET ||
    secret !== process.env.SMS_WEBHOOK_SECRET
  ) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Optional sender allow-list. If defined, the sender must match one from the list.
  // Supports phone numbers (e.g. "+38640123123") and app names (e.g. "mBank@Net", "OTP banka").
  const allowedSenders = (process.env.SMS_ALLOWED_SENDERS || "")
    .split(",")
    .map((s) => s.replace(/\s+/g, "").toLowerCase())
    .filter(Boolean);
  if (allowedSenders.length > 0) {
    const normalized = (sender || "").replace(/\s+/g, "").toLowerCase();
    if (!normalized || !allowedSenders.includes(normalized)) {
      return c.json({ error: "Sender not allowed" }, 401);
    }
  }

  let fallbackDate = new Date();
  if (providedDate) {
    const candidate = new Date(providedDate);
    if (!Number.isNaN(candidate.getTime())) {
      fallbackDate = candidate;
    }
  }

  const parsedMessage = parseBankMessage(message, {
    title,
    fallbackDate,
  });

  if (!parsedMessage) {
    return c.json({ error: "Could not parse message" }, 400);
  }

  const { date, amount, payee, notes, accountEnvKey } = parsedMessage;

  const accountId = accountEnvKey
    ? (process.env[accountEnvKey as keyof NodeJS.ProcessEnv] as
        | string
        | undefined)
    : undefined;
  if (!accountId) {
    return c.json(
      { error: `Unknown account mapping for ${accountEnvKey}` },
      400
    );
  }

  // Ensure the mapped account exists (and implicitly ties to a single user via accounts.userId)
  const [account] = await db
    .select({ id: accounts.id, userId: accounts.userId })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  if (!account) {
    return c.json({ error: "Mapped account not found" }, 400);
  }

  // Insert transaction
  const [transaction] = await db
    .insert(transactions)
    .values({
      id: createId(),
      date,
      payee,
      amount,
      notes,
      accountId: account.id,
      categoryId: null,
    })
    .returning();

  return c.json({ data: transaction });
});

export default app;
