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
import { useCartStore, useCartForBusiness } from "@/store/cart";
import { useCurrentBusinessStore } from "@/store/current-business";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { CheckoutDialog } from "./checkout-dialog";
import {
  generateOrderMessage,
  createWhatsAppLink,
  createTelegramLink,
  createPhoneLink,
  resolveWhatsappForOrder,
  getOrderContactLink,
  hasAnyOrderContact,
} from "@/lib/order";
import { trackClientEvent } from "@/lib/client-observability";
import { validatePromo } from "@/lib/promo";
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

  const business = useCurrentBusinessStore((state) => state.business);
  const cart = useCartForBusiness(business?.id ?? null);
  const {
    items,
    comment,
    promoCode,
    appliedPromo,
    promoError,
    getSubtotal,
    getDiscountAmount,
    getTotalPrice,
  } = cart;

  const orderNumberByBusinessId = useCartStore((s) => s.orderNumberByBusinessId);
  const orderNumber = business ? orderNumberByBusinessId[business.id] ?? null : null;
  const setComment = useCartStore((state) => state.setComment);
  const setPromoCode = useCartStore((state) => state.setPromoCode);
  const applyPromo = useCartStore((state) => state.applyPromo);
  const clearPromo = useCartStore((state) => state.clearPromo);
  const generateOrderNumber = useCartStore((state) => state.generateOrderNumber);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const createOrderFromCart = useCartStore((state) => state.createOrder);
  const clearCart = useCartStore((state) => state.clearCart);

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const totalPrice = getTotalPrice();
  const hasOrderContactsConfigured = business ? hasAnyOrderContact(business) : false;

  // Промо считаем действительным только для текущего бизнеса (на случай старых данных / краевых случаев)
  const isPromoForCurrentBusiness =
    appliedPromo != null && business?.id != null && appliedPromo.businessId === business.id;

  const handleApplyPromo = () => {
    if (!business?.promo || !business.id) return;
    const ok = applyPromo(business.id, business.promo);
    if (ok) toast.success("Промокод применён");
  };

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
    clearCart(business.id);
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
    if (open && business?.id && items.length > 0 && !orderNumber) {
      generateOrderNumber(business.id);
    }
  }, [open, business?.id, items.length, orderNumber, generateOrderNumber]);

  // Валидация промо после гидрации: при открытии drawer проверяем appliedPromo для текущего бизнеса
  useEffect(() => {
    if (!open || !business?.id || !appliedPromo) return;
    if (appliedPromo.businessId !== business.id) {
      clearPromo(business.id);
      return;
    }
    const subtotal = useCartStore.getState().getSubtotal(business.id);
    const result = validatePromo(
      business.promo,
      appliedPromo.code,
      subtotal,
      undefined,
      business.id
    );
    if (!result.valid) {
      clearPromo(business.id);
    }
  }, [open, business?.id, business?.promo, appliedPromo, clearPromo]);

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
    if (!hasOrderContactsConfigured) {
      toast.error("Бизнес ещё не настроил контакты для приёма заказов");
      return;
    }
    if (!orderNumber) generateOrderNumber(business.id);
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
    const num = orderNumber ?? generateOrderNumber(business.id);
    trackClientEvent("order_sent", {
      businessId: business.id,
      orderNumber: num,
      channel: type,
      itemsCount: items.length,
      totalPrice,
    });
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
            {!hasOrderContactsConfigured && (
              <p className="text-sm text-amber-700">
                Заказы пока недоступны: бизнесу нужно добавить WhatsApp, Telegram или телефон.
              </p>
            )}
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
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-2 py-3 first:pt-0"
                  >
                    {/* Название и цена за штуку */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.originalPrice != null &&
                        item.originalPrice > item.price ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-gray-400 line-through">
                              {item.originalPrice.toLocaleString("ru-RU")} ₽
                            </span>
                            <span>
                              {item.price.toLocaleString("ru-RU")} ₽ ×{" "}
                              {item.quantity}
                            </span>
                          </span>
                        ) : (
                          <>
                            {item.price.toLocaleString("ru-RU")} ₽ ×{" "}
                            {item.quantity}
                          </>
                        )}
                      </p>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-0.5 border-2 border-brand-yellow bg-brand-yellow/10 rounded-lg">
                      <button
                        onClick={() =>
                          business?.id &&
                          decreaseQuantity(business.id, item.productId)
                        }
                        className="p-1.5 hover:bg-brand-yellow/30 rounded-l-md transition-colors"
                        aria-label="Уменьшить количество"
                      >
                        <Minus className="h-3.5 w-3.5 text-gray-800" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold tabular-nums text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          business?.id &&
                          increaseQuantity(business.id, item.productId)
                        }
                        className="p-1.5 hover:bg-brand-yellow/30 rounded-r-md transition-colors"
                        aria-label="Увеличить количество"
                      >
                        <Plus className="h-3.5 w-3.5 text-gray-800" />
                      </button>
                    </div>

                    {/* Сумма */}
                    <div className="w-14 text-right shrink-0">
                      {item.originalPrice != null &&
                      item.originalPrice > item.price ? (
                        <div>
                          <p className="text-[10px] text-gray-400 line-through leading-tight">
                            {(item.originalPrice * item.quantity).toLocaleString(
                              "ru-RU"
                            )}{" "}
                            ₽
                          </p>
                          <p className="font-semibold text-sm">
                            {(item.price * item.quantity).toLocaleString(
                              "ru-RU"
                            )}{" "}
                            ₽
                          </p>
                        </div>
                      ) : (
                        <p className="font-semibold text-sm">
                          {(item.price * item.quantity).toLocaleString(
                            "ru-RU"
                          )}{" "}
                          ₽
                        </p>
                      )}
                    </div>

                    {/* Удалить */}
                    <button
                      onClick={() =>
                        business?.id && removeItem(business.id, item.productId)
                      }
                      className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors shrink-0"
                      aria-label="Удалить товар"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}

                {/* Комментарий к заказу — прокручивается вместе со списком */}
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
                    onChange={(e) =>
                      business?.id && setComment(business.id, e.target.value || null)
                    }
                    rows={2}
                    className="resize-none bg-gray-50 border-gray-200 rounded-lg text-[16px] min-h-[60px]"
                  />
                </div>

                {/* Промокод */}
                <div className="space-y-2">
                  <label
                    htmlFor="promo-code"
                    className="text-sm font-medium mb-2 block flex items-center gap-1.5"
                  >
                    <Tag className="h-4 w-4 text-gray-500" />
                    Промокод
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="promo-code"
                      type="text"
                      placeholder="Введите промокод..."
                      value={promoCode || ""}
                      onChange={(e) =>
                        business?.id &&
                        setPromoCode(
                          business.id,
                          e.target.value ? e.target.value.toUpperCase() : null
                        )
                      }
                      className="flex-1 bg-gray-50 border-gray-200 rounded-lg text-[16px]"
                      disabled={isPromoForCurrentBusiness}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyPromo}
                      disabled={!business?.promo?.enabled || !promoCode?.trim() || isPromoForCurrentBusiness}
                      className="shrink-0"
                    >
                      {isPromoForCurrentBusiness ? "Применён" : "Применить"}
                    </Button>
                  </div>
                  {isPromoForCurrentBusiness && appliedPromo && (
                    <div className="space-y-1">
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Промокод {appliedPromo.code} применён
                        <button
                        type="button"
                        onClick={() => business?.id && clearPromo(business.id)}
                        className="ml-2 text-gray-500 underline hover:text-gray-700"
                      >
                        снять
                      </button>
                    </p>
                      {discountAmount === 0 &&
                        appliedPromo.minOrder != null &&
                        appliedPromo.minOrder > 0 &&
                        subtotal < appliedPromo.minOrder && (
                          <p className="text-xs text-amber-600">
                            Минимальная сумма заказа для промокода:{" "}
                            {Math.round(appliedPromo.minOrder).toLocaleString(
                              "ru-RU"
                            )}{" "}
                            ₽
                          </p>
                        )}
                    </div>
                  )}
                  {promoError && !isPromoForCurrentBusiness && (
                    <p className="text-sm text-red-600">{promoError}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Нижняя часть: итого и кнопка (остаётся закреплённой) */}
        {!successState && items.length > 0 && (
          <div className="px-6 pb-6 pt-4 border-t bg-white rounded-b-3xl space-y-4">
            {/* Подытог / Скидка / Итого — показываем разбивку при применённом промокоде */}
            <div className="space-y-1.5 mb-4">
              {isPromoForCurrentBusiness && appliedPromo != null && (
                <>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Подытог:</span>
                    <span>{subtotal.toLocaleString("ru-RU")} ₽</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Скидка по промокоду:</span>
                    <span>−{discountAmount.toLocaleString("ru-RU")} ₽</span>
                  </div>
                  {discountAmount === 0 &&
                    appliedPromo.minOrder != null &&
                    appliedPromo.minOrder > 0 &&
                    subtotal < appliedPromo.minOrder && (
                      <p className="text-xs text-amber-600">
                        Минимальная сумма заказа для промокода:{" "}
                        {Math.round(appliedPromo.minOrder).toLocaleString(
                          "ru-RU"
                        )}{" "}
                        ₽
                      </p>
                    )}
                </>
              )}
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Итого:</span>
                <span>{totalPrice.toLocaleString("ru-RU")} ₽</span>
              </div>
            </div>

            {/* Кнопка оформления заказа */}
            <Button
              size="lg"
              className="w-full bg-brand-yellow hover:bg-brand-yellow/90 text-brand-yellow-foreground font-normal text-base py-6 rounded-lg"
              onClick={handleCheckout}
              disabled={!business || !hasOrderContactsConfigured}
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
