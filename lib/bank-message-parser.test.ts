import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseBankMessage,
  parseWebhookJsonBody,
} from "./bank-message-parser";

describe("parseBankMessage", () => {
  const fallbackDate = new Date("2026-11-23T13:56:00.000Z");

  it("parses the new OTP banka app outflow push notification", () => {
    const result = parseBankMessage(
      "Odliv 11,27 EUR; Prejemnik: NOEL F.; Namen: aleks ales darilo; Racun: SI56***********8483",
      { fallbackDate }
    );

    assert.ok(result);
    assert.equal(result.amount, -11270);
    assert.equal(result.payee, "NOEL F.");
    assert.equal(result.notes, "aleks ales darilo");
    assert.equal(result.accountEnvKey, "IBAN_8483");
    assert.equal(result.date.getTime(), fallbackDate.getTime());
  });

  it("parses new push notification when notification title is prepended on an earlier line", () => {
    const result = parseBankMessage(
      "Odliv iz računa\nOdliv 11,27 EUR; Prejemnik: NOEL F.; Namen: aleks ales darilo; Racun: SI56***********8483",
      { fallbackDate }
    );

    assert.ok(result);
    assert.equal(result.amount, -11270);
    assert.equal(result.payee, "NOEL F.");
    assert.equal(result.notes, "aleks ales darilo");
    assert.equal(result.accountEnvKey, "IBAN_8483");
  });

  it("parses new push notification for inflow (Priliv) with thousands separator and diacritics", () => {
    const result = parseBankMessage(
      "Priliv na račun\nPriliv 1.250,50 EUR; Plačnik: PODJETJE D.O.O.; Namen: Plača november; Račun: SI56***********8483",
      { fallbackDate }
    );

    assert.ok(result);
    assert.equal(result.amount, 1250500);
    assert.equal(result.payee, "PODJETJE D.O.O.");
    assert.equal(result.notes, "Plača november");
    assert.equal(result.accountEnvKey, "IBAN_8483");
    assert.equal(result.date.getTime(), fallbackDate.getTime());
  });

  it("parses new push notification without Namen field", () => {
    const result = parseBankMessage(
      "Odliv 25,00 EUR; Prejemnik: PETROL D.D.; Racun: SI56***********8483",
      { fallbackDate }
    );

    assert.ok(result);
    assert.equal(result.amount, -25000);
    assert.equal(result.payee, "PETROL D.D.");
    assert.equal(result.notes, undefined);
    assert.equal(result.accountEnvKey, "IBAN_8483");
  });

  it("falls back to Namen as payee when Prejemnik is omitted (e.g. bank fees)", () => {
    const result = parseBankMessage(
      "Odliv 2,50 EUR; Namen: Nadomestilo za vodenje računa; Racun: SI56***********8483",
      { fallbackDate }
    );

    assert.ok(result);
    assert.equal(result.amount, -2500);
    assert.equal(result.payee, "Nadomestilo za vodenje računa");
    assert.equal(result.notes, undefined);
    assert.equal(result.accountEnvKey, "IBAN_8483");
  });

  it("parses semicolon-style card purchase notification", () => {
    const result = parseBankMessage(
      "Nakup 4,50 EUR; Trgovec: MERCATOR; Kartica: ***1234",
      { fallbackDate }
    );

    assert.ok(result);
    assert.equal(result.amount, -4500);
    assert.equal(result.payee, "MERCATOR");
    assert.equal(result.accountEnvKey, "CARD_1234");
  });

  it("keeps supporting legacy SMS card purchase (NAKUP)", () => {
    const result = parseBankMessage(
      "NAKUP 28.10.2025 17:24, kartica ***1234, znesek 4,50 EUR, MERCATOR.",
      { fallbackDate }
    );

    assert.ok(result);
    assert.equal(result.amount, -4500);
    assert.equal(result.payee, "MERCATOR");
    assert.equal(result.accountEnvKey, "CARD_1234");
    assert.equal(result.date.getFullYear(), 2025);
    assert.equal(result.date.getMonth(), 9);
    assert.equal(result.date.getDate(), 28);
    assert.equal(result.date.getHours(), 17);
    assert.equal(result.date.getMinutes(), 24);
  });

  it("keeps supporting legacy SMS outflow (Odliv) with extra segments", () => {
    const result = parseBankMessage(
      "Odliv 02.11.2025; Iz racuna: SI56***********9148; Prejemnik: SOMEONE; Namen: text; Ref 123; Znesek: 0,01 EUR OTP banka d.d.",
      { fallbackDate }
    );

    assert.ok(result);
    assert.equal(result.amount, -10);
    assert.equal(result.payee, "SOMEONE");
    assert.equal(result.notes, "text — Ref 123");
    assert.equal(result.accountEnvKey, "IBAN_9148");
    assert.equal(result.date.getFullYear(), 2025);
    assert.equal(result.date.getMonth(), 10);
    assert.equal(result.date.getDate(), 2);
  });

  it("keeps supporting legacy SMS inflow (Priliv)", () => {
    const result = parseBankMessage(
      "Priliv 02.11.2025; Racun: SI56***********9148; Placnik: SOMEONE; Namen: refund; Znesek: 12,34 EUR OTP banka d.d.",
      { fallbackDate }
    );

    assert.ok(result);
    assert.equal(result.amount, 12340);
    assert.equal(result.payee, "SOMEONE");
    assert.equal(result.notes, "refund");
    assert.equal(result.accountEnvKey, "IBAN_9148");
  });

  it("rejects non-transaction bank notifications", () => {
    assert.equal(parseBankMessage("Potrdite prijavo v mBank@Net"), null);
    assert.equal(parseBankMessage("Novo sporočilo v nabiralniku"), null);
    assert.equal(parseBankMessage("   "), null);
  });
});

describe("parseWebhookJsonBody", () => {
  it("parses standard JSON", () => {
    const parsed = parseWebhookJsonBody(
      JSON.stringify({ message: "hello", secret: "s" })
    ) as { message: string; secret: string };
    assert.equal(parsed.message, "hello");
    assert.equal(parsed.secret, "s");
  });

  it("recovers when iOS Shortcuts embeds a raw newline inside a JSON string", () => {
    const raw =
      '{ "message": "Odliv iz računa\nOdliv 11,27 EUR; Prejemnik: NOEL F.; Namen: aleks ales darilo; Racun: SI56***********8483", "sender": "mBank@Net", "secret": "abc" }';
    const parsed = parseWebhookJsonBody(raw) as {
      message: string;
      sender: string;
      secret: string;
    };

    assert.ok(parsed);
    assert.equal(
      parsed.message,
      "Odliv iz računa\nOdliv 11,27 EUR; Prejemnik: NOEL F.; Namen: aleks ales darilo; Racun: SI56***********8483"
    );
    assert.equal(parsed.sender, "mBank@Net");
    assert.equal(parsed.secret, "abc");
  });
});
