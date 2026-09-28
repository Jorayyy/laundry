import test from "node:test";
import assert from "node:assert/strict";
import { loyaltyState } from "../lib/loyalty";

test("progress fills toward threshold", () => {
  assert.deepEqual(loyaltyState(3, 0, 10), { stamps: 3, total: 10, earned: 3, remaining: 7, eligible: false });
});

test("eligible at threshold and card caps at total", () => {
  const s = loyaltyState(10, 0, 10);
  assert.equal(s.eligible, true);
  assert.equal(s.stamps, 10);
  assert.equal(s.remaining, 0);
  assert.equal(loyaltyState(15, 0, 10).stamps, 10);
});

test("redemption resets progress", () => {
  assert.deepEqual(loyaltyState(10, 1, 10), { stamps: 0, total: 10, earned: 0, remaining: 10, eligible: false });
  assert.deepEqual(loyaltyState(12, 1, 10), { stamps: 2, total: 10, earned: 2, remaining: 8, eligible: false });
});

test("guards against zero threshold and negative inputs", () => {
  assert.equal(loyaltyState(5, 0, 0).total, 1);
  assert.equal(loyaltyState(-3, 0, 10).stamps, 0);
  assert.equal(loyaltyState(0, 5, 10).earned, 0);
});
