import test from "node:test";
import assert from "node:assert/strict";
import {
  lineSubtotal,
  orderTotals,
  paymentStatusOf,
  balanceOf,
  validatePayment,
  validateLine,
} from "../lib/calc";

test("per-kg line subtotal rounds to 2 decimals", () => {
  assert.equal(lineSubtotal({ pricingType: "PER_KG", unitPrice: 55, quantity: 3.333 }), 183.32);
});

test("per-item line subtotal", () => {
  assert.equal(lineSubtotal({ pricingType: "PER_ITEM", unitPrice: 180, quantity: 2 }), 360);
});

test("fixed line uses flat price regardless of quantity", () => {
  assert.equal(lineSubtotal({ pricingType: "FIXED", unitPrice: 80, quantity: 5 }), 80);
});

test("order totals apply discount and clamp at subtotal", () => {
  const lines = [
    { pricingType: "PER_KG" as const, unitPrice: 55, quantity: 10 },
    { pricingType: "PER_ITEM" as const, unitPrice: 180, quantity: 1 },
  ];
  assert.deepEqual(orderTotals(lines, 50), { subtotal: 730, discount: 50, total: 680 });
  assert.deepEqual(orderTotals(lines, 9999), { subtotal: 730, discount: 730, total: 0 });
  assert.deepEqual(orderTotals(lines, -10), { subtotal: 730, discount: 0, total: 730 });
});

test("payment status transitions", () => {
  assert.equal(paymentStatusOf(100, 0), "UNPAID");
  assert.equal(paymentStatusOf(100, 50), "PARTIAL");
  assert.equal(paymentStatusOf(100, 99.99), "PARTIAL");
  assert.equal(paymentStatusOf(100, 100), "PAID");
  assert.equal(paymentStatusOf(100, 120), "PAID");
});

test("balance never goes negative", () => {
  assert.equal(balanceOf(100, 150), 0);
  assert.equal(balanceOf(100, 40), 60);
});

test("payment validation rejects overpayment and non-positive amounts", () => {
  assert.ok(validatePayment(100, 60, 50));
  assert.ok(validatePayment(100, 0, 0));
  assert.ok(validatePayment(100, 0, -5));
  assert.equal(validatePayment(100, 60, 40), null);
  assert.equal(validatePayment(100, 0, 100), null);
});

test("line validation", () => {
  assert.ok(validateLine({ pricingType: "PER_KG", unitPrice: 55, quantity: 0 }, 0));
  assert.ok(validateLine({ pricingType: "PER_KG", unitPrice: -1, quantity: 5 }, 0));
  assert.equal(validateLine({ pricingType: "PER_KG", unitPrice: 55, quantity: 5 }, 0), null);
  assert.equal(validateLine({ pricingType: "FIXED", unitPrice: 80, quantity: 1 }, 0), null);
});
