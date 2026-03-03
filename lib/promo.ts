/**
 * Утилиты для промокодов: нормализация, валидация, расчёт скидки.
 * Логика только на клиенте, без серверной проверки.
 */

import type { AppliedPromo, BusinessPromo } from "@/types";

/** Нормализует введённый код: trim, для сравнения — без приведения регистра (сравниваем в validate). */
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

/**
 * Проверяет, можно ли применить промокод к текущей корзине.
 * Возвращает { valid, error } или { valid: true, applied }.
 * @param businessId - UUID бизнеса (для привязки applied к бизнесу)
 */
export function validatePromo(
  promo: BusinessPromo | null | undefined,
  code: string,
  subtotal: number,
  now: string = TODAY(),
  businessId?: string
): ValidatePromoResult {
  const normalizedCode = normalizePromoCode(code);
  if (!normalizedCode) {
    return { valid: false, error: "Введите промокод" };
  }

  if (!promo?.enabled || !promo.code || !promo.type || promo.value == null) {
    return { valid: false, error: "Промокод не найден или недействителен" };
  }

  if (promo.type !== "percent" && promo.type !== "fixed") {
    return { valid: false, error: "Промокод не найден или недействителен" };
  }

  if (promo.code.trim().toLowerCase() !== normalizedCode.toLowerCase()) {
    return { valid: false, error: "Промокод не найден или недействителен" };
  }

  if (promo.dateFrom && now < promo.dateFrom) {
    return { valid: false, error: "Промокод ещё не действует" };
  }
  if (promo.dateTo && now > promo.dateTo) {
    return { valid: false, error: "Срок действия промокода истёк" };
  }

  const minOrder = promo.minOrder ?? 0;
  if (subtotal < minOrder) {
    return {
      valid: false,
      error: minOrder > 0
        ? `Минимальная сумма заказа для промокода: ${Math.round(minOrder).toLocaleString("ru-RU")} ₽`
        : "Промокод не найден или недействителен",
    };
  }

  if (promo.type === "percent" && (promo.value < 1 || promo.value > 100)) {
    return { valid: false, error: "Промокод не найден или недействителен" };
  }
  if (promo.type === "fixed" && promo.value <= 0) {
    return { valid: false, error: "Промокод не найден или недействителен" };
  }

  const numValue = Number(promo.value);
  if (!Number.isFinite(numValue) || numValue <= 0) {
    return { valid: false, error: "Промокод не найден или недействителен" };
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

/**
 * Считает сумму скидки по применённому промокоду.
 * Округляет до целых рублей.
 * Принимает примитивы, чтобы не зависеть от прокси/геттеров store.
 */
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
    // 0 в админке = «без лимита»; ограничиваем только при явном maxDiscount > 0
    if (maxDiscount != null && maxDiscount > 0 && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else {
    discount = Math.min(value, subtotal);
  }
  return Math.round(discount);
}

/** Вариант по объекту AppliedPromo (делегирует в примитивы). */
export function calculatePromoDiscountFromApplied(subtotal: number, applied: AppliedPromo): number {
  return calculatePromoDiscount(
    subtotal,
    Number(applied.value),
    applied.type,
    applied.maxDiscount ?? null
  );
}
