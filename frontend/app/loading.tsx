export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-line border-t-accent animate-spin" />
        <p className="text-sm text-ink-muted">Loading…</p>
      </div>
    </div>
  );
}
