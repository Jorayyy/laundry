"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm } from "@/components/action-form";
import { saveCustomer } from "@/app/actions/customers";

export function CustomerDialog({ customer }: { customer?: { id: string; name: string; phone: string; email?: string | null; address?: string | null; notes?: string | null } }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {customer ? "Edit customer" : "+ New customer"}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? "Edit customer" : "New customer"}</DialogTitle>
        </DialogHeader>
        <ActionForm
          action={saveCustomer}
          submitLabel={customer ? "Save changes" : "Create customer"}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
          className="space-y-3"
        >
          {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full name *</label>
            <input name="name" required defaultValue={customer?.name} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone *</label>
            <input name="phone" required defaultValue={customer?.phone} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input name="email" type="email" defaultValue={customer?.email ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Address</label>
            <input name="address" defaultValue={customer?.address ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea name="notes" rows={2} defaultValue={customer?.notes ?? ""} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
