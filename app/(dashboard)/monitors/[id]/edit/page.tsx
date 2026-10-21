import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MonitorForm } from "@/components/monitors/monitor-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserId } from "@/lib/auth/session";
import { findUserMonitor } from "@/lib/data/monitors";

export const metadata: Metadata = { title: "Edit monitor" };

export default async function EditMonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;
  const monitor = await findUserMonitor(userId, id);
  if (!monitor) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Edit monitor"
        description="Saving re-checks the monitor with the new settings."
      />
      <Card className="p-6">
        <MonitorForm
          monitorId={monitor.id}
          initialValues={{
            name: monitor.name,
            url: monitor.url,
            method: monitor.method,
            expectedStatus: monitor.expectedStatus,
            intervalSeconds: monitor.intervalSeconds,
            timeoutMs: monitor.timeoutMs,
          }}
        />
      </Card>
    </div>
  );
}
