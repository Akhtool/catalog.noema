"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Category, Product } from "@/types";
import { isDiscountActive } from "@/lib/discount";
import { hasAnyOrderContact } from "@/lib/order";
import { useFiltersForBusiness } from "@/store/catalog-filters";
import { useCurrentBusinessStore } from "@/store/current-business";
import {
  useHasAccess,
  useProfileEditor,
  useProductEditor,
  useBulkImport,
  useDeleteProduct,
  useRestoreProduct,
} from "@/components/business/profile-editor-context";
import { CategoryList } from "./category-list";
import { SearchInput } from "./search-input";
import { ViewToggle } from "./view-toggle";
import { ProductCard } from "./product-card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CircleAlert, FileSpreadsheet, FileDown, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { getProductsForExport } from "@/app/admin/product/actions";

const SortableCatalogGrid = dynamic(
  () => import("./sortable-catalog-grid").then((m) => m.SortableCatalogGrid),
  { ssr: false },
);

interface CatalogProps {
  categories: Category[];
  products: Product[];
}

export function Catalog({ categories, products }: CatalogProps) {
  const business = useCurrentBusinessStore((s) => s.business);
  const hasAccess = useHasAccess();
  const openProfileEditor = useProfileEditor();
  const openProductEditor = useProductEditor();
  const openBulkImport = useBulkImport();
  const hideProduct = useDeleteProduct();
  const restoreProduct = useRestoreProduct();
  const {
    searchQuery,
    selectedCategoryId,
    selectedBrands,
    minPrice,
    maxPrice,
    showPopular,
    showDiscounted,
    viewMode,
    catalogMode,
    setCatalogMode,
    setSelectedCategoryId,
  } = useFiltersForBusiness(business?.id ?? null);

  /** Оптимистичный порядок id после drop; null = используем порядок с сервера */
  const [optimisticOrderIds, setOptimisticOrderIds] = useState<string[] | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);
  const hasOrderContactsConfigured = business ? hasAnyOrderContact(business) : false;

  async function handleExport() {
    if (!business?.id || !business?.slug) return;
    setIsExporting(true);
    try {
      const res = await getProductsForExport(business.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (!res.data?.length) {
        toast.info("Нет товаров для экспорта");
        return;
      }
      const { exportProductsToExcel } = await import("@/lib/bulk-export");
      const date = new Date().toISOString().slice(0, 10);
      await exportProductsToExcel(
        res.data,
        `каталог_${business.slug}_${date}.xlsx`,
      );
      toast.success(`Экспортировано ${res.data.length} товаров`);
    } catch {
      toast.error("Ошибка экспорта");
    } finally {
      setIsExporting(false);
    }
  }

  /** Ожидаемый порядок после refresh — сбрасываем оптимистичный только когда сервер вернул его */
  const pendingOrderIdsRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (
      pendingOrderIdsRef.current &&
      products.length === pendingOrderIdsRef.current.length &&
      products.every((p, i) => p.id === pendingOrderIdsRef.current![i])
    ) {
      pendingOrderIdsRef.current = null;
      setOptimisticOrderIds(null);
    }
  }, [products]);

  /** Продукты в текущем порядке (серверный или оптимистичный) */
  const productsOrdered = useMemo(() => {
    if (!optimisticOrderIds || optimisticOrderIds.length === 0) return products;
    const byId = new Map(products.map((p) => [p.id, p]));
    const ordered: Product[] = [];
    for (const id of optimisticOrderIds) {
      const p = byId.get(id);
      if (p) ordered.push(p);
    }
    return ordered.length > 0 ? ordered : products;
  }, [products, optimisticOrderIds]);

  // Формирование заголовка на основе фильтров
  const getHeaderTitle = () => {
    // Если выбрана категория - показываем её название
    if (selectedCategoryId) {
      return (
        categories.find((c) => c.id === selectedCategoryId)?.name || "Товары"
      );
    }

    // Формируем части заголовка на основе фильтров
    const parts: string[] = [];

    // Фильтр по цене
    if (minPrice !== null && maxPrice !== null) {
      parts.push(`${minPrice}₽ - ${maxPrice}₽`);
    } else if (minPrice !== null) {
      parts.push(`От ${minPrice}₽`);
    } else if (maxPrice !== null) {
      parts.push(`До ${maxPrice}₽`);
    }

    // Фильтр по брендам
    if (selectedBrands.length > 0) {
      if (selectedBrands.length === 1) {
        parts.push(selectedBrands[0]);
      } else {
        parts.push(`${selectedBrands.length} бренда`);
      }
    }

    // Популярные
    if (showPopular) {
      parts.push("Популярное");
    }

    // Со скидкой
    if (showDiscounted) {
      parts.push("Со скидкой");
    }

    // Поиск
    if (searchQuery.trim()) {
      parts.push(`"${searchQuery.trim()}"`);
    }

    // Если есть фильтры - возвращаем их, иначе "Популярное"
    return parts.length > 0 ? parts.join(", ") : "Популярное";
  };

  // Фильтрация товаров (по уже упорядоченному списку)
  const filteredProducts = useMemo(() => {
    let filtered = productsOrdered;

    // Фильтр по категории
    if (selectedCategoryId) {
      filtered = filtered.filter(
        (product) => product.categoryId === selectedCategoryId,
      );
    }

    // Фильтр по брендам
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(
        (product) => product.brand && selectedBrands.includes(product.brand),
      );
    }

    // Фильтр по цене
    if (minPrice !== null) {
      filtered = filtered.filter((product) => product.price >= minPrice);
    }
    if (maxPrice !== null) {
      filtered = filtered.filter((product) => product.price <= maxPrice);
    }

    // Фильтр "Популярные" (пока просто все товары, можно добавить логику на основе просмотров/продаж)
    if (showPopular) {
      // Пока оставляем все товары, можно добавить сортировку по популярности
      filtered = filtered;
    }

    // Фильтр "Товары со скидкой" — только активные скидки (в периоде)
    if (showDiscounted) {
      filtered = filtered.filter((product) => isDiscountActive(product));
    }

    // Фильтр по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.description &&
            product.description.toLowerCase().includes(query)) ||
          (product.brand && product.brand.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [
    productsOrdered,
    selectedCategoryId,
    selectedBrands,
    minPrice,
    maxPrice,
    showPopular,
    showDiscounted,
    searchQuery,
  ]);

  // Если режим "Категории" - показываем только список категорий
  if (catalogMode === "categories") {
    return (
      <div className="space-y-6">
        <SearchInput categories={categories} products={products} />
        {categories.length === 0 ? (
          <div className="text-center py-12 px-4 text-gray-500">
            <p className="text-base font-medium">Категорий пока нет</p>
            <p className="text-sm mt-1">
              {hasAccess
                ? "Добавьте категорию в редакторе позиции"
                : "Категории появятся скоро"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {categories.map((category) => {
              const categoryProducts = products.filter(
                (p) => p.categoryId === category.id,
              );
              return (
                <div
                  key={category.id}
                  className="bg-card-white rounded-[1.25rem] p-6 shadow-soft border border-transparent hover:border-brand-yellow/30 transition-all cursor-pointer"
                  onClick={() => {
                    if (business?.id) {
                      setCatalogMode("catalog");
                      setSelectedCategoryId(category.id);
                    }
                    // Скроллим к началу каталога
                    setTimeout(() => {
                      document
                        .getElementById("catalog-section")
                        ?.scrollIntoView({
                          behavior: "smooth",
                        });
                    }, 100);
                  }}
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {categoryProducts.length} товаров
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Режим "Каталог" - показываем товары, сгруппированные по категориям
  return (
    <div id="catalog-section">
      <SearchInput categories={categories} products={products} />
      <CategoryList categories={categories} />

      {/* Переключение вида и заголовок */}
      <div className="flex items-center justify-between gap-2 mt-[5px] mb-2.5 px-1 min-w-0">
        <h2 className="text-xl font-bold text-gray-900 truncate min-w-0">
          {getHeaderTitle()}
        </h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasAccess && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || !business?.id}
              className="gap-1.5 text-gray-600 shrink-0"
            >
              <FileDown className="w-4 h-4" />
              {isExporting ? "Экспорт…" : "Экспорт в Excel"}
            </Button>
          )}
          <ViewToggle />
        </div>
      </div>

      {/* Список товаров */}
      <div className="mt-2.5">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 px-4">
            {products.length === 0 ? (
              <div className="space-y-4">
                <p className="text-base font-medium text-gray-700">
                  {hasAccess
                    ? "Настройте витрину и добавьте товары"
                    : "Товары появятся скоро"}
                </p>
                {hasAccess && (
                  <div className="mx-auto max-w-xl rounded-[1.25rem] border border-gray-200 bg-white p-4 text-left shadow-soft">
                    <p className="text-sm font-semibold text-gray-900">
                      Что нужно сделать дальше
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        {hasOrderContactsConfigured ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                        ) : (
                          <CircleAlert className="mt-0.5 h-4 w-4 text-amber-600" />
                        )}
                        <span className="text-gray-700">
                          {hasOrderContactsConfigured
                            ? "Контакты для приёма заказов уже настроены"
                            : "Добавьте WhatsApp, Telegram или телефон в профиле бизнеса"}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CircleAlert className="mt-0.5 h-4 w-4 text-amber-600" />
                        <span className="text-gray-700">
                          Добавьте первую позицию. Категорию можно создать прямо в редакторе товара.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CircleAlert className="mt-0.5 h-4 w-4 text-amber-600" />
                        <span className="text-gray-700">
                          После этого проверьте первый тестовый заказ как обычный клиент.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {hasAccess && (openProfileEditor || openProductEditor || openBulkImport) ? (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
                    {openProfileEditor && (
                      <Button
                        onClick={openProfileEditor}
                        variant="outline"
                        className="w-full sm:w-auto rounded-xl border-2 border-gray-200 gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Логотип и обложка
                      </Button>
                    )}
                    {openProductEditor && (
                      <Button
                        onClick={() => openProductEditor()}
                        className="w-full sm:w-auto rounded-xl bg-brand-yellow text-brand-yellow-foreground hover:bg-brand-yellow/90 gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Добавить позицию
                      </Button>
                    )}
                    {openBulkImport && (
                      <Button
                        onClick={openBulkImport}
                        variant="outline"
                        className="w-full sm:w-auto rounded-xl border-2 border-gray-200 gap-2"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Импорт
                      </Button>
                    )}
                  </div>
                ) : hasAccess ? (
                  <p className="text-sm text-gray-500">Используйте кнопки выше для настройки</p>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground">Товары не найдены</p>
            )}
          </div>
        ) : hasAccess && business ? (
          <SortableCatalogGrid
            products={filteredProducts}
            allProducts={productsOrdered}
            viewMode={viewMode}
            businessId={business.id}
            businessSlug={business.slug}
            onEdit={openProductEditor ? (id) => openProductEditor(id) : undefined}
            onHide={hideProduct ? (id) => hideProduct(id) : undefined}
            onRestore={restoreProduct ? (id) => restoreProduct(id) : undefined}
            setOptimisticOrderIds={setOptimisticOrderIds}
            pendingOrderIdsRef={pendingOrderIdsRef}
          />
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 gap-4 mt-2.5 pb-4"
                : "space-y-4 mt-2.5"
            }
          >
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                viewMode={viewMode}
                showAdminActions={hasAccess}
                imagePriority={index === 0}
                onEdit={
                  hasAccess && openProductEditor
                    ? () => openProductEditor(product.id)
                    : undefined
                }
                onHide={
                  hasAccess && product.isActive ? () => hideProduct?.(product.id) : undefined
                }
                onRestore={hasAccess ? () => restoreProduct?.(product.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
