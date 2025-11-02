This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## SMS Webhook (Bank SMS → Transactions)

- Endpoint: `POST /api/sms-webhook`
- Purpose: Accepts forwarded bank SMS payloads (via iOS Shortcuts/REST) and creates a transaction on the mapped account.
- Auth: Public (no Clerk), secured with `SMS_WEBHOOK_SECRET` and optional `SMS_ALLOWED_SENDERS`.

Environment variables:

- `SMS_WEBHOOK_SECRET` — shared secret included in the POST body.
- `SMS_ALLOWED_SENDERS` — optional, comma-separated phone numbers to allow; example: `+38640123123, +38670111222`.
- `CARD_<SUFFIX>` — maps card suffix to an `accounts.id`. Example: `CARD_1234=acc_abc123`.
- `IBAN_<SUFFIX>` — maps account IBAN last 4 digits to an `accounts.id`. Example: `IBAN_9148=acc_abc123`.

Payload example:

```json
{
  "message": "NAKUP 28.10.2025 17:24, kartica ***1234, znesek 4,50 EUR, MERCATOR.",
  "sender": "+38640123123",
  "secret": "<SMS_WEBHOOK_SECRET>"
}
```

Notes:
  - Amounts are stored in miliunits; `4,50` → `4500`.
  - Card purchase (NAKUP) and outflow (Odliv) are recorded as negative (expenses).
  - Inflow (Priliv) is recorded as positive (income).
  - The mapped `accounts.id` determines which user owns the new transaction.

Supported message formats

- Card purchase (expense):
  `NAKUP 28.10.2025 17:24, kartica ***1234, znesek 4,50 EUR, MERCATOR.`
  - Maps via `CARD_1234`

- Account outflow (expense):
  `Odliv 02.11.2025; Iz racuna: SI56***********9148; Prejemnik: SOMEONE; Namen: text; Znesek: 0,01 EUR OTP banka d.d.`
  - Maps via `IBAN_9148`

- Account inflow (income):
  `Priliv 02.11.2025; Iz racuna: SI56***********9148; Placnik: SOMEONE; Namen: text; Znesek: 0,01 EUR OTP banka d.d.`
  - Maps via `IBAN_9148`
