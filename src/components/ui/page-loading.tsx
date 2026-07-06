export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-brand-red/30 border-t-brand-red"
        aria-hidden
      />
      <p className="text-sm text-brand-black/50">Carregando...</p>
    </div>
  );
}

export function StatsCardsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-brand-cream/70" />
        ))}
      </div>
      <div className="grid gap-2 grid-cols-2">
        <div className="h-14 rounded-xl bg-brand-cream/70" />
        <div className="h-14 rounded-xl bg-brand-cream/70" />
      </div>
    </div>
  );
}

export function ParcelasSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-3 w-28 rounded bg-brand-cream/80" />
      <div className="h-32 rounded-xl bg-brand-cream/60" />
    </div>
  );
}
