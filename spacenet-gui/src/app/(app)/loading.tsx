export default function AppLoading() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 rounded-full border-2 border-light-border dark:border-dark-border border-t-maroon animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm text-light-text/60 dark:text-dark-subtext">Loading…</p>
      </div>
    </div>
  )
}
