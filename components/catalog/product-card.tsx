"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Product } from "@/types";
import { useCartStore } from "@/store/cart";
import { Plus, Minus, Pencil, EyeOff, Loader2 } from "lucide-react";
import { ProductDetailCard } from "./product-detail-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  product: Product;
  viewMode: "grid" | "list";
  /** Показывать кнопки редактировать/скрыть и восстановить (для админа) */
  showAdminActions?: boolean;
  onEdit?: () => void;
  /** Скрыть карточку из каталога (деактивировать) */
  onHide?: () => void | Promise<void>;
  /** Вернуть в каталог (восстановить) */
  onRestore?: () => void | Promise<void>;
}

// Извлекаем вес/объем из description или используем description как есть
function extractWeight(description: string | null): string | null {
  if (!description) return null;

  // Ищем паттерны типа "896 г", "908г", "1 кг" и т.д.
  const weightMatch = description.match(/(\d+[\s]*(г|кг|ml|л|мл))/i);
  if (weightMatch) {
    return weightMatch[1];
  }

  return null;
}

export function ProductCard({
  product,
  viewMode,
  showAdminActions = false,
  onEdit,
  onHide,
  onRestore,
}: ProductCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [showHideConfirm, setShowHideConfirm] = useState(false);
  const [optimisticallyHidden, setOptimisticallyHidden] = useState(false);
  const [optimisticallyRestored, setOptimisticallyRestored] = useState(false);

  useEffect(() => {
    if (!product.isActive) setOptimisticallyHidden(false);
  }, [product.isActive]);

  useEffect(() => {
    if (product.isActive) setOptimisticallyRestored(false);
  }, [product.isActive]);

  const addItem = useCartStore((state) => state.addItem);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const cartItems = useCartStore((state) => state.items);

  const cartItem = cartItems.find((item) => item.productId === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product);
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity === 0) {
      addItem(product);
    } else {
      increaseQuantity(product.id);
    }
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity > 0) {
      decreaseQuantity(product.id);
    }
  };

  const isHidden =
    showAdminActions &&
    ((!product.isActive && !optimisticallyRestored) || optimisticallyHidden);

  const handleCardClick = () => {
    if (isHidden) return;
    setIsDetailOpen(true);
  };

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onHide && !actionInProgress) setShowHideConfirm(true);
  };

  const handleHideConfirm = async () => {
    if (!onHide || actionInProgress) return;
    setShowHideConfirm(false);
    setActionInProgress(true);
    try {
      await Promise.resolve(onHide());
      setOptimisticallyHidden(true);
      toast.success("Товар скрыт из каталога");
    } catch {
      toast.error("Не удалось скрыть товар");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRestore || actionInProgress) return;
    setActionInProgress(true);
    try {
      await Promise.resolve(onRestore());
      setOptimisticallyRestored(true);
      toast.success("Товар снова отображается в каталоге");
    } catch {
      toast.error("Не удалось вернуть товар в каталог");
    } finally {
      setActionInProgress(false);
    }
  };

  const weight = extractWeight(product.description);

  if (viewMode === "list") {
    return (
      <>
        <div
          className={`bg-card-white rounded-[1.25rem] p-4 shadow-soft relative group flex gap-4 border transition-all ${
            isHidden
              ? "border-gray-200 bg-gray-100 cursor-default"
              : "border-transparent hover:border-brand-yellow/30"
          }`}
        >
          {actionInProgress && (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center rounded-[1.25rem] bg-white/80"
              onClick={(e) => e.stopPropagation()}
            >
              <Loader2
                className="h-8 w-8 text-gray-600 animate-spin"
                aria-hidden
              />
            </div>
          )}
          {isHidden && onRestore && !actionInProgress && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-[1.25rem] bg-gray-200/50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleRestore}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-brand-yellow text-brand-yellow-foreground hover:bg-brand-yellow/90 active:scale-[0.99] shadow-soft ring-2 ring-brand-yellow/50 transition-all"
              >
                Вернуть в каталог
              </button>
            </div>
          )}
          {showAdminActions && (onEdit || onHide) && (
            <div
              className="absolute top-2 right-2 z-20 flex gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="p-1.5 rounded-full bg-white/90 shadow border border-gray-200 hover:bg-gray-50"
                  aria-label="Редактировать"
                >
                  <Pencil className="h-4 w-4 text-gray-600" />
                </button>
              )}
              {onHide && !isHidden && (
                <button
                  type="button"
                  onClick={handleHideClick}
                  disabled={actionInProgress}
                  className="p-1.5 rounded-full bg-white/90 shadow border border-gray-200 hover:bg-gray-50 disabled:opacity-70"
                  aria-label="Скрыть из каталога"
                >
                  <EyeOff className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
          )}
          {product.images && product.images.length > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleCardClick}
              onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
              className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden cursor-pointer"
              aria-label={`Подробнее о ${product.name}`}
            >
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div
              role="button"
              tabIndex={0}
              onClick={handleCardClick}
              onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
              className="cursor-pointer outline-none"
              aria-label={`Подробнее о ${product.name}`}
            >
              <h3 className="font-semibold mb-1 truncate">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {product.description}
                </p>
              )}
            </div>
            <div
              className={`flex items-center ${
                quantity > 0 ? "justify-end" : "justify-between"
              }`}
            >
              {quantity === 0 && (
                <span className="text-lg font-bold">
                  {product.price.toLocaleString("ru-RU")} ₽
                </span>
              )}
              {quantity > 0 ? (
                <div className="relative">
                  <div className="flex items-center gap-1.5 bg-white border-2 border-brand-yellow rounded-full px-1.5 py-0.5 flex-nowrap min-w-fit h-9">
                    <button
                      onClick={handleDecrease}
                      className="w-6 h-6 flex items-center justify-center text-gray-700 hover:text-black transition-colors"
                      aria-label="Уменьшить количество"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs font-semibold text-gray-900 whitespace-nowrap flex-shrink-0 min-w-[60px] text-center">
                      {(product.price * quantity).toLocaleString("ru-RU")} ₽
                    </span>
                    <button
                      onClick={handleIncrease}
                      disabled={!product.inStock}
                      className="w-6 h-6 flex items-center justify-center text-gray-700 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Увеличить количество"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-md z-10">
                    {quantity}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="w-9 h-9 flex items-center justify-center bg-brand-yellow rounded-full text-brand-yellow-foreground shadow-md hover:bg-brand-yellow/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Добавить в корзину"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
        <ProductDetailCard
          product={product}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />
        <Dialog open={showHideConfirm} onOpenChange={setShowHideConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Скрыть товар из каталога?</DialogTitle>
              <DialogDescription>
                «{product.name}» не будет отображаться в каталоге. Вы сможете
                вернуть его в любой момент.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowHideConfirm(false)}
              >
                Отмена
              </Button>
              <Button
                type="button"
                onClick={handleHideConfirm}
                disabled={actionInProgress}
              >
                {actionInProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Скрытие…
                  </>
                ) : (
                  "Скрыть"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div
        className={`bg-card-white rounded-[1.25rem] p-4 shadow-soft relative group flex flex-col justify-between h-full border transition-all ${
          isHidden
            ? "border-gray-200 bg-gray-100 cursor-default"
            : "border-transparent hover:border-brand-yellow/30"
        }`}
      >
        {actionInProgress && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center rounded-[1.25rem] bg-white/80"
            onClick={(e) => e.stopPropagation()}
          >
            <Loader2
              className="h-8 w-8 text-gray-600 animate-spin"
              aria-hidden
            />
          </div>
        )}
        {isHidden && onRestore && !actionInProgress && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-[1.25rem] bg-gray-200/50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleRestore}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-brand-yellow text-brand-yellow-foreground hover:bg-brand-yellow/90 active:scale-[0.99] shadow-soft ring-2 ring-brand-yellow/50 transition-all"
            >
              Вернуть в каталог
            </button>
          </div>
        )}
        {showAdminActions &&
          (onEdit || onHide) &&
          !actionInProgress && (
            <div
              className="absolute top-2 right-2 z-20 flex gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="p-1.5 rounded-full bg-white/90 shadow border border-gray-200 hover:bg-gray-50"
                  aria-label="Редактировать"
                >
                  <Pencil className="h-4 w-4 text-gray-600" />
                </button>
              )}
              {onHide && !isHidden && (
                <button
                  type="button"
                  onClick={handleHideClick}
                  disabled={actionInProgress}
                  className="p-1.5 rounded-full bg-white/90 shadow border border-gray-200 hover:bg-gray-50 disabled:opacity-70"
                  aria-label="Скрыть из каталога"
                >
                  <EyeOff className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
          )}
        {/* Вес/объем в левом верхнем углу */}
        {weight && (
          <div className="absolute top-3 left-3 bg-gray-100 px-2 py-1 rounded-md z-10">
            <span className="text-[10px] font-bold text-gray-500">
              {weight}
            </span>
          </div>
        )}

        {/* Изображение продукта — клик открывает детали */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
          className="relative h-36 w-full flex items-center justify-center mb-4 mt-2 cursor-pointer outline-none"
          aria-label={`Подробнее о ${product.name}`}
        >
          {product.images && product.images.length > 0 && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-300"
              sizes="50vw"
              unoptimized
            />
          )}
        </div>

        <div className="space-y-3">
          <div
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
            className="cursor-pointer outline-none min-h-[2.5rem] flex items-start"
            aria-label={`Подробнее о ${product.name}`}
          >
            <h3 className="text-sm font-bold text-gray-800 leading-snug line-clamp-2">
              {product.name}
            </h3>
          </div>
          <div
            className={`flex items-center ${
              quantity > 0 ? "justify-center" : "justify-between"
            }`}
          >
            {quantity === 0 && (
              <span className="text-sm font-bold text-gray-900 bg-brand-yellow/20 px-2 py-1 rounded-lg">
                {product.price.toLocaleString("ru-RU")} ₽
              </span>
            )}
            {quantity > 0 ? (
              <div className="relative">
                <div className="flex items-center gap-1.5 bg-white border-2 border-brand-yellow rounded-full px-1.5 py-0.5 flex-nowrap min-w-fit h-9">
                  <button
                    onClick={handleDecrease}
                    className="w-6 h-6 flex items-center justify-center text-gray-700 hover:text-black transition-colors"
                    aria-label="Уменьшить количество"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-semibold text-gray-900 whitespace-nowrap flex-shrink-0 min-w-[60px] text-center">
                    {(product.price * quantity).toLocaleString("ru-RU")} ₽
                  </span>
                  <button
                    onClick={handleIncrease}
                    disabled={!product.inStock}
                    className="w-6 h-6 flex items-center justify-center text-gray-700 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Увеличить количество"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-md z-10">
                  {quantity}
                </div>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="w-9 h-9 flex items-center justify-center bg-brand-yellow rounded-full text-brand-yellow-foreground shadow-md hover:bg-brand-yellow/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Добавить в корзину"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
      <ProductDetailCard
        product={product}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
      <Dialog open={showHideConfirm} onOpenChange={setShowHideConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Скрыть товар из каталога?</DialogTitle>
            <DialogDescription>
              «{product.name}» не будет отображаться в каталоге. Вы сможете
              вернуть его в любой момент.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowHideConfirm(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleHideConfirm}
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Скрытие…
                </>
              ) : (
                "Скрыть"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
