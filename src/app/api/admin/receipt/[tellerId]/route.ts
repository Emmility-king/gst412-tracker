import { reviewAuthorized } from "@/lib/admin";
import { findRecord, readReceipt } from "@/lib/store";

export async function GET(request: Request, { params }: { params: Promise<{ tellerId: string }> }) {
  if (!process.env.PAYMENT_REVIEW_PASSWORD) return new Response("Staff review is not configured.", { status: 503 });
  if (!reviewAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const { tellerId } = await params;
  const record = await findRecord(decodeURIComponent(tellerId));
  if (!record || record.status !== "pending" || !record.receiptFile) return new Response("Receipt not found.", { status: 404 });
  const file = await readReceipt(record.receiptFile);
  if (!file) return new Response("Receipt file is missing.", { status: 404 });
  const type = record.receiptFile.endsWith(".png") ? "image/png" : record.receiptFile.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(new Uint8Array(file), { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
}
