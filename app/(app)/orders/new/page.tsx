import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/bits";
import { OrderForm } from "@/components/orders/order-form";
import type { PricingType } from "@/lib/calc";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const user = await requireUser();

  const [customers, services] = await Promise.all([
    db.customer.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    db.service.findMany({
      where: { active: true },
      select: { id: true, name: true, pricingType: true, price: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="New Order" description="Create a laundry order and calculate the total automatically." />
      <OrderForm
        customers={customers}
        services={services.map((s) => ({ ...s, price: Number(s.price), pricingType: s.pricingType as PricingType }))}
        isOwner={user.role === "OWNER"}
      />
      {customers.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No customers yet — add one with the button above.</p>
      ) : null}
    </div>
  );
}
