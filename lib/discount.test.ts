import { describe, expect, it, vi } from "vitest";

import { calcDiscountPercent, isDiscountActive } from "@/lib/discount";
import type { Product } from "@/types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    businessId: "business-1",
    categoryId: "category-1",
    name: "Капучино",
    subtitle: null,
    description: null,
    price: 180,
    hasDiscount: false,
    originalPrice: null,
    discountDateFrom: null,
    discountDateTo: null,
    images: [],
    brand: null,
    inStock: true,
    isActive: true,
    order: 0,
    createdAt: "2026-03-08T10:00:00.000Z",
    updatedAt: "2026-03-08T10:00:00.000Z",
    ...overrides,
  };
}

describe("discount utils", () => {
  it("returns active discount only inside the configured period", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T09:00:00.000Z"));

    expect(
      isDiscountActive(
        makeProduct({
          price: 150,
          hasDiscount: true,
          originalPrice: 200,
          discountDateFrom: "2026-03-01",
          discountDateTo: "2026-03-10",
        }),
      ),
    ).toBe(true);

    expect(
      isDiscountActive(
        makeProduct({
          price: 150,
          hasDiscount: true,
          originalPrice: 200,
          discountDateFrom: "2026-03-09",
        }),
      ),
    ).toBe(false);

    vi.useRealTimers();
  });

  it("calculates rounded discount percent", () => {
    expect(calcDiscountPercent(999, 749)).toBe(25);
    expect(calcDiscountPercent(500, 500)).toBe(0);
  });
});
