"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cart";
import { useCurrentBusinessStore } from "@/store/current-business";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
} from "lucide-react";
import { CheckoutDialog } from "./checkout-dialog";
import {
  generateOrderMessage,
  createWhatsAppLink,
  createTelegramLink,
  createPhoneLink,
  resolveWhatsappForOrder,
  getOrderContactLink,
} from "@/lib/order";
import { useSheetDrag } from "@/lib/useSheetDrag";

const COUNTDOWN_SECONDS = 5;

type SuccessChannel = "whatsapp" | "telegram" | "phone";

interface SuccessState {
  channel: SuccessChannel;
  orderNumber: string;
}

const CHANNEL_LABELS: Record<SuccessChannel, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  phone: "по телефону",
};

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(COUNTDOWN_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const items = useCartStore((state) => state.items);
  const comment = useCartStore((state) => state.comment);
  const promoCode = useCartStore((state) => state.promoCode);
  const orderNumber = useCartStore((state) => state.orderNumber);
  const setComment = useCartStore((state) => state.setComment);
  const setPromoCode = useCartStore((state) => state.setPromoCode);
  const generateOrderNumber = useCartStore(
    (state) => state.generateOrderNumber,
  );
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const totalPrice = useCartStore((state) => state.getTotalPrice());
  const createOrderFromCart = useCartStore((state) => state.createOrder);
  const clearCart = useCartStore((state) => state.clearCart);
  const business = useCurrentBusinessStore((state) => state.business);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSuccessState(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange: handleOpenChange,
  });

  const doRedirect = useCallback(() => {
    if (!business || !successState) return;
    const order = createOrderFromCart(business.id, business.pickupPoints);
    const message = generateOrderMessage(order);
    const phone = order.selectedPoint?.phone ?? business.phone;
    const whatsapp = resolveWhatsappForOrder(business, order);
    const telegram = order.selectedPoint?.telegram ?? business.telegram;

    if (successState.channel === "whatsapp" && whatsapp) {
      window.open(createWhatsAppLink(whatsapp, message), "_blank");
    } else if (successState.channel === "telegram" && telegram) {
      window.open(createTelegramLink(telegram, message), "_blank");
    } else if (successState.channel === "phone" && phone) {
      window.open(createPhoneLink(phone), "_self");
    }
    clearCart();
    handleOpenChange(false);
    setSuccessState(null);
  }, [
    business,
    successState,
    createOrderFromCart,
    clearCart,
    handleOpenChange,
  ]);

  // Генерируем номер заказа при открытии корзины, если его еще нет
  useEffect(() => {
    if (open && items.length > 0 && !orderNumber) {
      generateOrderNumber();
    }
  }, [open, items.length, orderNumber, generateOrderNumber]);

  // Таймер перенаправления на экране успеха
  useEffect(() => {
    if (!successState || countdownSeconds <= 0) return;
    intervalRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [successState, countdownSeconds]);

  useEffect(() => {
    if (successState && countdownSeconds === 0) {
      doRedirect();
    }
  }, [successState, countdownSeconds, doRedirect]);

  const handleCheckout = () => {
    if (!business) return;
    if (!orderNumber) generateOrderNumber();
    const order = createOrderFromCart(business.id, business.pickupPoints);
    try {
      getOrderContactLink(business, order);
    } catch {
      toast.error("У бизнеса нет контактов для связи");
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleSelectContact = (type: SuccessChannel) => {
    if (!business) return;
    const num = orderNumber ?? generateOrderNumber();
    setSuccessState({ channel: type, orderNumber: num });
    setCountdownSeconds(COUNTDOWN_SECONDS);
    setIsCheckoutOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="w-full max-h-[95vh] rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
        showCloseButton={false}
        style={sheetStyle}
      >
        {/* Шапка: полоска свайпа и крестик в одной строке у верхнего края */}
        <header
          {...dragHandlers}
          className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-gray-100 cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-8 flex-shrink-0" aria-hidden />
          <div className="flex-1 flex items-center justify-center min-w-0 py-0.5">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0 touch-manipulation"
            aria-label="Закрыть корзину"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Заголовок — свайп вниз тоже закрывает */}
        <div
          {...dragHandlers}
          className="px-6 pt-4 pb-3 border-b cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <SheetTitle className="text-xl font-bold">
            {successState ? "Заказ оформлен" : "Корзина"}
          </SheetTitle>
          {successState ? (
            <SheetDescription className="text-sm text-gray-500 mt-2">
              Номер заказа: {successState.orderNumber}
            </SheetDescription>
          ) : (
            <>
              {orderNumber && (
                <div className="text-xs text-gray-600 mb-2 font-medium">
                  Номер заказа: {orderNumber}
                </div>
              )}
              <SheetDescription className="text-sm text-gray-500">
                {items.length === 0
                  ? "Ваша корзина пуста"
                  : `Товаров в корзине: ${items.length}`}
              </SheetDescription>
            </>
          )}
        </div>

        {/* Экран успеха после выбора способа связи */}
        {successState && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg font-semibold text-gray-900 mb-2">
              Заказ №{successState.orderNumber} отправлен
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Через {countdownSeconds} сек. вы будете перенаправлены в{" "}
              {CHANNEL_LABELS[successState.channel]}
            </p>
            <Button
              size="lg"
              className="w-full bg-brand-yellow hover:bg-brand-yellow/90 text-brand-yellow-foreground font-bold"
              onClick={() => doRedirect()}
            >
              Открыть сейчас
            </Button>
          </div>
        )}

        {/* Список товаров (когда не показываем экран успеха) */}
        {!successState && (
          <div
            className="flex-1 overflow-y-auto px-6 py-4"
            style={scrollableStyle}
          >
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500">Корзина пуста</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Левая часть: название и цена за единицу */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base mb-1">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-3">
                          {item.price.toLocaleString("ru-RU")} ₽ ×{" "}
                          {item.quantity}
                        </p>

                        {/* Управление количеством */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg">
                            <button
                              onClick={() => decreaseQuantity(item.productId)}
                              className="p-1.5 hover:bg-gray-100 rounded-l-lg transition-colors"
                              aria-label="Уменьшить количество"
                            >
                              <Minus className="h-4 w-4 text-gray-600" />
                            </button>
                            <span className="w-8 text-center font-medium text-sm">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => increaseQuantity(item.productId)}
                              className="p-1.5 hover:bg-gray-100 rounded-r-lg transition-colors"
                              aria-label="Увеличить количество"
                            >
                              <Plus className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>

                          {/* Кнопка удаления */}
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="p-2 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors"
                            aria-label="Удалить товар"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </div>

                      {/* Правая часть: итоговая стоимость */}
                      <div className="flex-shrink-0">
                        <p className="font-bold text-base whitespace-nowrap">
                          {(item.price * item.quantity).toLocaleString("ru-RU")}{" "}
                          ₽
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Нижняя часть: комментарий, итого и кнопка */}
        {!successState && items.length > 0 && (
          <div className="px-6 pb-6 pt-4 border-t bg-white rounded-b-3xl space-y-4">
            {/* Комментарий к заказу */}
            <div>
              <label
                htmlFor="order-comment"
                className="text-sm font-medium mb-2 block"
              >
                Комментарий к заказу
              </label>
              <Textarea
                id="order-comment"
                placeholder="Добавьте комментарий к заказу..."
                value={comment || ""}
                onChange={(e) => setComment(e.target.value || null)}
                rows={2}
                className="resize-none bg-gray-50 border-gray-200 rounded-lg text-[16px] min-h-[60px]"
              />
            </div>

            {/* Промокод */}
            <div>
              <label
                htmlFor="promo-code"
                className="text-sm font-medium mb-2 block"
              >
                Промокод
              </label>
              <Input
                id="promo-code"
                type="text"
                placeholder="Введите промокод..."
                value={promoCode || ""}
                onChange={(e) => setPromoCode(e.target.value || null)}
                className="bg-gray-50 border-gray-200 rounded-lg text-[16px]"
              />
            </div>

            {/* Итого */}
            <div className="flex items-center justify-between text-lg font-bold mb-4">
              <span>Итого:</span>
              <span>{totalPrice.toLocaleString("ru-RU")} ₽</span>
            </div>

            {/* Кнопка оформления заказа */}
            <Button
              size="lg"
              className="w-full bg-brand-yellow hover:bg-brand-yellow/90 text-brand-yellow-foreground font-normal text-base py-6 rounded-lg"
              onClick={handleCheckout}
              disabled={!business}
            >
              Оформить заказ
            </Button>
          </div>
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
  );
}
