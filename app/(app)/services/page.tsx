import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { php } from "@/lib/money";
import { PageHeader, EmptyState } from "@/components/bits";
import { ServiceDialog } from "@/components/services/service-dialog";
import { ActionButton } from "@/components/action-button";
import { toggleService } from "@/app/actions/services";

export const dynamic = "force-dynamic";

const TYPE_LABEL = { PER_KG: "Per kg", PER_ITEM: "Per item", FIXED: "Fixed" } as const;

export default async function ServicesPage() {
  await requireOwner();
  const services = await db.service.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <div>
      <PageHeader
        title="Services & Pricing"
        description="Staff pick these when creating orders. Prices are locked for staff — only the owner can change them."
      >
        <ServiceDialog />
      </PageHeader>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Service</th>
                <th className="px-4 py-2.5 font-medium">Pricing</th>
                <th className="px-4 py-2.5 font-medium text-right">Price</th>
                <th className="hidden sm:table-cell px-4 py-2.5 font-medium text-right">Min</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="No services yet" hint="Add your laundry services and prices to start taking orders." />
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id} className={`hover:bg-muted/40 ${s.active ? "" : "opacity-60"}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.name}</p>
                      {s.description ? <p className="text-xs text-muted-foreground">{s.description}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{TYPE_LABEL[s.pricingType]}</td>
                    <td className="px-4 py-3 text-right font-medium">{php(s.price)}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-right text-muted-foreground">
                      {Number(s.minQuantity)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {s.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <ServiceDialog
                          service={{
                            id: s.id,
                            name: s.name,
                            description: s.description,
                            pricingType: s.pricingType,
                            price: Number(s.price),
                            minQuantity: Number(s.minQuantity),
                            active: s.active,
                          }}
                        />
                        <ActionButton
                          action={toggleService.bind(null, s.id)}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          {s.active ? "Deactivate" : "Activate"}
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
