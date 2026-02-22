import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="w-full max-w-[430px] min-h-screen flex flex-col relative shrink-0 bg-background">
      {/* Имитация обложки */}
      <div className="relative w-full min-h-[180px] flex flex-col justify-end rounded-b-[2.5rem] overflow-hidden shadow-xl z-10 bg-muted">
        <div className="relative p-8 z-20">
          <div className="flex items-end gap-4">
            {/* Логотип */}
            <Skeleton className="w-24 h-24 rounded-full border-2 border-background shrink-0" />
            
            <div className="flex-1 min-w-0 space-y-2 mb-2">
              {/* Название */}
              <Skeleton className="h-8 w-3/4" />
              {/* Описание */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>

      {/* Информационная строка */}
      <div className="px-3 -mt-6 relative z-20 my-2.5">
        <div className="bg-background rounded-2xl shadow-card p-3 space-y-2 border border-border/50">
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>

      {/* Секция контактов */}
      <div className="px-3 py-2">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      {/* Категории */}
      <div className="px-3 py-2 flex gap-2 overflow-hidden">
        <Skeleton className="h-8 w-24 rounded-full shrink-0" />
        <Skeleton className="h-8 w-28 rounded-full shrink-0" />
        <Skeleton className="h-8 w-20 rounded-full shrink-0" />
        <Skeleton className="h-8 w-24 rounded-full shrink-0" />
      </div>

      {/* Товары */}
      <div className="px-3 space-y-4 pb-24">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 p-4 rounded-xl border border-border/50">
            <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
