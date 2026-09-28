import { round2 } from "@/lib/money";

export type PricingType = "PER_KG" | "PER_ITEM" | "FIXED";

export type LineInput = {
  pricingType: PricingType;
  unitPrice: number;
  quantity: number;
};

export function lineSubtotal(line: LineInput): number {
  if (line.pricingType === "FIXED") return round2(line.unitPrice);
  return round2(line.unitPrice * line.quantity);
}

export function validateLine(line: LineInput, index: number): string | null {
  if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0)
    return `Line ${index + 1}: price must be zero or greater.`;
  if (line.pricingType !== "FIXED" && (!Number.isFinite(line.quantity) || line.quantity <= 0))
    return `Line ${index + 1}: weight/quantity must be greater than zero.`;
  if (line.pricingType === "FIXED" && (!Number.isFinite(line.quantity) || line.quantity < 1))
    return `Line ${index + 1}: quantity must be at least 1.`;
  return null;
}

export function orderTotals(lines: LineInput[], discount: number) {
  const subtotal = round2(lines.reduce((sum, l) => sum + lineSubtotal(l), 0));
  const safeDiscount = round2(Math.min(Math.max(discount, 0), subtotal));
  const total = round2(subtotal - safeDiscount);
  return { subtotal, discount: safeDiscount, total };
}

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export function balanceOf(total: number, paid: number) {
  return round2(Math.max(total - paid, 0));
}

export function paymentStatusOf(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return "UNPAID";
  return paid + 0.001 >= total ? "PAID" : "PARTIAL";
}

export function validatePayment(total: number, paid: number, amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Payment amount must be greater than zero.";
  const balance = balanceOf(total, paid);
  if (amount - balance > 0.001)
    return `Amount exceeds outstanding balance of ${balance.toFixed(2)}.`;
  return null;
}
