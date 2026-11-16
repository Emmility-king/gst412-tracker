import { NextResponse } from "next/server";
import { reviewAuthorized } from "@/lib/admin";
import { listPendingPayments } from "@/lib/store";

export async function GET(request: Request) {
  if (!process.env.PAYMENT_REVIEW_PASSWORD) {
    return NextResponse.json({ ok: false, message: "Set PAYMENT_REVIEW_PASSWORD in the server environment first." }, { status: 503 });
  }
  if (!reviewAuthorized(request)) return NextResponse.json({ ok: false, message: "Staff password is incorrect." }, { status: 401 });
  const records = await listPendingPayments();
  return NextResponse.json({ ok: true, records: records.map(({ receiptFile: _receiptFile, ...record }) => record) }, { headers: { "Cache-Control": "no-store" } });
}
