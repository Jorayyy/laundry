import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar name={user.name} role={user.role} />
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
