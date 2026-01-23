"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useCartStore } from "@/store/cart"
import { useCurrentBusinessStore } from "@/store/current-business"
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { CheckoutDialog } from "./checkout-dialog"
import {
  generateOrderMessage,
  createWhatsAppLink,
  createTelegramLink,
  createPhoneLink,
} from "@/lib/order"

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const items = useCartStore((state) => state.items)
  const comment = useCartStore((state) => state.comment)
  const setComment = useCartStore((state) => state.setComment)
  const increaseQuantity = useCartStore((state) => state.increaseQuantity)
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const totalPrice = useCartStore((state) => state.getTotalPrice())
  const createOrderFromCart = useCartStore((state) => state.createOrder)
  const clearCart = useCartStore((state) => state.clearCart)
  const business = useCurrentBusinessStore((state) => state.business)

  const handleCheckout = () => {
    if (!business) {
      return
    }
    setIsCheckoutOpen(true)
  }

  const handleSelectContact = (type: "whatsapp" | "phone" | "telegram") => {
    if (!business) {
      return
    }

    const order = createOrderFromCart(business.id)
    const message = generateOrderMessage(order)

    // Открываем выбранный способ связи
    if (type === "whatsapp" && business.whatsapp) {
      const url = createWhatsAppLink(business.whatsapp, message)
      window.open(url, "_blank")
      // Очищаем корзину после отправки заказа
      clearCart()
      onOpenChange(false)
    } else if (type === "telegram" && business.telegram) {
      const url = createTelegramLink(business.telegram, message)
      window.open(url, "_blank")
      // Очищаем корзину после отправки заказа
      clearCart()
      onOpenChange(false)
    } else if (type === "phone" && business.phone) {
      const url = createPhoneLink(business.phone)
      window.open(url, "_self")
      // Очищаем корзину после звонка
      clearCart()
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Корзина</SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? "Ваша корзина пуста"
              : `Товаров в корзине: ${items.length}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Корзина пуста</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.price.toLocaleString("ru-RU")} ₽ × {item.quantity}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => decreaseQuantity(item.productId)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => increaseQuantity(item.productId)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold mt-2">
                      {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4 py-4">
              {/* Комментарий к заказу */}
              <div>
                <label
                  htmlFor="order-comment"
                  className="text-sm font-medium mb-2 block"
                >
                  Комментарий к заказу (необязательно)
                </label>
                <Textarea
                  id="order-comment"
                  placeholder="Добавьте комментарий к заказу..."
                  value={comment || ""}
                  onChange={(e) => setComment(e.target.value || null)}
                  rows={3}
                />
              </div>

              {/* Итого */}
              <div className="flex items-center justify-between text-lg font-semibold mb-4">
                <span>Итого:</span>
                <span>{totalPrice.toLocaleString("ru-RU")} ₽</span>
              </div>

              {/* Кнопка оформления заказа */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleCheckout}
                disabled={!business}
              >
                Оформить заказ
              </Button>
            </div>
          </>
        )}
      </SheetContent>

      {/* Диалог выбора способа связи */}
      {business && (
        <CheckoutDialog
          open={isCheckoutOpen}
          onOpenChange={setIsCheckoutOpen}
          business={business}
          onSelectContact={handleSelectContact}
        />
      )}
    </Sheet>
  )
}
