import { wiapyConfigured, verifyWiapyWebhook } from "@/lib/payments/wiapy";
import { adminDb } from "@/lib/server";
import { generatePaidPdf } from "@/lib/pdf";
import { after } from "next/server";
export async function POST(req: Request) {
  if (!wiapyConfigured())
    return Response.json({ error: "Gateway not configured" }, { status: 503 });
  if (Number(req.headers.get("content-length")) > 1000000)
    return new Response(null, { status: 413 });
  try {
    const raw = await req.text();
    if (raw.length > 1000000) return new Response(null, { status: 413 });
    const e = verifyWiapyWebhook(raw, req.headers);
    const result = await adminDb().rpc("confirm_wiapy_payment", {
      p_event: e.eventId,
      p_order: e.orderId,
      p_transaction: e.transactionId,
      p_checkout: e.checkoutId,
      p_amount: e.amount,
      p_status: e.status,
      p_occurred: e.occurredAt,
      p_hash: e.hash,
      p_plan: e.plan,
      p_subscription: e.subscriptionId,
      p_until: e.expiresAt,
    });
    if (result.error) throw result.error;
    if (e.status === "paid")
      after(async () => {
        try {
          await generatePaidPdf(result.data);
        } catch {
          console.error("pdf_job_deferred", { orderId: result.data });
        }
      });
    return Response.json({ received: true });
  } catch {
    console.error("webhook_rejected");
    return Response.json({ error: "Invalid event" }, { status: 400 });
  }
}
