import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass rounded-2xl ${className}`}>{children}</section>
  );
}

/** A retro window title bar: three pixel "buttons" and a pixel-font title. */
export function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--edge) px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex shrink-0 gap-1" aria-hidden>
          <span className="size-2 bg-lavender" />
          <span className="size-2 bg-haze-300 dark:bg-haze-700" />
          <span className="size-2 bg-haze-300 dark:bg-haze-700" />
        </span>
        <h2 className="truncate font-pixel text-xs tracking-wide text-haze-700 uppercase dark:text-haze-200">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
