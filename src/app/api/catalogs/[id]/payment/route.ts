import {
  adminDb,
  failure,
  identity,
  ownedCatalog,
  sameOrigin,
} from "@/lib/server";
import { provider } from "@/lib/payments/provider";
import { confirmPayment } from "@/lib/payments/service";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await identity();
    const { id } = await params;
    await ownedCatalog(id, user.id);
    const { data, error } = await adminDb()
      .from("orders")
      .select(
        "id,status,amount,created_at,version_id,checkout_url,pdf_files(id)",
      )
      .eq("catalog_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return Response.json(
      { orders: data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const { user } = await identity();
    const { id } = await context.params;
    await ownedCatalog(id, user.id);
    const { data, error } = await adminDb()
      .from("orders")
      .select("*")
      .eq("catalog_id", id)
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data && provider.available) {
      const event = await provider.getPaymentStatus(data);
      await confirmPayment(event, JSON.stringify(event));
    }
    return GET(req, context);
  } catch (e) {
    return failure(e);
  }
}
