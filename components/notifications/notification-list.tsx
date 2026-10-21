"use client";

import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { apiRequest } from "@/lib/client-api";

type NotificationRow = {
  id: string;
  type: "INCIDENT_OPENED" | "INCIDENT_RESOLVED";
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function NotificationList({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const unread = notifications.filter(
    (notification) => !notification.readAt,
  ).length;

  async function update(request: Promise<{ ok: boolean }>) {
    setPending(true);
    const result = await request;
    setPending(false);
    if (result.ok) router.refresh();
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="You'll be notified here when a monitor goes down or recovers."
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-haze-200 px-5 py-3 dark:border-haze-800">
        <p className="text-sm text-haze-500 dark:text-haze-400">
          {unread} unread
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || unread === 0}
          onClick={() =>
            update(apiRequest("/api/notifications/read-all", "POST"))
          }
        >
          Mark all as read
        </Button>
      </div>
      <ul className="divide-y divide-haze-100 dark:divide-haze-800">
        {notifications.map((notification) => {
          const opened = notification.type === "INCIDENT_OPENED";
          const Icon = opened ? XCircle : CheckCircle2;
          return (
            <li
              key={notification.id}
              className={`flex items-start gap-3 px-5 py-3 ${notification.readAt ? "" : "bg-lavender/10"}`}
            >
              <Icon
                className={`mt-0.5 size-4 shrink-0 ${opened ? "text-red-500" : "text-emerald-500"}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {notification.title}
                  {!notification.readAt && (
                    <span className="sr-only"> (unread)</span>
                  )}
                </p>
                <p className="truncate text-sm text-haze-500 dark:text-haze-400">
                  {notification.body}
                </p>
                <p className="mt-1 text-xs text-haze-400">
                  {timeFormat.format(new Date(notification.createdAt))} UTC
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  update(
                    apiRequest(
                      `/api/notifications/${notification.id}`,
                      "PATCH",
                      { read: !notification.readAt },
                    ),
                  )
                }
              >
                {notification.readAt ? "Mark unread" : "Mark read"}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
