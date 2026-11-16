"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PaymentRecord } from "@/lib/store";

export default function StaffReviewPage() {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => () => Object.values(receiptUrls).forEach((url) => URL.revokeObjectURL(url)), [receiptUrls]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/reviews", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        window.location.replace("/staff/login");
        return;
      }
      if (!response.ok) throw new Error(data.message ?? "Unable to load review queue.");
      setRecords(data.records);
      const urls: Record<string, string> = {};
      await Promise.all(data.records.map(async (record: PaymentRecord) => {
        const image = await fetch(`/api/admin/receipt/${encodeURIComponent(record.tellerId)}`, { cache: "no-store" });
        if (image.ok) urls[record.tellerId] = URL.createObjectURL(await image.blob());
      }));
      setReceiptUrls(urls);
      setMessage(data.records.length ? `${data.records.length} payment(s) waiting for review.` : "No payments are waiting for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadReviews(); }, [loadReviews]);

  async function decide(tellerId: string, action: "approve" | "reject") {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/reviews/${encodeURIComponent(tellerId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.replace("/staff/login");
        return;
      }
      if (!response.ok) throw new Error(data.message ?? "Unable to update payment.");
      await loadReviews();
      setMessage(action === "approve" ? `Payment approved. Manual ID ${data.record.manualId} was issued.` : "Payment rejected.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update payment.");
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/staff/logout", { method: "POST" });
    window.location.replace("/staff/login");
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff payment review</h1>
          <p className="mt-1 text-sm text-slate-600">Inspect each receipt and confirm settlement before approving a manual download.</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm"><Link href="/student/login" className="font-medium text-emerald-700 hover:underline">Student sign in</Link><button type="button" onClick={logout} className="font-medium text-slate-500 hover:underline">Staff sign out</button></div>
      </header>

      <button type="button" disabled={loading} onClick={() => void loadReviews()} className="mb-6 rounded-md bg-slate-900 px-5 py-2 font-semibold text-white disabled:opacity-60">{loading ? "Loading..." : "Refresh review queue"}</button>
      {message && <p className="mb-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}

      <div className="space-y-5">
        {records.map((record) => (
          <article key={record.tellerId} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{record.fullName}</h2>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="font-medium text-slate-600">Matric number</dt><dd className="font-mono text-slate-900">{record.matricNumber}</dd>
                <dt className="font-medium text-slate-600">Receipt reference</dt><dd className="font-mono text-slate-900">{record.tellerId}</dd>
                <dt className="font-medium text-slate-600">Submitted</dt><dd className="text-slate-900">{new Date(record.submittedAt).toLocaleString()}</dd>
                <dt className="font-medium text-slate-600">Payment expected</dt><dd className="text-slate-900">{record.accountName}, {record.bankName}, {record.accountNumber}, NGN {record.amountPaid.toLocaleString()}</dd>
              </dl>
              <div className="mt-5 flex gap-3">
                <button disabled={loading} onClick={() => void decide(record.tellerId, "approve")} className="rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-60">Approve payment</button>
                <button disabled={loading} onClick={() => void decide(record.tellerId, "reject")} className="rounded-md border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:opacity-60">Reject</button>
              </div>
            </div>
            <div>{receiptUrls[record.tellerId] ? <a href={receiptUrls[record.tellerId]} target="_blank" rel="noreferrer"><img src={receiptUrls[record.tellerId]} alt={`Receipt from ${record.fullName}`} className="max-h-80 w-full rounded border border-slate-200 object-contain" /></a> : <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">Receipt preview unavailable.</p>}</div>
          </article>
        ))}
      </div>
    </main>
  );
}
