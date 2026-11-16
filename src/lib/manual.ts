import { promises as fs } from "fs";
import path from "path";
import bwipjs from "bwip-js/node";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PaymentRecord } from "./store";

// Put the real manual here. It lives outside /public so it can't be downloaded without verifying.
export const MANUAL_PATH = path.join(process.cwd(), "manual", "GST412-manual.pdf");

export function barcodePng(text: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
    backgroundcolor: "FFFFFF",
  });
}

async function placeholderManual(): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const body = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 3; i++) {
    const page = doc.addPage([595.28, 841.89]); // A4
    page.drawText("GST412 Manual", { x: 50, y: 760, size: 28, font });
    page.drawText(`Placeholder page ${i} — replace manual/GST412-manual.pdf with the real manual.`, {
      x: 50, y: 720, size: 11, font: body,
    });
  }
  return doc;
}

/** Standard PDF fonts only cover Latin-1; strip accents/dot-below marks (e.g. Yoruba "Ọ") instead of crashing. */
const pdfSafe = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

/** Returns the manual PDF with an ownership cover page and an ID + barcode footer on every page. */
export async function buildStampedManual(original: PaymentRecord): Promise<Uint8Array> {
  if (original.status !== "verified" || !original.manualId || !original.verifiedAt) {
    throw new Error("A payment must be verified before a manual is generated.");
  }
  const record = {
    ...original,
    manualId: original.manualId,
    verifiedAt: original.verifiedAt,
    fullName: pdfSafe(original.fullName),
    matricNumber: pdfSafe(original.matricNumber),
  };
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(await fs.readFile(MANUAL_PATH));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    doc = await placeholderManual();
  }

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const barcode = await doc.embedPng(await barcodePng(record.manualId));

  // Footer on every existing page.
  for (const page of doc.getPages()) {
    const { width } = page.getSize();
    const h = 34;
    const w = (barcode.width / barcode.height) * h;
    page.drawRectangle({ x: width - w - 28, y: 10, width: w + 8, height: h + 8, color: rgb(1, 1, 1) });
    page.drawImage(barcode, { x: width - w - 24, y: 14, width: w, height: h });
    page.drawText(`Licensed to ${record.fullName} (${record.matricNumber})  |  ID: ${record.manualId}`, {
      x: 24, y: 20, size: 7.5, font: regular, color: rgb(0.3, 0.3, 0.3),
    });
  }

  // Ownership cover page at the front.
  const first = doc.getPage(0).getSize();
  const cover = doc.insertPage(0, [first.width, first.height]);
  const { width, height } = cover.getSize();
  const center = (text: string, size: number, font = regular) => (width - font.widthOfTextAtSize(text, size)) / 2;

  cover.drawText("GST412 MANUAL", { x: center("GST412 MANUAL", 26, bold), y: height - 120, size: 26, font: bold });
  cover.drawText("Certificate of Verified Payment", {
    x: center("Certificate of Verified Payment", 14), y: height - 150, size: 14, font: regular,
  });

  const bw = Math.min(width - 120, 380);
  const bh = (barcode.height / barcode.width) * bw;
  cover.drawImage(barcode, { x: (width - bw) / 2, y: height - 220 - bh, width: bw, height: bh });

  const rows: [string, string][] = [
    ["Manual ID", record.manualId],
    ["Student name", record.fullName],
    ["Matric number", record.matricNumber],
    ["Teller ID", record.tellerId],
    ["Account name", record.accountName],
    ["Bank", record.bankName],
    ["Account number", record.accountNumber],
    ["Amount paid", `NGN ${record.amountPaid.toLocaleString("en-NG")}`],
    ["Verified on", new Date(record.verifiedAt).toUTCString()],
  ];
  let y = height - 260 - bh;
  for (const [label, value] of rows) {
    cover.drawText(label, { x: 80, y, size: 11, font: bold });
    cover.drawText(value, { x: 220, y, size: 11, font: regular });
    y -= 22;
  }
  cover.drawText("This copy is uniquely issued. Scan the barcode to confirm ownership.", {
    x: 80, y: y - 20, size: 9, font: regular, color: rgb(0.4, 0.4, 0.4),
  });

  return doc.save();
}
