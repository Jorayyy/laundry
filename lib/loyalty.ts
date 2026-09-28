export type LoyaltyState = {
  stamps: number;
  total: number;
  earned: number;
  remaining: number;
  eligible: boolean;
};

export function loyaltyState(completedOrders: number, redemptions: number, threshold: number): LoyaltyState {
  const safeThreshold = Math.max(threshold, 1);
  const earned = Math.max(completedOrders - redemptions * safeThreshold, 0);
  const stamps = Math.min(earned, safeThreshold);
  return {
    stamps,
    total: safeThreshold,
    earned,
    remaining: Math.max(safeThreshold - earned, 0),
    eligible: earned >= safeThreshold,
  };
}
