/**
 * Loading placeholder shown while the backend profile is being fetched after
 * login. Mirrors the rough shape of the patient dashboard (welcome header +
 * two-column content) so the transition to real content feels seamless.
 */
export default function DashboardSkeleton() {
  return (
    <div className="flex-1 w-full bg-background px-6 md:px-10 py-10 max-w-7xl mx-auto flex flex-col gap-8 animate-pulse">
      {/* Welcome header */}
      <section className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div className="space-y-3">
          <div className="h-9 w-64 max-w-full rounded-lg bg-surface-container-high" />
          <div className="h-4 w-80 max-w-full rounded bg-surface-container-high" />
        </div>
        <div className="h-12 w-56 rounded-xl bg-surface-container-high" />
      </section>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10 space-y-6">
            <div className="h-6 w-48 rounded bg-surface-container-high" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-surface-container-high" />
                    <div className="h-3 w-1/4 rounded bg-surface-container-high" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-surface-container-high" />
            <div className="h-4 w-32 rounded bg-surface-container-high" />
            <div className="w-full space-y-4 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 rounded bg-surface-container-high" />
                  <div className="h-9 w-full rounded-lg bg-surface-container-high" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
