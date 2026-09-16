function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-base-border/60 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8" aria-label="Loading dashboard" role="status">
      <div className="flex flex-col gap-3">
        <LoadingBlock className="h-3 w-28" />
        <LoadingBlock className="h-9 w-64" />
        <LoadingBlock className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <LoadingBlock key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <LoadingBlock className="h-6 w-40" />
        <LoadingBlock className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
