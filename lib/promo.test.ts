import { describe, expect, it } from "vitest";

import {
  calculatePromoDiscount,
  calculatePromoDiscountFromApplied,
  normalizePromoCode,
  validatePromo,
} from "@/lib/promo";
import type { AppliedPromo, BusinessPromo } from "@/types";

const MIN_ORDER_MESSAGE_PREFIX =
  "\u041c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u0430\u044f \u0441\u0443\u043c\u043c\u0430 \u0437\u0430\u043a\u0430\u0437\u0430";

const promo: BusinessPromo = {
  enabled: true,
  code: "WELCOME",
  type: "percent",
  value: 15,
  minOrder: 1000,
  dateFrom: "2026-03-01",
  dateTo: "2026-03-31",
  maxDiscount: 300,
};

describe("promo utils", () => {
  it("normalizes user input before comparison", () => {
    expect(normalizePromoCode("  WELCOME  ")).toBe("WELCOME");
    expect(normalizePromoCode(null)).toBe("");
  });

  it("applies a valid promo and binds it to the current business", () => {
    const result = validatePromo(promo, " welcome ", 2500, "2026-03-08", "business-1");

    expect(result.valid).toBe(true);
    expect(result.applied).toMatchObject({
      code: "WELCOME",
      businessId: "business-1",
      type: "percent",
      value: 15,
    });
  });

  it("rejects a promo below the minimum order amount", () => {
    const result = validatePromo(promo, "WELCOME", 900, "2026-03-08", "business-1");

    expect(result.valid).toBe(false);
    expect(result.error).toContain(MIN_ORDER_MESSAGE_PREFIX);
  });

  it("caps percent discounts and clamps fixed discounts to subtotal", () => {
    expect(calculatePromoDiscount(5000, 15, "percent", 300)).toBe(300);
    expect(calculatePromoDiscount(800, 1000, "fixed")).toBe(800);
  });

  it("calculates discount from AppliedPromo", () => {
    const applied: AppliedPromo = {
      code: "WELCOME",
      type: "percent",
      value: 10,
      minOrder: null,
      maxDiscount: 250,
      businessId: "business-1",
    };

    expect(calculatePromoDiscountFromApplied(4000, applied)).toBe(250);
  });
});
