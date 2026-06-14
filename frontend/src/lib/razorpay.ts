import type { PaymentOrder } from "./api";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/** Lazy-load the Razorpay checkout script once. */
function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Open the Razorpay checkout for an order. Resolves with the success payload
 * (to hand to the verify endpoint), or rejects if the user dismisses it or the
 * script fails to load.
 */
export function openRazorpayCheckout(
  order: PaymentOrder,
  opts: { name: string; description: string; prefill?: { name?: string; email?: string; contact?: string } }
): Promise<RazorpaySuccess> {
  return new Promise(async (resolve, reject) => {
    const ok = await loadRazorpayScript();
    if (!ok || !window.Razorpay) {
      reject(new Error("Could not load the payment gateway. Check your connection."));
      return;
    }
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: opts.name,
      description: opts.description,
      prefill: opts.prefill,
      theme: { color: "#1f6feb" },
      handler: (response: RazorpaySuccess) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    });
    rzp.open();
  });
}
