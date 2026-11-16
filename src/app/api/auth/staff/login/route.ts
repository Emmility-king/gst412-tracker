import { NextResponse } from "next/server";
import { makeStaffSessionCookie, verifyStaffPassword } from "@/lib/auth";

export async function POST(request: Request) {
  if (!process.env.PAYMENT_REVIEW_PASSWORD) {
    return NextResponse.json({ ok: false, message: "Staff login is not configured on this server." }, { status: 503 });
  }
  let password = "";
  try {
    const body = await request.json();
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, message: "Enter the staff password." }, { status: 400 });
  }
  if (!verifyStaffPassword(password)) return NextResponse.json({ ok: false, message: "Incorrect staff password." }, { status: 401 });
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": makeStaffSessionCookie(request), "Cache-Control": "no-store" } });
}
