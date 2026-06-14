import crypto from "crypto";
import Razorpay from "razorpay";

/**
 * Razorpay integration helpers.
 *
 * Credentials come from the environment (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).
 * The key id is public-safe (it ships to the browser checkout); the secret is
 * server-only and is used to (a) create orders and (b) verify the signature
 * Razorpay returns after a successful payment.
 */
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export const razorpayKeyId = KEY_ID;
export const isRazorpayConfigured = Boolean(KEY_ID && KEY_SECRET);

const client = isRazorpayConfigured
  ? new Razorpay({ key_id: KEY_ID!, key_secret: KEY_SECRET! })
  : null;

/** Create a Razorpay order for the given amount (in paise). */
export async function createRazorpayOrder(amountPaise: number, receipt: string) {
  if (!client) throw new Error("Razorpay is not configured");
  return client.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
  });
}

/**
 * Verify the HMAC signature Razorpay sends back to the client on a successful
 * payment. Returns true only if the signature matches `orderId|paymentId`
 * signed with the key secret — proof the payment really succeeded.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  // Constant-time comparison to avoid leaking timing information.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
