"use client";

import { Pause, Pencil, Play, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonStyles } from "@/components/ui/button";
import { apiRequest } from "@/lib/client-api";

type MonitorActionsProps = {
  monitor: { id: string; name: string; isActive: boolean };
};

export function MonitorActions({ monitor }: MonitorActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    success?: string,
  ) {
    setBusy(true);
    setMessage(null);
    const result = await action();
    setBusy(false);
    setMessage(
      result.ok ? (success ?? null) : (result.error ?? "Something went wrong."),
    );
    if (result.ok) router.refresh();
  }

  function toggleActive() {
    return run(() =>
      apiRequest(`/api/monitors/${monitor.id}`, "PATCH", {
        isActive: !monitor.isActive,
      }),
    );
  }

  function checkNow() {
    return run(
      () => apiRequest(`/api/monitors/${monitor.id}/check`, "POST"),
      "Check scheduled. The worker will run it within a few seconds.",
    );
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete "${monitor.name}"? Its check history and incidents will be removed.`,
      )
    ) {
      return;
    }
    setBusy(true);
    const result = await apiRequest(`/api/monitors/${monitor.id}`, "DELETE");
    if (result.ok) {
      router.push("/monitors");
      router.refresh();
    } else {
      setBusy(false);
      setMessage(result.error);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {monitor.isActive && (
          <Button
            variant="secondary"
            size="sm"
            onClick={checkNow}
            disabled={busy}
          >
            <RefreshCw className="size-4" aria-hidden />
            Check now
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleActive}
          disabled={busy}
        >
          {monitor.isActive ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
          {monitor.isActive ? "Pause" : "Resume"}
        </Button>
        <Link
          href={`/monitors/${monitor.id}/edit`}
          className={buttonStyles("secondary", "sm")}
        >
          <Pencil className="size-4" aria-hidden />
          Edit
        </Link>
        <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
          <Trash2 className="size-4" aria-hidden />
          Delete
        </Button>
      </div>
      <p
        aria-live="polite"
        className="text-xs text-zinc-500 dark:text-zinc-400"
      >
        {message}
      </p>
    </div>
  );
}
