import { barcodePng } from "@/lib/manual";
import { findRecord } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await findRecord(id);
  if (!record || record.manualId !== id.toUpperCase()) {
    return new Response("Not found", { status: 404 });
  }
  const png = await barcodePng(record.manualId);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
