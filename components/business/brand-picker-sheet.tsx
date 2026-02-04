"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSheetDrag } from "@/lib/useSheetDrag";
import { Business, Brand } from "@/types";
import { X, Plus, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  getProductCountByBrand,
} from "@/app/admin/brand/actions";

const BRAND_NAME_MAX_LENGTH = 40;

interface BrandPickerSheetProps {
  business: Business;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Вызов при выборе бренда (id, name) или сбросе (null, null) */
  onSelect?: (brandId: string | null, brandName: string | null) => void;
  /** Текущий выбранный id для подсветки */
  selectedBrandId?: string | null;
}

/**
 * Модалка выбора/управления брендами (roadmap этап 4).
 * Список из БД, добавление, переименование, удаление (с подтверждением и опцией «удалить связанные товары»), выбор для товара.
 */
export function BrandPickerSheet({
  business,
  open,
  onOpenChange,
  onSelect,
  selectedBrandId = null,
}: BrandPickerSheetProps) {
  const [newBrandName, setNewBrandName] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [relatedProductCount, setRelatedProductCount] = useState(0);
  const [deleteWithProducts, setDeleteWithProducts] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [addBrandInProgress, setAddBrandInProgress] = useState(false);
  /** id бренда, для которого идёт загрузка перед открытием модалки удаления */
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null);

  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange,
  });

  const isDeleteSheetOpen = !!brandToDelete;
  const {
    dragHandlers: deleteDragHandlers,
    sheetStyle: deleteSheetStyle,
  } = useSheetDrag({
    open: isDeleteSheetOpen,
    onOpenChange: (open) => !open && setBrandToDelete(null),
  });

  const fetchBrands = useCallback(async () => {
    if (!business.id) return;
    setLoading(true);
    setError(null);
    const result = await getBrands(business.id, true);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const sorted =
      (result.data ?? []).slice().sort((a, b) =>
        a.name.localeCompare(b.name, "ru")
      );
    setBrands(sorted);
  }, [business.id]);

  useEffect(() => {
    if (open && business.id) {
      fetchBrands();
      setEditingBrandId(null);
      setEditingName("");
    }
  }, [open, business.id, fetchBrands]);

  async function handleAddBrand() {
    const name = newBrandName.trim();
    if (!name) return;
    setError(null);
    setAddBrandInProgress(true);
    const result = await createBrand(business.id, name, business.slug);
    setAddBrandInProgress(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNewBrandName("");
    await fetchBrands();
  }

  async function handleStartRename(brand: Brand) {
    setEditingBrandId(brand.id);
    setEditingName(brand.name);
  }

  async function handleSaveRename() {
    if (!editingBrandId || !editingName.trim()) {
      setEditingBrandId(null);
      setEditingName("");
      return;
    }
    setError(null);
    const result = await updateBrand(
      editingBrandId,
      editingName.trim(),
      business.slug
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingBrandId(null);
    setEditingName("");
    await fetchBrands();
  }

  async function handleDeleteClick(brand: Brand, e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    setDeletingBrandId(brand.id);
    const result = await getProductCountByBrand(brand.id);
    setDeletingBrandId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRelatedProductCount(result.count ?? 0);
    setDeleteWithProducts(false);
    setBrandToDelete(brand);
  }

  async function handleConfirmDelete() {
    if (!brandToDelete) return;
    setDeleteInProgress(true);
    setError(null);
    const result = await deleteBrand(
      brandToDelete.id,
      deleteWithProducts,
      business.slug
    );
    setDeleteInProgress(false);
    setBrandToDelete(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    await fetchBrands();
  }

  function handleSelectBrand(brand: Brand) {
    onSelect?.(brand.id, brand.name);
    onOpenChange(false);
  }

  function handleSelectNone() {
    onSelect?.(null, null);
    onOpenChange(false);
  }

  function handleClose() {
    setError(null);
    setEditingBrandId(null);
    onOpenChange(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="w-full max-h-[95vh] rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
          style={sheetStyle}
        >
          <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-gray-100">
            <div className="w-8 flex-shrink-0" aria-hidden />
            <div
              {...dragHandlers}
              className="flex-1 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none min-w-0 py-0.5"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="px-6 pt-4 pb-3 border-b">
            <SheetTitle className="text-xl font-bold">
              Выбор бренда
            </SheetTitle>
            <SheetDescription className="text-sm text-gray-500 mt-2">
              Добавьте бренд или выберите из списка. Бренды отображаются в
              фильтрах каталога.
            </SheetDescription>
          </div>

          <div
            className="flex-1 overflow-y-auto px-6 py-4"
            style={scrollableStyle}
          >
            <div className="space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Добавить бренд
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={newBrandName}
                      onChange={(e) =>
                        setNewBrandName(
                          e.target.value.slice(0, BRAND_NAME_MAX_LENGTH)
                        )
                      }
                      placeholder="Введите название бренда"
                      className="pr-12 border-0 border-b rounded-none bg-gray-50 focus-visible:ring-0"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {newBrandName.length}/{BRAND_NAME_MAX_LENGTH}
                    </span>
                  </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full w-10 h-10 flex-shrink-0 border-2"
                  onClick={handleAddBrand}
                  disabled={!newBrandName.trim() || addBrandInProgress}
                  aria-label="Добавить бренд"
                >
                  {addBrandInProgress ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Выбрать бренд
                </label>
                <div className="rounded-lg border bg-gray-50/50 min-h-[280px] max-h-[280px] overflow-y-auto flex flex-col">
                  {loading ? (
                    <div className="flex-1 flex items-center justify-center min-h-[280px]">
                      <Loader2 className="h-8 w-8 text-gray-400 animate-spin" aria-hidden />
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleSelectNone}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors text-left"
                      >
                        <span className="text-gray-500 font-medium">
                          Без бренда
                        </span>
                        {!selectedBrandId && (
                          <Check className="h-5 w-5 text-gray-600" />
                        )}
                      </button>
                      {brands.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-gray-500 text-center border-t">
                          Список брендов пуст. Добавьте бренд выше.
                        </p>
                      ) : (
                        <ul className="divide-y border-t">
                          {brands.map((brand) => (
                            <li key={brand.id}>
                              <div className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 transition-colors">
                                {editingBrandId !== brand.id && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartRename(brand)}
                                      className="p-1 rounded hover:bg-gray-200 flex-shrink-0"
                                      aria-label="Переименовать"
                                    >
                                      <Pencil className="h-4 w-4 text-gray-500" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleDeleteClick(brand, e)
                                      }
                                      disabled={deletingBrandId === brand.id}
                                      className="p-1 rounded hover:bg-gray-200 flex-shrink-0 disabled:opacity-70 disabled:pointer-events-none w-6 h-6 flex items-center justify-center"
                                      aria-label="Удалить"
                                    >
                                      {deletingBrandId === brand.id ? (
                                        <Loader2 className="h-4 w-4 text-gray-500 animate-spin" aria-hidden />
                                      ) : (
                                        <Trash2 className="h-4 w-4 text-gray-500" />
                                      )}
                                    </button>
                                  </>
                                )}
                                {editingBrandId === brand.id ? (
                                  <div className="flex-1 flex items-center gap-2 min-w-0">
                                    <Input
                                      value={editingName}
                                      onChange={(e) =>
                                        setEditingName(
                                          e.target.value.slice(
                                            0,
                                            BRAND_NAME_MAX_LENGTH
                                          )
                                        )
                                      }
                                      onBlur={handleSaveRename}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          handleSaveRename();
                                        if (e.key === "Escape") {
                                          setEditingBrandId(null);
                                          setEditingName("");
                                        }
                                      }}
                                      className="flex-1 border-0 border-b rounded-none bg-white h-8 text-sm"
                                      autoFocus
                                    />
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 flex-shrink-0"
                                      onClick={handleSaveRename}
                                      aria-label="Сохранить"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectBrand(brand)}
                                    className="flex-1 flex items-center justify-between text-left min-w-0"
                                  >
                                    <span
                                      className={`font-medium truncate ${
                                        selectedBrandId === brand.id
                                          ? "text-gray-900"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      {brand.name}
                                    </span>
                                    {selectedBrandId === brand.id && (
                                      <Check className="h-5 w-5 text-gray-600 flex-shrink-0 ml-2" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>

              <Button
                type="button"
                onClick={handleClose}
                className="w-full mt-4 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black"
              >
                Готово
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isDeleteSheetOpen} onOpenChange={(open) => !open && setBrandToDelete(null)}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="w-full max-h-[95vh] rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
          style={deleteSheetStyle}
        >
          <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-gray-100">
            <div className="w-8 flex-shrink-0" aria-hidden />
            <div
              {...deleteDragHandlers}
              className="flex-1 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none min-w-0 py-0.5"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            <button
              type="button"
              onClick={() => setBrandToDelete(null)}
              className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="px-6 pt-4 pb-3 border-b">
            <SheetTitle className="text-xl font-bold">
              Удалить этот бренд?
            </SheetTitle>
            <SheetDescription className="text-sm text-gray-500 mt-2">
              Все данные удаляться безвозвратно
            </SheetDescription>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {relatedProductCount > 0 && (
              <label className="flex flex-col gap-1 cursor-pointer mb-4">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={deleteWithProducts}
                    onChange={(e) => setDeleteWithProducts(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  удалить связанные товары
                </span>
                <span className="text-xs text-gray-500">
                  кол-во: {relatedProductCount}
                </span>
              </label>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBrandToDelete(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-900 hover:bg-gray-200 rounded-xl font-semibold border-0"
              >
                Нет
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteInProgress}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black"
              >
                {deleteInProgress ? "…" : "Да"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
