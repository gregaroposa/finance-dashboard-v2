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

## Bank Notification & SMS Webhook (Bank Alerts → Transactions)

- Endpoint: `POST /api/sms-webhook`
- Purpose: Accepts forwarded bank push notifications (OTP banka / mBank@Net) or legacy bank SMS payloads (via iOS Shortcuts/REST) and creates a transaction on the mapped account.
- Auth: Public (no Clerk), secured with `SMS_WEBHOOK_SECRET` and optional `SMS_ALLOWED_SENDERS`.

Environment variables:

- `SMS_WEBHOOK_SECRET` — shared secret included in the POST body.
- `SMS_ALLOWED_SENDERS` — optional, comma-separated allowed senders (phone numbers or app names, matched case-insensitively without whitespace); example: `+38640123123, mBank@Net, OTP banka`.
- `CARD_<SUFFIX>` — maps card suffix to an `accounts.id`. Example: `CARD_1234=acc_abc123`.
- `IBAN_<SUFFIX>` — maps account IBAN last 4 digits to an `accounts.id`. Example: `IBAN_8483=acc_abc123`.

Payload example (bank app notification):

```json
{
  "title": "Odliv iz računa",
  "message": "Odliv 11,27 EUR; Prejemnik: NOEL F.; Namen: aleks ales darilo; Racun: SI56***********8483",
  "sender": "mBank@Net",
  "secret": "<SMS_WEBHOOK_SECRET>"
}
```

Notes:
  - `title`, `sender`, and `date` (ISO timestamp) are optional. If the notification does not include a date, the server uses `date` (if supplied) or the current timestamp.
  - Amounts are stored in miliunits; `11,27` → `11270`.
  - Card purchases (`NAKUP` / `Nakup`), outflows (`Odliv`), payments (`Plačilo`), and withdrawals (`Dvig`) are recorded as negative (expenses).
  - Inflows (`Priliv`) are recorded as positive (income).
  - The mapped `accounts.id` determines which user owns the new transaction.

Supported message formats

- Bank app push notification — outflow (expense):
  `Odliv 11,27 EUR; Prejemnik: NOEL F.; Namen: aleks ales darilo; Racun: SI56***********8483`
  - Also accepts notification title prepended on a preceding line (e.g. `Odliv iz računa\nOdliv 11,27 EUR; ...`).
  - Maps via `IBAN_8483`

- Bank app push notification — inflow (income):
  `Priliv 1.250,00 EUR; Placnik: PODJETJE D.O.O.; Namen: Placa; Racun: SI56***********8483`
  - Maps via `IBAN_8483`

- Card purchase (expense):
  `NAKUP 28.10.2025 17:24, kartica ***1234, znesek 4,50 EUR, MERCATOR.`
  - Maps via `CARD_1234`

- Legacy SMS account outflow (expense):
  `Odliv 02.11.2025; Iz racuna: SI56***********9148; Prejemnik: SOMEONE; Namen: text; Znesek: 0,01 EUR OTP banka d.d.`
  - Maps via `IBAN_9148`

- Legacy SMS account inflow (income):
  `Priliv 02.11.2025; Iz racuna: SI56***********9148; Placnik: SOMEONE; Namen: text; Znesek: 0,01 EUR OTP banka d.d.`
  - Maps via `IBAN_9148`
