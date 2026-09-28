"use client";

import { recordPayment } from "@/app/actions/payments";
import { ActionForm } from "@/components/action-form";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { php } from "@/lib/money";

export function PaymentForm({ orderId, balance }: { orderId: string; balance: number }) {
  return (
    <ActionForm action={recordPayment} className="space-y-3" submitLabel="Record payment">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Amount *</label>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            max={balance}
            defaultValue={balance > 0 ? balance : undefined}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-right"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Method *</label>
          <select
            name="method"
            defaultValue="CASH"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Reference (optional)</label>
        <input
          name="reference"
          placeholder="GCash ref no., check no."
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes (optional)</label>
        <input
          name="notes"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
        />
      </div>
      <p className="text-xs text-muted-foreground">Outstanding balance: {php(balance)}</p>
    </ActionForm>
  );
}
