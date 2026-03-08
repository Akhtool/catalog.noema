import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCartStore } from "@/store/cart";
import type { BusinessLocation, BusinessPromo, Product } from "@/types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    businessId: "business-1",
    categoryId: "category-1",
    name: "Cappuccino",
    subtitle: null,
    description: null,
    price: 200,
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

const promo: BusinessPromo = {
  enabled: true,
  code: "WELCOME",
  type: "percent",
  value: 10,
  minOrder: 100,
  dateFrom: "2026-03-01",
  dateTo: "2026-03-31",
  maxDiscount: 300,
};

const pickupPoint: BusinessLocation = {
  id: "point-1",
  businessId: "business-1",
  title: "Pickup Point",
  address: "Main street 1",
  phone: null,
  whatsapp: null,
  telegram: null,
  orderPosition: 0,
  isActive: true,
  createdAt: "2026-03-08T10:00:00.000Z",
  updatedAt: "2026-03-08T10:00:00.000Z",
};

describe("cart store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T10:00:00.000Z"));
    localStorage.clear();
    useCartStore.setState({
      cartByBusinessId: {},
      orderNumberByBusinessId: {},
    });
  });

  it("stores items separately for each business", () => {
    const store = useCartStore.getState();

    store.addItem(makeProduct());
    store.addItem(makeProduct({ id: "product-2", businessId: "business-2", name: "Latte" }));

    expect(store.getItems("business-1")).toHaveLength(1);
    expect(store.getItems("business-2")).toHaveLength(1);
    expect(store.getTotalQuantity("business-1")).toBe(1);
    expect(store.getTotalQuantity("business-2")).toBe(1);
  });

  it("applies a promo only within the matching business cart", () => {
    const store = useCartStore.getState();

    store.addItem(makeProduct());
    store.setPromoCode("business-1", "WELCOME");

    expect(store.applyPromo("business-1", promo)).toBe(true);
    expect(store.getDiscountAmount("business-1")).toBe(20);
    expect(store.getDiscountAmount("business-2")).toBe(0);
  });

  it("clears promo data when the last item is removed", () => {
    const store = useCartStore.getState();

    store.addItem(makeProduct());
    store.setPromoCode("business-1", "WELCOME");
    store.applyPromo("business-1", promo);
    store.removeItem("business-1", "product-1");

    expect(useCartStore.getState().cartByBusinessId["business-1"]).toMatchObject({
      items: [],
      promoCode: null,
      appliedPromo: null,
      promoError: null,
    });
  });

  it("creates an order snapshot with totals and pickup point", () => {
    const store = useCartStore.getState();

    store.addItem(makeProduct());
    store.addItem(makeProduct());
    store.setPromoCode("business-1", "WELCOME");
    store.applyPromo("business-1", promo);
    store.setDeliveryType("business-1", "pickup");
    store.setSelectedPointId("business-1", pickupPoint.id);
    store.generateOrderNumber("business-1");

    const order = store.createOrder("business-1", [pickupPoint]);

    expect(order).toMatchObject({
      businessId: "business-1",
      subtotal: 400,
      discountAmount: 40,
      totalPrice: 360,
      totalQuantity: 2,
      selectedPointId: "point-1",
    });
    expect(order.selectedPoint).toMatchObject({ title: "Pickup Point" });
  });
});
