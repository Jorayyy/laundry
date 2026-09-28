import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { php, num, formatDateTime, formatDate } from "@/lib/money";
import { PageHeader, StatusBadge, PaymentBadge, StatCard, methodLabel } from "@/components/bits";
import { CustomerDialog } from "@/components/customers/customer-dialog";
import { LoyaltyCard } from "@/components/loyalty-card";
import { ActionButton } from "@/components/action-button";
import { archiveCustomer } from "@/app/actions/customers";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const [customer, settings] = await Promise.all([
    db.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { receivedAt: "desc" },
          include: { items: { select: { serviceName: true } } },
        },
      },
    }),
    db.settings.findUnique({ where: { id: "single" } }),
  ]);
  if (!customer) notFound();

  const activeOrders = customer.orders.filter((o) => o.status !== "CANCELLED");
  const spent = activeOrders.reduce((s, o) => s + num(o.total), 0);
  const balance = activeOrders.reduce(
    (s, o) => s + Math.max(num(o.total) - num(o.paidAmount), 0),
    0
  );
  const lastOrder = activeOrders[0]?.receivedAt ?? null;
  const paymentHistory = await db.payment.findMany({
    where: { order: { customerId: id }, voidedAt: null },
    orderBy: { paidAt: "desc" },
    take: 20,
    include: { order: { select: { orderNo: true } } },
  });

  return (
    <div>
      <PageHeader title={customer.name} description={customer.archivedAt ? "Archived customer" : `Registered ${formatDate(customer.createdAt)}`}>
        <CustomerDialog customer={customer} />
        {!customer.archivedAt ? (
          <ActionButton
            action={archiveCustomer.bind(null, customer.id)}
            confirmMessage="Archive this customer? They will no longer appear in order forms."
            className="rounded-md border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            Archive
          </ActionButton>
        ) : null}
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total orders" value={activeOrders.length} />
        <StatCard label="Total spent" value={php(spent)} />
        <StatCard label="Outstanding balance" value={php(balance)} tone={balance > 0 ? "negative" : "positive"} />
        <StatCard label="Last order" value={lastOrder ? formatDate(lastOrder) : "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Order history</h2>
            <Link href={`/orders?q=${encodeURIComponent(customer.phone)}`} className="text-xs text-muted-foreground hover:underline">
              View in orders →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="hidden sm:table-cell px-4 py-2.5 font-medium">Items</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customer.orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  customer.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                          {o.orderNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(o.receivedAt)}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground max-w-52 truncate">
                        {o.items.map((i) => i.serviceName).join(", ")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{php(o.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={o.status} />
                          <PaymentBadge status={o.paymentStatus} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <LoyaltyCard
            customerId={customer.id}
            completedOrders={activeOrders.filter((o) => o.status === "COMPLETED").length}
            redemptions={customer.loyaltyRedemptions}
            threshold={settings?.loyaltyThreshold ?? 10}
            canRedeem={user.role === "OWNER"}
          />

          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Contact</h2>
            </div>
            <dl className="space-y-1.5 p-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd>{customer.phone}</dd>
              </div>
              {customer.email ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd>{customer.email}</dd>
                </div>
              ) : null}
              {customer.address ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Address</dt>
                  <dd>{customer.address}</dd>
                </div>
              ) : null}
              {customer.notes ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Notes</dt>
                  <dd>{customer.notes}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Payment history</h2>
            </div>
            <ul className="divide-y text-sm">
              {paymentHistory.length === 0 ? (
                <li className="px-4 py-4 text-muted-foreground">No payments recorded.</li>
              ) : (
                paymentHistory.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2 px-4 py-2.5">
                    <div>
                      <p className="font-medium">{php(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        <Link href={`/orders/${p.orderId}`} className="hover:underline">
                          {p.order.orderNo}
                        </Link>{" "}
                        · {formatDateTime(p.paidAt)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{methodLabel(p.method)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
