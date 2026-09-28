"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm } from "@/components/action-form";
import { ActionButton } from "@/components/action-button";
import { createUser, toggleUser, resetPassword } from "@/app/actions/settings";
import { formatDate } from "@/lib/money";
import type { Role } from "@prisma/client";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: Date;
};

export function UsersPanel({ users }: { users: User[] }) {
  const [open, setOpen] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Staff accounts</h2>
          <p className="text-xs text-muted-foreground">Owners get full access. Staff can take orders and payments.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              + New account
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create account</DialogTitle>
            </DialogHeader>
            <ActionForm
              action={createUser}
              submitLabel="Create account"
              onSuccess={() => {
                setOpen(false);
                router.refresh();
              }}
              className="space-y-3"
            >
              <input name="name" required placeholder="Full name" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
              <input name="email" type="email" required placeholder="Email" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
              <select name="role" className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm">
                <option value="STAFF">Staff</option>
                <option value="OWNER">Owner / Admin</option>
              </select>
              <input name="password" type="password" required minLength={8} placeholder="Password (min 8 chars)" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
            </ActionForm>
          </DialogContent>
        </Dialog>
      </div>

      <ul className="divide-y text-sm">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">
                {u.name}{" "}
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    u.role === "OWNER" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {u.role}
                </span>
                {!u.active ? (
                  <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-600">Inactive</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {u.email} · joined {formatDate(u.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setResetId(resetId === u.id ? null : u.id)}
                className="text-xs text-muted-foreground hover:underline"
              >
                Reset password
              </button>
              <ActionButton
                action={toggleUser.bind(null, u.id)}
                className="text-xs text-muted-foreground hover:underline"
              >
                {u.active ? "Deactivate" : "Activate"}
              </ActionButton>
            </div>
            {resetId === u.id ? (
              <div className="w-full border-t pt-3">
                <ActionForm
                  action={resetPassword}
                  submitLabel="Update password"
                  onSuccess={() => setResetId(null)}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="id" value={u.id} />
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="New password (min 8 chars)"
                    className="flex h-9 w-64 rounded-md border border-input bg-transparent px-3 text-sm"
                  />
                </ActionForm>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
