import { config } from "dotenv";
import { subDays } from "date-fns";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { categories, accounts, transactions } from "@/db/schema";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const SEED_USER_ID = "user_34TTt1VmwzhkRRKZetHQtAefsMT";
const SEED_CATEGORIES = [
  { id: "category_1", name: "Food", userId: SEED_USER_ID },
  { id: "category_2", name: "Transport", userId: SEED_USER_ID },
  { id: "category_3", name: "Entertainment", userId: SEED_USER_ID },
  { id: "category_7", name: "Utilities", userId: SEED_USER_ID },
];

const SEED_ACCOUNTS = [
  { id: "account_1", name: "Checking Account", userId: SEED_USER_ID },
  { id: "account_2", name: "Savings Account", userId: SEED_USER_ID },
];

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 90);

const SEED_TRANSACTIONS: (typeof transactions.$inferSelect)[] = [];

import { eachDayOfInterval, format } from "date-fns";
import { convertAmountToMiliunits } from "@/lib/utils";

const generateRandomAmount = (category: typeof categories.$inferSelect) => {
  switch (category.name) {
    case "Rent":
      return Math.random() * 400 + 90;

    case "Utilities":
      return Math.random() * 100 + 30;

    case "Food":
      return Math.random() * 50 + 10;

    case "Transport":
      return Math.random() * 20 + 5;

    case "Entertainment":
      return Math.random() * 70 + 15;

    default:
      return Math.random() * 100 + 20;
  }
};

const generateTransactionsForDay = (day: Date) => {
  const numTransactions = Math.floor(Math.random() * 4) + 1;

  for (let i = 0; i < numTransactions; i++) {
    const category =
      SEED_CATEGORIES[Math.floor(Math.random() * SEED_CATEGORIES.length)];
    const isExpense = Math.random() > 0.6;
    const amount = generateRandomAmount(category);
    const formattedAmount = convertAmountToMiliunits(
      isExpense ? -amount : amount
    );

    SEED_TRANSACTIONS.push({
      id: `transaction_${format(day, "yyyyMMdd")}_${i}`,
      accountId: SEED_ACCOUNTS[0].id,
      categoryId: category.id,
      date: day,
      amount: formattedAmount,
      payee: "Merchant",
      notes: "Random transaction",
    });
  }
};

const generateTransactions = () => {
  const days = eachDayOfInterval({ start: defaultFrom, end: defaultTo });
  days.forEach((day) => generateTransactionsForDay(day));
};

generateTransactions();

const main = async () => {
  try {
    // Reset database
    await db.delete(transactions).execute();
    await db.delete(accounts).execute();
    await db.delete(categories).execute();
    // Seed categories
    await db.insert(categories).values(SEED_CATEGORIES).execute();
    // Seed accounts
    await db.insert(accounts).values(SEED_ACCOUNTS).execute();
    // Seed transactions
    await db.insert(transactions).values(SEED_TRANSACTIONS).execute();
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

main();
