import {
  userHasAccessToBusinessId,
  validateEntityBelongsToBusiness,
  type ServerSupabase,
} from "../_lib/access-control";

type SupabaseLike = {
  from: (table: string) => unknown;
};

export interface ProductRelationPayload {
  categoryId: string;
  brandId?: string | null;
}

export interface ProductBasicsPayload {
  name: string;
  categoryId: string;
  price: number;
}

export interface ProductBasicsValidationResult {
  name?: string;
  price?: number;
  error?: string;
}

const ERR_NAME_REQUIRED = "Название обязательно";
const ERR_CATEGORY_REQUIRED = "Выберите категорию";
const ERR_PRICE_INVALID = "Укажите корректную цену";
const ERR_CATEGORY_NOT_FOUND = "Категория не найдена";
const ERR_CATEGORY_WRONG_BUSINESS =
  "Категория не принадлежит этому бизнесу";
const ERR_BRAND_NOT_FOUND = "Бренд не найден";
const ERR_BRAND_WRONG_BUSINESS =
  "Бренд не принадлежит этому бизнесу";

export async function ensureBusinessAccess(
  supabase: SupabaseLike,
  userId: string,
  businessId: string
): Promise<boolean> {
  return userHasAccessToBusinessId(supabase as ServerSupabase, userId, businessId);
}

export async function validateProductRelationsBelongToBusiness(
  supabase: SupabaseLike,
  businessId: string,
  payload: ProductRelationPayload
): Promise<{ error?: string }> {
  const categoryValidation = await validateEntityBelongsToBusiness(
    supabase as ServerSupabase,
    "category",
    payload.categoryId,
    businessId,
    ERR_CATEGORY_NOT_FOUND,
    ERR_CATEGORY_WRONG_BUSINESS
  );
  if (categoryValidation.error) {
    return categoryValidation;
  }

  if (!payload.brandId) {
    return {};
  }

  return validateEntityBelongsToBusiness(
    supabase as ServerSupabase,
    "brand",
    payload.brandId,
    businessId,
    ERR_BRAND_NOT_FOUND,
    ERR_BRAND_WRONG_BUSINESS
  );
}

export function validateProductPayloadBasics(
  payload: ProductBasicsPayload
): ProductBasicsValidationResult {
  const name = payload.name?.trim();
  if (!name) {
    return { error: ERR_NAME_REQUIRED };
  }

  if (!payload.categoryId) {
    return { error: ERR_CATEGORY_REQUIRED };
  }

  const price = Number(payload.price);
  if (Number.isNaN(price) || price < 0) {
    return { error: ERR_PRICE_INVALID };
  }

  return { name, price };
}
