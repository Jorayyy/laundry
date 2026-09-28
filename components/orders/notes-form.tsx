"use client";

import { updateOrderNotes } from "@/app/actions/orders";
import { ActionForm } from "@/components/action-form";

export function NotesForm({ id, notes, internalNotes }: { id: string; notes: string; internalNotes: string }) {
  return (
    <ActionForm action={updateOrderNotes} submitLabel="Save notes" className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Customer notes</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={notes}
          placeholder="Shown on the claim stub"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Internal notes</label>
        <textarea
          name="internalNotes"
          rows={2}
          defaultValue={internalNotes}
          placeholder="Staff only"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>
    </ActionForm>
  );
}
