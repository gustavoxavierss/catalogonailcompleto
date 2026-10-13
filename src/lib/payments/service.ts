import "server-only";
import { createHash } from "node:crypto";
import { adminDb } from "../server";
import { validatePayment, VerifiedPayment } from "./provider";
export async function confirmPayment(event: VerifiedPayment, raw: string) {
  const db = adminDb();
  const { data: order, error } = await db
    .from("orders")
    .select("*")
    .eq("id", event.orderId)
    .single();
  if (error) throw error;
  validatePayment(order, event);
  const result = await db.rpc("confirm_payment", {
    p_event: event.eventId,
    p_order: event.orderId,
    p_transaction: event.transactionId,
    p_gateway_order: event.gatewayOrderId,
    p_amount: event.amount,
    p_currency: event.currency,
    p_status: event.status,
    p_occurred: event.occurredAt,
    p_hash: createHash("sha256").update(raw).digest("hex"),
  });
  if (result.error) throw result.error;
  return result.data;
}
