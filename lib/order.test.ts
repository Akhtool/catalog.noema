import { describe, expect, it } from "vitest";

import {
  createPhoneLink,
  createTelegramLink,
  createWhatsAppLink,
  generateOrderMessage,
  getOrderContactLink,
  parseDeliveryTypes,
  resolveWhatsappForOrder,
} from "@/lib/order";
import type { Business, Order } from "@/types";

const MSG_NEW_ORDER = "\u041d\u043e\u0432\u044b\u0439 \u0437\u0430\u043a\u0430\u0437";
const MSG_PROMO_DISCOUNT = "\u0421\u043a\u0438\u0434\u043a\u0430 \u043f\u043e \u043f\u0440\u043e\u043c\u043e\u043a\u043e\u0434\u0443";
const MSG_BRANCH = "\u0424\u0438\u043b\u0438\u0430\u043b";

const business: Business = {
  id: "business-1",
  slug: "coffee",
  name: "Noema Coffee",
  description: "Coffee shop",
  logoUrl: null,
  coverUrl: null,
  themeBrandHsl: null,
  themeBrandForeground: null,
  phone: "+7 (999) 123-45-67",
  whatsapp: "+7 (999) 111-22-33",
  whatsappDelivery: "+7 (999) 111-00-00",
  whatsappPickup: null,
  whatsappDineIn: null,
  telegram: "@noema_coffee",
  workingHours: null,
  deliveryRegions: null,
  cityDelivery: null,
  deliveryTypes: ["delivery", "pickup"],
  pickupPoints: [
    {
      id: "point-1",
      businessId: "business-1",
      title: "Tverskaya Point",
      address: "Tverskaya st. 1",
      phone: "+7 (999) 000-00-01",
      whatsapp: "+7 (999) 000-00-02",
      telegram: "@point_one",
      orderPosition: 0,
      isActive: true,
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
  ],
  promo: null,
  createdAt: "2026-03-08T10:00:00.000Z",
  updatedAt: "2026-03-08T10:00:00.000Z",
};

const order: Order = {
  businessId: "business-1",
  orderNumber: "42",
  items: [
    {
      productId: "product-1",
      businessId: "business-1",
      name: "Cappuccino",
      price: 200,
      quantity: 2,
      originalPrice: 240,
    },
  ],
  subtotal: 400,
  discountAmount: 40,
  totalPrice: 360,
  totalQuantity: 2,
  comment: "No sugar",
  promoCode: "WELCOME",
  deliveryType: "pickup",
  deliveryAddress: null,
  selectedPointId: "point-1",
  selectedPoint: business.pickupPoints![0],
  createdAt: "2026-03-08T10:00:00.000Z",
};

describe("order utils", () => {
  it("normalizes delivery types and falls back to defaults", () => {
    expect(parseDeliveryTypes(["pickup", "invalid", "delivery"])).toEqual(["pickup", "delivery"]);
    expect(parseDeliveryTypes(null)).toEqual(["delivery", "pickup", "dine-in"]);
  });

  it("builds an order message with discount and pickup point details", () => {
    const message = generateOrderMessage(order);

    expect(message).toContain(MSG_NEW_ORDER);
    expect(message).toContain(MSG_PROMO_DISCOUNT);
    expect(message).toContain(MSG_BRANCH);
    expect(message).toContain("Tverskaya Point");
  });

  it("prefers point-specific whatsapp over business-level contacts", () => {
    expect(resolveWhatsappForOrder(business, order)).toBe("+7 (999) 000-00-02");
  });

  it("creates deep links for supported contact channels", () => {
    expect(createWhatsAppLink("+7 (999) 111-22-33", "test")).toContain("wa.me/79991112233");
    expect(createTelegramLink("@noema", "test")).toBe("https://t.me/noema?text=test");
    expect(createPhoneLink("+7 (999) 123-45-67")).toBe("tel:79991234567");
  });

  it("returns the highest-priority contact link", () => {
    expect(getOrderContactLink(business, order)).toMatchObject({
      type: "whatsapp",
    });
  });
});
