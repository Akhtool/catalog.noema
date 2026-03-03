/**
 * Утилиты для работы со скидками товаров
 */

import type { Product } from "@/types";

/** Проверяет, активна ли скидка: hasDiscount, originalPrice > price, и текущая дата в периоде (если задан) */
export function isDiscountActive(product: Product): boolean {
  if (!product.hasDiscount || !product.originalPrice || product.originalPrice <= product.price) {
    return false;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (product.discountDateFrom && today < product.discountDateFrom) return false;
  if (product.discountDateTo && today > product.discountDateTo) return false;
  return true;
}

/** Рассчитывает процент скидки по оригинальной и итоговой цене */
export function calcDiscountPercent(originalPrice: number, finalPrice: number): number {
  if (originalPrice <= 0 || finalPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
}
