import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { php, num, formatDate } from "@/lib/money";
import { resolveRange, RANGE_OPTIONS, rangeQuery } from "@/lib/range";
import { PageHeader, EmptyState, StatCard, methodLabel } from "@/components/bits";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { FilterBar, fieldClass } from "@/components/filters";
import { ActionButton } from "@/components/action-button";
import { deleteExpense } from "@/app/actions/expenses";
import { EXPENSE_CATEGORY_LABEL, EXPENSE_CATEGORIES } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; category?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const range = resolveRange(sp);
  const where = {
    spentAt: rangeQuery(range),
    ...(EXPENSE_CATEGORIES.includes(sp.category as never) ? { category: sp.category as never } : {}),
  };

  const [expenses, byCategory] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: { spentAt: "desc" },
      take: 200,
      include: { createdBy: { select: { name: true } } },
    }),
    db.expense.groupBy({ by: ["category"], where, _sum: { amount: true } }),
  ]);

  const total = expenses.reduce((s, e) => s + num(e.amount), 0);
  const maxCat = Math.max(...byCategory.map((c) => num(c._sum.amount)), 1);
  const sorted = [...byCategory].sort((a, b) => num(b._sum.amount) - num(a._sum.amount));

  return (
    <div>
      <PageHeader title="Expenses" description={range.label}>
        <ExpenseDialog />
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total expenses" value={php(total)} hint={`${expenses.length} records`} />
        {sorted.slice(0, 3).map((c) => (
          <StatCard key={c.category} label={EXPENSE_CATEGORY_LABEL[c.category] ?? c.category} value={php(c._sum.amount)} />
        ))}
      </div>

      <FilterBar>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Period</label>
          <select name="range" defaultValue={sp.range ?? "month"} className={fieldClass("w-40")}>
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Category</label>
          <select name="category" defaultValue={sp.category ?? ""} className={fieldClass("w-44")}>
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        {sp.range === "custom" || !sp.range ? (
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card overflow-hidden lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="hidden sm:table-cell px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState title="No expenses in this period" hint="Track spending to estimate operating profit." />
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(e.spentAt)}</td>
                      <td className="px-4 py-3">{EXPENSE_CATEGORY_LABEL[e.category]}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground max-w-56 truncate">
                        {e.description || e.notes || e.reference || "—"}
                        <span className="block text-xs">{methodLabel(e.method)}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{php(e.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <ActionButton
                          action={deleteExpense.bind(null, e.id)}
                          confirmMessage="Delete this expense?"
                          className="text-xs text-destructive hover:underline"
                        >
                          Delete
                        </ActionButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border bg-card h-fit">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">By category</h2>
          </div>
          <div className="space-y-3 p-4">
            {sorted.length === 0 ? (
              <EmptyState title="No data" />
            ) : (
              sorted.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-sm">
                    <span>{EXPENSE_CATEGORY_LABEL[c.category]}</span>
                    <span className="font-medium">{php(c._sum.amount)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-muted">
                    <div className="h-1.5 rounded bg-primary" style={{ width: `${(num(c._sum.amount) / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
