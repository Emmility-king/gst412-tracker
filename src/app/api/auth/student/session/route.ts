import { NextResponse } from "next/server";
import { getStudentProfile } from "@/lib/auth";

export async function GET(request: Request) {
  const profile = getStudentProfile(request);
  return NextResponse.json({ ok: !!profile, profile }, { headers: { "Cache-Control": "no-store" } });
}
