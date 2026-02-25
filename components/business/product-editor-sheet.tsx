"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSheetDrag } from "@/lib/useSheetDrag";
import { Business } from "@/types";
import { X, ChevronRight, Camera, Calendar, Trash2, Loader2, FileSpreadsheet } from "lucide-react";
import { useBulkImport } from "./profile-editor-context";
import { BrandPickerSheet } from "./brand-picker-sheet";
import { CategoryPickerSheet } from "./category-picker-sheet";
import type { DiscountDateRange } from "./discount-date-picker-dialog";
import {
  DiscountDatePickerDialog,
  formatDiscountDateDisplay,
} from "./discount-date-picker-dialog";
import { ProductImageCropSheet } from "./product-image-crop-sheet";
import { calcDiscountPercent } from "@/lib/discount";
import {
  getProduct,
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
  reorderProductImages,
  type ProductImageForEdit,
} from "@/app/admin/product/actions";

const NAME_MAX_LENGTH = 70;
const SUBTITLE_MAX_LENGTH = 60;
const DESCRIPTION_MAX_LENGTH = 2000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/** Элемент списка для отображения (серверное фото или pending) */
interface DisplayImageItem {
  id: string;
  url: string;
  position: number;
  /** Индекс в массиве images (для «Главное» и удаления серверного) */
  originalIndex?: number;
  isPendingAdd?: boolean;
  file?: File;
}

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
  const [basePrice, setBasePrice] = useState("");
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
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
  const [isActive, setIsActive] = useState(true);
  const [inStock, setInStock] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [isBrandPickerOpen, setIsBrandPickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isDiscountCalendarOpen, setIsDiscountCalendarOpen] = useState(false);
  const [images, setImages] = useState<ProductImageForEdit[]>([]);
  const [imageUploading] = useState(false);
  const [cropSheetOpen, setCropSheetOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropReplacingImageId, setCropReplacingImageId] = useState<string | null>(null);
  const [cropReplacingIndex, setCropReplacingIndex] = useState<number | null>(null);
  const [pendingAddFiles, setPendingAddFiles] = useState<{ id: string; url: string; file: File }[]>([]);
  const [pendingReplaces, setPendingReplaces] = useState<Record<string, { index: number; url: string; file: File }>>({});
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [pendingMainImageId, setPendingMainImageId] = useState<string | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const openBulkImport = useBulkImport();
  const imageInputRef = useRef<HTMLInputElement>(null);
  /** Ref для проверки несохранённых изменений при любом способе закрытия (свайп, кнопка, overlay). */
  const hasUnsavedRef = useRef<() => boolean>(() => false);
  const initialFormRef = useRef<{
    name: string;
    subtitle: string;
    description: string;
    basePrice: string;
    categoryId: string | null;
    brandId: string | null;
    isActive: boolean;
    inStock: boolean;
    hasDiscount: boolean;
    discountedPrice: string;
    discountPercent: string;
    discountDateFrom: string | null;
    discountDateTo: string | null;
  } | null>(null);

  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange: handleSheetOpenChange,
  });

  const hasPendingImageChanges = useCallback(
    () =>
      pendingAddFiles.length > 0 ||
      Object.keys(pendingReplaces).length > 0 ||
      pendingDeleteIds.length > 0 ||
      pendingMainImageId != null,
    [pendingAddFiles.length, pendingReplaces, pendingDeleteIds.length, pendingMainImageId]
  );

  const hasFormDirty = useCallback(() => {
    const i = initialFormRef.current;
    if (!i) return false;
    const from = discountDateRange.from ?? null;
    const to = discountDateRange.to ?? null;
    return (
      name !== i.name ||
      subtitle !== i.subtitle ||
      description !== i.description ||
      basePrice !== i.basePrice ||
      selectedCategoryId !== i.categoryId ||
      selectedBrandId !== i.brandId ||
      isActive !== i.isActive ||
      inStock !== i.inStock ||
      hasDiscount !== i.hasDiscount ||
      discountedPrice !== i.discountedPrice ||
      discountPercent !== i.discountPercent ||
      from !== i.discountDateFrom ||
      to !== i.discountDateTo
    );
  }, [name, subtitle, description, basePrice, selectedCategoryId, selectedBrandId, isActive, inStock, hasDiscount, discountedPrice, discountPercent, discountDateRange.from, discountDateRange.to]);

  const displayImages = useMemo((): DisplayImageItem[] => {
    const list: DisplayImageItem[] = [];
    images.forEach((img, idx) => {
      if (pendingDeleteIds.includes(img.id)) return;
      const replace = pendingReplaces[img.id];
      list.push({
        id: img.id,
        url: replace?.url ?? img.url,
        position: list.length,
        originalIndex: idx,
      });
    });
    pendingAddFiles.forEach((p) => {
      list.push({
        id: p.id,
        url: p.url,
        position: list.length,
        isPendingAdd: true,
        file: p.file,
      });
    });
    if (pendingMainImageId && list.length > 1) {
      const idx = list.findIndex((i) => i.id === pendingMainImageId);
      if (idx > 0) {
        const [main] = list.splice(idx, 1);
        list.unshift(main);
      }
    }
    return list;
  }, [images, pendingReplaces, pendingAddFiles, pendingDeleteIds, pendingMainImageId]);

  hasUnsavedRef.current = () => hasPendingImageChanges() || hasFormDirty();

  function handleSheetOpenChange(nextOpen: boolean) {
    if (!nextOpen && hasUnsavedRef.current()) {
      setShowUnsavedConfirm(true);
      return;
    }
    onOpenChange(nextOpen);
  }

  function handleConfirmClose() {
    pendingAddFiles.forEach((p) => URL.revokeObjectURL(p.url));
    Object.values(pendingReplaces).forEach((r) => URL.revokeObjectURL(r.url));
    setPendingAddFiles([]);
    setPendingReplaces({});
    setPendingDeleteIds([]);
    setPendingMainImageId(null);
    setShowUnsavedConfirm(false);
    onOpenChange(false);
  }

  const resetForm = useCallback(() => {
    setName("");
    setSubtitle("");
    setDescription("");
    setBasePrice("");
    setHasDiscount(false);
    setDiscountedPrice("");
    setDiscountPercent("");
    setDiscountDateRange({ from: null, to: null });
    setSelectedBrandId(null);
    setSelectedBrandName(null);
    setSelectedCategoryId(null);
    setSelectedCategoryName(null);
    setIsActive(true);
    setInStock(true);
    setSubmitError(null);
    setImages([]);
    setPendingAddFiles([]);
    setPendingReplaces({});
    setPendingDeleteIds([]);
    setPendingMainImageId(null);
    initialFormRef.current = {
      name: "",
      subtitle: "",
      description: "",
      basePrice: "",
      categoryId: null,
      brandId: null,
      isActive: true,
      inStock: true,
      hasDiscount: false,
      discountedPrice: "",
      discountPercent: "",
      discountDateFrom: null,
      discountDateTo: null,
    };
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
          setSelectedCategoryId(p.categoryId);
          setSelectedCategoryName(p.categoryName ?? null);
          const hasDisc = p.hasDiscount ?? false;
          const orig = p.originalPrice;
          setBasePrice(
            hasDisc && orig != null ? String(orig) : String(p.price)
          );
          setHasDiscount(hasDisc);
          setDiscountedPrice(hasDisc && orig != null ? String(p.price) : "");
          setDiscountPercent("");
          setDiscountDateRange({
            from: p.discountDateFrom ?? null,
            to: p.discountDateTo ?? null,
          });
          setImages(p.images ?? []);
          initialFormRef.current = {
            name: p.name,
            subtitle: p.subtitle ?? "",
            description: p.description ?? "",
            basePrice:
              hasDisc && orig != null ? String(orig) : String(p.price),
            categoryId: p.categoryId,
            brandId: p.brandId,
            isActive: p.isActive,
            inStock: p.inStock,
            hasDiscount: hasDisc,
            discountedPrice: hasDisc && orig != null ? String(p.price) : "",
            discountPercent: "",
            discountDateFrom: p.discountDateFrom ?? null,
            discountDateTo: p.discountDateTo ?? null,
          };
        }
      });
    } else {
      setLoadingProduct(false);
      resetForm();
    }
  }, [open, productId, resetForm]);

  const basePriceNum = parseFloat(basePrice.replace(",", "."));
  const discountedPriceNum = parseFloat(discountedPrice.replace(",", "."));
  const discountPercentNum = parseFloat(discountPercent.replace(",", "."));
  const hasValidBasePrice = !Number.isNaN(basePriceNum) && basePriceNum > 0;
  const hasValidDiscountedPrice =
    !Number.isNaN(discountedPriceNum) &&
    discountedPriceNum > 0 &&
    discountedPriceNum < basePriceNum;
  const hasValidDiscountPercent =
    !Number.isNaN(discountPercentNum) &&
    discountPercentNum > 0 &&
    discountPercentNum < 100;

  const computedDiscountPercent =
    hasValidBasePrice && hasValidDiscountedPrice
      ? calcDiscountPercent(basePriceNum, discountedPriceNum)
      : null;
  const computedDiscountedPrice =
    hasValidBasePrice && hasValidDiscountPercent
      ? Math.round(basePriceNum * (1 - discountPercentNum / 100) * 100) / 100
      : null;

  const displayPercent =
    hasValidDiscountPercent ? discountPercentNum : computedDiscountPercent;
  const displayDiscountedPrice =
    hasValidDiscountedPrice ? discountedPriceNum : computedDiscountedPrice;

  function handleDiscountedPriceChange(value: string) {
    setDiscountedPrice(value);
    setDiscountPercent("");
  }
  function handleDiscountPercentInputChange(value: string) {
    setDiscountPercent(value);
    setDiscountedPrice("");
  }

  /** Выбор файла: открывает модалку обрезки (3:4); при создании — в pending, при редактировании — загрузка после сохранения */
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSubmitError("Файл должен быть изображением");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setSubmitError("Размер файла не должен превышать 5MB");
      return;
    }
    setSubmitError(null);
    setCropReplacingImageId(null);
    setCropReplacingIndex(null);
    setCropImageSrc(URL.createObjectURL(file));
    setCropSheetOpen(true);
    e.target.value = "";
  }

  /** Открыть кроп по клику на превью существующего фото (замена) */
  function openCropForExistingImage(img: ProductImageForEdit, index: number) {
    setSubmitError(null);
    setCropReplacingImageId(img.id);
    setCropReplacingIndex(index);
    setCropImageSrc(img.url);
    setCropSheetOpen(true);
  }

  /** После обрезки: добавляем в pending (на сервер — только по «Сохранить изменения») */
  function handleCropComplete(croppedFile: File) {
    const replacingId = cropReplacingImageId;
    const replacingIndex = cropReplacingIndex;
    if (cropImageSrc?.startsWith("blob:")) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(null);
    setCropReplacingImageId(null);
    setCropReplacingIndex(null);
    setCropSheetOpen(false);
    const url = URL.createObjectURL(croppedFile);
    if (replacingId != null && replacingIndex != null) {
      setPendingReplaces((prev) => ({
        ...prev,
        [replacingId]: { index: replacingIndex, url, file: croppedFile },
      }));
    } else {
      setPendingAddFiles((prev) => [
        ...prev,
        { id: `pending-add-${Date.now()}`, url, file: croppedFile },
      ]);
    }
  }

  function handleCropSheetOpenChange(open: boolean) {
    setCropSheetOpen(open);
    if (!open) {
      if (cropImageSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(cropImageSrc);
      }
      setCropImageSrc(null);
      setCropReplacingImageId(null);
      setCropReplacingIndex(null);
    }
  }

  /** Удаление фото: pending-add убираем из списка; серверное — помечаем на удаление при сохранении */
  function handleDeleteImage(imageId: string) {
    if (imageId.startsWith("pending-add-")) {
      setPendingAddFiles((prev) => {
        const item = prev.find((p) => p.id === imageId);
        if (item) URL.revokeObjectURL(item.url);
        return prev.filter((p) => p.id !== imageId);
      });
      return;
    }
    setPendingDeleteIds((prev) => (prev.includes(imageId) ? prev : [...prev, imageId]));
    setPendingReplaces((prev) => {
      const next = { ...prev };
      const rep = next[imageId];
      if (rep) URL.revokeObjectURL(rep.url);
      delete next[imageId];
      return next;
    });
  }

  /** Пометить фото как главное; порядок применится при сохранении */
  function handleSetMainImage(imageId: string) {
    setPendingMainImageId(imageId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      const msg = "Введите название";
      setSubmitError(msg);
      toast.error(msg);
      return;
    }
    if (!selectedCategoryId) {
      const msg = "Выберите категорию";
      setSubmitError(msg);
      toast.error(msg);
      return;
    }
    if (displayImages.length === 0) {
      const msg = "Добавьте минимум одно фото";
      setSubmitError(msg);
      toast.error(msg);
      return;
    }
    const baseVal = parseFloat(basePrice.replace(",", "."));
    if (Number.isNaN(baseVal) || baseVal < 0) {
      const msg = "Укажите корректную цену";
      setSubmitError(msg);
      toast.error(msg);
      return;
    }
    let finalPrice = baseVal;
    let origPrice: number | null = null;
    if (hasDiscount) {
      if (hasValidDiscountedPrice) {
        finalPrice = discountedPriceNum;
        origPrice = baseVal;
      } else if (hasValidDiscountPercent) {
        finalPrice =
          Math.round(baseVal * (1 - discountPercentNum / 100) * 100) / 100;
        origPrice = baseVal;
      } else {
        const msg = "Введите цену со скидкой или процент скидки";
        setSubmitError(msg);
        toast.error(msg);
        return;
      }
    }

    setSubmitError(null);
    setSubmitInProgress(true);
    const payload = {
      name: name.trim(),
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      price: finalPrice,
      hasDiscount,
      originalPrice: origPrice,
      discountDateFrom: hasDiscount ? discountDateRange.from : null,
      discountDateTo: hasDiscount ? discountDateRange.to : null,
      categoryId: selectedCategoryId,
      brandId: selectedBrandId,
      inStock: inStock,
      isActive: isActive,
    };
    let currentProductId = productId ?? undefined;
    const result = currentProductId
      ? await updateProduct(currentProductId, payload, business.slug)
      : await createProduct(business.id, payload, business.slug);
    if (result.error) {
      setSubmitInProgress(false);
      setSubmitError(result.error);
      toast.error(result.error);
      return;
    }
    if (result.data?.id) currentProductId = result.data.id;
    if (currentProductId) {
      let currentImages = [...images];
      const replaceMap: Record<string, string> = {};
      for (const key of Object.keys(pendingReplaces)) {
        const rep = pendingReplaces[key];
        const formData = new FormData();
        formData.append("file", rep.file);
        const up = await uploadProductImage(currentProductId, formData, business.slug);
        if (up.error) {
          setSubmitError(up.error);
          toast.error(up.error);
          setSubmitInProgress(false);
          return;
        }
        if (!up.data) continue;
        replaceMap[key] = up.data.id;
        const newOrderedIds = currentImages.map((img, idx) => (idx === rep.index ? up.data!.id : img.id));
        const reorderRes = await reorderProductImages(currentProductId, newOrderedIds, business.slug);
        if (reorderRes.error) {
          setSubmitError(reorderRes.error);
          toast.error(reorderRes.error);
          setSubmitInProgress(false);
          return;
        }
        await deleteProductImage(key, business.slug);
        currentImages = currentImages.map((img, idx) =>
          idx === rep.index ? { id: up.data!.id, url: up.data!.url, position: idx } : img
        );
      }
      const newIdsFromAdds: string[] = [];
      const pendingIdToServerId: Record<string, string> = {};
      for (const p of pendingAddFiles) {
        const formData = new FormData();
        formData.append("file", p.file);
        const up = await uploadProductImage(currentProductId, formData, business.slug);
        if (up.error) {
          setSubmitError(up.error);
          toast.error(up.error);
          setSubmitInProgress(false);
          return;
        }
        if (up.data) {
          setImages((prev) => [...prev, up.data!]);
          newIdsFromAdds.push(up.data.id);
          pendingIdToServerId[p.id] = up.data.id;
        }
      }
      setImages(currentImages);
      for (const id of pendingDeleteIds) {
        const delRes = await deleteProductImage(id, business.slug);
        if (delRes.error) {
          setSubmitError(delRes.error);
          toast.error(delRes.error);
          setSubmitInProgress(false);
          return;
        }
      }
      setImages((prev) => prev.filter((img) => !pendingDeleteIds.includes(img.id)));
      if (pendingMainImageId) {
        const mainId = replaceMap[pendingMainImageId] ?? pendingIdToServerId[pendingMainImageId] ?? pendingMainImageId;
        const afterDelete = currentImages.filter((img) => !pendingDeleteIds.includes(img.id));
        const allIds = [...afterDelete.map((i) => i.id), ...newIdsFromAdds];
        if (allIds.includes(mainId)) {
          const finalOrder = [mainId, ...allIds.filter((id) => id !== mainId)];
          const reorderRes = await reorderProductImages(currentProductId, finalOrder, business.slug);
          if (reorderRes.error) {
            setSubmitError(reorderRes.error);
            toast.error(reorderRes.error);
          }
        }
      }
      pendingAddFiles.forEach((p) => URL.revokeObjectURL(p.url));
      Object.values(pendingReplaces).forEach((r) => URL.revokeObjectURL(r.url));
      setPendingAddFiles([]);
      setPendingReplaces({});
      setPendingDeleteIds([]);
      setPendingMainImageId(null);
    }
    setSubmitInProgress(false);
    toast.success(productId ? "Изменения сохранены" : "Товар добавлен");
    router.refresh();
    onOpenChange(false);
  }

  return (
    <>
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="w-full min-h-[85vh] max-h-[95vh] rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
        style={sheetStyle}
      >
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
            onClick={() => handleSheetOpenChange(false)}
            className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0 touch-manipulation"
            aria-label="Закрыть редактор"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          {...dragHandlers}
          className="px-6 pt-4 pb-3 border-b cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <SheetTitle className="text-xl font-bold">Редактор позиции</SheetTitle>
          <SheetDescription className="text-sm text-gray-500 mt-2">
            {productId
              ? "Редактирование позиции"
              : "Позиция появится в каталоге после сохранения"}
          </SheetDescription>
          <p className="text-xs text-gray-500 mt-1">
            <span className="text-red-600">*</span> — обязательные поля
          </p>
          {openBulkImport && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openBulkImport}
                className="gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Импорт из Excel
              </Button>
            </div>
          )}
        </div>

        <div
          className="flex-1 min-h-[60vh] overflow-y-auto px-6 py-4 flex flex-col"
          style={scrollableStyle}
        >
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
                  disabled={submitInProgress}
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
                  disabled={submitInProgress}
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
                  disabled={submitInProgress}
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
                onClick={() => !submitInProgress && setIsBrandPickerOpen(true)}
                disabled={submitInProgress}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-transparent border-b-gray-200 text-left text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                onClick={() => !submitInProgress && setIsCategoryPickerOpen(true)}
                disabled={submitInProgress}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-transparent border-b-gray-200 text-left text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className={selectedCategoryName ? "text-gray-900" : ""}>
                  {selectedCategoryName ?? "Выбрать категорию"}
                </span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {hasDiscount ? "Старая цена" : "Цена"}
                <span className="text-red-600">*</span>
              </label>
              <div className="relative flex items-center">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="...0"
                  disabled={submitInProgress}
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
                onChange={(e) => {
                  const v = e.target.checked;
                  setHasDiscount(v);
                  if (!v) {
                    setDiscountedPrice("");
                    setDiscountPercent("");
                  }
                }}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Есть скидка
              </span>
            </label>

            {hasDiscount && (
              <div className="space-y-4 rounded-lg border bg-gray-50/50 p-4">
                {!hasValidBasePrice && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Введите старую цену выше
                  </p>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Цена со скидкой
                  </label>
                  <div className="relative flex items-center">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={
                        hasValidDiscountedPrice
                          ? discountedPrice
                          : displayDiscountedPrice != null
                            ? String(displayDiscountedPrice)
                            : ""
                      }
                      onChange={(e) =>
                        handleDiscountedPriceChange(e.target.value)
                      }
                      placeholder="Например: 450"
                      className="pr-10 border-0 border-b rounded-none bg-white focus-visible:ring-0"
                    />
                    <span className="absolute right-3 text-gray-500">₽</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Или скидка %
                  </label>
                  <div className="relative flex items-center">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={
                        hasValidDiscountPercent
                          ? discountPercent
                          : displayPercent != null
                            ? String(Math.round(displayPercent))
                            : ""
                      }
                      onChange={(e) =>
                        handleDiscountPercentInputChange(e.target.value)
                      }
                      placeholder="Например: 25"
                      className="pr-10 border-0 border-b rounded-none bg-white focus-visible:ring-0"
                    />
                    <span className="absolute right-3 text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Введите цену со скидкой или процент — второе рассчитается само.
                  </p>
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
                  <p className="text-xs text-gray-500">
                    Опционально. Если не задано — скидка действует всегда.
                  </p>
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
              {displayImages.length > 0 && (
                <ul className="grid grid-cols-3 gap-2">
                  {displayImages.map((item, displayIndex) => {
                    const canOpenCrop = item.originalIndex != null;
                    const canSetMain = displayIndex > 0 && (item.isPendingAdd || (item.originalIndex != null && item.originalIndex > 0));
                    return (
                      <li
                        key={item.id}
                        className="relative flex flex-col rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            canOpenCrop &&
                            openCropForExistingImage(images[item.originalIndex!], item.originalIndex!)
                          }
                          disabled={!canOpenCrop}
                          className="relative aspect-square w-full block cursor-pointer disabled:cursor-default disabled:pointer-events-none text-left"
                          aria-label={canOpenCrop ? "Обрезать фото" : "Превью"}
                        >
                          <Image
                            src={item.url}
                            alt=""
                            width={160}
                            height={160}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                          <span className="absolute bottom-1 left-1 text-xs font-medium text-white bg-black/50 rounded px-1">
                            {displayIndex + 1} / {displayImages.length}
                          </span>
                        </button>
                        <div className="flex items-center justify-center gap-1 p-1.5 bg-gray-50 border-t border-gray-200">
                          {canSetMain && (
                            <button
                              type="button"
                              onClick={() => handleSetMainImage(item.id)}
                              className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-medium touch-manipulation hover:bg-amber-200"
                              aria-label="Сделать главным"
                            >
                              Главное
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(item.id)}
                            className="p-1.5 rounded-md bg-red-500 text-white touch-manipulation disabled:opacity-50 disabled:pointer-events-none"
                            aria-label="Удалить фото"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {displayImages.length < 12 && (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={imageUploading || submitInProgress}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={imageUploading || submitInProgress}
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 hover:bg-gray-50"
                  >
                    {imageUploading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 mr-2" />
                    )}
                    {imageUploading ? "Загрузка…" : "Добавить фото"}
                  </Button>
                </>
              )}
            </div>

            {submitError && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2"
                role="alert"
              >
                <span className="flex-1">{submitError}</span>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="text-red-500 hover:text-red-700 shrink-0"
                  aria-label="Закрыть"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={submitInProgress}
              className="w-full bg-brand-yellow hover:bg-brand-yellow/90 text-brand-yellow-foreground font-normal text-base py-6 rounded-lg"
            >
              {submitInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение…
                </>
              ) : (
                "Сохранить изменения"
              )}
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
    <ProductImageCropSheet
      open={cropSheetOpen}
      onOpenChange={handleCropSheetOpenChange}
      imageSrc={cropImageSrc}
      onComplete={handleCropComplete}
    />
    <Dialog open={showUnsavedConfirm} onOpenChange={setShowUnsavedConfirm}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Вы не сохранили изменения</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Закрыть редактор без сохранения? Все несохранённые изменения (поля формы и фото) будут потеряны.
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowUnsavedConfirm(false)}
          >
            Остаться
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmClose}
          >
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
