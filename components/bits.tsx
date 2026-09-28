import { cn } from "@/lib/utils";
import { STATUS_BADGE, STATUS_LABEL, PAYMENT_BADGE, PAYMENT_METHOD_LABEL, type OrderStatus } from "@/lib/labels";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_BADGE[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        PAYMENT_BADGE[status] ?? "bg-gray-100 text-gray-700"
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function methodLabel(m: string | null | undefined) {
  return m ? PAYMENT_METHOD_LABEL[m] ?? m : "—";
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground mt-1">{description}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-12 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      {hint ? <p className="mt-1">{hint}</p> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tracking-tight",
          tone === "positive" && "text-emerald-600",
          tone === "negative" && "text-red-600"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
