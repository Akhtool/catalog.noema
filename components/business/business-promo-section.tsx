"use client"

import { Input } from "@/components/ui/input"
import type { Business } from "@/types"
import { ChevronDown, ChevronUp, Tag } from "lucide-react"

type Props = {
  business: Business
  isSubmitting: boolean
  promoSectionOpen: boolean
  onToggleSection: () => void
}

export function BusinessPromoSection({
  business,
  isSubmitting,
  promoSectionOpen,
  onToggleSection,
}: Props) {
  return (
    <div className="rounded-lg border p-4">
      <button
        type="button"
        onClick={onToggleSection}
        className="flex w-full items-center justify-between gap-2 rounded-md -m-1 p-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-expanded={promoSectionOpen}
      >
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-brand-yellow" />
          <h3 className="text-lg font-semibold">Промокод</h3>
        </div>
        {promoSectionOpen ? (
          <ChevronUp className="w-5 h-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {promoSectionOpen && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Один активный промокод на каталог. Клиент вводит код в корзине; при
            совпадении и соблюдении условий применяется скидка.
          </p>

          <label className="mb-4 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name="promo_enabled"
              value="true"
              defaultChecked={business.promo?.enabled}
              disabled={isSubmitting}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium">Включить промокод</span>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="promo_code" className="text-sm font-medium">
                Код
              </label>
              <Input
                id="promo_code"
                name="promo_code"
                type="text"
                defaultValue={business.promo?.code ?? ""}
                placeholder="SALE10"
                disabled={isSubmitting}
                className="bg-white"
                onInput={(e) => {
                  const el = e.currentTarget
                  const start = el.selectionStart ?? 0
                  const end = el.selectionEnd ?? 0
                  const value = el.value.toUpperCase()
                  if (value !== el.value) {
                    el.value = value
                    el.setSelectionRange(start, end)
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="promo_type" className="text-sm font-medium">
                Тип скидки
              </label>
              <select
                id="promo_type"
                name="promo_type"
                defaultValue={business.promo?.type ?? ""}
                disabled={isSubmitting}
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="">-</option>
                <option value="percent">Процент</option>
                <option value="fixed">Фиксированная сумма</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="promo_value" className="text-sm font-medium">
                Значение (%) или сумма (₽)
              </label>
              <Input
                id="promo_value"
                name="promo_value"
                type="number"
                min={0}
                step={1}
                defaultValue={business.promo?.value ?? ""}
                placeholder="10 или 500"
                disabled={isSubmitting}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="promo_min_order" className="text-sm font-medium">
                Мин. сумма заказа (₽)
              </label>
              <Input
                id="promo_min_order"
                name="promo_min_order"
                type="number"
                min={0}
                step={1}
                defaultValue={business.promo?.minOrder ?? ""}
                placeholder="1000"
                disabled={isSubmitting}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="promo_date_from" className="text-sm font-medium">
                Действует с
              </label>
              <Input
                id="promo_date_from"
                name="promo_date_from"
                type="date"
                defaultValue={business.promo?.dateFrom ?? ""}
                disabled={isSubmitting}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="promo_date_to" className="text-sm font-medium">
                Действует по
              </label>
              <Input
                id="promo_date_to"
                name="promo_date_to"
                type="date"
                defaultValue={business.promo?.dateTo ?? ""}
                disabled={isSubmitting}
                className="bg-white"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="promo_max_discount" className="text-sm font-medium">
                Макс. скидка (₽) только для %
              </label>
              <Input
                id="promo_max_discount"
                name="promo_max_discount"
                type="number"
                min={0}
                step={1}
                defaultValue={business.promo?.maxDiscount ?? ""}
                placeholder="500"
                disabled={isSubmitting}
                className="bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
