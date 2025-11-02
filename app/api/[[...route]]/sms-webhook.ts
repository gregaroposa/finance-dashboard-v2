// app/api/sms-webhook.ts
import { Hono } from "hono";
import { parse } from "date-fns";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { accounts, transactions } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";

const app = new Hono();

const payloadSchema = z.object({
  message: z.string().min(1),
  secret: z.string().min(1),
  sender: z.string().optional(),
});

app.post("/", async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const { message, sender, secret } = parsed.data;

  // Secret check to prevent unauthorized requests
  if (!process.env.SMS_WEBHOOK_SECRET || secret !== process.env.SMS_WEBHOOK_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Optional sender allow-list. If defined, the sender must match one from the list.
  // Expect a comma-separated list of phone numbers (normalized), e.g. "+38640123123, +38670111222"
  const allowedSenders = (process.env.SMS_ALLOWED_SENDERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowedSenders.length > 0) {
    const normalized = (sender || "").replace(/\s+/g, "");
    if (!normalized || !allowedSenders.includes(normalized)) {
      return c.json({ error: "Sender not allowed" }, 401);
    }
  }

  // Regex to extract fields from the OTP banka message (Slovenian locale)
  const pattern =
    /NAKUP\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}),\s+kartica\s+\*{3}(\d+),\s+znesek\s+([\d.,]+)\s+EUR,\s+([^\.]+)\./;
  const match = pattern.exec(message);
  if (!match) {
    return c.json({ error: "Could not parse message" }, 400);
  }

  const [, dateStr, timeStr, cardSuffix, amountStr, payee] = match;
  const date = parse(`${dateStr} ${timeStr}`, "dd.MM.yyyy HH:mm", new Date());

  // Convert amount (e.g., "4,50") to miliunits and force expense (negative)
  const parsedValue = Math.round(parseFloat(amountStr.replace(",", ".")) * 1000);
  const amount = -Math.abs(parsedValue);

  // Map last card digits to accountId via environment variables (CARD_<suffix>=<accountId>)
  const envKey = `CARD_${cardSuffix}`;
  const accountId = process.env[envKey as keyof NodeJS.ProcessEnv];
  if (!accountId) {
    return c.json({ error: `Unknown card suffix ${cardSuffix}` }, 400);
  }

  // Ensure the mapped account exists (and implicitly ties to a single user via accounts.userId)
  const [account] = await db
    .select({ id: accounts.id, userId: accounts.userId })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  if (!account) {
    return c.json({ error: "Mapped account not found" }, 400);
  }

  // Insert transaction into the database
  const [transaction] = await db
    .insert(transactions)
    .values({
      id: createId(),
      date,
      payee,
      amount,
      accountId: account.id,
      categoryId: null,
    })
    .returning();

  return c.json({ data: transaction });
});

export default app;
