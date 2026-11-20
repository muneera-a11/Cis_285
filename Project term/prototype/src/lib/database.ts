import Database from "better-sqlite3";
import path from "node:path";

type Db = InstanceType<typeof Database>;
const globalForDatabase = globalThis as unknown as { splitSmartDb?: Db };
function openDatabase(): Db {
  const configured = process.env.DATABASE_URL ?? "file:./dev.db";
  const filename = configured.startsWith("file:") ? configured.slice(5) : configured;
  const db = new Database(path.resolve(process.cwd(), decodeURIComponent(filename)));
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS "Group" (id TEXT PRIMARY KEY, name TEXT NOT NULL, createdAt TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS "Member" (id TEXT PRIMARY KEY, name TEXT NOT NULL, groupId TEXT NOT NULL REFERENCES "Group"(id) ON DELETE CASCADE, createdAt TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS "Member_groupId_idx" ON "Member"(groupId);
    CREATE TABLE IF NOT EXISTS "Expense" (id TEXT PRIMARY KEY, description TEXT NOT NULL, amountCents INTEGER NOT NULL CHECK(amountCents > 0), groupId TEXT NOT NULL REFERENCES "Group"(id) ON DELETE CASCADE, payerId TEXT NOT NULL REFERENCES "Member"(id) ON DELETE RESTRICT, createdAt TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS "Expense_groupId_createdAt_idx" ON "Expense"(groupId, createdAt);
    CREATE TABLE IF NOT EXISTS "ExpenseParticipant" (expenseId TEXT NOT NULL REFERENCES "Expense"(id) ON DELETE CASCADE, memberId TEXT NOT NULL REFERENCES "Member"(id) ON DELETE RESTRICT, PRIMARY KEY(expenseId, memberId));
  `);
  return db;
}
export const db = globalForDatabase.splitSmartDb ?? openDatabase();
if (process.env.NODE_ENV !== "production") globalForDatabase.splitSmartDb = db;
export function newId() { return crypto.randomUUID(); }
