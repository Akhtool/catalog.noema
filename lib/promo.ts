/**
 * Promo-code helpers: normalization, validation, and discount calculation.
 * Client-only logic without server verification.
 */

import type { AppliedPromo, BusinessPromo } from "@/types";

const ERR_ENTER_PROMO = "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u0440\u043e\u043c\u043e\u043a\u043e\u0434";
const ERR_INVALID_PROMO =
  "\u041f\u0440\u043e\u043c\u043e\u043a\u043e\u0434 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0438\u043b\u0438 \u043d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u0435\u043d";
const ERR_PROMO_NOT_STARTED =
  "\u041f\u0440\u043e\u043c\u043e\u043a\u043e\u0434 \u0435\u0449\u0451 \u043d\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442";
const ERR_PROMO_EXPIRED =
  "\u0421\u0440\u043e\u043a \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043f\u0440\u043e\u043c\u043e\u043a\u043e\u0434\u0430 \u0438\u0441\u0442\u0451\u043a";
const MIN_ORDER_PREFIX =
  "\u041c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u0430\u044f \u0441\u0443\u043c\u043c\u0430 \u0437\u0430\u043a\u0430\u0437\u0430 \u0434\u043b\u044f \u043f\u0440\u043e\u043c\u043e\u043a\u043e\u0434\u0430: ";

/** Trims external whitespace from user input. */
export function normalizePromoCode(input: string | null | undefined): string {
  if (input == null) return "";
  return input.trim();
}

const TODAY = (): string => new Date().toISOString().slice(0, 10);

export interface ValidatePromoResult {
  valid: boolean;
  error?: string;
  applied?: AppliedPromo;
}

/** Validates whether a promo can be applied to the current cart. */
export function validatePromo(
  promo: BusinessPromo | null | undefined,
  code: string,
  subtotal: number,
  now: string = TODAY(),
  businessId?: string
): ValidatePromoResult {
  const normalizedCode = normalizePromoCode(code);
  if (!normalizedCode) {
    return { valid: false, error: ERR_ENTER_PROMO };
  }

  if (!promo?.enabled || !promo.code || !promo.type || promo.value == null) {
    return { valid: false, error: ERR_INVALID_PROMO };
  }

  if (promo.type !== "percent" && promo.type !== "fixed") {
    return { valid: false, error: ERR_INVALID_PROMO };
  }

  if (promo.code.trim().toLowerCase() !== normalizedCode.toLowerCase()) {
    return { valid: false, error: ERR_INVALID_PROMO };
  }

  if (promo.dateFrom && now < promo.dateFrom) {
    return { valid: false, error: ERR_PROMO_NOT_STARTED };
  }
  if (promo.dateTo && now > promo.dateTo) {
    return { valid: false, error: ERR_PROMO_EXPIRED };
  }

  const minOrder = promo.minOrder ?? 0;
  if (subtotal < minOrder) {
    return {
      valid: false,
      error:
        minOrder > 0
          ? `${MIN_ORDER_PREFIX}${Math.round(minOrder).toLocaleString("ru-RU")} \u20BD`
          : ERR_INVALID_PROMO,
    };
  }

  if (promo.type === "percent" && (promo.value < 1 || promo.value > 100)) {
    return { valid: false, error: ERR_INVALID_PROMO };
  }
  if (promo.type === "fixed" && promo.value <= 0) {
    return { valid: false, error: ERR_INVALID_PROMO };
  }

  const numValue = Number(promo.value);
  if (!Number.isFinite(numValue) || numValue <= 0) {
    return { valid: false, error: ERR_INVALID_PROMO };
  }

  const applied: AppliedPromo = {
    code: promo.code,
    type: promo.type,
    value: numValue,
    minOrder: promo.minOrder ?? null,
    maxDiscount: promo.type === "percent" ? (promo.maxDiscount ?? null) : null,
    businessId: businessId ?? "",
  };

  return { valid: true, applied };
}

/** Calculates the discount amount and rounds to whole rubles. */
export function calculatePromoDiscount(
  subtotal: number,
  appliedValue: number,
  appliedType: "percent" | "fixed",
  maxDiscount: number | null = null
): number {
  if (subtotal <= 0) return 0;

  const value = Number(appliedValue);
  if (!Number.isFinite(value) || value <= 0) return 0;

  const type = String(appliedType ?? "").toLowerCase();
  let discount: number;

  if (type === "percent") {
    discount = (subtotal * value) / 100;
    if (maxDiscount != null && maxDiscount > 0 && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else {
    discount = Math.min(value, subtotal);
  }

  return Math.round(discount);
}

/** Convenience variant for AppliedPromo objects. */
export function calculatePromoDiscountFromApplied(subtotal: number, applied: AppliedPromo): number {
  return calculatePromoDiscount(
    subtotal,
    Number(applied.value),
    applied.type,
    applied.maxDiscount ?? null
  );
}
