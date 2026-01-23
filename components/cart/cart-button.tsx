"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useCartStore } from "@/store/cart"
import { CartDrawer } from "./cart-drawer"
import { Badge } from "@/components/ui/badge"

export function CartButton() {
  const [isOpen, setIsOpen] = useState(false)
  const totalQuantity = useCartStore((state) => state.getTotalQuantity())

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
        {totalQuantity > 0 && (
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
