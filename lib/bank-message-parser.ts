import { parse } from "date-fns";

export type ParsedBankMessage = {
  date: Date;
  amount: number;
  payee: string;
  notes?: string;
  accountEnvKey: string;
};

export type ParseBankMessageOptions = {
  title?: string;
  fallbackDate?: Date;
};

function parseEurAmountToMiliunits(amountStr: string): number | null {
  const cleaned = amountStr.trim().replace(/^[+-]/, "").replace(/\s+/g, "");
  if (!cleaned) return null;

  let normalized: string;
  if (cleaned.includes(",")) {
    // European/Slovenian format: "11,27" or "1.234,56"
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+\.\d{1,2}$/.test(cleaned)) {
    // Dot-decimal format: "11.27"
    normalized = cleaned;
  } else {
    // Integer or dot-thousands without decimals: "1.000" or "100"
    normalized = cleaned.replace(/\./g, "");
  }

  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 1000);
}

function parseSlovenianDate(
  dateStr: string,
  timeStr: string | undefined,
  referenceDate: Date
): Date | null {
  const parsed = timeStr
    ? parse(`${dateStr} ${timeStr}`, "dd.MM.yyyy HH:mm", referenceDate)
    : parse(dateStr, "dd.MM.yyyy", referenceDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractIbanSuffix(value: string): string | null {
  // Matches masked or unmasked Slovenian IBANs such as:
  // "SI56***********8483", "SI56****8483", "SI56 0400 1004 0008 483"
  const ibanMatch = /\bSI\d{2}(?:[\d*\s\-]|X(?=[\d*X]))+/i.exec(value);
  if (!ibanMatch) return null;
  const compact = ibanMatch[0].replace(/[\s\-]/g, "");
  const suffixMatch = /(\d{4})$/.exec(compact);
  return suffixMatch ? suffixMatch[1] : null;
}

function extractCardSuffix(value: string): string | null {
  const maskedMatch = /(?:\*+|X+)(\d{3,4})\b/i.exec(value);
  if (maskedMatch) return maskedMatch[1];
  const digitsMatch = /(\d{4})\b/.exec(value);
  return digitsMatch ? digitsMatch[1] : null;
}

function extractEurAmount(value: string): number | null {
  const match = /([+-]?\d[\d.,]*)\s*(?:EUR\b|€)/i.exec(value);
  if (!match) return null;
  return parseEurAmountToMiliunits(match[1]);
}

function normalizeMessageBody(
  message: string,
  explicitTitle?: string
): { title: string; body: string } {
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { title: (explicitTitle || "").trim(), body: "" };
  }

  let title = (explicitTitle || "").trim();
  let bodyLines = lines;

  // When iOS Shortcuts passes Shortcut Input directly from a Notification trigger,
  // it may prepend the notification title (or app name + title) on earlier lines, e.g.:
  //   Odliv iz računa
  //   Odliv 11,27 EUR; Prejemnik: NOEL F.; Namen: ...; Racun: SI56***********8483
  const transactionStartIdx = lines.findIndex(
    (line) =>
      /^(?:Odliv|Priliv|Nakup|Pla[cč]ilo|Dvig)\s+[\d+-]/i.test(line) ||
      line.includes(";")
  );

  if (transactionStartIdx > 0) {
    if (!title) {
      title = lines.slice(0, transactionStartIdx).join(" ");
    }
    bodyLines = lines.slice(transactionStartIdx);
  }

  return {
    title,
    body: bodyLines.join(" ").trim(),
  };
}

function parseLegacyCardPurchase(
  body: string,
  fallbackDate: Date
): ParsedBankMessage | null {
  // Example: "NAKUP 28.10.2025 17:24, kartica ***1234, znesek 4,50 EUR, MERCATOR."
  const patternCard =
    /NAKUP\s+(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2}),\s+kartica\s+\*+(\d+),\s+znesek\s+([\d.,]+)\s+(?:EUR|€),\s+([^\.]+)(?:\.|$)/i;
  const match = patternCard.exec(body);
  if (!match) return null;

  const [, dateStr, timeStr, cardSuffix, amountStr, payeeStr] = match;
  const date = parseSlovenianDate(dateStr, timeStr, fallbackDate);
  const amountMiliunits = parseEurAmountToMiliunits(amountStr);
  const payee = payeeStr.trim();

  if (!date || amountMiliunits === null || !payee) return null;

  return {
    date,
    amount: -Math.abs(amountMiliunits),
    payee,
    accountEnvKey: `CARD_${cardSuffix}`,
  };
}

function parseSemicolonMessage(
  body: string,
  title: string,
  fallbackDate: Date
): ParsedBankMessage | null {
  const segments = body
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length < 2) return null;

  const firstSegment = segments[0];
  let direction: "expense" | "income" | null = null;
  let hasActionHeader = false;

  if (/^Odliv\b/i.test(firstSegment)) {
    direction = "expense";
    hasActionHeader = true;
  } else if (/^Priliv\b/i.test(firstSegment)) {
    direction = "income";
    hasActionHeader = true;
  } else if (/^(?:Nakup|Pla[cč]ilo|Dvig)\b/i.test(firstSegment)) {
    direction = "expense";
    hasActionHeader = true;
  } else if (/\b(?:Odliv|Nakup|Pla[cč]ilo|Dvig)\b/i.test(title)) {
    direction = "expense";
  } else if (/\bPriliv\b/i.test(title)) {
    direction = "income";
  }

  if (!direction) return null;

  let parsedDate: Date | null = null;
  let amountMiliunits: number | null = null;
  let accountEnvKey: string | null = null;
  let payee = "";
  let baseNote = "";
  const extraNotes: string[] = [];

  if (hasActionHeader) {
    // New app push format: "Odliv 11,27 EUR" / "Priliv 1.250,00 EUR"
    // Legacy SMS format:   "Odliv 02.11.2025" / "Priliv 02.11.2025"
    const headerAmount = extractEurAmount(firstSegment);
    if (headerAmount !== null) {
      amountMiliunits = headerAmount;
    }

    const headerDateMatch =
      /\b(\d{2}\.\d{2}\.\d{4})(?:\s+(\d{2}:\d{2}))?\b/.exec(firstSegment);
    if (headerDateMatch) {
      parsedDate = parseSlovenianDate(
        headerDateMatch[1],
        headerDateMatch[2],
        fallbackDate
      );
    }
  }

  const fieldSegments = hasActionHeader ? segments.slice(1) : segments;

  for (const segment of fieldSegments) {
    const ibanField =
      /^(?:Iz\s+ra[cč]una|Na\s+ra[cč]un|Ra[cč]un)\s*:\s*(.+)$/i.exec(segment);
    if (ibanField) {
      const suffix = extractIbanSuffix(ibanField[1]);
      if (suffix) {
        accountEnvKey = `IBAN_${suffix}`;
      }
      continue;
    }

    const cardField = /^Kartica\s*:\s*(.+)$/i.exec(segment);
    if (cardField) {
      const suffix = extractCardSuffix(cardField[1]);
      if (suffix) {
        accountEnvKey = `CARD_${suffix}`;
      }
      continue;
    }

    const amountField = /^Znesek\s*:\s*(.+)$/i.exec(segment);
    if (amountField) {
      const value = extractEurAmount(amountField[1]);
      if (value !== null) {
        amountMiliunits = value;
      }
      continue;
    }

    const dateField = /^(?:Datum(?:\s+in\s+[cč]as)?)\s*:\s*(.+)$/i.exec(
      segment
    );
    if (dateField) {
      const dm = /(\d{2}\.\d{2}\.\d{4})(?:[,\s]+(\d{2}:\d{2}))?/.exec(
        dateField[1]
      );
      if (dm) {
        parsedDate = parseSlovenianDate(dm[1], dm[2], fallbackDate);
      }
      continue;
    }

    const recipientField =
      /^(?:Prejemnik|Trgovec|Prodajno\s+mesto)\s*:\s*(.+)$/i.exec(segment);
    if (recipientField) {
      if (direction === "expense") {
        payee = recipientField[1].trim();
      }
      continue;
    }

    const payerField = /^Pla[cč]nik\s*:\s*(.+)$/i.exec(segment);
    if (payerField) {
      if (direction === "income") {
        payee = payerField[1].trim();
      }
      continue;
    }

    const purposeField = /^Namen\s*:\s*(.+)$/i.exec(segment);
    if (purposeField) {
      baseNote = purposeField[1].trim();
      continue;
    }

    // Ignore trailing bank signature if it appears as its own segment
    if (/^OTP\s+banka(?:\s+d\.d\.)?$/i.test(segment)) {
      continue;
    }

    extraNotes.push(segment);
  }

  // Fallback for bank fees or notifications without a Prejemnik/Plačnik field
  if (!payee && baseNote) {
    payee = baseNote;
    baseNote = "";
  }

  if (amountMiliunits === null || !accountEnvKey || !payee) {
    return null;
  }

  const extraJoined = extraNotes.join(" | ");
  const combinedNotes = [baseNote, extraJoined].filter(Boolean).join(" — ");

  return {
    date: parsedDate ?? fallbackDate,
    amount:
      direction === "expense"
        ? -Math.abs(amountMiliunits)
        : Math.abs(amountMiliunits),
    payee,
    notes: combinedNotes || undefined,
    accountEnvKey,
  };
}

/**
 * Parses bank SMS and OTP banka (mBank@Net) push notification messages into
 * structured transaction fields.
 */
export function parseBankMessage(
  message: string,
  options: ParseBankMessageOptions = {}
): ParsedBankMessage | null {
  const fallbackDate = options.fallbackDate ?? new Date();
  const { title, body } = normalizeMessageBody(message, options.title);
  if (!body) return null;

  // 1) Legacy/standard card purchase format ("NAKUP ...")
  const legacyCard = parseLegacyCardPurchase(body, fallbackDate);
  if (legacyCard) return legacyCard;

  // 2) Semicolon-delimited account & notification formats (both new push & legacy SMS)
  return parseSemicolonMessage(body, title, fallbackDate);
}

/**
 * Escapes literal control characters (such as newlines from iOS Shortcuts raw
 * JSON templates) that appear inside JSON string literals.
 */
function escapeControlCharsInJsonStrings(raw: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) {
        result += ch;
        escaped = false;
      } else if (ch === "\\") {
        result += ch;
        escaped = true;
      } else if (ch === '"') {
        result += ch;
        inString = false;
      } else if (ch === "\n") {
        result += "\\n";
      } else if (ch === "\r") {
        result += "\\r";
      } else if (ch === "\t") {
        result += "\\t";
      } else {
        result += ch;
      }
    } else {
      if (ch === '"') {
        inString = true;
      }
      result += ch;
    }
  }

  return result;
}

/**
 * Parses a JSON webhook body while gracefully recovering from unescaped
 * newlines/tabs inside string values (common in iOS Shortcuts HTTP templates).
 */
export function parseWebhookJsonBody(rawText: string): unknown {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    try {
      return JSON.parse(escapeControlCharsInJsonStrings(rawText));
    } catch {
      return null;
    }
  }
}
