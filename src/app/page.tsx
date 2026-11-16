"use client";

import Link from "next/link";
import { useState } from "react";
import { REQUIRED_PAYMENT, type FieldErrors, type PaymentInput } from "@/lib/payment";
import type { PaymentRecord } from "@/lib/store";

const EMPTY: PaymentInput = {
  fullName: "",
  matricNumber: "",
  tellerId: "",
  accountName: "",
  bankName: "",
  accountNumber: "",
  amountPaid: "",
};

const FIELDS: { name: keyof PaymentInput; label: string; placeholder: string; inputMode?: "numeric" | "decimal" }[] = [
  { name: "fullName", label: "Full name", placeholder: "e.g. Adaeze Okafor" },
  { name: "matricNumber", label: "Matric number", placeholder: "e.g. WUB/CSC/21/0123" },
  { name: "tellerId", label: "Teller ID", placeholder: "Teller / transaction number on your receipt" },
  { name: "accountName", label: "Account name paid to", placeholder: "As written on your teller" },
  { name: "bankName", label: "Bank name", placeholder: "As written on your teller" },
  { name: "accountNumber", label: "Account number paid to", placeholder: "10-digit account number", inputMode: "numeric" },
  { name: "amountPaid", label: "Amount paid (₦)", placeholder: "e.g. 2000", inputMode: "decimal" },
];

export default function Home() {
  const [form, setForm] = useState<PaymentInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<PaymentRecord | null>(null);

  const verified = record !== null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrors({});
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setRecord(data.record);
        setMessage(data.existing ? "Payment already verified — here is your existing manual ID." : null);
      } else {
        setErrors(data.errors ?? {});
        setMessage(data.message ?? "Verification failed.");
      }
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(EMPTY);
    setRecord(null);
    setErrors({});
    setMessage(null);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">GST412 Manual — Payment Verification</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter the details from your bank teller to verify payment and get your personalised manual.
          </p>
        </div>
        <Link href="/track" className="shrink-0 text-sm font-medium text-emerald-700 hover:underline">
          Track a payment →
        </Link>
      </header>

      <section className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="mb-2 font-semibold">Pay into this account only</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt>Account name</dt><dd className="font-medium">{REQUIRED_PAYMENT.accountName}</dd>
          <dt>Bank</dt><dd className="font-medium">{REQUIRED_PAYMENT.bankName}</dd>
          <dt>Account number</dt><dd className="font-mono font-medium">{REQUIRED_PAYMENT.accountNumber}</dd>
          <dt>Amount</dt><dd className="font-medium">₦{REQUIRED_PAYMENT.amount.toLocaleString()}</dd>
        </dl>
      </section>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={f.name} className="mb-1 block text-sm font-medium text-slate-800">
              {f.label}
            </label>
            <input
              id={f.name}
              name={f.name}
              required
              disabled={verified}
              inputMode={f.inputMode}
              placeholder={f.placeholder}
              value={form[f.name]}
              onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              aria-invalid={!!errors[f.name]}
              className={`w-full rounded-md border px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 ${
                errors[f.name] ? "border-red-500" : "border-slate-300"
              }`}
            />
            {errors[f.name] && <p className="mt-1 text-sm text-red-600">{errors[f.name]}</p>}
          </div>
        ))}

        {message && (
          <p className={`rounded-md p-3 text-sm ${verified ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {message}
          </p>
        )}

        {!verified && (
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-700 px-4 py-2.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify payment"}
          </button>
        )}
      </form>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Your manual</h2>

        {verified ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-700">✓ Payment verified. Your manual ID and barcode have been added to the manual.</p>
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-slate-300 p-4">
              <span className="text-xs uppercase tracking-wide text-slate-500">Manual ID</span>
              <span className="font-mono text-xl font-bold text-slate-900">{record.manualId}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/barcode/${record.manualId}`} alt={`Barcode for ${record.manualId}`} className="h-20" />
              <span className="text-xs text-slate-500">Teller ID: {record.tellerId}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Verify your payment above to generate your manual ID and barcode.</p>
        )}

        <div className="mt-4 flex gap-3">
          {verified ? (
            <a
              href={`/api/manual/${record.manualId}`}
              className="flex-1 rounded-md bg-slate-900 px-4 py-2.5 text-center font-semibold text-white hover:bg-slate-700"
            >
              Download manual (PDF)
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="Verify your payment first"
              className="flex-1 cursor-not-allowed rounded-md bg-slate-300 px-4 py-2.5 font-semibold text-slate-500"
            >
              Download manual (PDF)
            </button>
          )}
          {verified && (
            <button type="button" onClick={reset} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm">
              New payment
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
