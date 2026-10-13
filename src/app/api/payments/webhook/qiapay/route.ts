import { provider } from "@/lib/payments/provider";
import { confirmPayment } from "@/lib/payments/service";
import { generatePaidPdf } from "@/lib/pdf";
import { after } from "next/server";
export async function POST(req: Request) {
  if (!provider.available)
    return Response.json({ error: "Gateway not configured" }, { status: 503 });
  if (Number(req.headers.get("content-length")) > 1000000)
    return new Response(null, { status: 413 });
  try {
    const raw = await req.text();
    if (raw.length > 1000000) return new Response(null, { status: 413 });
    const event = await provider.verifyWebhook(raw, req.headers);
    await confirmPayment(event, raw);
    if (event.status === "paid")
      after(async () => {
        try {
          await generatePaidPdf(event.orderId);
        } catch {
          console.error("pdf_job_deferred", { orderId: event.orderId });
        }
      });
    return Response.json({ received: true });
  } catch {
    console.error("webhook_rejected");
    return Response.json({ error: "Invalid event" }, { status: 400 });
  }
}
