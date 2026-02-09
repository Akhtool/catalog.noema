import { Skeleton } from "@/components/ui/skeleton"

/**
 * Показывается при загрузке страницы каталога (в т.ч. после редиректа с логина).
 * Вместо белого экрана пользователь видит skeleton, пока подгружаются данные и toast успевает отобразиться.
 */
export default function CatalogLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="min-h-[180px]" aria-hidden />

      {/* Блок с лого + название (внутри баннера по макету) */}
      <div className="px-5 -mt-16 relative z-10">
        <div className="flex items-end gap-4">
          <Skeleton className="w-24 h-24 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2 pb-1">
            <Skeleton className="h-10 w-3/4 max-w-[240px]" />
            <Skeleton className="h-4 w-1/2 max-w-[160px]" />
          </div>
        </div>
      </div>

      {/* Инфо-карточка (доставка/часы) */}
      <div className="px-5 mt-4">
        <Skeleton className="w-full h-[72px] rounded-2xl" />
      </div>

      {/* Секция контактов / кнопка */}
      <div className="px-5 mt-4">
        <Skeleton className="w-full h-12 rounded-xl" />
      </div>

      {/* Заголовок каталога / поиск */}
      <div className="px-5 mt-6 space-y-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Сетка карточек товаров (pb — место под фиксированную панель корзины) */}
      <div className="px-5 mt-4 pb-20 grid grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-1/2 mt-1" />
          </div>
        ))}
      </div>

      {/* Футер */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="container flex flex-col items-center gap-2 px-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3.5 w-12" />
        </div>
      </div>

      {/* Нижняя панель корзины */}
      <div className="fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background flex items-center px-5">
        <Skeleton className="h-10 flex-1 max-w-[200px] rounded-xl" />
      </div>
    </div>
  )
}
