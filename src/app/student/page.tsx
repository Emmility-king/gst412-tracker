"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createWorker } from "tesseract.js";
import type { StudentProfile } from "@/lib/auth";
import { REQUIRED_PAYMENT, type FieldErrors, type PaymentInput } from "@/lib/payment";
import { findReceiptReferences } from "@/lib/receipt";
import type { PaymentRecord } from "@/lib/store";

const EMPTY: PaymentInput = { fullName: "", matricNumber: "", tellerId: "" };

export default function Home() {
  const [form, setForm] = useState<PaymentInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [receiptText, setReceiptText] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [references, setReferences] = useState<string[]>([]);
  const [receiptConfirmed, setReceiptConfirmed] = useState(false);
  const [record, setRecord] = useState<PaymentRecord | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const receiptInput = useRef<HTMLInputElement>(null);
  const verifiedRecord = record?.status === "verified" && record.manualId ? record : null;
  const verified = verifiedRecord !== null;
  const submitted = record !== null;
  const pendingTellerId = record?.status === "pending" ? record.tellerId : null;

  useEffect(() => {
    fetch("/api/auth/student/session", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok || !data.profile) {
          window.location.replace("/student/login");
          return;
        }
        const student = data.profile as StudentProfile;
        setProfile(student);
        setForm((current) => ({ ...current, fullName: student.fullName, matricNumber: student.matricNumber }));
      })
      .catch(() => window.location.replace("/student/login"))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!pendingTellerId) return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/track?q=${encodeURIComponent(pendingTellerId)}`, { cache: "no-store" });
        const data = await res.json();
        if (!data.ok) return;
        setRecord(data.record);
        if (data.record.status === "verified") setMessage("Payment verified. Your manual is ready to download.");
        if (data.record.status === "rejected") setMessage("Payment was not approved. Contact the department for help.");
      } catch {
        // Keep the pending view visible; the student can retry with the status button.
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [pendingTellerId]);

  async function onReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setReceiptText("");
    setReceiptName("");
    setReceiptFile(file ?? null);
    setReferences([]);
    setForm((current) => ({ ...current, tellerId: "" }));
    setReceiptConfirmed(false);
    setErrors({});
    setMessage(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrors({ receipt: "Upload a receipt image (JPG, PNG, or WEBP)." });
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ receipt: "The receipt image must be 10 MB or smaller." });
      e.target.value = "";
      return;
    }

    setOcrLoading(true);
    setMessage("Reading receipt text in your browser...");
    let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
    try {
      worker = await createWorker("eng");
      const result = await worker.recognize(file);
      const text = result.data.text.trim();
      const candidates = findReceiptReferences(text);
      setReceiptText(text);
      setReceiptName(file.name);
      setReferences(candidates);
      if (candidates.length === 1) setForm((current) => ({ ...current, tellerId: candidates[0] }));
      setMessage(text ? "Receipt read. Check the detected reference and your receipt details before continuing." : "No readable text found. Try a clearer image.");
      if (!text) setErrors({ receipt: "We could not read this image. Upload a clear, well-lit receipt." });
    } catch {
      setErrors({ receipt: "Receipt reading failed. Try a clear JPG, PNG, or WEBP image." });
      setMessage(null);
    } finally {
      await worker?.terminate();
      setOcrLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrors({});
    try {
      const body = new FormData();
      body.set("receipt", receiptFile!);
      body.set("receiptText", receiptText);
      body.set("receiptConfirmed", String(receiptConfirmed));
      Object.entries(form).forEach(([key, value]) => body.set(key, value));
      const res = await fetch("/api/verify", { method: "POST", body });
      const data = await res.json();
      if (data.ok) {
        setRecord(data.record);
        setMessage(data.record.status === "verified" ? "This payment has already been verified." : data.existing ? "This receipt is already on file and is waiting for staff review." : "Receipt submitted. Staff must verify the payment before the manual download is enabled.");
      } else {
        setErrors(data.errors ?? {});
        setMessage(data.message ?? "We could not accept these receipt details.");
      }
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshStatus() {
    if (!record) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/track?q=${encodeURIComponent(record.tellerId)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setRecord(data.record);
        setMessage(data.record.status === "verified" ? "Payment verified. Your manual is ready to download." : data.record.status === "rejected" ? "Payment was not approved. Contact the department for help." : "Payment is still waiting for staff review.");
      } else setMessage(data.message ?? "Could not check payment status.");
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(profile ? { ...EMPTY, fullName: profile.fullName, matricNumber: profile.matricNumber } : EMPTY);
    setRecord(null);
    setErrors({});
    setMessage(null);
    setReceiptText("");
    setReceiptName("");
    setReceiptFile(null);
    setReferences([]);
    setReceiptConfirmed(false);
    if (receiptInput.current) receiptInput.current.value = "";
  }

  async function logout() {
    await fetch("/api/auth/student/logout", { method: "POST" });
    window.location.replace("/student/login");
  }

  if (authLoading || !profile) {
    return <main className="mx-auto w-full max-w-2xl px-4 py-10 text-sm text-slate-600">Loading student profile...</main>;
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">GST412 Manual — Payment Verification</h1>
          <p className="mt-1 text-sm text-slate-600">Upload your receipt, confirm its reference number, and get your personalized manual.</p>
        </div>
        <Link href="/track" className="shrink-0 text-sm font-medium text-emerald-700 hover:underline">Track a payment →</Link>
        <div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-600">{profile.fullName} · {profile.matricNumber}</span><button type="button" onClick={logout} className="font-medium text-slate-500 hover:underline">Student sign out</button></div>
      </header>

      <section className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="mb-2 font-semibold">Required payment details</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt>Account name</dt><dd className="font-medium">{REQUIRED_PAYMENT.accountName}</dd>
          <dt>Bank</dt><dd className="font-medium">{REQUIRED_PAYMENT.bankName}</dd>
          <dt>Account number</dt><dd className="font-mono font-medium">{REQUIRED_PAYMENT.accountNumber}</dd>
          <dt>Amount</dt><dd className="font-medium">NGN {REQUIRED_PAYMENT.amount.toLocaleString()}</dd>
        </dl>
      </section>

      <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        OCR only reads the receipt. A staff member must inspect the uploaded receipt and verify payment before a manual ID is issued or download is enabled.
      </p>
      <p className="-mt-4 mb-5 text-right text-sm"><Link href="/staff/login" className="font-medium text-emerald-700 hover:underline">Staff sign in</Link></p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="receipt" className="mb-1 block text-sm font-medium text-slate-800">Payment receipt image</label>
          <input ref={receiptInput} id="receipt" type="file" accept="image/jpeg,image/png,image/webp" required disabled={submitted || ocrLoading} onChange={onReceiptChange} className="block w-full rounded-md border border-slate-300 p-2 text-sm text-slate-800 file:mr-3 file:rounded file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-emerald-800" />
          <p className="mt-1 text-xs text-slate-500">JPG, PNG, or WEBP; max 10 MB. A clear image helps the reader find the reference.</p>
          {receiptName && <p className="mt-1 text-xs text-slate-600">Selected: {receiptName}</p>}
          {errors.receipt && <p className="mt-1 text-sm text-red-600">{errors.receipt}</p>}
        </div>

        {references.length > 0 && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <p className="font-medium text-emerald-900">Reference candidates found on receipt</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {references.map((reference) => <button key={reference} type="button" onClick={() => setForm({ ...form, tellerId: reference })} className="rounded border border-emerald-300 bg-white px-2 py-1 font-mono text-emerald-900">{reference}</button>)}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="tellerId" className="mb-1 block text-sm font-medium text-slate-800">Reference / transaction / transfer / teller ID</label>
          <input id="tellerId" required disabled={submitted} value={form.tellerId} onChange={(e) => setForm({ ...form, tellerId: e.target.value })} placeholder="Enter the ID printed on your receipt" aria-invalid={!!errors.tellerId} className={`w-full rounded-md border px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 ${errors.tellerId ? "border-red-500" : "border-slate-300"}`} />
          {errors.tellerId && <p className="mt-1 text-sm text-red-600">{errors.tellerId}</p>}
        </div>

        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-800">Full name</label>
          <input id="fullName" required disabled value={profile.fullName} className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900" />
          {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
        </div>

        <div>
          <label htmlFor="matricNumber" className="mb-1 block text-sm font-medium text-slate-800">Matric number</label>
          <input id="matricNumber" required disabled value={profile.matricNumber} placeholder="e.g. MER24001" maxLength={8} className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900" />
          {errors.matricNumber && <p className="mt-1 text-sm text-red-600">{errors.matricNumber}</p>}
        </div>

        <label className="flex items-start gap-2 text-sm leading-5 text-slate-700">
          <input type="checkbox" required disabled={submitted} checked={receiptConfirmed} onChange={(e) => setReceiptConfirmed(e.target.checked)} className="mt-1 accent-emerald-700" />
          I checked the uploaded receipt and confirm it is for NGN 2,000 paid to the account shown above. I have entered the reference printed on that receipt.
        </label>

        {message && <p className={`rounded-md p-3 text-sm ${verified ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`}>{message}</p>}
        {!submitted && <button type="submit" disabled={loading || ocrLoading || !receiptText || !receiptFile} className="w-full rounded-md bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{ocrLoading ? "Reading receipt..." : loading ? "Submitting..." : "Submit payment for verification"}</button>}
      </form>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Your manual</h2>
        {verifiedRecord ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-700">Payment verified. Your manual ID and barcode are ready.</p>
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-slate-300 p-4">
              <span className="text-xs uppercase tracking-wide text-slate-500">Manual ID</span>
              <span className="font-mono text-xl font-bold text-slate-900">{verifiedRecord.manualId}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/api/barcode/${verifiedRecord.manualId}`} alt={`Barcode for ${verifiedRecord.manualId}`} className="h-20" />
              <span className="text-xs text-slate-500">Matric number: {verifiedRecord.matricNumber} · Payment reference: {verifiedRecord.tellerId}</span>
            </div>
          </div>
        ) : submitted ? (
          <div className={`rounded-md p-4 text-sm ${record.status === "rejected" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
            <p className="font-semibold">{record.status === "rejected" ? "Payment not approved" : "Payment pending staff verification"}</p>
            <p className="mt-1">{record.status === "rejected" ? "Contact the department for help with this receipt." : "No manual ID has been issued. Download stays disabled until staff approves the payment."}</p>
            <button type="button" disabled={loading} onClick={record.status === "rejected" ? reset : refreshStatus} className="mt-3 rounded border border-current px-3 py-1.5 font-medium">{record.status === "rejected" ? "Submit another receipt" : loading ? "Checking..." : "Check verification status"}</button>
          </div>
        ) : <p className="text-sm text-slate-500">Submit your receipt. Staff must verify payment before a manual ID and barcode are issued.</p>}
        <div className="mt-4 flex gap-3">
          {verifiedRecord ? <a href={`/api/manual/${verifiedRecord.manualId}`} className="flex-1 rounded-md bg-slate-900 px-4 py-2.5 text-center font-semibold text-white hover:bg-slate-700">Download manual (PDF)</a> : <button type="button" disabled title="Staff must verify the payment first" className="flex-1 cursor-not-allowed rounded-md bg-slate-300 px-4 py-2.5 font-semibold text-slate-500">Download manual (PDF)</button>}
          {verified && <button type="button" onClick={reset} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm">New payment</button>}
        </div>
      </section>
    </main>
  );
}
