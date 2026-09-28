"use client";

import { saveSettings } from "@/app/actions/settings";
import { ActionForm } from "@/components/action-form";

type Settings = {
  businessName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  currency: string;
  orderPrefix: string;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
} | null;

export function SettingsForm({ settings }: { settings: Settings }) {
  return (
    <ActionForm action={saveSettings} submitLabel="Save settings" className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Business name *</label>
        <input name="businessName" required defaultValue={settings?.businessName ?? "My Laundry Shop"} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Address</label>
        <input name="address" defaultValue={settings?.address ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Phone</label>
          <input name="phone" defaultValue={settings?.phone ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <input name="email" type="email" defaultValue={settings?.email ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Currency</label>
          <input name="currency" defaultValue={settings?.currency ?? "PHP"} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Order number prefix</label>
          <input name="orderPrefix" defaultValue={settings?.orderPrefix ?? "LD"} placeholder="LD" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm uppercase" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Receipt header</label>
        <input name="receiptHeader" defaultValue={settings?.receiptHeader ?? ""} placeholder="Tagline printed above the order no." className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Receipt footer / pickup instructions</label>
        <textarea name="receiptFooter" rows={3} defaultValue={settings?.receiptFooter ?? ""} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
      </div>
      <p className="text-xs text-muted-foreground">
        Logo upload and custom laundry statuses are not implemented yet — order numbering and receipt text are fully
        configurable.
      </p>
    </ActionForm>
  );
}
