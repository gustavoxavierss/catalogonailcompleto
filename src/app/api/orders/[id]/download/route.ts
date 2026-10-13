import {
  adminDb,
  AppError,
  failure,
  identity,
  sameOrigin,
  track,
} from "@/lib/server";
import { generatePaidPdf } from "@/lib/pdf";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const { user } = await identity();
    const { id } = await params;
    const db = adminDb();
    const { data: order, error } = await db
      .from("orders")
      .select("status,catalog_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw new AppError("Catálogo não encontrado.", 404);
    if (order.status !== "paid")
      throw new AppError("Confirme o pagamento para liberar seu PDF.", 403);
    const file = await generatePaidPdf(id);
    const current = await db
      .from("orders")
      .select("status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (current.error || current.data.status !== "paid")
      throw new AppError("Este pagamento não está aprovado.", 403);
    const signed = await db.storage
      .from("catalog-pdfs")
      .createSignedUrl(file.path, 60, { download: "meu-catalogo.pdf" });
    if (signed.error) throw signed.error;
    await track("pdf_downloaded", user.id, order.catalog_id, id);
    return Response.json(
      { url: signed.data.signedUrl, expiresIn: 60 },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
