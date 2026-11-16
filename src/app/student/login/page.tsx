"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function StudentLoginPage() {
  const [fullName, setFullName] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/student/session", { cache: "no-store" })
      .then(async (res) => { const data = await res.json(); if (data.ok) window.location.replace("/student"); })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, matricNumber }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Unable to sign in.");
      window.location.assign("/student");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Student sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Enter your name and matric number to open your GST412 payment profile.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="studentName" className="mb-1 block text-sm font-medium text-slate-800">Full name</label>
          <input id="studentName" autoComplete="name" required minLength={3} value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
        </div>
        <div>
          <label htmlFor="studentMatric" className="mb-1 block text-sm font-medium text-slate-800">Matric number</label>
          <input id="studentMatric" required value={matricNumber} onChange={(e) => setMatricNumber(e.target.value.toUpperCase())} placeholder="e.g. MER24001" maxLength={8} className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-slate-900" />
          <p className="mt-1 text-xs text-slate-500">3 department letters + 2 entry-year digits + 3 serial digits, with no separators.</p>
        </div>
        {message && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{message}</p>}
        <button disabled={loading} className="w-full rounded-md bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{loading ? "Signing in..." : "Continue as student"}</button>
      </form>
      <p className="mt-5 text-sm text-slate-600">Staff member? <Link href="/staff/login" className="font-medium text-emerald-700 hover:underline">Staff sign in</Link></p>
    </main>
  );
}
