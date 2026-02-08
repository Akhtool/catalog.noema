"use client"

import { useState, useEffect } from "react"
import { ShoppingBag, Search } from "lucide-react"
import { useCartStore, useCartHydration } from "@/store/cart"
import { CartDrawer } from "./cart-drawer"

/**
 * Обработчик клика по кнопке поиска
 * Прокручивает страницу вверх, если она прокручена вниз, и делает фокус на строку поиска
 */
const handleSearchClick = () => {
  const searchInput = document.getElementById("search-input")

  // Если страница прокручена вниз - прокручиваем вверх
  if (window.scrollY > 0) {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
    
    // Ждем завершения прокрутки перед фокусом
    setTimeout(() => {
      searchInput?.focus()
    }, 500)
  } else {
    // Если страница уже вверху - сразу делаем фокус
    searchInput?.focus()
  }
}

export function CartBottomBar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  useCartHydration() // Восстанавливаем корзину из localStorage
  const totalQuantity = useCartStore((state) => state.getTotalQuantity())

  // Предотвращаем ошибку гидратации, показывая данные корзины только после монтирования на клиенте
  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <>
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 bg-dark-nav pb-safe-sm pt-3 px-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out ${
          isOpen ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        }`}
        style={{
          paddingBottom: `max(0.5rem, env(safe-area-inset-bottom, 0.5rem))`,
        }}
      >
        <div className="flex justify-between items-center gap-4">
          {/* Кнопка поиска */}
          <button
            onClick={handleSearchClick}
            className="flex flex-col items-center gap-1 text-brand-yellow flex-1"
            aria-label="Поиск"
          >
            <Search className="h-6 w-6" />
            <span className="text-xs font-medium">Поиск</span>
          </button>

          {/* Кнопка корзины */}
          <button
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center gap-1 text-brand-yellow flex-1 relative"
            aria-label="Корзина"
          >
            <div className="relative">
              <ShoppingBag className="h-6 w-6" />
              {isMounted && totalQuantity > 0 && (
                <div className="absolute -top-1 -right-1 bg-brand-yellow text-brand-yellow-foreground text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-dark-nav">
                  {totalQuantity > 99 ? "99+" : totalQuantity}
                </div>
              )}
            </div>
            <span className="text-xs font-medium">Корзина</span>
          </button>
        </div>
      </div>
      <CartDrawer open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
