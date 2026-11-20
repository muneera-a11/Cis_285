import { NextResponse } from "next/server";
import { db, newId } from "@/lib/database";
import { parseAmountCents, parseName, readObject } from "@/lib/validation";
export const runtime = "nodejs";
type Context = { params: Promise<{ groupId: string }> };
export async function POST(request: Request, { params }: Context) {
  try {
    const { groupId } = await params;
    const body = readObject(await request.json());
    if (!body) throw new Error("Enter expense details.");
    const description = parseName(body.description, "Description");
    if (description.length > 120) throw new Error("Description must be 120 characters or fewer.");
    const amountCents = parseAmountCents(body.amount);
    if (typeof body.payerId !== "string" || !body.payerId.trim()) throw new Error("Choose who paid for this expense.");
    if (!Array.isArray(body.participantIds) || body.participantIds.length === 0) throw new Error("Choose at least one participant.");
    if (!body.participantIds.every((id) => typeof id === "string" && id.trim())) throw new Error("Participant IDs must be valid members.");
    const participantIds = [...new Set(body.participantIds as string[])];
    if (participantIds.length !== body.participantIds.length) throw new Error("Each participant can only be selected once.");
    if (!db.prepare('SELECT 1 FROM "Group" WHERE id = ?').get(groupId)) return NextResponse.json({ error: "That group does not exist." }, { status: 404 });
    const ids = [...new Set([...participantIds, body.payerId])];
    const placeholders = ids.map(() => "?").join(",");
    const members = db.prepare(`SELECT id, groupId FROM "Member" WHERE id IN (${placeholders})`).all(...ids) as { id: string; groupId: string }[];
    if (members.length !== ids.length || members.some(member => member.groupId !== groupId)) return NextResponse.json({ error: "Payer and participants must all be members of this group." }, { status: 400 });
    const id = newId();
    const insertExpense = db.prepare('INSERT INTO "Expense" (id, description, amountCents, groupId, payerId) VALUES (?, ?, ?, ?, ?)');
    const insertParticipant = db.prepare('INSERT INTO "ExpenseParticipant" (expenseId, memberId) VALUES (?, ?)');
    db.transaction(() => { insertExpense.run(id, description, amountCents, groupId, body.payerId); for (const memberId of participantIds) insertParticipant.run(id, memberId); })();
    const payer = members.find(member => member.id === body.payerId)!;
    const payerName = db.prepare('SELECT name FROM "Member" WHERE id = ?').get(payer.id) as { name: string };
    const expenseParticipants = db.prepare(`SELECT id, name FROM "Member" WHERE id IN (${participantIds.map(() => "?").join(",")}) ORDER BY id`).all(...participantIds) as { id: string; name: string }[];
    return NextResponse.json({ expense: { id, description, amountCents, groupId, payerId: payer.id, payer: { id: payer.id, name: payerName.name }, participants: expenseParticipants.map(member => ({ member })), createdAt: new Date().toISOString() } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record expense." }, { status: 400 });
  }
}
