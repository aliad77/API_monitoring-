import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusPageForm } from "@/components/status-pages/status-page-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findUserStatusPage } from "@/lib/data/status-pages";

export const metadata: Metadata = { title: "Edit status page" };

export default async function EditStatusPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const [statusPage, monitors] = await Promise.all([
    findUserStatusPage(userId, id),
    prisma.monitor.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!statusPage) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit status page" />
      <Card className="p-6">
        <StatusPageForm
          statusPageId={statusPage.id}
          monitors={monitors}
          initialValues={{
            title: statusPage.title,
            slug: statusPage.slug,
            description: statusPage.description ?? "",
            monitorIds: statusPage.monitors.map((entry) => entry.monitorId),
          }}
        />
      </Card>
    </div>
  );
}
