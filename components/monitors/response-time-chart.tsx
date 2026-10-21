"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

export type ChartPoint = {
  time: string;
  avgResponseTimeMs: number | null;
  total: number;
  failed: number;
};

// UTC throughout, matching the rest of the dashboard.
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const fullFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border border-haze-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-haze-700 dark:bg-haze-900">
      <p className="font-medium text-haze-900 dark:text-haze-100">
        {fullFormat.format(new Date(point.time))} UTC
      </p>
      <p className="mt-1 text-haze-600 dark:text-haze-300">
        Avg response:{" "}
        {point.avgResponseTimeMs === null
          ? "—"
          : `${Math.round(point.avgResponseTimeMs)} ms`}
      </p>
      <p className="text-haze-600 dark:text-haze-300">
        {point.total} checks{point.failed > 0 ? `, ${point.failed} failed` : ""}
      </p>
    </div>
  );
}

export function ResponseTimeChart({
  points,
  multiDay,
}: {
  points: ChartPoint[];
  multiDay: boolean;
}) {
  if (points.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-haze-500 dark:text-haze-400">
        No checks recorded in this period yet.
      </p>
    );
  }

  return (
    <div className="h-64 text-haze-500 dark:text-haze-400">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="responseFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-lavender)"
                stopOpacity={0.2}
              />
              <stop
                offset="100%"
                stopColor="var(--color-lavender)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            className="stroke-haze-200 dark:stroke-haze-800"
          />
          <XAxis
            dataKey="time"
            tickFormatter={(value: string) =>
              (multiDay ? dateFormat : timeFormat).format(new Date(value))
            }
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(value: number) => `${value} ms`}
            tick={{ fill: "currentColor", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "currentColor", strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey="avgResponseTimeMs"
            stroke="var(--color-lavender)"
            strokeWidth={2}
            fill="url(#responseFill)"
            connectNulls
            isAnimationActive={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
