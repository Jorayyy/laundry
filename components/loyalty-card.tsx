import { loyaltyState } from "@/lib/loyalty";
import { ActionButton } from "@/components/action-button";
import { redeemLoyalty } from "@/app/actions/customers";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export function LoyaltyCard({
  customerId,
  completedOrders,
  redemptions,
  threshold,
  canRedeem,
}: {
  customerId: string;
  completedOrders: number;
  redemptions: number;
  threshold: number;
  canRedeem: boolean;
}) {
  const state = loyaltyState(completedOrders, redemptions, threshold);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        state.eligible ? "border-amber-400 bg-amber-50" : "bg-card"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              state.eligible ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground"
            )}
          >
            <Star className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Loyalty Card</h2>
            <p className="text-xs text-muted-foreground">
              {state.eligible
                ? "Reward unlocked — eligible for a free reward!"
                : `${state.remaining} more stamp${state.remaining === 1 ? "" : "s"} to go`}
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {state.stamps}/{state.total}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: state.total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold",
              i < state.stamps
                ? state.eligible
                  ? "border-amber-400 bg-amber-400 text-white"
                  : "border-primary bg-primary text-primary-foreground"
                : "border-dashed text-muted-foreground"
            )}
          >
            {i + 1}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <p className="text-xs text-muted-foreground">
          Earn 1 stamp per completed order · {redemptions} reward{redemptions === 1 ? "" : "s"} redeemed
        </p>
        {state.eligible ? (
          canRedeem ? (
            <ActionButton
              action={redeemLoyalty.bind(null, customerId)}
              confirmMessage="Redeem the loyalty reward and reset this card?"
              className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
            >
              Redeem reward
            </ActionButton>
          ) : (
            <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Eligible
            </span>
          )
        ) : null}
      </div>
    </div>
  );
}
