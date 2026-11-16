import { NextResponse } from "next/server";
import { isValidStudentCredentials, makeStudentSessionCookie } from "@/lib/auth";
import { normalizeMatric } from "@/lib/payment";

export async function POST(request: Request) {
  if (!process.env.AUTH_SESSION_SECRET && !process.env.PAYMENT_REVIEW_PASSWORD) {
    return NextResponse.json({ ok: false, message: "Student sign-in is not configured on this server." }, { status: 503 });
  }
  let fullName = "";
  let matricNumber = "";
  try {
    const body = await request.json();
    fullName = typeof body.fullName === "string" ? body.fullName.trim().replace(/\s+/g, " ") : "";
    matricNumber = typeof body.matricNumber === "string" ? normalizeMatric(body.matricNumber) : "";
  } catch {
    return NextResponse.json({ ok: false, message: "Enter your name and matric number." }, { status: 400 });
  }
  if (!isValidStudentCredentials(fullName, matricNumber)) {
    return NextResponse.json({ ok: false, message: "Enter a name and matric number in the format ABC24001." }, { status: 422 });
  }
  const profile = { fullName, matricNumber };
  return NextResponse.json({ ok: true, profile }, { headers: { "Set-Cookie": makeStudentSessionCookie(request, profile), "Cache-Control": "no-store" } });
}
