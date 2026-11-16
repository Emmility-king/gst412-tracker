import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export type PaymentStatus = "pending" | "verified" | "rejected";

export type PaymentRecord = {
  manualId: string | null;
  fullName: string;
  matricNumber: string;
  tellerId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  amountPaid: number;
  status: PaymentStatus;
  submittedAt: string;
  verifiedAt: string | null;
  receiptFile: string | null;
  downloads: number;
  lastDownloadAt: string | null;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "payments.json");
const RECEIPTS_DIR = path.join(DATA_DIR, "receipts");
let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<PaymentRecord[]> {
  try {
    const records = JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as Partial<PaymentRecord>[];
    return records.map((r) => {
      // Legacy records were created by a client-side receipt declaration, not staff review.
      // Require explicit staff approval for every record before exposing a manual.
      const status = r.status ?? "pending";
      return {
        ...r,
        status,
        submittedAt: r.submittedAt ?? r.verifiedAt ?? new Date(0).toISOString(),
        verifiedAt: status === "verified" ? r.verifiedAt ?? r.submittedAt ?? new Date(0).toISOString() : null,
        receiptFile: r.receiptFile ?? null,
        manualId: status === "verified" ? r.manualId ?? null : null,
        downloads: r.downloads ?? 0,
        lastDownloadAt: r.lastDownloadAt ?? null,
      } as PaymentRecord;
    });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function writeAll(records: PaymentRecord[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(records, null, 2));
  await fs.rename(tmp, DATA_FILE);
}

function newManualId() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(8);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const yy = String(new Date().getFullYear()).slice(-2);
  return `GST412-${yy}-${suffix}`;
}

export function receiptFileName(tellerId: string, extension: string) {
  const digest = crypto.createHash("sha256").update(tellerId.toUpperCase()).digest("hex");
  return `${digest}-${crypto.randomBytes(8).toString("hex")}${extension}`;
}

export async function saveReceipt(fileName: string, bytes: Buffer) {
  await fs.mkdir(RECEIPTS_DIR, { recursive: true });
  await fs.writeFile(path.join(RECEIPTS_DIR, fileName), bytes, { flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
    await fs.writeFile(path.join(RECEIPTS_DIR, fileName), bytes);
  });
}

export async function readReceipt(fileName: string) {
  if (!/^[a-f0-9]{64}-[a-f0-9]{16}\.(jpg|png|webp)$/.test(fileName)) return null;
  try {
    return await fs.readFile(path.join(RECEIPTS_DIR, fileName));
  } catch {
    return null;
  }
}

export type RegisterResult =
  | { ok: true; record: PaymentRecord; existing: boolean }
  | { ok: false; field: "tellerId" | "matricNumber"; message: string };

export function registerPayment(data: {
  fullName: string;
  matricNumber: string;
  tellerId: string;
  receiptFile: string;
}): Promise<RegisterResult> {
  return withLock(async () => {
    const records = await readAll();
    const byTeller = records.find((r) => r.tellerId === data.tellerId);
    if (byTeller) {
      if (byTeller.matricNumber === data.matricNumber) {
        if (byTeller.status === "rejected" || !byTeller.receiptFile) {
          byTeller.status = "pending";
          byTeller.receiptFile = data.receiptFile;
          byTeller.submittedAt = new Date().toISOString();
          await writeAll(records);
        }
        return { ok: true, record: byTeller, existing: true };
      }
      return { ok: false, field: "tellerId", message: "This receipt reference has already been submitted by another student." };
    }
    if (records.some((r) => r.matricNumber === data.matricNumber && r.status !== "rejected")) {
      return { ok: false, field: "matricNumber", message: "This matric number already has a payment submitted or verified. Use the original receipt reference to check its status." };
    }

    const record: PaymentRecord = {
      ...data,
      accountName: "Wellspring University Ventures",
      bankName: "Zenith Bank",
      accountNumber: "1310392285",
      amountPaid: 2000,
      manualId: null,
      status: "pending",
      submittedAt: new Date().toISOString(),
      verifiedAt: null,
      downloads: 0,
      lastDownloadAt: null,
    };
    records.push(record);
    await writeAll(records);
    return { ok: true, record, existing: false };
  });
}

export async function findRecord(query: string): Promise<PaymentRecord | undefined> {
  const q = query.trim().replace(/\s+/g, "").toUpperCase();
  const records = await readAll();
  return records.find((r) => r.manualId === q || r.tellerId === q);
}

export async function listPendingPayments() {
  return (await readAll()).filter((r) => r.status === "pending");
}

export function reviewPayment(tellerId: string, action: "approve" | "reject") {
  return withLock(async () => {
    const records = await readAll();
    const record = records.find((r) => r.tellerId === tellerId);
    if (!record) return null;
    if (record.status !== "pending") return record;
    if (action === "reject") {
      record.status = "rejected";
    } else {
      let manualId = newManualId();
      while (records.some((r) => r.manualId === manualId)) manualId = newManualId();
      record.manualId = manualId;
      record.status = "verified";
      record.verifiedAt = new Date().toISOString();
    }
    await writeAll(records);
    return record;
  });
}

export function recordDownload(manualId: string) {
  return withLock(async () => {
    const records = await readAll();
    const r = records.find((x) => x.manualId === manualId && x.status === "verified");
    if (!r) return;
    r.downloads += 1;
    r.lastDownloadAt = new Date().toISOString();
    await writeAll(records);
  });
}
