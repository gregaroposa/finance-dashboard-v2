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

  // Patterns:
  // 1) Card purchase (expense)
  const patternCard =
    /NAKUP\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}),\s+kartica\s+\*{3}(\d+),\s+znesek\s+([\d.,]+)\s+EUR,\s+([^\.]+)\./i;
  // 2) Account outflow (expense)
  const patternOdliv =
    /^(?:\s*)Odliv\s+(\d{2}\.\d{2}\.\d{4});\s*(?:Iz\s+ra[cč]una|Ra[cč]un):\s*SI\d{2}\*+(\d{4});\s*Prejemnik:\s*([^;]+);\s*Namen:\s*([^;]+);\s*Znesek:\s*([\d.,]+)\s*EUR/i;
  // 3) Account inflow (income)
  const patternPriliv =
    /^(?:\s*)Priliv\s+(\d{2}\.\d{2}\.\d{4});\s*(?:Iz\s+ra[cč]una|Ra[cč]un):\s*SI\d{2}\*+(\d{4});\s*Pla[cč]nik:\s*([^;]+);\s*Namen:\s*([^;]+);\s*Znesek:\s*([\d.,]+)\s*EUR/i;

  const msg = message?.trim() ?? "";
  let date: Date;
  let amount: number;
  let accountEnvKey: string | null = null;
  let payee: string = "";
  let notes: string | undefined;

  const matchCard = patternCard.exec(msg);
  const matchOdliv = !matchCard ? patternOdliv.exec(msg) : null;
  const matchPriliv = !matchCard && !matchOdliv ? patternPriliv.exec(msg) : null;

  if (matchCard) {
    const [, dateStr, timeStr, cardSuffix, amountStr, payeeStr] = matchCard;
    date = parse(`${dateStr} ${timeStr}`, "dd.MM.yyyy HH:mm", new Date());
    const parsedValue = Math.round(
      parseFloat(amountStr.replace(/\./g, "").replace(",", ".")) * 1000
    );
    amount = -Math.abs(parsedValue); // expense
    payee = payeeStr.trim();
    accountEnvKey = `CARD_${cardSuffix}`;
  } else if (matchOdliv) {
    const [, dateStr, ibanSuffix, prejemnik, namen, amountStr] = matchOdliv;
    date = parse(dateStr, "dd.MM.yyyy", new Date());
    const parsedValue = Math.round(
      parseFloat(amountStr.replace(/\./g, "").replace(",", ".")) * 1000
    );
    amount = -Math.abs(parsedValue); // expense
    payee = prejemnik.trim();
    notes = namen.trim();
    accountEnvKey = `IBAN_${ibanSuffix}`;
  } else if (matchPriliv) {
    const [, dateStr, ibanSuffix, placnik, namen, amountStr] = matchPriliv;
    date = parse(dateStr, "dd.MM.yyyy", new Date());
    const parsedValue = Math.round(
      parseFloat(amountStr.replace(/\./g, "").replace(",", ".")) * 1000
    );
    amount = Math.abs(parsedValue); // income
    payee = placnik.trim();
    notes = namen.trim();
    accountEnvKey = `IBAN_${ibanSuffix}`;
  } else {
    return c.json({ error: "Could not parse message" }, 400);
  }

  const accountId = accountEnvKey
    ? (process.env[accountEnvKey as keyof NodeJS.ProcessEnv] as string | undefined)
    : undefined;
  if (!accountId) {
    return c.json({ error: `Unknown account mapping for ${accountEnvKey}` }, 400);
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
