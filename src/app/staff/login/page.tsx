"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function StaffLoginPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/staff/session", { cache: "no-store" })
      .then(async (res) => { const data = await res.json(); if (data.ok) window.location.replace("/staff"); })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Unable to sign in.");
      window.location.assign("/staff");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Staff sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Sign in to verify receipt submissions and approve manual downloads.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="staffPassword" className="mb-1 block text-sm font-medium text-slate-800">Staff password</label>
          <input id="staffPassword" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
        </div>
        {message && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{message}</p>}
        <button disabled={loading} className="w-full rounded-md bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{loading ? "Signing in..." : "Continue to staff review"}</button>
      </form>
      <p className="mt-5 text-sm text-slate-600">Student? <Link href="/student/login" className="font-medium text-emerald-700 hover:underline">Student sign in</Link></p>
    </main>
  );
}
