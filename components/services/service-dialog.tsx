"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm } from "@/components/action-form";
import { saveService } from "@/app/actions/services";

type Service = {
  id: string;
  name: string;
  description?: string | null;
  pricingType: "PER_KG" | "PER_ITEM" | "FIXED";
  price: number;
  minQuantity: number;
  active: boolean;
};

export function ServiceDialog({ service }: { service?: Service }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {service ? "Edit" : "+ New service"}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle>
        </DialogHeader>
        <ActionForm
          action={saveService}
          submitLabel={service ? "Save changes" : "Create service"}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
          className="space-y-3"
        >
          {service ? <input type="hidden" name="id" value={service.id} /> : null}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name *</label>
            <input name="name" required defaultValue={service?.name} placeholder="Wash-Dry-Fold" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <input name="description" defaultValue={service?.description ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pricing type *</label>
              <select name="pricingType" defaultValue={service?.pricingType ?? "PER_KG"} className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm">
                <option value="PER_KG">Per kilogram</option>
                <option value="PER_ITEM">Per item</option>
                <option value="FIXED">Fixed price</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Price (₱) *</label>
              <input name="price" type="number" min="0" step="0.01" required defaultValue={service?.price ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-right" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Min quantity/weight</label>
              <input name="minQuantity" type="number" min="0" step="0.1" defaultValue={service?.minQuantity ?? 1} className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm" />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <input type="checkbox" name="active" defaultChecked={service?.active ?? true} className="h-4 w-4" />
              <label className="text-sm">Active</label>
            </div>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
