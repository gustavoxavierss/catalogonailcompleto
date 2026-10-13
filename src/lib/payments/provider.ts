export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "expired";
export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  gateway_order_id: string | null;
  gateway_transaction_id: string | null;
}
export interface VerifiedPayment {
  eventId: string;
  orderId: string;
  transactionId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  occurredAt: string;
}
export interface PaymentProvider {
  name: string;
  available: boolean;
  createPayment(
    order: PaymentOrder,
    returnUrl: string,
  ): Promise<{
    transactionId: string;
    gatewayOrderId: string;
    checkoutUrl: string;
    expiresAt: string;
  }>;
  getPaymentStatus(order: PaymentOrder): Promise<VerifiedPayment>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedPayment>;
}
// Intentionally fail closed: no Qiapay endpoints, signing rules or events have been supplied.
export class QiapayProvider implements PaymentProvider {
  name = "qiapay";
  available = false;
  private blocked(): never {
    throw new Error("QIAPAY_OFFICIAL_CONTRACT_REQUIRED");
  }
  async createPayment(): Promise<never> {
    return this.blocked();
  }
  async getPaymentStatus(): Promise<never> {
    return this.blocked();
  }
  async verifyWebhook(): Promise<never> {
    return this.blocked();
  }
}
export const provider: PaymentProvider = new QiapayProvider();
export function validatePayment(order: PaymentOrder, event: VerifiedPayment) {
  if (
    order.id !== event.orderId ||
    order.amount !== event.amount ||
    order.currency !== event.currency ||
    order.gateway_transaction_id !== event.transactionId ||
    order.gateway_order_id !== event.gatewayOrderId
  )
    throw new Error("PAYMENT_MISMATCH");
  if (
    !event.eventId ||
    !event.transactionId ||
    !Number.isFinite(Date.parse(event.occurredAt))
  )
    throw new Error("INVALID_EVENT");
}
