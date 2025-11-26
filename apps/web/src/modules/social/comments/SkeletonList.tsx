export const SkeletonList = () => (
  <>
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="flex gap-3 rounded-xl border border-white/5 bg-white/5 p-3 backdrop-blur">
        <div className="size-8 shrink-0 animate-pulse rounded-full bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    ))}
  </>
)
