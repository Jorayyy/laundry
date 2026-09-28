"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings2,
  Wallet,
  Receipt,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

const OWNER_ITEMS = [
  { href: "/services", label: "Services", icon: Settings2 },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Receipt },
];

const ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
];

export function Sidebar({ name, role }: { name: string; role: "OWNER" | "STAFF" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = role === "OWNER" ? [...ITEMS, ...OWNER_ITEMS] : ITEMS;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  const nav = (
    <nav className="flex-1 space-y-1 px-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t p-3">
      <div className="px-3 py-2">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{role === "OWNER" ? "Owner / Admin" : "Staff"}</p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </form>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-sidebar print:hidden">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            LS
          </span>
          <span className="text-sm font-semibold">Laundry Shop</span>
        </div>
        {nav}
        {footer}
      </aside>

      <div className="md:hidden fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 print:hidden">
        <span className="text-sm font-semibold">Laundry Shop</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 hover:bg-accent"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <div className="md:hidden fixed inset-0 top-14 z-30 flex flex-col bg-background border-t print:hidden">
          {nav}
          {footer}
        </div>
      ) : null}
    </>
  );
}
