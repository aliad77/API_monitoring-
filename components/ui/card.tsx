import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-haze-200 bg-white dark:border-haze-800 dark:bg-haze-900 ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-haze-200 px-5 py-3 dark:border-haze-800">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action}
    </div>
  );
}
