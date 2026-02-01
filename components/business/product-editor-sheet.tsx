"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSheetDrag } from "@/lib/useSheetDrag";
import { Business } from "@/types";
import { X, ChevronRight, Camera, Calendar, Trash2, Loader2 } from "lucide-react";
import { BrandPickerSheet } from "./brand-picker-sheet";
import { CategoryPickerSheet } from "./category-picker-sheet";
import type { DiscountDateRange } from "./discount-date-picker-dialog";
import {
  DiscountDatePickerDialog,
  formatDiscountDateDisplay,
} from "./discount-date-picker-dialog";
import {
  getProduct,
  createProduct,
  updateProduct,
} from "@/app/admin/product/actions";

const NAME_MAX_LENGTH = 70;
const SUBTITLE_MAX_LENGTH = 60;
const DESCRIPTION_MAX_LENGTH = 2000;

interface ProductEditorSheetProps {
  business: Business;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** При редактировании — id товара; при создании — null */
  productId?: string | null;
}

/**
 * Модалка добавления/редактирования позиции (товара). Roadmap этап 6.
 */
export function ProductEditorSheet({
  business,
  open,
  onOpenChange,
  productId = null,
}: ProductEditorSheetProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("");
  const [totalWithDiscount, setTotalWithDiscount] = useState("");
  const [discountDateRange, setDiscountDateRange] =
    useState<DiscountDateRange>({ from: null, to: null });
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedBrandName, setSelectedBrandName] = useState<string | null>(
    null
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedCategoryName, setSelectedCategoryName] = useState<
    string | null
  >(null);
  const [isActive, setIsActive] = useState(false);
  const [inStock, setInStock] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [isBrandPickerOpen, setIsBrandPickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isDiscountCalendarOpen, setIsDiscountCalendarOpen] = useState(false);

  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange,
  });

  const resetForm = useCallback(() => {
    setName("");
    setSubtitle("");
    setDescription("");
    setPrice("");
    setHasDiscount(false);
    setDiscountPercent("");
    setTotalWithDiscount("");
    setDiscountDateRange({ from: null, to: null });
    setSelectedBrandId(null);
    setSelectedBrandName(null);
    setSelectedCategoryId(null);
    setSelectedCategoryName(null);
    setIsActive(false);
    setInStock(true);
    setSubmitError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    const id = typeof productId === "string" ? productId.trim() : null;
    if (id) {
      setLoadingProduct(true);
      getProduct(id).then((result) => {
        setLoadingProduct(false);
        if (result.error) {
          setSubmitError(result.error);
          return;
        }
        const p = result.data;
        if (p) {
          setName(p.name);
          setSubtitle(p.subtitle ?? "");
          setDescription(p.description ?? "");
          setPrice(String(p.price));
          setSelectedBrandId(p.brandId);
          setSelectedBrandName(p.brandName ?? null);
          setSelectedCategoryId(p.categoryId);
          setSelectedCategoryName(p.categoryName ?? null);
          setIsActive(p.isActive);
          setInStock(p.inStock);
        }
      });
    } else {
      setLoadingProduct(false);
      resetForm();
    }
  }, [open, productId, resetForm]);

  const priceNum = parseFloat(price.replace(",", "."));
  const discountNum = parseFloat(discountPercent.replace(",", "."));
  const hasValidPrice = !Number.isNaN(priceNum) && priceNum > 0;
  const hasValidDiscount =
    !Number.isNaN(discountNum) && discountNum >= 0 && discountNum <= 100;

  useEffect(() => {
    if (hasValidPrice && hasValidDiscount) {
      const total =
        Math.round(priceNum * (1 - discountNum / 100) * 100) / 100;
      setTotalWithDiscount(
        total === Math.floor(total) ? String(total) : total.toFixed(2)
      );
    } else if (!discountPercent.trim()) {
      setTotalWithDiscount("");
    }
  }, [price, discountPercent, hasValidPrice, hasValidDiscount]);

  /** Обновляет итог и пересчитывает процент скидки при вводе в поле «Итоговая сумма» */
  function handleTotalWithDiscountChange(value: string) {
    setTotalWithDiscount(value);
    const totalNum = parseFloat(value.replace(",", "."));
    if (
      hasValidPrice &&
      !Number.isNaN(totalNum) &&
      totalNum >= 0 &&
      totalNum <= priceNum
    ) {
      const pct = ((priceNum - totalNum) / priceNum) * 100;
      const pctRounded = Math.round(pct * 100) / 100;
      setDiscountPercent(String(Math.min(100, Math.max(0, pctRounded))));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError("Введите название");
      return;
    }
    if (!selectedCategoryId) {
      setSubmitError("Выберите категорию");
      return;
    }
    const priceVal = parseFloat(price.replace(",", "."));
    if (Number.isNaN(priceVal) || priceVal < 0) {
      setSubmitError("Укажите корректную цену");
      return;
    }
    setSubmitError(null);
    setSubmitInProgress(true);
    const payload = {
      name: name.trim(),
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      price: priceVal,
      categoryId: selectedCategoryId,
      brandId: selectedBrandId,
      inStock: inStock,
      isActive: isActive,
    };
    const result = productId
      ? await updateProduct(productId, payload, business.slug)
      : await createProduct(business.id, payload, business.slug);
    setSubmitInProgress(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    router.refresh();
    onOpenChange(false);
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="w-full min-h-[85vh] max-h-[95vh] rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
        style={sheetStyle}
      >
        <div
          {...dragHandlers}
          className="w-full pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <div className="px-6 pt-3 pb-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <SheetTitle className="text-xl font-bold">Редактор позиции</SheetTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Закрыть редактор"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SheetDescription className="text-sm text-gray-500">
            {productId
              ? "Редактирование позиции"
              : "Позиция появится в каталоге после сохранения"}
          </SheetDescription>
          <p className="text-xs text-gray-500 mt-1">
            <span className="text-red-600">*</span> — обязательные поля
          </p>
        </div>

        <div
          className="flex-1 min-h-[60vh] overflow-y-auto px-6 py-4 flex flex-col"
          style={scrollableStyle}
        >
          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {submitError}
            </p>
          )}
          {loadingProduct ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-3">
              <Loader2 className="h-10 w-10 text-gray-400 animate-spin" aria-hidden />
              <p className="text-sm text-gray-500">Загрузка…</p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Название товара/услуги
                <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, NAME_MAX_LENGTH))}
                  placeholder="Например: ковер"
                  className="pr-14 border-0 border-b rounded-none bg-gray-50 focus-visible:ring-0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {name.length}/{NAME_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Подзаголовок
              </label>
              <div className="relative">
                <Input
                  value={subtitle}
                  onChange={(e) =>
                    setSubtitle(e.target.value.slice(0, SUBTITLE_MAX_LENGTH))
                  }
                  placeholder="Например: 1 штука, 100 грамм, S размер"
                  className="pr-14 border-0 border-b rounded-none bg-gray-50 focus-visible:ring-0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {subtitle.length}/{SUBTITLE_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Описание
              </label>
              <div className="relative">
                <Textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value.slice(0, DESCRIPTION_MAX_LENGTH)
                    )
                  }
                  placeholder="Например информация о доставке и ее сроках, условия предоставления услуги, технические важные характеристики, акции на данный товар и многое другое"
                  rows={4}
                  className="pr-14 border-0 border-b rounded-none bg-gray-50 focus-visible:ring-0 resize-none"
                />
                <span className="absolute right-2 top-3 text-xs text-gray-400">
                  {description.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Бренд</label>
              <button
                type="button"
                onClick={() => setIsBrandPickerOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-transparent border-b-gray-200 text-left text-gray-500 hover:bg-gray-100"
              >
                <span className={selectedBrandName ? "text-gray-900" : ""}>
                  {selectedBrandName ?? "Выбрать бренд"}
                </span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Категория
                <span className="text-red-600">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryPickerOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-transparent border-b-gray-200 text-left text-gray-500 hover:bg-gray-100"
              >
                <span className={selectedCategoryName ? "text-gray-900" : ""}>
                  {selectedCategoryName ?? "Выбрать категорию"}
                </span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Цена
                <span className="text-red-600">*</span>
              </label>
              <div className="relative flex items-center">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="...0"
                  className="pr-10 border-0 border-b rounded-none bg-gray-50 focus-visible:ring-0"
                />
                <span className="absolute right-3 text-gray-500">₽</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">
                  Опубликован (показывать в каталоге)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">
                  В наличии
                </span>
              </label>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasDiscount}
                onChange={(e) => setHasDiscount(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Есть скидка
              </span>
            </label>

            {hasDiscount && (
              <div className="space-y-4 rounded-lg border bg-gray-50/50 p-4">
                {!hasValidPrice && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Введите цену товара выше
                  </p>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Скидка
                  </label>
                  <div className="relative flex items-center">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      placeholder="0"
                      className="pr-10 border-0 border-b rounded-none bg-white focus-visible:ring-0"
                    />
                    <span className="absolute right-3 text-gray-500">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Итоговая сумма с учётом скидки
                  </label>
                  <div className="relative flex items-center">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={totalWithDiscount}
                      onChange={(e) =>
                        handleTotalWithDiscountChange(e.target.value)
                      }
                      placeholder="0"
                      className="pr-10 border-0 border-b rounded-none bg-white focus-visible:ring-0"
                    />
                    <span className="absolute right-3 text-gray-500">₽</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Период скидки (от — до)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDiscountCalendarOpen(true)}
                      className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-left text-gray-500 hover:bg-gray-50 text-sm"
                    >
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {formatDiscountDateDisplay(discountDateRange)}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDiscountDateRange({ from: null, to: null })
                      }
                      className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-500"
                      aria-label="Очистить дату"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t pt-4 mt-6 space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Фото товара или услуги
                <span className="text-red-600">*</span>
                <span className="text-gray-500 font-normal"> (от 1 до 12)</span>
              </p>
              <p className="text-xs text-gray-500">
                Нужно минимум одно фото. Первое фото показывается на карточке в
                каталоге.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 hover:bg-gray-50"
              >
                <Camera className="w-5 h-5 mr-2" />
                Добавить фото
              </Button>
            </div>

            <Button
              type="submit"
              disabled={submitInProgress}
              className="w-full mt-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black disabled:opacity-70"
            >
              {submitInProgress ? "Сохранение…" : "Сохранить изменения"}
            </Button>
          </form>
          )}
        </div>
      </SheetContent>
    </Sheet>

    <BrandPickerSheet
      business={business}
      open={isBrandPickerOpen}
      onOpenChange={setIsBrandPickerOpen}
      selectedBrandId={selectedBrandId}
      onSelect={(id, name) => {
        setSelectedBrandId(id);
        setSelectedBrandName(name);
      }}
    />
    <CategoryPickerSheet
      business={business}
      open={isCategoryPickerOpen}
      onOpenChange={setIsCategoryPickerOpen}
      selectedCategoryId={selectedCategoryId}
      onSelect={(id, name) => {
        setSelectedCategoryId(id);
        setSelectedCategoryName(name);
      }}
    />
    <DiscountDatePickerDialog
      open={isDiscountCalendarOpen}
      onOpenChange={setIsDiscountCalendarOpen}
      selectedRange={discountDateRange}
      onSelectRange={setDiscountDateRange}
    />
    </>
  );
}
