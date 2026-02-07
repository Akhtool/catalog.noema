"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSheetDrag } from "@/lib/useSheetDrag";
import { Business, Category } from "@/types";
import { X, Plus, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getProductCountByCategory,
} from "@/app/admin/category/actions";

const CATEGORY_NAME_MAX_LENGTH = 60;

interface CategoryPickerSheetProps {
  business: Business;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Вызов при выборе категории (id, name) */
  onSelect?: (categoryId: string | null, categoryName: string | null) => void;
  /** Текущий выбранный id для подсветки */
  selectedCategoryId?: string | null;
}

/**
 * Модалка выбора/управления категориями (roadmap этап 5).
 * Список из БД, добавление, переименование, удаление (с подтверждением и опцией «удалить связанные товары»), выбор для товара.
 */
export function CategoryPickerSheet({
  business,
  open,
  onOpenChange,
  onSelect,
  selectedCategoryId = null,
}: CategoryPickerSheetProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editingName, setEditingName] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [relatedProductCount, setRelatedProductCount] = useState(0);
  const [deleteWithProducts, setDeleteWithProducts] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null
  );
  const [addCategoryInProgress, setAddCategoryInProgress] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange,
    scrollRef,
  });

  const isDeleteSheetOpen = !!categoryToDelete;
  const {
    dragHandlers: deleteDragHandlers,
    sheetStyle: deleteSheetStyle,
  } = useSheetDrag({
    open: isDeleteSheetOpen,
    onOpenChange: (open) => !open && setCategoryToDelete(null),
  });

  const fetchCategories = useCallback(async () => {
    if (!business.id) return;
    setLoading(true);
    setError(null);
    const result = await getCategories(business.id, true);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setCategories(result.data ?? []);
  }, [business.id]);

  useEffect(() => {
    if (open && business.id) {
      fetchCategories();
      setEditingCategoryId(null);
      setEditingName("");
    }
  }, [open, business.id, fetchCategories]);

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setError(null);
    setAddCategoryInProgress(true);
    const result = await createCategory(business.id, name, business.slug);
    setAddCategoryInProgress(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNewCategoryName("");
    await fetchCategories();
  }

  function handleStartRename(category: Category) {
    setEditingCategoryId(category.id);
    setEditingName(category.name);
  }

  async function handleSaveRename() {
    if (!editingCategoryId || !editingName.trim()) {
      setEditingCategoryId(null);
      setEditingName("");
      return;
    }
    setError(null);
    const result = await updateCategory(
      editingCategoryId,
      { name: editingName.trim() },
      business.slug
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingCategoryId(null);
    setEditingName("");
    await fetchCategories();
  }

  async function handleDeleteClick(category: Category, e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    setDeletingCategoryId(category.id);
    const result = await getProductCountByCategory(category.id);
    setDeletingCategoryId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRelatedProductCount(result.count ?? 0);
    setDeleteWithProducts(false);
    setCategoryToDelete(category);
  }

  async function handleConfirmDelete() {
    if (!categoryToDelete) return;
    setDeleteInProgress(true);
    setError(null);
    const result = await deleteCategory(
      categoryToDelete.id,
      deleteWithProducts,
      business.slug
    );
    setDeleteInProgress(false);
    setCategoryToDelete(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    await fetchCategories();
  }

  function handleSelectCategory(category: Category) {
    onSelect?.(category.id, category.name);
    onOpenChange(false);
  }

  function handleClose() {
    setError(null);
    setEditingCategoryId(null);
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
        {...dragHandlers}
      >
        <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-gray-100">
          <div className="w-8 flex-shrink-0" aria-hidden />
          <div className="flex-1 flex justify-center touch-none select-none min-w-0 py-0.5 pointer-events-none">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" aria-hidden />
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
            Выбор категории
          </SheetTitle>
          <SheetDescription className="text-sm text-gray-500 mt-2">
            Добавьте категорию или выберите из списка. Категории отображаются в
            каталоге.
          </SheetDescription>
        </div>

        <div
          ref={scrollRef}
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
                Добавить категорию
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={newCategoryName}
                    onChange={(e) =>
                      setNewCategoryName(
                        e.target.value.slice(0, CATEGORY_NAME_MAX_LENGTH)
                      )
                    }
                    placeholder="Введите название категории"
                    className="pr-12 border-0 border-b rounded-none bg-gray-50 focus-visible:ring-0"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {newCategoryName.length}/{CATEGORY_NAME_MAX_LENGTH}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full w-10 h-10 flex-shrink-0 border-2"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim() || addCategoryInProgress}
                  aria-label="Добавить категорию"
                >
                  {addCategoryInProgress ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Выбрать категорию
              </label>
              <div className="rounded-lg border bg-gray-50/50 min-h-[280px] max-h-[280px] overflow-y-auto flex flex-col">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center min-h-[280px]">
                    <Loader2
                      className="h-8 w-8 text-gray-400 animate-spin"
                      aria-hidden
                    />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500 text-center min-h-[280px] flex items-center justify-center">
                    Список категорий пуст. Добавьте категорию выше.
                  </p>
                ) : (
                  <ul className="divide-y border-t">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <div className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 transition-colors">
                          {editingCategoryId !== category.id && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartRename(category)}
                                className="p-1 rounded hover:bg-gray-200 flex-shrink-0"
                                aria-label="Редактировать"
                              >
                                <Pencil className="h-4 w-4 text-gray-500" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteClick(category, e)}
                                disabled={deletingCategoryId === category.id}
                                className="p-1 rounded hover:bg-gray-200 flex-shrink-0 disabled:opacity-70 disabled:pointer-events-none w-6 h-6 flex items-center justify-center"
                                aria-label="Удалить"
                              >
                                {deletingCategoryId === category.id ? (
                                  <Loader2 className="h-4 w-4 text-gray-500 animate-spin" aria-hidden />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-gray-500" />
                                )}
                              </button>
                            </>
                          )}
                          {editingCategoryId === category.id ? (
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <Input
                                value={editingName}
                                onChange={(e) =>
                                  setEditingName(
                                    e.target.value.slice(
                                      0,
                                      CATEGORY_NAME_MAX_LENGTH
                                    )
                                  )}
                                onBlur={handleSaveRename}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveRename();
                                  if (e.key === "Escape") {
                                    setEditingCategoryId(null);
                                    setEditingName("");
                                  }
                                }}
                                className="flex-1 border-0 border-b rounded-none bg-white h-8 text-[16px]"
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
                              onClick={() => handleSelectCategory(category)}
                              className="flex-1 flex items-center justify-between text-left min-w-0"
                            >
                              <span
                                className={`font-medium truncate ${
                                  selectedCategoryId === category.id
                                    ? "text-gray-900"
                                    : "text-gray-700"
                                }`}
                              >
                                {category.name}
                              </span>
                              {selectedCategoryId === category.id && (
                                <Check className="h-5 w-5 text-gray-600 flex-shrink-0 ml-2" />
                              )}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
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

    <Sheet open={isDeleteSheetOpen} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="w-full max-h-[95vh] rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
        style={deleteSheetStyle}
        {...deleteDragHandlers}
      >
        <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-gray-100">
          <div className="w-8 flex-shrink-0" aria-hidden />
          <div className="flex-1 flex justify-center touch-none select-none min-w-0 py-0.5 pointer-events-none">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" aria-hidden />
          </div>
          <button
            type="button"
            onClick={() => setCategoryToDelete(null)}
            className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-6 pt-4 pb-3 border-b">
          <SheetTitle className="text-xl font-bold">
            Удалить эту категорию?
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
              onClick={() => setCategoryToDelete(null)}
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
