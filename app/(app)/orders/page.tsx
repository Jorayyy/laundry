import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { php } from "@/lib/money";
import { StatusBadge, PaymentBadge, PageHeader, EmptyState } from "@/components/bits";
import { Pagination, FilterBar, fieldClass } from "@/components/filters";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string; q?: string; from?: string; to?: string; page?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const page = Math.max(Number(sp.page) || 1, 1);
  const status = ORDER_STATUSES.includes(sp.status as never) ? sp.status : undefined;
  const payment = ["UNPAID", "PARTIAL", "PAID"].includes(sp.payment ?? "") ? sp.payment : undefined;
  const q = sp.q?.trim();

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(payment ? { paymentStatus: payment as never } : {}),
    ...(sp.from || sp.to
      ? {
          receivedAt: {
            ...(sp.from ? { gte: new Date(sp.from) } : {}),
            ...(sp.to ? { lte: new Date(new Date(sp.to).setHours(23, 59, 59, 999)) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { orderNo: { contains: q, mode: "insensitive" as const } },
            { customer: { name: { contains: q, mode: "insensitive" as const } } },
            { customer: { phone: { contains: q } } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: { select: { name: true, phone: true } },
        items: { select: { serviceName: true } },
        _count: { select: { payments: true } },
      },
    }),
    db.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const params = { status: sp.status, payment: sp.payment, q: sp.q, from: sp.from, to: sp.to };

  return (
    <div>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"} found`}>
        <Link
          href="/orders/new"
          className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Order
        </Link>
      </PageHeader>

      <FilterBar>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Search</label>
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Order no., name, phone" className={fieldClass("w-52")} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <select name="status" defaultValue={sp.status ?? ""} className={fieldClass("w-40")}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Payment</label>
          <select name="payment" defaultValue={sp.payment ?? ""} className={fieldClass("w-32")}>
            <option value="">All</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className={fieldClass("w-38")} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className={fieldClass("w-38")} />
        </div>
      </FilterBar>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Order</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="hidden sm:table-cell px-4 py-2.5 font-medium">Received</th>
                <th className="hidden md:table-cell px-4 py-2.5 font-medium">Items</th>
                <th className="px-4 py-2.5 font-medium text-right">Total</th>
                <th className="hidden sm:table-cell px-4 py-2.5 font-medium text-right">Balance</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No orders found" hint="Try changing filters or create a new order." />
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const balance = Number(o.total) - Number(o.paidAmount);
                  return (
                    <tr key={o.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                          {o.orderNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate max-w-40">{o.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{o.customer.phone}</p>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {o.receivedAt.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                        <span className="ml-1.5 text-xs">
                          {o.receivedAt.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-muted-foreground max-w-44 truncate">
                        {o.items.map((i) => i.serviceName).join(", ")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{php(o.total)}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-right whitespace-nowrap">
                        <span className={balance > 0.001 ? "text-red-600 font-medium" : "text-muted-foreground"}>
                          {php(balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={o.status} />
                          <PaymentBadge status={o.paymentStatus} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} basePath="/orders" params={params} />
      </div>
    </div>
  );
}
