/** Shown while a signed-in route's code loads. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded bg-muted" />
      <div className="h-4 w-80 max-w-full rounded bg-muted" />
      <div className="h-72 rounded-xl bg-muted" />
    </div>
  );
}
