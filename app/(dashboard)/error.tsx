"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center py-24 text-center">
      <AlertTriangle className="mb-3 size-6 text-amber-500" aria-hidden />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        We couldn&apos;t load this page. The error has been logged on the server.
      </p>
      <Button className="mt-6" variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
