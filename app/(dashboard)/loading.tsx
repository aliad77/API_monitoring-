export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="animate-pulse space-y-6 motion-reduce:animate-none"
    >
      <div className="h-8 w-48 rounded-lg bg-lavender/15" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 rounded-2xl bg-lavender/15" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-lavender/15" />
    </div>
  );
}
