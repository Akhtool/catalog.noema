"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Product } from "@/types";
import { useCartStore } from "@/store/cart";
import {
  X,
  Share2,
  Minus,
  Plus,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Expand,
} from "lucide-react";
import { useSheetDrag } from "@/lib/useSheetDrag";
import useEmblaCarousel from "embla-carousel-react";
import Lightbox from "yet-another-react-lightbox";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

interface ProductDetailCardProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Извлекаем вес/объем и порции из description
function extractWeightAndPortions(description: string | null): {
  weight: string | null;
  portions: string | null;
} {
  if (!description) return { weight: null, portions: null };

  // Ищем паттерны типа "900g", "900 г", "1 кг" и т.д.
  const weightMatch = description.match(/(\d+[\s]*(г|кг|g|kg|ml|л|мл))/i);
  const weight = weightMatch ? weightMatch[1] : null;

  // Ищем паттерны типа "30 порций", "30 порций" и т.д.
  const portionsMatch = description.match(/(\d+[\s]*порций?)/i);
  const portions = portionsMatch ? portionsMatch[1] : null;

  return { weight, portions };
}

export function ProductDetailCard({
  product,
  open,
  onOpenChange,
}: ProductDetailCardProps) {
  const images = useMemo(
    () => (product.images && product.images.length > 0 ? product.images : []),
    [product.images],
  );
  const [imageLoadError, setImageLoadError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const lightboxSlides = useMemo(
    () => images.map((src) => ({ src })),
    [images],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    skipSnaps: false,
  });

  useEffect(() => {
    setImageLoadError(false);
  }, [open]);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    update();
    emblaApi.on("select", update);
    emblaApi.on("reInit", update);
    return () => {
      emblaApi.off("select", update);
      emblaApi.off("reInit", update);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (open && emblaApi) emblaApi.scrollTo(0);
  }, [open, product.id, emblaApi]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();
  const scrollTo = (index: number) => emblaApi?.scrollTo(index);

  const addItem = useCartStore((state) => state.addItem);
  const increaseQuantity = useCartStore((state) => state.increaseQuantity);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const cartItems = useCartStore((state) => state.items);

  const cartItem = cartItems.find((item) => item.productId === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleAddToCart = () => {
    if (quantity === 0) {
      addItem(product);
    } else {
      increaseQuantity(product.id);
    }
  };

  const handleIncrease = () => {
    if (quantity === 0) {
      addItem(product);
    } else {
      increaseQuantity(product.id);
    }
  };

  const handleDecrease = () => {
    if (quantity > 0) {
      decreaseQuantity(product.id);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description || "",
          url: window.location.href,
        });
      } catch {
        // Пользователь отменил или произошла ошибка
      }
    } else {
      // Fallback: копируем в буфер обмена
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  const { weight, portions } = extractWeightAndPortions(product.description);
  const weightAndPortions =
    weight && portions ? `${weight} / ${portions}` : weight || portions || null;

  // Используем хук для перетаскивания
  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange,
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[90vh] max-h-[90vh] rounded-t-[2rem] p-0 flex flex-col overflow-hidden border-0"
          showCloseButton={false}
          style={sheetStyle}
        >
          {/* Скрытый заголовок для доступности */}
          <SheetTitle className="sr-only">{product.name}</SheetTitle>

          {/* Шапка: полоска свайпа и крестик — как в остальных sheet */}
          <header
            {...dragHandlers}
            className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-gray-100 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
          >
            <div className="w-8 flex-shrink-0" aria-hidden />
            <div className="flex-1 flex items-center justify-center min-w-0 py-0.5">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0 touch-manipulation"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>
          </header>

          {/* Контент с прокруткой */}
          <div className="flex-1 overflow-y-auto" style={scrollableStyle}>
            {/* Секция изображения продукта */}
            {images.length > 0 && !imageLoadError ? (
              <div className="w-full min-h-[320px] flex items-center justify-center gap-2 bg-gray-50 px-4">
                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={scrollPrev}
                      disabled={!canScrollPrev}
                      className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      aria-label="Предыдущее изображение"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <div className="relative w-[240px] flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setLightboxOpen(true)}
                        className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                        aria-label="Развернуть изображение"
                      >
                        <Expand className="h-4 w-4" />
                      </button>
                      <div className="overflow-hidden" ref={emblaRef}>
                        <div className="flex touch-pan-y cursor-grab active:cursor-grabbing select-none">
                          {images.map((src, index) => (
                            <div
                              key={index}
                              className="relative flex-[0_0_100%] min-w-0 w-[240px] h-[320px]"
                            >
                              <Image
                                src={src}
                                alt={`${product.name} - изображение ${index + 1}`}
                                fill
                                className="object-cover"
                                priority={index === 0}
                                sizes="240px"
                                unoptimized
                                onError={() => setImageLoadError(true)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => scrollTo(index)}
                            className={`h-2 rounded-full transition-all ${
                              index === selectedIndex
                                ? "w-2 bg-brand-yellow"
                                : "w-2 bg-white/60 hover:bg-white/80"
                            }`}
                            aria-label={`Изображение ${index + 1} из ${images.length}`}
                            aria-current={
                              index === selectedIndex ? "true" : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={scrollNext}
                      disabled={!canScrollNext}
                      className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      aria-label="Следующее изображение"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                ) : (
                  <div className="relative w-[240px] h-[320px] flex-shrink-0 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      aria-label="Развернуть изображение"
                    >
                      <Expand className="h-4 w-4" />
                    </button>
                    <Image
                      src={images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                      priority
                      sizes="240px"
                      unoptimized
                      onError={() => setImageLoadError(true)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full min-h-[320px] flex items-center justify-center bg-gray-50 px-4">
                <div className="w-[240px] h-[320px] flex-shrink-0 bg-white border border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <ImageIcon
                    className="h-16 w-16"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span className="text-sm">Нет изображения</span>
                </div>
              </div>
            )}

            {/* Детали продукта */}
            <div className="px-5 pt-4 pb-6 space-y-4">
              {/* Метка BEST SELLER и рейтинг (пока скрыто, так как нет в модели) */}
              {/* <div className="flex items-center gap-3">
              <span className="bg-brand-yellow text-brand-yellow-foreground text-xs font-bold px-2 py-1 rounded">
                BEST SELLER
              </span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-brand-yellow text-brand-yellow" />
                <span className="text-sm font-semibold text-gray-700">4.9</span>
              </div>
            </div> */}

              {/* Название продукта и кнопка «Поделиться» */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl font-black text-gray-900 leading-tight flex-1 min-w-0">
                  {product.name}
                </h2>
                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-full w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
                  aria-label="Поделиться ссылкой"
                >
                  <Share2 className="h-5 w-5 text-gray-700" />
                </button>
              </div>

              {/* Объем/порции */}
              {weightAndPortions && (
                <p className="text-sm text-gray-500 font-medium">
                  {weightAndPortions}
                </p>
              )}

              {/* Секция ОПИСАНИЕ */}
              {product.description && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    ОПИСАНИЕ
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Панель действий (фиксированная внизу) */}
          <div className="px-5 pb-5 pt-4 border-t bg-white">
            <div className="flex items-center justify-between gap-3">
              {/* Цена слева */}
              <div className="text-2xl font-black text-gray-900">
                {product.price.toLocaleString("ru-RU")} ₽
              </div>

              {/* Кнопка с плюсиком или селектор количества справа */}
              {quantity > 0 ? (
                <div className="flex items-center gap-3 bg-white border-2 border-brand-yellow rounded-xl px-3 h-12">
                  <button
                    onClick={handleDecrease}
                    disabled={quantity === 0}
                    className="w-6 h-6 flex items-center justify-center text-gray-700 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Уменьшить количество"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-base font-semibold text-gray-900 min-w-[20px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={handleIncrease}
                    disabled={!product.inStock}
                    className="w-6 h-6 flex items-center justify-center text-gray-700 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Увеличить количество"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="w-12 h-12 flex items-center justify-center bg-brand-yellow rounded-full text-brand-yellow-foreground shadow-md hover:bg-brand-yellow/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Добавить в корзину"
                >
                  <Plus className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {lightboxSlides.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={lightboxSlides}
          index={selectedIndex}
          plugins={[Fullscreen, Zoom]}
          render={{
            buttonPrev: () => null,
            buttonNext: () => null,
          }}
        />
      )}
    </>
  );
}
