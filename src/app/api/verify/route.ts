import { NextResponse } from "next/server";
import { cleanInput, verifyPayment, type PaymentInput } from "@/lib/payment";
import { registerPayment } from "@/lib/store";

export const runtime = "nodejs";

const FIELDS: (keyof PaymentInput)[] = [
  "fullName", "matricNumber", "tellerId", "accountName", "bankName", "accountNumber", "amountPaid",
];

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const input = Object.fromEntries(
    FIELDS.map((f) => [f, typeof body[f] === "string" ? (body[f] as string) : ""]),
  ) as PaymentInput;

  const errors = verifyPayment(input);
  if (Object.keys(errors).length) {
    return NextResponse.json(
      { ok: false, message: "Payment details could not be verified.", errors },
      { status: 422 },
    );
  }

  const result = await registerPayment(cleanInput(input));
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message, errors: { [result.field]: result.message } },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, existing: result.existing, record: result.record });
}
