import { NextResponse } from "next/server";
import { hasStaffSession } from "@/lib/auth";

export async function GET(request: Request) {
  return NextResponse.json({ ok: hasStaffSession(request) }, { headers: { "Cache-Control": "no-store" } });
}
