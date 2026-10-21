"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/client-api";

export type CheckRow = {
  id: string;
  checkedAt: string;
  ok: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
};

// Fixed locale and time zone so the server render and hydration match.
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "UTC",
});

type CheckHistoryProps = {
  monitorId: string;
  initialChecks: CheckRow[];
  initialCursor: string | null;
};

export function CheckHistory({
  monitorId,
  initialChecks,
  initialCursor,
}: CheckHistoryProps) {
  const [checks, setChecks] = useState(initialChecks);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    const result = await apiRequest<{
      items: CheckRow[];
      nextCursor: string | null;
    }>(
      `/api/monitors/${monitorId}/checks?cursor=${encodeURIComponent(cursor)}&limit=20`,
      "GET",
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setChecks((current) => [...current, ...result.data.items]);
    setCursor(result.data.nextCursor);
  }

  if (checks.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-haze-500 dark:text-haze-400">
        No checks yet. Make sure the worker is running.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-haze-500 dark:text-haze-400">
            <tr className="border-b border-haze-200 dark:border-haze-800">
              <th scope="col" className="px-5 py-2 font-medium">
                Time
              </th>
              <th scope="col" className="px-5 py-2 font-medium">
                Result
              </th>
              <th scope="col" className="px-5 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-5 py-2 text-right font-medium">
                Response
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-haze-100 dark:divide-haze-800">
            {checks.map((check) => (
              <tr key={check.id}>
                <td className="px-5 py-2 whitespace-nowrap text-haze-600 dark:text-haze-300">
                  <time dateTime={check.checkedAt}>
                    {timeFormat.format(new Date(check.checkedAt))} UTC
                  </time>
                </td>
                <td className="px-5 py-2">
                  {check.ok ? (
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Success
                    </span>
                  ) : (
                    <span className="text-red-700 dark:text-red-400">
                      {check.error ?? "Failed"}
                    </span>
                  )}
                </td>
                <td className="px-5 py-2 font-mono text-xs">
                  {check.statusCode ?? "—"}
                </td>
                <td className="px-5 py-2 text-right font-mono text-xs whitespace-nowrap">
                  {check.responseTimeMs === null
                    ? "—"
                    : `${check.responseTimeMs} ms`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(cursor || error) && (
        <div className="flex items-center justify-center gap-3 border-t border-haze-200 px-5 py-3 dark:border-haze-800">
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          {cursor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? "Loading…" : "Load older checks"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
