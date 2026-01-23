"use client"

import { useState } from "react"
import { ShoppingBag } from "lucide-react"
import { useCartStore } from "@/store/cart"
import { CartDrawer } from "./cart-drawer"

export function CartBottomBar() {
  const [isOpen, setIsOpen] = useState(false)
  const totalQuantity = useCartStore((state) => state.getTotalQuantity())
  const totalPrice = useCartStore((state) => state.getTotalPrice())

  return (
    <>
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 bg-dark-nav pb-6 pt-3 px-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out ${
          isOpen ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="flex justify-between items-center">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-3 text-brand-yellow w-full"
          >
            <div className="relative">
              <ShoppingBag className="h-6 w-6" />
              {totalQuantity > 0 && (
                <div className="absolute -top-1 -right-1 bg-brand-yellow text-black text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-dark-nav">
                  {totalQuantity > 99 ? "99+" : totalQuantity}
                </div>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">Корзина</div>
              <div className="text-xs text-gray-400">
                {totalQuantity > 0
                  ? `${totalPrice.toLocaleString("ru-RU")} ₽`
                  : "0 ₽"}
              </div>
            </div>
          </button>
        </div>
        <div className="mx-auto w-16 h-1 bg-white/20 rounded-full mt-4"></div>
      </div>
      <CartDrawer open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
