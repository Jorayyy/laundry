import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { php, num, formatDate } from "@/lib/money";
import { PageHeader, EmptyState } from "@/components/bits";
import { Pagination, FilterBar, fieldClass } from "@/components/filters";
import { CustomerDialog } from "@/components/customers/customer-dialog";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; new?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const page = Math.max(Number(sp.page) || 1, 1);
  const q = sp.q?.trim();

  const where = q
    ? {
        archivedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : { archivedAt: null };

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        orders: {
          select: { total: true, paidAmount: true, paymentStatus: true, receivedAt: true, status: true },
        },
      },
    }),
    db.customer.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Customers" description={`${total} active customer${total === 1 ? "" : "s"}`}>
        <CustomerDialog />
      </PageHeader>

      <FilterBar>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Search</label>
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Name, phone, email" className={fieldClass("w-64")} />
        </div>
      </FilterBar>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="hidden sm:table-cell px-4 py-2.5 font-medium">Contact</th>
                <th className="px-4 py-2.5 font-medium text-right">Orders</th>
                <th className="hidden md:table-cell px-4 py-2.5 font-medium text-right">Total spent</th>
                <th className="px-4 py-2.5 font-medium text-right">Balance</th>
                <th className="hidden md:table-cell px-4 py-2.5 font-medium">Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="No customers found" hint="Add your first customer to start taking orders." />
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const spent = c.orders
                    .filter((o) => o.status !== "CANCELLED")
                    .reduce((s, o) => s + num(o.total), 0);
                  const balance = c.orders
                    .filter((o) => o.status !== "CANCELLED" && o.paymentStatus !== "PAID")
                    .reduce((s, o) => s + (num(o.total) - num(o.paidAmount)), 0);
                  const lastOrder = c.orders.reduce<Date | null>(
                    (latest, o) => (!latest || o.receivedAt > latest ? o.receivedAt : latest),
                    null
                  );
                  return (
                    <tr key={c.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link href={`/customers/${c.id}`} className="font-medium hover:underline">
                          {c.name}
                        </Link>
                        {c.notes ? <p className="text-xs text-muted-foreground truncate max-w-52">{c.notes}</p> : null}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">
                        <p>{c.phone}</p>
                        {c.email ? <p className="text-xs">{c.email}</p> : null}
                      </td>
                      <td className="px-4 py-3 text-right">{c.orders.length}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-right">{php(spent)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={balance > 0.001 ? "font-medium text-red-600" : "text-muted-foreground"}>
                          {php(balance)}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{formatDate(lastOrder)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} basePath="/customers" params={{ q: sp.q }} />
      </div>
    </div>
  );
}
