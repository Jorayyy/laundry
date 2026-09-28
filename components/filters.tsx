import Link from "next/link";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    qs.set("page", String(p));
    return `${basePath}?${qs.toString()}`;
  };

  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="rounded-md border px-3 py-1 hover:bg-accent">
            Previous
          </Link>
        ) : (
          <span className="rounded-md border px-3 py-1 opacity-40">Previous</span>
        )}
        {page < totalPages ? (
          <Link href={href(page + 1)} className="rounded-md border px-3 py-1 hover:bg-accent">
            Next
          </Link>
        ) : (
          <span className="rounded-md border px-3 py-1 opacity-40">Next</span>
        )}
      </div>
    </div>
  );
}

export function FilterBar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <form method="GET" className="mb-4 flex flex-wrap items-end gap-2">
      {children}
      <button className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Filter
      </button>
    </form>
  );
}

export function fieldClass(extra?: string) {
  return cn(
    "h-9 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    extra
  );
}
