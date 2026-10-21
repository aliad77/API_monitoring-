import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IncidentList } from "@/components/monitors/incident-list";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserId } from "@/lib/auth/session";
import { listIncidents, type IncidentFilter } from "@/lib/data/incidents";

export const metadata: Metadata = { title: "Incidents" };

const filters: { value: IncidentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Ongoing" },
  { value: "resolved", label: "Resolved" },
];

type PageProps = {
  searchParams: Promise<{ status?: string; cursor?: string }>;
};

export default async function IncidentsPage({ searchParams }: PageProps) {
  const userId = await requireUserId();
  const { status, cursor } = await searchParams;
  const filter: IncidentFilter =
    status === "open" || status === "resolved" ? status : "all";

  const page = await listIncidents(userId, { filter, cursor, limit: 25 });

  return (
    <>
      <PageHeader
        title="Incidents"
        description="An incident opens on the first failed check and resolves on the next successful one."
      />

      <nav aria-label="Filter incidents" className="mb-4 flex gap-2">
        {filters.map((option) => (
          <Link
            key={option.value}
            href={
              option.value === "all"
                ? "/incidents"
                : `/incidents?status=${option.value}`
            }
            aria-current={option.value === filter ? "page" : undefined}
            className={buttonStyles(
              option.value === filter ? "primary" : "secondary",
              "sm",
            )}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      <Card>
        {page.items.length > 0 ? (
          <IncidentList incidents={page.items} />
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title={cursor ? "No more incidents" : "No incidents"}
            description="When a monitor fails a check, an incident is recorded here with its cause and duration."
          />
        )}
      </Card>

      <div className="mt-4 flex justify-end gap-2">
        {cursor && (
          <Link
            href={
              filter === "all" ? "/incidents" : `/incidents?status=${filter}`
            }
            className={buttonStyles("secondary", "sm")}
          >
            Newest
          </Link>
        )}
        {page.nextCursor && (
          <Link
            href={`/incidents?${new URLSearchParams({ ...(filter === "all" ? {} : { status: filter }), cursor: page.nextCursor })}`}
            className={buttonStyles("secondary", "sm")}
          >
            Older
          </Link>
        )}
      </div>
    </>
  );
}
