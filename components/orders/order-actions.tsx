"use client";

import { NEXT_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/labels";
import { changeOrderStatus } from "@/app/actions/orders";
import { ActionButton } from "@/components/action-button";

const STYLES: Record<string, string> = {
  default: "rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent",
  primary: "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90",
  danger: "rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10",
};

const TONE: Record<OrderStatus, "default" | "primary" | "danger"> = {
  RECEIVED: "primary",
  SORTING: "primary",
  WASHING: "primary",
  DRYING: "primary",
  FOLDING: "primary",
  READY_FOR_PICKUP: "primary",
  COMPLETED: "primary",
  ON_HOLD: "default",
  CANCELLED: "danger",
};

export function OrderActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const next = NEXT_STATUSES[status] ?? [];
  if (next.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {next.map((s) => (
        <ActionButton
          key={s}
          action={changeOrderStatus.bind(null, orderId, s)}
          confirmMessage={
            s === "CANCELLED"
              ? "Cancel this order? The order will be excluded from sales reports."
              : undefined
          }
          className={STYLES[TONE[s]]}
        >
          {s === "CANCELLED" ? "Cancel order" : `Mark as ${STATUS_LABEL[s]}`}
        </ActionButton>
      ))}
    </div>
  );
}
