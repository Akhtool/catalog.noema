type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  in?: (column: string, values: unknown[]) => QueryBuilder;
  single?: () => Promise<{ data?: unknown; error?: unknown }>;
  maybeSingle?: () => Promise<{ data?: unknown; error?: unknown }>;
};

type SupabaseLike = {
  from: (table: string) => QueryBuilder;
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

const ERR_NAME_REQUIRED = "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e";
const ERR_CATEGORY_REQUIRED = "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044e";
const ERR_PRICE_INVALID = "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u0443\u044e \u0446\u0435\u043d\u0443";
const ERR_CATEGORY_NOT_FOUND = "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430";
const ERR_CATEGORY_WRONG_BUSINESS =
  "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f \u043d\u0435 \u043f\u0440\u0438\u043d\u0430\u0434\u043b\u0435\u0436\u0438\u0442 \u044d\u0442\u043e\u043c\u0443 \u0431\u0438\u0437\u043d\u0435\u0441\u0443";
const ERR_BRAND_NOT_FOUND = "\u0411\u0440\u0435\u043d\u0434 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d";
const ERR_BRAND_WRONG_BUSINESS =
  "\u0411\u0440\u0435\u043d\u0434 \u043d\u0435 \u043f\u0440\u0438\u043d\u0430\u0434\u043b\u0435\u0436\u0438\u0442 \u044d\u0442\u043e\u043c\u0443 \u0431\u0438\u0437\u043d\u0435\u0441\u0443";

export async function ensureBusinessAccess(
  supabase: SupabaseLike,
  userId: string,
  businessId: string
): Promise<boolean> {
  const query = supabase
    .from("business_user")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("user_id", userId);

  const result = await query.in!("role", ["owner", "admin"]).single!();
  return !!result.data;
}

export async function validateProductRelationsBelongToBusiness(
  supabase: SupabaseLike,
  businessId: string,
  payload: ProductRelationPayload
): Promise<{ error?: string }> {
  const { data: category, error: categoryError } = await supabase
    .from("category")
    .select("business_id")
    .eq("id", payload.categoryId)
    .maybeSingle!();

  const categoryBusinessId = (category as { business_id?: string } | undefined)?.business_id;
  if (categoryError || !categoryBusinessId) {
    return { error: ERR_CATEGORY_NOT_FOUND };
  }

  if (categoryBusinessId !== businessId) {
    return { error: ERR_CATEGORY_WRONG_BUSINESS };
  }

  if (!payload.brandId) {
    return {};
  }

  const { data: brand, error: brandError } = await supabase
    .from("brand")
    .select("business_id")
    .eq("id", payload.brandId)
    .maybeSingle!();

  const brandBusinessId = (brand as { business_id?: string } | undefined)?.business_id;
  if (brandError || !brandBusinessId) {
    return { error: ERR_BRAND_NOT_FOUND };
  }

  if (brandBusinessId !== businessId) {
    return { error: ERR_BRAND_WRONG_BUSINESS };
  }

  return {};
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
