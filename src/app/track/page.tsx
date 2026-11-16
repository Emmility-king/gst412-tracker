"use client";

import Link from "next/link";
import { useState } from "react";
import type { PaymentRecord } from "@/lib/store";

export default function TrackPage() {
  const [q, setQ] = useState("");
  const [record, setRecord] = useState<PaymentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRecord(null);
    try {
      const res = await fetch(`/api/track?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.ok) setRecord(data.record);
      else setError(data.message);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const rows: [string, string][] = record
    ? [
        ["Manual ID", record.manualId],
        ["Student", record.fullName],
        ["Matric number", record.matricNumber],
        ["Teller ID", record.tellerId],
        ["Paid to", `${record.accountName} — ${record.bankName} (${record.accountNumber})`],
        ["Amount", `₦${record.amountPaid.toLocaleString()}`],
        ["Verified", new Date(record.verifiedAt).toLocaleString()],
        ["Downloads", String(record.downloads)],
        ["Last download", record.lastDownloadAt ? new Date(record.lastDownloadAt).toLocaleString() : "—"],
      ]
    : [];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Track a payment</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter (or scan the barcode for) a manual ID, or enter the teller ID used for payment.
          </p>
        </div>
        <Link href="/" className="shrink-0 text-sm font-medium text-emerald-700 hover:underline">
          ← Verify payment
        </Link>
      </header>

      <form onSubmit={onSubmit} className="flex gap-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="GST412-26-XXXXXXXX or teller ID"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          disabled={loading || !q.trim()}
          className="rounded-md bg-emerald-700 px-5 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {record && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/barcode/${record.manualId}`} alt={`Barcode for ${record.manualId}`} className="h-20" />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium text-slate-600">{k}</dt>
                <dd className="text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
          <a
            href={`/api/manual/${record.manualId}`}
            className="mt-6 block rounded-md bg-slate-900 px-4 py-2.5 text-center font-semibold text-white hover:bg-slate-700"
          >
            Download manual (PDF)
          </a>
        </section>
      )}
    </main>
  );
}
