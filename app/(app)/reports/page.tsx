import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { php, num, formatDateTime } from "@/lib/money";
import { resolveRange, RANGE_OPTIONS, rangeQuery } from "@/lib/range";
import { PageHeader, EmptyState, StatCard, StatusBadge, methodLabel } from "@/components/bits";
import { FilterBar, fieldClass } from "@/components/filters";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; tab?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const range = resolveRange(sp);
  const rangeWhere = rangeQuery(range);
  const qs = new URLSearchParams({ range: sp.range ?? "today", ...(sp.from ? { from: sp.from } : {}), ...(sp.to ? { to: sp.to } : {}) });

  const [ordersAgg, collectedAgg, expensesAgg, byService, byMethod, byStatus, byStaff, outstanding, byCategory, cancelledCount] =
    await Promise.all([
      db.order.aggregate({
        where: { receivedAt: rangeWhere, status: { not: "CANCELLED" } },
        _sum: { total: true, discount: true, paidAmount: true },
        _count: true,
      }),
      db.payment.aggregate({ where: { paidAt: rangeWhere, voidedAt: null }, _sum: { amount: true } }),
      db.expense.aggregate({ where: { spentAt: rangeWhere }, _sum: { amount: true } }),
      db.orderItem.groupBy({
        by: ["serviceName"],
        where: { order: { receivedAt: rangeWhere, status: { not: "CANCELLED" } } },
        _sum: { subtotal: true },
        _count: true,
        orderBy: { _sum: { subtotal: "desc" } },
      }),
      db.payment.groupBy({
        by: ["method"],
        where: { paidAt: rangeWhere, voidedAt: null },
        _sum: { amount: true },
        _count: true,
      }),
      db.order.groupBy({ by: ["status"], where: { receivedAt: rangeWhere }, _count: true }),
      db.order.groupBy({
        by: ["createdById"],
        where: { receivedAt: rangeWhere, status: { not: "CANCELLED" } },
        _sum: { total: true },
        _count: true,
      }),
      db.order.findMany({
        where: { paymentStatus: { not: "PAID" }, status: { notIn: ["CANCELLED"] } },
        orderBy: { receivedAt: "asc" },
        take: 50,
        include: { customer: { select: { name: true, phone: true } } },
      }),
      db.expense.groupBy({ by: ["category"], where: { spentAt: rangeWhere }, _sum: { amount: true } }),
      db.order.count({ where: { receivedAt: rangeWhere, status: "CANCELLED" } }),
    ]);

  const staff = await db.user.findMany({ select: { id: true, name: true } });
  const staffMap = new Map(staff.map((s) => [s.id, s.name]));

  const gross = num(ordersAgg._sum.total);
  const discounts = num(ordersAgg._sum.discount);
  const collected = num(collectedAgg._sum.amount);
  const expenses = num(expensesAgg._sum.amount);
  const outstandingTotal = outstanding.reduce((s, o) => s + Math.max(num(o.total) - num(o.paidAmount), 0), 0);

  const exportHref = `/api/export?${qs.toString()}`;

  return (
    <div>
      <PageHeader title="Reports" description={range.label}>
        <a
          href={exportHref}
          className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          Export CSV (orders)
        </a>
      </PageHeader>

      <FilterBar>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Period</label>
          <select name="range" defaultValue={sp.range ?? "today"} className={fieldClass("w-40")}>
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {sp.range === "custom" ? (
          <>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <input type="date" name="from" defaultValue={sp.from ?? ""} className={fieldClass("w-38")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <input type="date" name="to" defaultValue={sp.to ?? ""} className={fieldClass("w-38")} />
            </div>
          </>
        ) : null}
      </FilterBar>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Gross sales" value={php(gross)} hint={`${ordersAgg._count} orders`} />
        <StatCard label="Discounts" value={php(discounts)} />
        <StatCard label="Collected" value={php(collected)} hint="Cash-basis payments" tone="positive" />
        <StatCard label="Outstanding" value={php(outstandingTotal)} tone={outstandingTotal > 0 ? "negative" : "default"} />
        <StatCard label="Expenses" value={php(expenses)} />
        <StatCard
          label="Operating estimate"
          value={php(gross - expenses)}
          hint="Gross − expenses"
          tone={gross - expenses >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Sales by service</h2>
            <span className="text-xs text-muted-foreground">Accrual basis</span>
          </div>
          <ul className="divide-y text-sm">
            {byService.length === 0 ? (
              <li className="px-4 py-4"><EmptyState title="No sales in period" /></li>
            ) : (
              byService.map((s) => (
                <li key={s.serviceName} className="flex justify-between px-4 py-2.5">
                  <span>
                    {s.serviceName} <span className="text-xs text-muted-foreground">({s._count})</span>
                  </span>
                  <span className="font-medium">{php(s._sum.subtotal)}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Sales by payment method</h2>
            <span className="text-xs text-muted-foreground">Collected</span>
          </div>
          <ul className="divide-y text-sm">
            {byMethod.length === 0 ? (
              <li className="px-4 py-4"><EmptyState title="No payments in period" /></li>
            ) : (
              byMethod.map((m) => (
                <li key={m.method} className="flex justify-between px-4 py-2.5">
                  <span>
                    {methodLabel(m.method)} <span className="text-xs text-muted-foreground">({m._count})</span>
                  </span>
                  <span className="font-medium">{php(m._sum.amount)}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Orders by status</h2>
          </div>
          <ul className="divide-y text-sm">
            {byStatus.length === 0 ? (
              <li className="px-4 py-4"><EmptyState title="No orders in period" /></li>
            ) : (
              byStatus.map((s) => (
                <li key={s.status} className="flex items-center justify-between px-4 py-2.5">
                  <StatusBadge status={s.status} />
                  <span className="font-medium">{s._count}</span>
                </li>
              ))
            )}
            <li className="flex justify-between px-4 py-2.5 text-muted-foreground">
              <span>Cancelled (excluded from sales)</span>
              <span>{cancelledCount}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Sales by staff (orders created)</h2>
          </div>
          <ul className="divide-y text-sm">
            {byStaff.length === 0 ? (
              <li className="px-4 py-4"><EmptyState title="No orders in period" /></li>
            ) : (
              byStaff.map((s) => (
                <li key={s.createdById} className="flex justify-between px-4 py-2.5">
                  <span>
                    {staffMap.get(s.createdById) ?? "Unknown"}{" "}
                    <span className="text-xs text-muted-foreground">({s._count} orders)</span>
                  </span>
                  <span className="font-medium">{php(s._sum.total)}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Expenses by category</h2>
          </div>
          <ul className="divide-y text-sm">
            {byCategory.length === 0 ? (
              <li className="px-4 py-4"><EmptyState title="No expenses in period" /></li>
            ) : (
              byCategory.map((c) => (
                <li key={c.category} className="flex justify-between px-4 py-2.5">
                  <span>{EXPENSE_CATEGORY_LABEL[c.category]}</span>
                  <span className="font-medium">{php(c._sum.amount)}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Outstanding balances</h2>
            <span className="text-xs text-muted-foreground">{php(outstandingTotal)}</span>
          </div>
          <ul className="divide-y text-sm">
            {outstanding.length === 0 ? (
              <li className="px-4 py-4"><EmptyState title="No unpaid balances" /></li>
            ) : (
              outstanding.map((o) => (
                <li key={o.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                      {o.orderNo}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {o.customer.name} · {o.customer.phone} · {formatDateTime(o.receivedAt)}
                    </p>
                  </div>
                  <span className="font-medium text-red-600">{php(num(o.total) - num(o.paidAmount))}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Gross sales = order totals (accrual, cancelled excluded). Collected = payments recorded in period. Operating
        estimate = gross sales − expenses; not a full accounting statement.
      </p>
    </div>
  );
}
