import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";
import { eachDayOfInterval, isSameDay } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertAmountFromMiliunits(amount: number) {
  return amount / 1000;
}

export function convertAmountToMiliunits(amount: number) {
  return Math.round(amount * 1000);
}
// Parses a currency/amount string into a number, handling both comma and dot
// decimal separators, optional thousands separators, and an optional leading minus.
// Examples:
//  "10,50" -> 10.5
//  "1.234,56" -> 1234.56
//  "1,234.56" -> 1234.56
//  "-€ 10,50" -> -10.5
export function parseAmountFromString(
  value: string | undefined | null
): number {
  if (!value) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;

  // Keep only digits, comma, dot, and minus for analysis
  let cleaned = raw.replace(/[^0-9.,-]/g, "");

  // Extract sign and strip all minus signs from the remainder
  const isNegative = cleaned.startsWith("-");
  cleaned = cleaned.replace(/-/g, "");

  if (!cleaned) return isNegative ? -0 : 0;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  let normalized: string;
  if (lastDot === -1 && lastComma === -1) {
    // No separators, treat as integer value
    normalized = cleaned;
  } else {
    // Determine which is the decimal separator: whichever appears last
    const decimalIndex = Math.max(lastDot, lastComma);
    const integerPart = cleaned.slice(0, decimalIndex).replace(/[.,]/g, "");
    const fractionPart = cleaned.slice(decimalIndex + 1).replace(/[.,]/g, "");

    normalized = integerPart + "." + fractionPart;
  }

  const result = parseFloat(normalized);
  if (Number.isNaN(result)) return 0;
  return isNegative ? -result : result;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) {
    return previous === current ? 0 : 100;
  }

  return ((current - previous) / previous) * 100;
}

export function fillMissingDays(
  activeDays: {
    date: Date;
    income: number;
    expenses: number;
  }[],
  startDate: Date,
  endDate: Date
) {
  if (activeDays.length === 0) {
    return [];
  }

  const allDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const transactionsByDay = allDays.map((day) => {
    const found = activeDays.find((d) => isSameDay(d.date, day));

    if (found) {
      return found;
    } else {
      return {
        date: day,
        income: 0,
        expenses: 0,
      };
    }
  });

  return transactionsByDay;
}
