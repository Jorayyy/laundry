import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { php, num, formatDateTime, formatDate } from "@/lib/money";
import { StatusBadge, PaymentBadge, PageHeader, methodLabel } from "@/components/bits";
import { OrderActions } from "@/components/orders/order-actions";
import { PaymentForm } from "@/components/orders/payment-form";
import { NotesForm } from "@/components/orders/notes-form";
import { ActionButton } from "@/components/action-button";
import { voidPayment } from "@/app/actions/payments";
import { Printer } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      payments: { orderBy: { paidAt: "desc" }, include: { createdBy: { select: { name: true } } } },
      activities: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
      createdBy: { select: { name: true } },
    },
  });

  if (!order) notFound();

  const total = num(order.total);
  const paid = num(order.paidAmount);
  const balance = Math.max(total - paid, 0);
  const activePayments = order.payments.filter((p) => !p.voidedAt);

  return (
    <div>
      <PageHeader title={order.orderNo} description={`Received ${formatDateTime(order.receivedAt)}`}>
        <Link
          href={`/orders/${order.id}/receipt`}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <Printer className="h-4 w-4" /> Print stub
        </Link>
      </PageHeader>

      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.paymentStatus} />
            {order.dueAt ? (
              <span className="text-sm text-muted-foreground">Due {formatDateTime(order.dueAt)}</span>
            ) : null}
            {order.completedAt ? (
              <span className="text-sm text-muted-foreground">Completed {formatDateTime(order.completedAt)}</span>
            ) : null}
          </div>
          <OrderActions orderId={order.id} status={order.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Customer</h2>
            </div>
            <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium">{order.customer.name}</p>
                <p className="text-muted-foreground">{order.customer.phone}</p>
                {order.customer.email ? <p className="text-muted-foreground">{order.customer.email}</p> : null}
                {order.customer.address ? <p className="text-muted-foreground">{order.customer.address}</p> : null}
              </div>
              <div className="text-muted-foreground sm:text-right">
                <p>Created by {order.createdBy.name}</p>
                <Link href={`/customers/${order.customerId}`} className="hover:underline text-foreground">
                  View customer profile →
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Service</th>
                    <th className="px-4 py-2.5 font-medium text-right">Unit price</th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      {order.items.some((i) => i.pricingType === "PER_KG") ? "Weight / Qty" : "Qty"}
                    </th>
                    <th className="px-4 py-2.5 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">{item.serviceName}</td>
                      <td className="px-4 py-3 text-right">{php(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right">
                        {item.pricingType === "PER_KG"
                          ? `${num(item.quantity)} kg`
                          : `${num(item.quantity)} ${item.pricingType === "FIXED" ? "x" : "pc(s)"}`}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{php(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t px-4 py-3 text-sm space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{php(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>−{php(order.discount)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{php(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Paid</span>
                <span>{php(paid)}</span>
              </div>
              <div className={`flex justify-between font-medium ${balance > 0.001 ? "text-red-600" : "text-emerald-600"}`}>
                <span>Balance</span>
                <span>{php(balance)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Activity history</h2>
            </div>
            <ul className="divide-y text-sm">
              {order.activities.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div>
                    <p className="font-medium">
                      {a.action === "STATUS_CHANGED"
                        ? `${a.fromStatus} → ${a.toStatus}`
                        : a.action.replace(/_/g, " ").toLowerCase()}
                    </p>
                    {a.message ? <p className="text-muted-foreground">{a.message}</p> : null}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p>{a.user.name}</p>
                    <p>{formatDateTime(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Payments</h2>
              <span className="text-xs text-muted-foreground">{activePayments.length} record(s)</span>
            </div>
            <div className="p-4">
              {order.status !== "CANCELLED" && balance > 0.001 ? (
                <PaymentForm orderId={order.id} balance={balance} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {order.status === "CANCELLED" ? "Order cancelled — payments disabled." : "Fully paid."}
                </p>
              )}

              <ul className="mt-4 divide-y border-t">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2 py-2.5 text-sm">
                    <div>
                      <p className={`font-medium ${p.voidedAt ? "line-through text-muted-foreground" : ""}`}>
                        {php(p.amount)} · {methodLabel(p.method)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(p.paidAt)} · {p.createdBy.name}
                        {p.reference ? ` · Ref ${p.reference}` : ""}
                      </p>
                    </div>
                    {p.voidedAt ? (
                      <span className="text-xs text-muted-foreground">Voided</span>
                    ) : (
                      <ActionButton
                        action={voidPayment.bind(null, p.id)}
                        confirmMessage="Void this payment? It will be reversed from the order balance."
                        className="text-xs text-destructive hover:underline shrink-0"
                      >
                        Void
                      </ActionButton>
                    )}
                  </li>
                ))}
                {order.payments.length === 0 ? <li className="py-3 text-sm text-muted-foreground">No payments yet.</li> : null}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Notes</h2>
            </div>
            <div className="p-4">
              <NotesForm id={order.id} notes={order.notes ?? ""} internalNotes={order.internalNotes ?? ""} />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 text-sm">
            <h2 className="text-sm font-semibold mb-2">Summary</h2>
            <dl className="space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <dt>Received by</dt>
                <dd className="text-foreground">{order.createdBy.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Last updated</dt>
                <dd className="text-foreground">{formatDate(order.updatedAt)}</dd>
              </div>
              {order.notes ? (
                <div className="pt-2 border-t mt-2">
                  <dt>Customer note</dt>
                  <dd className="text-foreground">{order.notes}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
