export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
