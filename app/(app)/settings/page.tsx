import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { PageHeader } from "@/components/bits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from "@/components/settings/settings-form";
import { UsersPanel } from "@/components/settings/users-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireOwner();
  const sp = await searchParams;
  const [settings, users] = await Promise.all([
    db.settings.findUnique({ where: { id: "single" } }),
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Settings" description="Business info, receipt, order numbering, and staff accounts." />

      <Tabs defaultValue={sp.tab === "users" ? "users" : "business"}>
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="users">Staff accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-4">
          <div className="max-w-2xl rounded-lg border bg-card p-5">
            <SettingsForm settings={settings} />
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UsersPanel users={users} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
