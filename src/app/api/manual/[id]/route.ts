import { findRecord, recordDownload } from "@/lib/store";
import { buildStampedManual } from "@/lib/manual";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await findRecord(id);
  if (!record || record.status !== "verified" || !record.manualId || record.manualId !== id.toUpperCase()) {
    return new Response("No verified payment found for this manual ID.", { status: 404 });
  }

  const pdf = await buildStampedManual(record);
  await recordDownload(record.manualId);

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="GST412-Manual-${record.manualId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
