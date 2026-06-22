export default function GlobalLoading() {
  return (
    <div className="app-page min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-bg-border border-t-brand animate-spin" />
        <p className="text-sm text-ink-muted">Loading…</p>
      </div>
    </div>
  );
}