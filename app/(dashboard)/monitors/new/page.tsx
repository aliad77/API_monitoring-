import type { Metadata } from "next";
import { MonitorForm } from "@/components/monitors/monitor-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New monitor" };

export default async function NewMonitorPage() {
  await requireUserId();
  return (
    <div className="max-w-2xl">
      <PageHeader title="New monitor" description="Pulse sends a request on every interval and checks the response status." />
      <Card className="p-6">
        <MonitorForm />
      </Card>
    </div>
  );
}
