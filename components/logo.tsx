import { Activity } from "lucide-react";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-semibold tracking-tight"
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
        <Activity className="size-4" aria-hidden />
      </span>
      Pulse
    </Link>
  );
}
