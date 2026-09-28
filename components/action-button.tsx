"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type State = { error?: string; success?: string };

export function ActionButton({
  action,
  children,
  className,
  confirmMessage,
  disabled,
}: {
  action: () => Promise<State>;
  children: React.ReactNode;
  className?: string;
  confirmMessage?: string;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending || disabled}
      className={cn(className)}
      onClick={() => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        start(async () => {
          try {
            const res = await action();
            if (res?.error) toast.error(res.error);
            else if (res?.success) toast.success(res.success);
          } catch {
            toast.error("Something went wrong.");
          }
        });
      }}
    >
      {pending ? "Working..." : children}
    </button>
  );
}
