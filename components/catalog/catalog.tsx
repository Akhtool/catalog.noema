"use client";

import { useMemo } from "react";
import { Category, Product } from "@/types";
import { useCatalogFiltersStore } from "@/store/catalog-filters";
import { CategoryList } from "./category-list";
import { SearchInput } from "./search-input";
import { ViewToggle } from "./view-toggle";
import { ProductCard } from "./product-card";

interface CatalogProps {
  categories: Category[];
  products: Product[];
}

export function Catalog({ categories, products }: CatalogProps) {
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
  } = useCatalogFiltersStore();

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

  // Фильтрация товаров
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Фильтр по категории
    if (selectedCategoryId) {
      filtered = filtered.filter(
        (product) => product.categoryId === selectedCategoryId
      );
    }

    // Фильтр по брендам
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(
        (product) => product.brand && selectedBrands.includes(product.brand)
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

    // Фильтр "Товары со скидкой" (пока нет поля скидки, можно добавить позже)
    if (showDiscounted) {
      // Пока оставляем все товары, можно добавить проверку на наличие скидки
      filtered = filtered;
    }

    // Фильтр по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.description &&
            product.description.toLowerCase().includes(query)) ||
          (product.brand && product.brand.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [
    products,
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
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category) => {
            const categoryProducts = products.filter(
              (p) => p.categoryId === category.id
            );
            return (
              <div
                key={category.id}
                className="bg-card-white rounded-[1.25rem] p-6 shadow-soft border border-transparent hover:border-brand-yellow/30 transition-all cursor-pointer"
                onClick={() => {
                  // Переключаемся в режим каталога и выбираем категорию
                  useCatalogFiltersStore.getState().setCatalogMode("catalog");
                  useCatalogFiltersStore
                    .getState()
                    .setSelectedCategoryId(category.id);
                  // Скроллим к началу каталога
                  setTimeout(() => {
                    document.getElementById("catalog-section")?.scrollIntoView({
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
      </div>
    );
  }

  // Режим "Каталог" - показываем товары, сгруппированные по категориям
  return (
    <div id="catalog-section">
      <SearchInput categories={categories} products={products} />
      <CategoryList categories={categories} />

      {/* Переключение вида и заголовок */}
      <div className="flex items-center justify-between mt-[5px] mb-2.5 px-1">
        <h2 className="text-xl font-bold text-gray-900">
          {getHeaderTitle()}
        </h2>
        <ViewToggle />
      </div>

      {/* Список товаров */}
      <div className="mt-2.5">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Товары не найдены</p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid" ? "grid grid-cols-2 gap-4 mt-2.5" : "space-y-4 mt-2.5"
            }
          >
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
