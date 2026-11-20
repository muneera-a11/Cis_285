import { NextResponse } from "next/server";
import { db, newId } from "@/lib/database";
import { parseName, readObject } from "@/lib/validation";
export const runtime = "nodejs";
type Context = { params: Promise<{ groupId: string }> };
export async function POST(request: Request, { params }: Context) {
  try {
    const { groupId } = await params;
    const body = readObject(await request.json());
    const name = parseName(body?.name, "Member name");
    if (!db.prepare('SELECT 1 FROM "Group" WHERE id = ?').get(groupId)) return NextResponse.json({ error: "That group does not exist." }, { status: 404 });
    const member = { id: newId(), name };
    db.prepare('INSERT INTO "Member" (id, name, groupId) VALUES (?, ?, ?)').run(member.id, member.name, groupId);
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add member." }, { status: 400 });
  }
}
