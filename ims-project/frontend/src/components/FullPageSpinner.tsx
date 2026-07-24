export function FullPageSpinner() {
  return (
    <div className="flex h-full items-center justify-center bg-slate-50">
      <div
        className="size-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
