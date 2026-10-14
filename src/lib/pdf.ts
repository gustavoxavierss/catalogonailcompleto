import "server-only";
import { adminDb, AppError, track } from "./server";
import { catalogSchema } from "./catalog";
import { renderCatalogPdf } from "./pdf-engine";
import { requireSubscriptionAccess } from "./subscription-access";
export async function generatePaidPdf(orderId: string) {
  const db = adminDb();
  const { data: order, error } = await db
    .from("orders")
    .select("*,catalog_versions(snapshot)")
    .eq("id", orderId)
    .single();
  if (error) throw error;
  if (order.status !== "paid")
    throw new AppError(
      "O pagamento precisa estar aprovado para gerar o PDF.",
      403,
    );
  await requireSubscriptionAccess(order);
  const existing = await db
    .from("pdf_files")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;
  const { data: claimed, error: claimError } = await db.rpc("claim_pdf_job", {
    p_order: orderId,
  });
  if (claimError) throw claimError;
  if (!claimed)
    throw new AppError(
      "Seu PDF está sendo preparado. Aguarde alguns instantes.",
      409,
    );
  try {
    const doc = catalogSchema.parse(order.catalog_versions.snapshot);
    const bytes = await renderCatalogPdf(doc, async (path) => {
      if (!path.startsWith(`${order.user_id}/${order.catalog_id}/`))
        throw new Error("IMAGE_OWNERSHIP");
      const { data, error } = await db.storage
        .from("catalog-images")
        .download(path);
      if (error) throw error;
      return new Uint8Array(await data.arrayBuffer());
    });
    const check = await db
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();
    if (check.error || check.data.status !== "paid")
      throw new AppError("Este pagamento não está mais aprovado.", 403);
    await requireSubscriptionAccess(order);
    const path = `${order.user_id}/${order.catalog_id}/${crypto.randomUUID()}.pdf`;
    const upload = await db.storage
      .from("catalog-pdfs")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (upload.error) throw upload.error;
    const record = await db
      .from("pdf_files")
      .insert({ order_id: orderId, user_id: order.user_id, path })
      .select("*")
      .single();
    if (record.error) {
      await db.storage.from("catalog-pdfs").remove([path]);
      throw record.error;
    }
    await db
      .from("pdf_jobs")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("order_id", orderId);
    await track("pdf_generated", order.user_id, order.catalog_id, orderId);
    return record.data;
  } catch (e) {
    await db
      .from("pdf_jobs")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("order_id", orderId);
    throw e;
  }
}
