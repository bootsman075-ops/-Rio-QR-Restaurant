import "server-only";

/**
 * Provider-neutral contract for future QR payments. NO provider is connected
 * today and none of these methods are invoked by any guest route.
 *
 * An implementation must verify the signature over the RAW webhook request
 * body, check provider API status server-side when appropriate, enforce
 * EUR/amount/order/tenant matching and process idempotently in one transaction.
 * Never trust a customer's success-page redirect as proof of payment.
 */
export type PaymentCheckoutRequest = {
  restaurantId: string;
  orderId: string;
  amountCents: number;
  currency: "EUR";
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
};

export type PaymentCheckoutResult = {
  providerPaymentId: string;
  checkoutUrl: string;
  expiresAt: string | null;
};

export type VerifiedPaymentEvent = {
  providerEventId: string;
  providerPaymentId: string;
  status: "pending" | "succeeded" | "failed" | "cancelled" | "expired" | "refunded";
  amountCents: number;
  currency: "EUR";
};

export interface QrPaymentProviderAdapter {
  readonly code: string;
  createCheckout(request: PaymentCheckoutRequest): Promise<PaymentCheckoutResult>;
  verifyWebhookSignature(rawBody: Uint8Array, headers: Headers): Promise<VerifiedPaymentEvent>;
  getPaymentStatus(providerPaymentId: string): Promise<VerifiedPaymentEvent>;
}

/**
 * Fail closed while no payment provider is selected.
 * A future connector registers a validated server-only adapter here.
 */
export function getQrPaymentProvider(): never {
  throw new Error("QR_ONLINE_PAYMENTS_NOT_CONFIGURED");
}
