import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(request, "staff") } });
}
