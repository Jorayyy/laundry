"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";

type State = { error?: string; success?: string };

export function ActionForm({
  action,
  onSuccess,
  children,
  className,
  id,
  submitLabel,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  onSuccess?: () => void;
  children: React.ReactNode;
  className?: string;
  id?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const successRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.success && state.success !== successRef.current) {
      successRef.current = state.success;
      toast.success(state.success);
      onSuccess?.();
    }
    if (state.error) toast.error(state.error);
  }, [state, onSuccess]);

  return (
    <form id={id} action={formAction} className={className}>
      {children}
      {state.error ? <p className="text-sm text-destructive mt-3">{state.error}</p> : null}
      {submitLabel ? (
        <div className="mt-5 flex justify-end">
          <SubmitButton label={submitLabel} />
        </div>
      ) : null}
    </form>
  );
}
