import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "@/components/settings/settings-forms";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description={`Signed in as ${user.email}`} />

      <Card>
        <CardHeader title="Profile" />
        <div className="p-5">
          <ProfileForm name={user.name ?? ""} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Password" />
        <div className="p-5">
          <PasswordForm />
        </div>
      </Card>

      <Card>
        <CardHeader title="Notifications" />
        <p className="p-5 text-sm text-zinc-600 dark:text-zinc-300">
          Incident alerts are delivered in-app on the Notifications page. Email delivery is not implemented.
        </p>
      </Card>

      <Card className="border-red-200 dark:border-red-900">
        <CardHeader title="Delete account" />
        <div className="space-y-4 p-5">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Permanently removes your account, monitors, check history, incidents and status pages. This cannot be undone.
          </p>
          <DeleteAccountForm />
        </div>
      </Card>
    </div>
  );
}
