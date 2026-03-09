import { revalidatePath } from "next/cache"
import {
  getFirstBusinessIdForUser,
  type ServerSupabase,
  userHasAccessToBusinessId,
} from "../_lib/access-control"

export async function resolveBusinessIdForUpdate(
  supabase: ServerSupabase,
  userId: string,
  formBusinessId: string | null
): Promise<string | null> {
  if (formBusinessId) {
    const hasAccess = await userHasAccessToBusinessId(supabase, userId, formBusinessId)
    if (hasAccess) {
      return formBusinessId
    }
  }

  return getFirstBusinessIdForUser(supabase, userId)
}

export async function getBusinessSlugById(
  supabase: ServerSupabase,
  businessId: string
) {
  const { data } = await supabase
    .from("business")
    .select("slug")
    .eq("id", businessId)
    .single()

  return data?.slug ?? null
}

export async function revalidateBusinessPath(
  supabase: ServerSupabase,
  businessId: string
) {
  const slug = await getBusinessSlugById(supabase, businessId)
  if (slug) {
    revalidatePath(`/${slug}`)
  }
}

export function normalizeNullableString(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export function normalizeTelegramUsername(value: string | null | undefined): string | null {
  const normalized = normalizeNullableString(value)
  if (!normalized) return null
  return normalized.startsWith("@") ? normalized.slice(1) : normalized
}

export function buildBusinessUpdatePayload(formData: FormData) {
  const name = normalizeNullableString(formData.get("name") as string)

  const themeBrandForegroundRaw = normalizeNullableString(
    formData.get("theme_brand_foreground") as string
  )
  const themeBrandForeground =
    themeBrandForegroundRaw === "black" || themeBrandForegroundRaw === "white"
      ? themeBrandForegroundRaw
      : null

  const updateData: Record<string, string | null> = {
    name,
    description: normalizeNullableString(formData.get("description") as string),
    phone: normalizeNullableString(formData.get("phone") as string),
    whatsapp: normalizeNullableString(formData.get("whatsapp") as string),
    whatsapp_delivery: normalizeNullableString(formData.get("whatsapp_delivery") as string),
    whatsapp_pickup: normalizeNullableString(formData.get("whatsapp_pickup") as string),
    whatsapp_dine_in: normalizeNullableString(formData.get("whatsapp_dine_in") as string),
    telegram: normalizeTelegramUsername(formData.get("telegram") as string),
    logo_url: normalizeNullableString(formData.get("logo_url") as string),
    cover_url: normalizeNullableString(formData.get("cover_url") as string),
    theme_brand_hsl: normalizeNullableString(formData.get("theme_brand_hsl") as string),
    theme_brand_foreground: themeBrandForeground,
    delivery_regions: normalizeNullableString(formData.get("delivery_regions") as string),
    city_delivery: normalizeNullableString(formData.get("city_delivery") as string),
    working_hours: normalizeNullableString(formData.get("working_hours") as string),
  }

  const promoEnabled = formData.get("promo_enabled") === "true"
  const promoCode = normalizeNullableString(formData.get("promo_code") as string)
  const promoTypeRaw = normalizeNullableString(formData.get("promo_type") as string)
  const promoType =
    promoTypeRaw === "percent" || promoTypeRaw === "fixed" ? promoTypeRaw : null
  const promoValueStr = normalizeNullableString(formData.get("promo_value") as string)
  const promoValue = promoValueStr ? parseFloat(promoValueStr) : null
  const promoMinOrderStr = normalizeNullableString(formData.get("promo_min_order") as string)
  const promoMinOrder = promoMinOrderStr ? parseFloat(promoMinOrderStr) : null
  const promoDateFrom = normalizeNullableString(formData.get("promo_date_from") as string)
  const promoDateTo = normalizeNullableString(formData.get("promo_date_to") as string)
  const promoMaxDiscountStr = normalizeNullableString(
    formData.get("promo_max_discount") as string
  )
  const promoMaxDiscount = promoMaxDiscountStr ? parseFloat(promoMaxDiscountStr) : null

  const promoData: Record<string, unknown> = {
    promo_enabled: promoEnabled,
    promo_code: promoCode,
    promo_type: promoType,
    promo_value: promoValue,
    promo_min_order: promoMinOrder,
    promo_date_from: promoDateFrom || null,
    promo_date_to: promoDateTo || null,
    promo_max_discount: promoMaxDiscount,
  }

  return {
    name,
    payload: { ...updateData, ...promoData },
  }
}
