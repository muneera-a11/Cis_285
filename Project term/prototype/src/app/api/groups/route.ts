import { NextResponse } from "next/server";
import { db, newId } from "@/lib/database";
import { parseName, readObject } from "@/lib/validation";

export const runtime = "nodejs";
export async function GET() {
  const groups = db.prepare('SELECT id, name, createdAt FROM "Group" ORDER BY createdAt, id').all() as { id: string; name: string; createdAt: string }[];
  const memberRows = db.prepare('SELECT id, name, groupId, createdAt FROM "Member" ORDER BY createdAt, id').all() as { id: string; name: string; groupId: string; createdAt: string }[];
  const expenses = db.prepare('SELECT e.id, e.description, e.amountCents, e.groupId, e.payerId, e.createdAt, p.name AS payerName FROM "Expense" e JOIN "Member" p ON p.id = e.payerId ORDER BY e.createdAt DESC, e.id DESC').all() as { id: string; description: string; amountCents: number; groupId: string; payerId: string; createdAt: string; payerName: string }[];
  const participants = db.prepare('SELECT ep.expenseId, m.id, m.name FROM "ExpenseParticipant" ep JOIN "Member" m ON m.id = ep.memberId ORDER BY m.id').all() as { expenseId: string; id: string; name: string }[];
  return NextResponse.json({ groups: groups.map(group => ({
    id: group.id, name: group.name,
    members: memberRows.filter(member => member.groupId === group.id).map(({ id, name }) => ({ id, name })),
    expenses: expenses.filter(expense => expense.groupId === group.id).map(expense => ({
      id: expense.id, description: expense.description, amountCents: expense.amountCents, payerId: expense.payerId,
      payer: { id: expense.payerId, name: expense.payerName }, createdAt: new Date(`${expense.createdAt.replace(" ", "T")}Z`).toISOString(),
      participants: participants.filter(participant => participant.expenseId === expense.id).map(({ id, name }) => ({ member: { id, name } })),
    })),
  })) });
}
export async function POST(request: Request) {
  try {
    const body = readObject(await request.json());
    const name = parseName(body?.name, "Group name");
    const group = { id: newId(), name };
    db.prepare('INSERT INTO "Group" (id, name) VALUES (?, ?)').run(group.id, group.name);
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create group." }, { status: 400 });
  }
}
