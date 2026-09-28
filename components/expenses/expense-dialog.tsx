"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm } from "@/components/action-form";
import { saveExpense } from "@/app/actions/expenses";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL, PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/labels";

export function ExpenseDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          + Add expense
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
        </DialogHeader>
        <ActionForm
          action={saveExpense}
          submitLabel="Record expense"
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category *</label>
              <select name="category" className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {EXPENSE_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Amount *</label>
              <input name="amount" type="number" min="0.01" step="0.01" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-right" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <input name="description" placeholder="e.g. 2 bottles Ariel" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date *</label>
              <input name="spentAt" type="date" defaultValue={today} required className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Paid via</label>
              <select name="method" defaultValue="CASH" className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm">
                <option value="">—</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Receipt / reference</label>
            <input name="reference" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <input name="notes" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
