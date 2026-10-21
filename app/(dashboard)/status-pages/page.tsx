import { ExternalLink, Globe, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserId } from "@/lib/auth/session";
import { listUserStatusPages } from "@/lib/data/status-pages";
import { MAX_STATUS_PAGES_PER_USER } from "@/lib/monitoring/options";

export const metadata: Metadata = { title: "Status pages" };

export default async function StatusPagesPage() {
  const userId = await requireUserId();
  const statusPages = await listUserStatusPages(userId);

  const create = (
    <Link href="/status-pages/new" className={buttonStyles()}>
      <Plus className="size-4" aria-hidden />
      New status page
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Status pages"
        description="Public pages that show your users the current state of selected services."
        actions={statusPages.length < MAX_STATUS_PAGES_PER_USER ? create : null}
      />
      <Card>
        {statusPages.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No status pages yet"
            description="Create a public page to share uptime and incident history with your users."
            action={create}
          />
        ) : (
          <ul className="divide-y divide-(--edge)">
            {statusPages.map((page) => (
              <li
                key={page.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{page.title}</p>
                  <p className="text-sm text-haze-500 dark:text-haze-400">
                    /status/{page.slug} · {page._count.monitors} monitors
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/status/${page.slug}`}
                    target="_blank"
                    className={buttonStyles("secondary", "sm")}
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    View
                  </Link>
                  <Link
                    href={`/status-pages/${page.id}/edit`}
                    className={buttonStyles("secondary", "sm")}
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
