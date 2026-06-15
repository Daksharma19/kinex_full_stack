/**
 * Appointment payment breakdown.
 *
 * In India a doctor's consultation fee is GST-exempt (healthcare service by an
 * authorised practitioner). The payment gateway, however, charges 2% + 18% GST
 * on that 2% fee. We pass those gateway costs on to the patient, so the total
 * charged = consultation + gateway fee + GST-on-gateway-fee.
 *
 * All math is done in paise (integers) to avoid floating-point drift; the order
 * sent to Razorpay uses `totalPaise`.
 */
export const GATEWAY_FEE_PERCENT = 2; // Razorpay domestic platform fee
export const GST_PERCENT = 18; // GST on the gateway fee (not the consultation)

export interface PaymentBreakdown {
  consultationFee: number; // rupees
  gatewayFeePercent: number;
  gatewayFee: number; // rupees, 2dp
  gstPercent: number;
  gst: number; // rupees, 2dp (GST on the gateway fee only)
  total: number; // rupees, 2dp
  totalPaise: number; // integer paise actually charged
}

/** Compute the patient-facing invoice for a given consultation fee (rupees). */
export function computeBreakdown(consultationFeeRupees: number): PaymentBreakdown {
  const consultationPaise = Math.round(consultationFeeRupees * 100);
  const gatewayFeePaise = Math.round((consultationPaise * GATEWAY_FEE_PERCENT) / 100);
  const gstPaise = Math.round((gatewayFeePaise * GST_PERCENT) / 100);
  const totalPaise = consultationPaise + gatewayFeePaise + gstPaise;

  return {
    consultationFee: consultationPaise / 100,
    gatewayFeePercent: GATEWAY_FEE_PERCENT,
    gatewayFee: gatewayFeePaise / 100,
    gstPercent: GST_PERCENT,
    gst: gstPaise / 100,
    total: totalPaise / 100,
    totalPaise,
  };
}
