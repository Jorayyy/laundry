import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { resolveRange } from "@/lib/range";

function esc(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const range = resolveRange({
    range: url.searchParams.get("range") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const orders = await db.order.findMany({
    where: { receivedAt: { gte: range.from, lte: range.to } },
    orderBy: { receivedAt: "asc" },
    include: {
      customer: { select: { name: true, phone: true } },
      items: { select: { serviceName: true } },
      createdBy: { select: { name: true } },
    },
  });

  const header = [
    "Order No",
    "Date Received",
    "Customer",
    "Phone",
    "Services",
    "Status",
    "Payment Status",
    "Subtotal",
    "Discount",
    "Total",
    "Paid",
    "Balance",
    "Created By",
  ];

  const rows = orders.map((o) => [
    o.orderNo,
    o.receivedAt.toISOString(),
    o.customer.name,
    o.customer.phone,
    o.items.map((i) => i.serviceName).join(" | "),
    o.status,
    o.paymentStatus,
    Number(o.subtotal).toFixed(2),
    Number(o.discount).toFixed(2),
    Number(o.total).toFixed(2),
    Number(o.paidAmount).toFixed(2),
    (Number(o.total) - Number(o.paidAmount)).toFixed(2),
    o.createdBy.name,
  ]);

  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const filename = `orders-${range.from.toISOString().slice(0, 10)}-to-${range.to.toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
