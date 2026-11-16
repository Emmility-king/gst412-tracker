import { NextResponse } from "next/server";
import { reviewAuthorized } from "@/lib/admin";
import { reviewPayment } from "@/lib/store";

export async function POST(request: Request, { params }: { params: Promise<{ tellerId: string }> }) {
  if (!process.env.PAYMENT_REVIEW_PASSWORD) {
    return NextResponse.json({ ok: false, message: "Set PAYMENT_REVIEW_PASSWORD in the server environment first." }, { status: 503 });
  }
  if (!reviewAuthorized(request)) return NextResponse.json({ ok: false, message: "Staff password is incorrect." }, { status: 401 });
  let action: unknown;
  try {
    action = (await request.json()).action;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ ok: false, message: "Choose approve or reject." }, { status: 400 });
  }
  const { tellerId } = await params;
  const record = await reviewPayment(decodeURIComponent(tellerId), action);
  if (!record) return NextResponse.json({ ok: false, message: "Payment submission not found." }, { status: 404 });
  const { receiptFile: _receiptFile, ...reviewedRecord } = record;
  return NextResponse.json({ ok: true, record: reviewedRecord }, { headers: { "Cache-Control": "no-store" } });
}
