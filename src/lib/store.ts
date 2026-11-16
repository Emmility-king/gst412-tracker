import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export type PaymentRecord = {
  manualId: string;
  fullName: string;
  matricNumber: string;
  tellerId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  amountPaid: number;
  verifiedAt: string;
  downloads: number;
  lastDownloadAt: string | null;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "payments.json");

// Serialise all writes so concurrent requests can't clobber each other.
let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<PaymentRecord[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
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
  // e.g. GST412-26-7F3K9QX2 — no ambiguous chars (0/O, 1/I)
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(8);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const yy = String(new Date().getFullYear()).slice(-2);
  return `GST412-${yy}-${suffix}`;
}

export type RegisterResult =
  | { ok: true; record: PaymentRecord; existing: boolean }
  | { ok: false; field: "tellerId" | "matricNumber"; message: string };

export function registerPayment(
  data: Omit<PaymentRecord, "manualId" | "verifiedAt" | "downloads" | "lastDownloadAt">,
): Promise<RegisterResult> {
  return withLock(async () => {
    const records = await readAll();

    const byTeller = records.find((r) => r.tellerId === data.tellerId);
    if (byTeller) {
      if (byTeller.matricNumber === data.matricNumber) {
        // Same student re-verifying the same teller — give them back their ID.
        return { ok: true, record: byTeller, existing: true };
      }
      return {
        ok: false,
        field: "tellerId",
        message: "This teller ID has already been used by another student.",
      };
    }

    if (records.some((r) => r.matricNumber === data.matricNumber)) {
      return {
        ok: false,
        field: "matricNumber",
        message:
          "This matric number already has a verified payment. Re-enter the teller ID you used originally, or retrieve it on the Track page.",
      };
    }

    let manualId = newManualId();
    while (records.some((r) => r.manualId === manualId)) manualId = newManualId();

    const record: PaymentRecord = {
      ...data,
      manualId,
      verifiedAt: new Date().toISOString(),
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

export function recordDownload(manualId: string) {
  return withLock(async () => {
    const records = await readAll();
    const r = records.find((x) => x.manualId === manualId);
    if (!r) return;
    r.downloads += 1;
    r.lastDownloadAt = new Date().toISOString();
    await writeAll(records);
  });
}
