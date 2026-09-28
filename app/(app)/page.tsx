import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolveRange, RANGE_OPTIONS } from "@/lib/range";
import { php, num, formatDateTime } from "@/lib/money";
import { PageHeader, StatCard, StatusBadge, EmptyState } from "@/components/bits";
import { PlusCircle, UserPlus, Wallet, ReceiptText, PackageCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const range = resolveRange({ range: params.range });
  const where = { gte: range.from, lte: range.to };

  const [grossAgg, collectedAgg, expenseAgg, statusGroups, unpaidCount, readyCount, customerCount, yesterdayCollected] =
    await Promise.all([
      db.order.aggregate({
        where: { receivedAt: where, status: { not: "CANCELLED" } },
        _sum: { total: true },
        _count: true,
      }),
      db.payment.aggregate({ where: { paidAt: where, voidedAt: null }, _sum: { amount: true } }),
      db.expense.aggregate({ where: { spentAt: where }, _sum: { amount: true } }),
      db.order.groupBy({ by: ["status"], where: { receivedAt: where }, _count: true }),
      db.order.count({ where: { paymentStatus: { not: "PAID" }, status: { notIn: ["CANCELLED"] } } }),
      db.order.count({ where: { status: "READY_FOR_PICKUP" } }),
      db.customer.count({ where: { archivedAt: null } }),
      db.payment.aggregate({
        where: {
          voidedAt: null,
          paidAt: { gte: new Date(range.from.getTime() - 86400000), lte: new Date(range.to.getTime() - 86400000) },
        },
        _sum: { amount: true },
      }),
    ]);

  const gross = num(grossAgg._sum.total);
  const collected = num(collectedAgg._sum.amount);
  const expenses = num(expenseAgg._sum.amount);
  const yesterday = num(yesterdayCollected._sum.amount);
  const delta = collected - yesterday;
  const orderCount = grossAgg._count;

  const [recentOrders, sales14, topServices, methodGroups, statusTotals] = await Promise.all([
    db.order.findMany({
      orderBy: { receivedAt: "desc" },
      take: 6,
      include: { customer: { select: { name: true } } },
    }),
    db.payment.findMany({
      where: { voidedAt: null, paidAt: { gte: new Date(range.to.getTime() - 13 * 86400000), lte: range.to } },
      select: { amount: true, paidAt: true },
    }),
    db.orderItem.groupBy({
      by: ["serviceName"],
      where: { order: { receivedAt: { gte: new Date(range.to.getTime() - 29 * 86400000), lte: range.to }, status: { not: "CANCELLED" } } },
      _sum: { subtotal: true },
      _count: true,
      orderBy: { _sum: { subtotal: "desc" } },
      take: 5,
    }),
    db.payment.groupBy({
      by: ["method"],
      where: { paidAt: where, voidedAt: null },
      _sum: { amount: true },
      _count: true,
    }),
    Promise.resolve(statusGroups.map((g) => ({ status: g.status, count: g._count }))),
  ]);

  const buckets: { day: string; total: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(range.to.getTime() - i * 86400000);
    buckets.push({
      day: d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
      total: 0,
    });
  }
  for (const p of sales14) {
    const key = p.paidAt.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    const b = buckets.find((x) => x.day === key);
    if (b) b.total += num(p.amount);
  }
  const maxBucket = Math.max(...buckets.map((b) => b.total), 1);
  const maxTop = Math.max(...topServices.map((t) => num(t._sum.subtotal)), 1);

  const quick = [
    { href: "/orders/new", label: "New Order", icon: PlusCircle },
    { href: "/customers?new=1", label: "New Customer", icon: UserPlus },
    { href: "/payments", label: "Record Payment", icon: Wallet },
    { href: "/expenses?new=1", label: "Add Expense", icon: ReceiptText },
    { href: "/orders?status=READY_FOR_PICKUP", label: "Ready Orders", icon: PackageCheck },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description={range.label}>
        <form method="GET" className="flex items-center gap-2">
          <select
            name="range"
            defaultValue={params.range ?? "today"}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="h-9 rounded-md border px-3 text-sm font-medium hover:bg-accent">Apply</button>
        </form>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Collected" value={php(collected)} hint={`${delta >= 0 ? "+" : ""}${php(delta)} vs prev period`} tone={delta >= 0 ? "positive" : "negative"} />
        <StatCard label="Gross Sales" value={php(gross)} hint={`${orderCount} orders`} />
        <StatCard label="Expenses" value={php(expenses)} hint="Recorded this period" />
        <StatCard label="Operating Estimate" value={php(gross - expenses)} hint="Gross sales − expenses" tone={gross - expenses >= 0 ? "positive" : "negative"} />
        <StatCard label="Ready for Pickup" value={readyCount} />
        <StatCard label="Unpaid Orders" value={unpaidCount} tone={unpaidCount > 0 ? "negative" : "default"} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quick.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <q.icon className="h-4 w-4" />
            {q.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Daily Collections (14 days)</h2>
            <span className="text-xs text-muted-foreground">Peak {php(maxBucket)}</span>
          </div>
          <div className="flex h-40 items-end gap-1.5">
            {buckets.map((b) => (
              <div key={b.day} className="group relative flex-1">
                <div
                  className="w-full rounded-t bg-primary/80 hover:bg-primary"
                  style={{ height: `${Math.max((b.total / maxBucket) * 150, 3)}px` }}
                />
                <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
                  {php(b.total)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{buckets[0].day}</span>
            <span>{buckets[buckets.length - 1].day}</span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Orders by Status</h2>
          {statusTotals.length === 0 ? (
            <EmptyState title="No orders yet" hint="Create your first order to get started." />
          ) : (
            <div className="space-y-2">
              {statusTotals.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <StatusBadge status={s.status} />
                  <span className="font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Top Services (30 days)</h2>
          {topServices.length === 0 ? (
            <EmptyState title="No service sales yet" />
          ) : (
            <div className="space-y-3">
              {topServices.map((t) => (
                <div key={t.serviceName}>
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{t.serviceName}</span>
                    <span className="font-medium">{php(t._sum.subtotal)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-muted">
                    <div className="h-1.5 rounded bg-primary" style={{ width: `${(num(t._sum.subtotal) / maxTop) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Payment Methods</h2>
          {methodGroups.length === 0 ? (
            <EmptyState title="No payments in range" />
          ) : (
            <div className="space-y-2 text-sm">
              {methodGroups.map((m) => (
                <div key={m.method} className="flex justify-between">
                  <span>{m.method.replace("_", " ").toLowerCase()}</span>
                  <span className="font-medium">{php(m._sum.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Orders</h2>
            <Link href="/orders" className="text-xs text-muted-foreground hover:underline">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{o.orderNo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {o.customer.name} · {formatDateTime(o.receivedAt)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Customer count: <span className="font-medium text-foreground">{customerCount}</span> · Operating estimate is
        operational, not an accounting figure.
      </p>
    </div>
  );
}
