import { NextResponse } from "next/server";
import { findRecord } from "@/lib/store";

export const runtime = "nodejs";

// Look up a verified payment by manual ID (e.g. from scanning the barcode) or by teller ID.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ ok: false, message: "Enter a manual ID or teller ID." }, { status: 400 });
  const record = await findRecord(q);
  if (!record) return NextResponse.json({ ok: false, message: "No verified payment found." }, { status: 404 });
  return NextResponse.json({ ok: true, record });
}
