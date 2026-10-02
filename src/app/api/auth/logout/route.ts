import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth/session";
import { recordAudit } from "@/lib/db/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    await recordAudit({ userId: session.userId, action: "LOGOUT", entity: "User", entityId: session.userId });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
