import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { php, num, formatDateTime } from "@/lib/money";
import { PageHeader, EmptyState, StatCard, methodLabel } from "@/components/bits";
import { Pagination, FilterBar, fieldClass } from "@/components/filters";
import { PaymentBadge } from "@/components/bits";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; method?: string; page?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const page = Math.max(Number(sp.page) || 1, 1);

  const paidAt = {
    ...(sp.from ? { gte: new Date(sp.from) } : {}),
    ...(sp.to ? { lte: new Date(new Date(sp.to).setHours(23, 59, 59, 999)) } : {}),
  };

  const where = {
    ...(Object.keys(paidAt).length ? { paidAt } : {}),
    ...(sp.method ? { method: sp.method as never } : {}),
  };

  const [payments, total, collected, unpaidOrders] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        order: { select: { orderNo: true, total: true, paidAmount: true, paymentStatus: true } },
        createdBy: { select: { name: true } },
      },
    }),
    db.payment.count({ where }),
    db.payment.aggregate({ where: { ...where, voidedAt: null }, _sum: { amount: true } }),
    db.order.findMany({
      where: { paymentStatus: { not: "PAID" }, status: { notIn: ["CANCELLED", "COMPLETED"] } },
      orderBy: { receivedAt: "asc" },
      take: 8,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Payment ledger — transactions are never overwritten; void instead."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Collected in filter" value={php(num(collected._sum.amount))} />
        <StatCard label="Transactions" value={total} />
        <StatCard label="Unpaid orders" value={unpaidOrders.length} tone={unpaidOrders.length ? "negative" : "default"} />
        <StatCard label="Note" value="Void, don't delete" hint="Voided payments stay in the ledger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FilterBar>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <input type="date" name="from" defaultValue={sp.from ?? ""} className={fieldClass("w-38")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <input type="date" name="to" defaultValue={sp.to ?? ""} className={fieldClass("w-38")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Method</label>
              <select name="method" defaultValue={sp.method ?? ""} className={fieldClass("w-40")}>
                <option value="">All methods</option>
                <option value="CASH">Cash</option>
                <option value="GCASH">GCash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </FilterBar>

          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Order</th>
                    <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                    <th className="px-4 py-2.5 font-medium">Method</th>
                    <th className="hidden sm:table-cell px-4 py-2.5 font-medium">Received by</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState title="No payments found" />
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className={`hover:bg-muted/40 ${p.voidedAt ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(p.paidAt)}</td>
                        <td className="px-4 py-3">
                          <Link href={`/orders/${p.orderId}`} className="font-medium hover:underline">
                            {p.order.orderNo}
                          </Link>
                          {p.reference ? <p className="text-xs text-muted-foreground">Ref: {p.reference}</p> : null}
                        </td>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                          {p.voidedAt ? <s className="text-muted-foreground">{php(p.amount)}</s> : php(p.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{methodLabel(p.method)}</span>
                          {p.voidedAt ? (
                            <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">VOIDED</span>
                          ) : null}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">{p.createdBy.name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} basePath="/payments" params={{ from: sp.from, to: sp.to, method: sp.method }} />
          </div>
        </div>

        <div className="rounded-lg border bg-card h-fit">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Orders awaiting payment</h2>
          </div>
          <ul className="divide-y text-sm">
            {unpaidOrders.length === 0 ? (
              <li className="px-4 py-4 text-muted-foreground">Nothing outstanding. </li>
            ) : (
              unpaidOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                      {o.orderNo}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.customer.name} · {php(num(o.total) - num(o.paidAmount))} due
                    </p>
                  </div>
                  <PaymentBadge status={o.paymentStatus} />
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
