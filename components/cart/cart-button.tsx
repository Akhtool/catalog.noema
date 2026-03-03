"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useCartHydration, useCartTotalQuantity } from "@/store/cart"
import { useCurrentBusinessStore } from "@/store/current-business"
import { CartDrawer } from "./cart-drawer"
import { Badge } from "@/components/ui/badge"

export function CartButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  useCartHydration()
  const business = useCurrentBusinessStore((s) => s.business)
  const totalQuantity = useCartTotalQuantity(business?.id ?? null)

  // Предотвращаем ошибку гидратации, показывая Badge только после монтирования на клиенте
  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
        aria-label="Открыть корзину"
      >
        <ShoppingCart className="h-5 w-5" />
        {isMounted && totalQuantity > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {totalQuantity > 99 ? "99+" : totalQuantity}
          </Badge>
        )}
      </Button>
      <CartDrawer open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
