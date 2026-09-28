import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { php, num, formatDateTime } from "@/lib/money";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      payments: { where: { voidedAt: null }, orderBy: { paidAt: "asc" } },
      createdBy: { select: { name: true } },
    },
  });
  const settings = await db.settings.findUnique({ where: { id: "single" } });
  if (!order) notFound();

  const total = num(order.total);
  const paid = num(order.paidAmount);
  const balance = Math.max(total - paid, 0);
  const methods = [...new Set(order.payments.map((p) => p.method))].join(", ");

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/orders/${order.id}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to order
        </Link>
        <PrintButton />
      </div>

      <div className="border bg-white p-5 text-black shadow-sm print:border-0 print:shadow-none">
        <div className="text-center">
          {settings?.businessName ? <h1 className="text-lg font-bold">{settings.businessName}</h1> : null}
          {settings?.address ? <p className="text-xs">{settings.address}</p> : null}
          <p className="text-xs">{[settings?.phone, settings?.email].filter(Boolean).join(" · ")}</p>
          {settings?.receiptHeader ? <p className="mt-1 text-xs italic">{settings.receiptHeader}</p> : null}
        </div>

        <div className="my-3 border-t border-dashed" />

        <div className="text-center">
          <p className="text-xs uppercase tracking-widest">Claim Stub / Reference</p>
          <p className="text-2xl font-bold tracking-wider">{order.orderNo}</p>
        </div>

        <div className="my-3 border-t border-dashed" />

        <dl className="space-y-1 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600">Customer</dt>
            <dd className="text-right font-medium">{order.customer.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600">Phone</dt>
            <dd className="text-right">{order.customer.phone}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600">Date received</dt>
            <dd className="text-right">{formatDateTime(order.receivedAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600">Expected pickup</dt>
            <dd className="text-right">{order.dueAt ? formatDateTime(order.dueAt) : "To be advised"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-600">Status</dt>
            <dd className="text-right font-medium">{order.status.replace(/_/g, " ")}</dd>
          </div>
        </dl>

        <div className="my-3 border-t border-dashed" />

        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="pb-1 font-medium">Service</th>
              <th className="pb-1 text-right font-medium">Qty</th>
              <th className="pb-1 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-1.5">{item.serviceName}</td>
                <td className="py-1.5 text-right">
                  {item.pricingType === "PER_KG" ? `${num(item.quantity)} kg` : num(item.quantity)}
                </td>
                <td className="py-1.5 text-right">{php(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-3 border-t border-dashed" />

        <dl className="space-y-1 text-xs">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{php(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Discount</dt>
            <dd>−{php(order.discount)}</dd>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <dt>Total</dt>
            <dd>{php(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Paid</dt>
            <dd>{php(paid)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Balance</dt>
            <dd>{php(balance)}</dd>
          </div>
          {methods ? (
            <div className="flex justify-between">
              <dt>Payment method</dt>
              <dd>{methods}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Received by</dt>
            <dd>{order.createdBy.name}</dd>
          </div>
        </dl>

        {order.notes ? (
          <>
            <div className="my-3 border-t border-dashed" />
            <p className="text-xs">
              <span className="font-semibold">Notes:</span> {order.notes}
            </p>
          </>
        ) : null}

        <div className="my-3 border-t border-dashed" />

        <p className="text-center text-[11px] leading-snug text-gray-700">
          {settings?.receiptFooter ?? "Thank you! Present this stub upon claiming."}
        </p>
        <p className="mt-2 text-center text-[10px] text-gray-500">
          Keep this stub. Reference: {order.orderNo}
        </p>
      </div>
    </div>
  );
}
