import type { Metadata } from "next";
import { StatusPageForm } from "@/components/status-pages/status-page-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "New status page" };

export default async function NewStatusPagePage() {
  const userId = await requireUserId();
  const monitors = await prisma.monitor.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-2xl">
      <PageHeader title="New status page" />
      <Card className="p-6">
        <StatusPageForm monitors={monitors} />
      </Card>
    </div>
  );
}
