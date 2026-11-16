import { NextResponse } from "next/server";
import { getStudentProfile } from "@/lib/auth";
import { cleanInput, verifyPayment, type PaymentInput } from "@/lib/payment";
import { findReceiptReferences } from "@/lib/receipt";
import { receiptFileName, registerPayment, saveReceipt } from "@/lib/store";

const FIELDS: (keyof PaymentInput)[] = ["fullName", "matricNumber", "tellerId"];
const EXTENSIONS: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

export async function POST(req: Request) {
  const profile = getStudentProfile(req);
  if (!profile) return NextResponse.json({ ok: false, message: "Sign in as a student before submitting a payment." }, { status: 401 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Upload a receipt image with your payment details." }, { status: 400 });
  }

  const input = Object.fromEntries(
    FIELDS.map((field) => [field, typeof form.get(field) === "string" ? form.get(field) as string : ""]),
  ) as PaymentInput;
  if (input.matricNumber !== profile.matricNumber || input.fullName.trim().replace(/\s+/g, " ").toLowerCase() !== profile.fullName.toLowerCase()) {
    return NextResponse.json({ ok: false, message: "The submitted student details do not match the signed-in student profile." }, { status: 403 });
  }
  const receipt = form.get("receipt");
  const receiptText = typeof form.get("receiptText") === "string" ? String(form.get("receiptText")).trim() : "";
  const receiptConfirmed = form.get("receiptConfirmed") === "true";

  const errors: Record<string, string> = {};
  if (!(receipt instanceof File) || !EXTENSIONS[receipt.type] || receipt.size > 10 * 1024 * 1024) {
    errors.receipt = "Upload a JPG, PNG, or WEBP receipt image no larger than 10 MB.";
  }
  if (receiptText.length < 8 || !receiptConfirmed) errors.receipt = "Read and confirm the details on a receipt image before submitting.";
  const references = findReceiptReferences(receiptText);
  if (references.length && !references.includes(input.tellerId.trim().replace(/\s+/g, "").toUpperCase())) {
    errors.tellerId = "The entered ID does not match a reference detected on the receipt. Select a detected reference or check it and enter it again.";
  }
  Object.assign(errors, verifyPayment(input));
  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, message: "Receipt details need attention.", errors }, { status: 422 });
  }

  const file = receipt as File;
  const normalized = cleanInput(input);
  const storedName = receiptFileName(normalized.tellerId, EXTENSIONS[file.type]);
  await saveReceipt(storedName, Buffer.from(await file.arrayBuffer()));
  const result = await registerPayment({ ...normalized, receiptFile: storedName });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message, errors: { [result.field]: result.message } }, { status: 409 });
  }

  const { receiptFile: _receiptFile, ...publicRecord } = result.record;
  return NextResponse.json({ ok: true, existing: result.existing, record: publicRecord });
}
