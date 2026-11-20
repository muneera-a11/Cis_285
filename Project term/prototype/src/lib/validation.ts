export function readObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function parseName(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  const name = value.trim();
  if (name.length > 100) throw new Error(`${label} must be 100 characters or fewer.`);
  return name;
}

export function parseAmountCents(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Enter a valid positive amount.");
  const raw = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error("Enter a valid amount with no more than two decimal places.");
  const [dollars, cents = ""] = raw.split(".");
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Amount must be greater than $0.00.");
  return amount;
}
