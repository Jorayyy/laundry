"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/actions/orders";
import { saveCustomer } from "@/app/actions/customers";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { lineSubtotal, orderTotals } from "@/lib/calc";
import { php } from "@/lib/money";
import type { PricingType } from "@/lib/calc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

type Customer = { id: string; name: string; phone: string };
type Service = { id: string; name: string; pricingType: PricingType; price: number };

function quantityLabel(p: PricingType) {
  if (p === "PER_KG") return "Weight (kg)";
  if (p === "PER_ITEM") return "Quantity";
  return "Qty";
}

export function OrderForm({
  customers,
  services,
  isOwner,
}: {
  customers: Customer[];
  services: Service[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<{ key: number; serviceId: string; quantity: number; unitPrice: number }[]>([
    { key: 1, serviceId: services[0]?.id ?? "", quantity: services[0]?.pricingType === "PER_KG" ? 1 : 1, unitPrice: services[0]?.price ?? 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [customerOpen, setCustomerOpen] = useState(false);

  const svcMap = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const totals = useMemo(() => {
    const computed = lines.map((l) => ({
      pricingType: (svcMap.get(l.serviceId)?.pricingType ?? "PER_ITEM") as PricingType,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
    }));
    return orderTotals(computed, discount);
  }, [lines, discount, svcMap]);

  const updateLine = (key: number, patch: Partial<(typeof lines)[number]>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const setService = (key: number, serviceId: string) => {
    const svc = svcMap.get(serviceId);
    updateLine(key, { serviceId, unitPrice: svc?.price ?? 0 });
  };

  return (
    <ActionForm id="order-form" action={createOrder} className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium">Customer *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>
            </div>
            <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="h-9 shrink-0 rounded-md border px-3 text-sm font-medium hover:bg-accent"
                >
                  + New customer
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add customer</DialogTitle>
                </DialogHeader>
                <ActionForm
                  action={saveCustomer}
                  submitLabel="Create customer"
                  onSuccess={() => {
                    setCustomerOpen(false);
                    router.refresh();
                  }}
                  className="space-y-3"
                >
                  <input name="name" required placeholder="Full name" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
                  <input name="phone" required placeholder="Phone number" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
                  <input name="email" placeholder="Email (optional)" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
                  <input name="address" placeholder="Address (optional)" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
                </ActionForm>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Service lines</h2>
            <button
              type="button"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  {
                    key: Math.max(0, ...prev.map((l) => l.key)) + 1,
                    serviceId: services[0]?.id ?? "",
                    quantity: 1,
                    unitPrice: services[0]?.price ?? 0,
                  },
                ])
              }
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium hover:bg-accent"
            >
              <Plus className="h-4 w-4" /> Add line
            </button>
          </div>

          <div className="divide-y">
            {lines.map((line) => {
              const svc = svcMap.get(line.serviceId);
              const pType = svc?.pricingType ?? "PER_ITEM";
              const sub = lineSubtotal({
                pricingType: pType,
                unitPrice: line.unitPrice,
                quantity: line.quantity,
              });
              return (
                <div key={line.key} className="grid gap-3 p-4 sm:grid-cols-[1fr_100px_100px_100px_36px] sm:items-end">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Service</label>
                    <select
                      value={line.serviceId}
                      onChange={(e) => setService(line.key, e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.pricingType === "PER_KG" ? "kg" : s.pricingType === "PER_ITEM" ? "item" : "fixed"} — {php(s.price)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">{quantityLabel(pType)}</label>
                    <input
                      type="number"
                      min={pType === "PER_ITEM" ? 1 : 0.1}
                      step={pType === "PER_KG" ? 0.1 : 1}
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-right"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Unit price</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={!isOwner}
                      title={isOwner ? "Custom price" : "Only the owner can change prices"}
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-right disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Line total</label>
                    <div className="flex h-9 items-center justify-end px-1 text-sm font-medium">{php(sub)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== line.key) : prev))}
                    className="h-9 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remove line"
                  >
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                  <input
                    type="hidden"
                    name="lines"
                    value={`serviceId=${line.serviceId}&quantity=${line.quantity}&unitPrice=${line.unitPrice}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Customer notes</label>
            <textarea name="notes" rows={2} placeholder="e.g. fragile items, special instructions" className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Internal staff notes</label>
            <textarea name="internalNotes" rows={2} placeholder="Not shown to customer" className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <input type="hidden" name="customerId" value={customerId} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Expected completion</label>
            <input
              type="datetime-local"
              name="dueAt"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Discount (₱)</label>
            <input
              type="number"
              name="discount"
              min={0}
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm text-right"
            />
          </div>

          <div className="space-y-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{php(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span>−{php(totals.discount)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{php(totals.total)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Payment can be recorded after the order is created.</p>
          </div>
          <SubmitButton label="Create order" />
        </div>
      </div>
    </ActionForm>
  );
}
