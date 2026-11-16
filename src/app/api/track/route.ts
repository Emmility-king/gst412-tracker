import { NextResponse } from "next/server";
import { getStudentProfile } from "@/lib/auth";
import { findRecord } from "@/lib/store";

// Look up a payment submission by manual ID or receipt reference and return its review status.
export async function GET(req: Request) {
  const profile = getStudentProfile(req);
  if (!profile) return NextResponse.json({ ok: false, message: "Sign in as a student to track your payment." }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ ok: false, message: "Enter a manual ID or teller ID." }, { status: 400 });
  const record = await findRecord(q);
  if (!record || record.matricNumber !== profile.matricNumber) return NextResponse.json({ ok: false, message: "No payment submission found for this student profile." }, { status: 404 });
  const { receiptFile: _receiptFile, ...publicRecord } = record;
  return NextResponse.json({ ok: true, record: publicRecord }, { headers: { "Cache-Control": "no-store" } });
}
