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
      const res = await fetch(`/api/track?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setRecord(data.record);
      else setError(data.message);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const rows: [string, string][] = record ? [
    ["Status", record.status === "verified" ? "Verified" : record.status === "rejected" ? "Not approved" : "Awaiting staff verification"],
    ["Student", record.fullName],
    ["Matric number", record.matricNumber],
    ["Payment reference", record.tellerId],
    ["Paid to", `${record.accountName} — ${record.bankName} (${record.accountNumber})`],
    ["Amount", `NGN ${record.amountPaid.toLocaleString()}`],
    ["Submitted", new Date(record.submittedAt).toLocaleString()],
    ...(record.verifiedAt ? [["Verified", new Date(record.verifiedAt).toLocaleString()] as [string, string]] : []),
    ["Downloads", String(record.downloads)],
  ] : [];
  const verifiedRecord = record?.status === "verified" && record.manualId ? record : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Track a payment</h1>
          <p className="mt-1 text-sm text-slate-600">Enter the receipt reference or manual ID to see payment review status.</p>
        </div>
        <Link href="/" className="shrink-0 text-sm font-medium text-emerald-700 hover:underline">← Verify payment</Link>
      </header>

      <form onSubmit={onSubmit} className="flex gap-3">
        <input autoFocus required value={q} onChange={(e) => setQ(e.target.value)} placeholder="Receipt reference or manual ID" className="flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500" />
        <button disabled={loading || !q.trim()} className="rounded-md bg-emerald-700 px-5 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{loading ? "Searching..." : "Search"}</button>
      </form>

      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {record && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {verifiedRecord && <div className="mb-4 flex justify-center">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/api/barcode/${verifiedRecord.manualId}`} alt={`Barcode for ${verifiedRecord.manualId}`} className="h-20" /></div>}
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {verifiedRecord && <><dt className="font-medium text-slate-600">Manual ID</dt><dd className="font-mono text-slate-900">{verifiedRecord.manualId}</dd></>}
            {rows.map(([key, value]) => <div key={key} className="contents"><dt className="font-medium text-slate-600">{key}</dt><dd className="text-slate-900">{value}</dd></div>)}
          </dl>
          {verifiedRecord ? (
            <a href={`/api/manual/${verifiedRecord.manualId}`} className="mt-6 block rounded-md bg-slate-900 px-4 py-2.5 text-center font-semibold text-white hover:bg-slate-700">Download manual (PDF)</a>
          ) : <p className="mt-5 rounded-md bg-amber-50 p-3 text-sm text-amber-900">The manual download remains locked until staff verifies this payment.</p>}
        </section>
      )}
    </main>
  );
}
