"use server";

import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { logServerError, trackServerEvent } from "@/lib/observability";
import {
  getAuthenticatedUser,
  userHasAccessToBusinessId,
} from "../_lib/access-control";
import {
  validateProductPayloadBasics as validateProductPayloadBasicsGuard,
  validateProductRelationsBelongToBusiness as validateProductRelationsGuard,
} from "./product-guards";
import {
  getAccessibleProductBusinessId,
  revalidateProductPaths,
} from "./product-action-helpers";
import {
  createProductsBulk as createProductsBulkAction,
  getProductsForExport as getProductsForExportAction,
} from "./product-bulk-actions";
import type {
  BulkCreateResult,
  BulkProductItem,
  ProductForExport,
} from "./product-bulk-actions";
import {
  deleteProductImage as deleteProductImageAction,
  reorderProductImages as reorderProductImagesAction,
  uploadProductImage as uploadProductImageAction,
} from "./product-image-actions";
import type { ProductImageForEdit } from "./product-image-actions";
export type { ProductImageForEdit } from "./product-image-actions";
export type {
  BulkCreateResult,
  BulkProductItem,
  ProductForExport,
} from "./product-bulk-actions";

async function validateProductRelationsBelongToBusiness(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  businessId: string,
  payload: Pick<ProductUpsertPayload, "categoryId" | "brandId">
): Promise<{ error?: string }> {
  return validateProductRelationsGuard(supabase, businessId, payload);
}

function validateProductPayloadBasics(
  payload: Pick<ProductUpsertPayload, "name" | "categoryId" | "price">
): { name?: string; price?: number; error?: string } {
  return validateProductPayloadBasicsGuard({
    name: payload.name,
    categoryId: payload.categoryId,
    price: payload.price,
  });
}

function buildProductWritePayload(
  payload: ProductUpsertPayload,
  normalized: { name: string; price: number }
) {
  const hasDiscount = payload.hasDiscount ?? false;
  const originalPrice =
    hasDiscount &&
    payload.originalPrice != null &&
    payload.originalPrice > normalized.price
      ? payload.originalPrice
      : null;

  return {
    category_id: payload.categoryId,
    brand_id: payload.brandId ?? null,
    name: normalized.name,
    subtitle: payload.subtitle?.trim() || null,
    description: payload.description?.trim() || null,
    price: normalized.price,
    has_discount: hasDiscount,
    original_price: originalPrice,
    discount_date_from: payload.discountDateFrom ?? null,
    discount_date_to: payload.discountDateTo ?? null,
    in_stock: payload.inStock ?? true,
    is_active: payload.isActive ?? false,
  };
}

/** Данные товара для редактирования (из БД) */
export interface ProductForEdit {
  id: string;
  businessId: string;
  categoryId: string;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  name: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  hasDiscount: boolean;
  originalPrice: number | null;
  discountDateFrom: string | null;
  discountDateTo: string | null;
  inStock: boolean;
  isActive: boolean;
  images: ProductImageForEdit[];
}

/**
 * Возвращает товар по id для редактирования (с проверкой доступа).
 * Подгружает названия категории и бренда для отображения в форме.
 */
/** Проверка, что productId — непустая строка (для вызова getProduct). */
function isValidProductId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function getProduct(
  productId: string
): Promise<{ data?: ProductForEdit; error?: string }> {
  if (!isValidProductId(productId)) {
    return { error: "Товар не найден" };
  }

  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const id = productId.trim();
  const { data: row, error } = await supabase
    .from("product")
    .select(
      "id, business_id, category_id, brand_id, name, subtitle, description, price, has_discount, original_price, discount_date_from, discount_date_to, in_stock, is_active, category(name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getProduct Supabase error:", error.code, error.message);
    return { error: "Товар не найден" };
  }

  if (!row) {
    return { error: "Товар не найден" };
  }

  const hasAccess = await userHasAccessToBusinessId(supabase, user.id, row.business_id);
  if (!hasAccess) {
    return { error: "Нет доступа к этому товару" };
  }

  const { data: imageRows } = await supabase
    .from("product_image")
    .select("id, url, position")
    .eq("product_id", row.id)
    .order("position", { ascending: true });

  const catEmbed = row.category as { name: string } | { name: string }[] | null;
  let categoryName =
    Array.isArray(catEmbed) ? catEmbed[0]?.name ?? null : catEmbed?.name ?? null;
  if (!categoryName && row.category_id) {
    const { data: cat } = await supabase
      .from("category")
      .select("name")
      .eq("id", row.category_id)
      .maybeSingle();
    categoryName = cat?.name ?? null;
  }
  let brandName: string | null = null;
  if (row.brand_id) {
    const { data: brand } = await supabase
      .from("brand")
      .select("name")
      .eq("id", row.brand_id)
      .single();
    brandName = brand?.name ?? null;
  }

  const images: ProductImageForEdit[] = (imageRows ?? []).map((img) => ({
    id: img.id,
    url: img.url,
    position: img.position,
  }));

  const data: ProductForEdit = {
    id: row.id,
    businessId: row.business_id,
    categoryId: row.category_id,
    categoryName,
    brandId: row.brand_id,
    brandName,
    name: row.name,
    subtitle: row.subtitle,
    description: row.description,
    price: row.price,
    hasDiscount: row.has_discount === true,
    originalPrice:
      row.original_price != null && typeof row.original_price === "number"
        ? Number(row.original_price)
        : null,
    discountDateFrom:
      typeof row.discount_date_from === "string" ? row.discount_date_from : null,
    discountDateTo:
      typeof row.discount_date_to === "string" ? row.discount_date_to : null,
    inStock: row.in_stock,
    isActive: row.is_active,
    images,
  };
  return { data };
}

/** Поля для создания/обновления товара */
export interface ProductUpsertPayload {
  name: string;
  subtitle?: string | null;
  description?: string | null;
  price: number;
  hasDiscount?: boolean;
  originalPrice?: number | null;
  discountDateFrom?: string | null;
  discountDateTo?: string | null;
  categoryId: string;
  brandId?: string | null;
  inStock?: boolean;
  isActive?: boolean;
}

export async function getProductsForExport(
  businessId: string
): Promise<{ data?: ProductForExport[]; error?: string }> {
  return getProductsForExportAction(businessId);
}

export async function createProductsBulk(
  businessId: string,
  items: BulkProductItem[],
  businessSlug?: string
): Promise<{ data?: BulkCreateResult; error?: string }> {
  return createProductsBulkAction(businessId, items, businessSlug);
}

/**
 * Сбрасывает истёкшие скидки: price = original_price, has_discount = false.
 * Вызывается при загрузке каталога. Использует admin-клиент (без авторизации).
 */
export async function expireProductDiscounts(
  businessId: string
): Promise<{ expired?: number; error?: string }> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = createAdminClient();

  const { data: products, error: fetchError } = await supabase
    .from("product")
    .select("id, original_price")
    .eq("business_id", businessId)
    .eq("has_discount", true)
    .not("original_price", "is", null)
    .not("discount_date_to", "is", null)
    .lt("discount_date_to", today);

  if (fetchError) {
    console.error("expireProductDiscounts fetch:", fetchError);
    return { error: "Ошибка при проверке скидок" };
  }

  if (!products || products.length === 0) return { expired: 0 };

  let expired = 0;
  for (const p of products) {
    const { error: updateError } = await supabase
      .from("product")
      .update({
        price: p.original_price,
        has_discount: false,
        original_price: null,
        discount_date_from: null,
        discount_date_to: null,
      })
      .eq("id", p.id);

    if (updateError) {
      console.error("expireProductDiscounts update:", updateError);
      continue;
    }
    expired++;
  }

  return { expired };
}

/**
 * Создаёт товар.
 */
export async function createProduct(
  businessId: string,
  payload: ProductUpsertPayload,
  businessSlug?: string
): Promise<{ data?: { id: string }; error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const hasAccess = await userHasAccessToBusinessId(supabase, user.id, businessId);
  if (!hasAccess) {
    return { error: "Нет доступа к этому бизнесу" };
  }

  const basics = validateProductPayloadBasics(payload);
  if (basics.error) {
    return { error: basics.error };
  }
  const name = basics.name!;
  const price = basics.price!;

  const relationValidation = await validateProductRelationsBelongToBusiness(
    supabase,
    businessId,
    payload
  );
  if (relationValidation.error) {
    return { error: relationValidation.error };
  }

  const { data: maxOrderRow } = await supabase
    .from("product")
    .select("order")
    .eq("business_id", businessId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxOrderRow?.order ?? -1) + 1;

  const productWritePayload = buildProductWritePayload(payload, { name, price });

  const { data: row, error } = await supabase
    .from("product")
    .insert({
      business_id: businessId,
      ...productWritePayload,
      order: nextOrder,
    })
    .select("id")
    .single();

  if (error) {
    logServerError("product.create", error, {
      businessId,
      businessSlug: businessSlug ?? null,
      categoryId: payload.categoryId,
      brandId: payload.brandId ?? null,
    });
    return { error: "Ошибка создания товара" };
  }

  revalidateProductPaths(businessSlug);
  if (payload.isActive ?? false) {
    trackServerEvent("catalog_published", {
      businessId,
      productId: row.id,
      source: "create_product",
    });
  }

  return { data: { id: row.id } };
}

/**
 * Обновляет товар.
 */
export async function updateProduct(
  productId: string,
  payload: ProductUpsertPayload,
  businessSlug?: string
): Promise<{ data?: { id: string }; error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const productAccess = await getAccessibleProductBusinessId(
    supabase,
    user.id,
    productId
  );
  if (productAccess.error) {
    return { error: productAccess.error };
  }
  const businessId = productAccess.businessId!;

  const basics = validateProductPayloadBasics(payload);
  if (basics.error) {
    return { error: basics.error };
  }
  const name = basics.name!;
  const price = basics.price!;

  const relationValidation = await validateProductRelationsBelongToBusiness(
    supabase,
    businessId,
    payload
  );
  if (relationValidation.error) {
    return { error: relationValidation.error };
  }

  const productWritePayload = buildProductWritePayload(payload, { name, price });

  const { error: updateError } = await supabase
    .from("product")
    .update(productWritePayload)
    .eq("id", productId);

  if (updateError) {
    logServerError("product.update", updateError, {
      productId,
      businessId,
      businessSlug: businessSlug ?? null,
    });
    return { error: "Ошибка сохранения товара" };
  }

  revalidateProductPaths(businessSlug);
  if (payload.isActive ?? false) {
    trackServerEvent("catalog_published", {
      businessId,
      productId,
      source: "update_product",
    });
  }

  return { data: { id: productId } };
}

/**
 * Деактивирует товар (soft delete).
 */
export async function deleteProduct(
  productId: string,
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const productAccess = await getAccessibleProductBusinessId(
    supabase,
    user.id,
    productId
  );
  if (productAccess.error) {
    return { error: productAccess.error };
  }

  const { error: deleteError } = await supabase
    .from("product")
    .update({ is_active: false })
    .eq("id", productId);

  if (deleteError) {
    console.error("deleteProduct error:", deleteError);
    return { error: "Ошибка удаления товара" };
  }

  revalidateProductPaths(businessSlug);

  return {};
}

/**
 * Восстанавливает товар (is_active = true) после скрытия.
 */
export async function restoreProduct(
  productId: string,
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const productAccess = await getAccessibleProductBusinessId(
    supabase,
    user.id,
    productId
  );
  if (productAccess.error) {
    return { error: productAccess.error };
  }

  const { error: updateError } = await supabase
    .from("product")
    .update({ is_active: true })
    .eq("id", productId);

  if (updateError) {
    logServerError("product.restore", updateError, {
      productId,
      businessSlug: businessSlug ?? null,
    });
    return { error: "Ошибка восстановления товара" };
  }

  revalidateProductPaths(businessSlug);
  trackServerEvent("catalog_published", {
    businessId: productAccess.businessId ?? null,
    productId,
    source: "restore_product",
  });

  return {};
}

/**
 * Меняет порядок товаров в каталоге по переданному списку id (индекс = order).
 */
export async function reorderProducts(
  businessId: string,
  orderedProductIds: string[],
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const hasAccess = await userHasAccessToBusinessId(supabase, user.id, businessId);
  if (!hasAccess) {
    return { error: "Нет доступа к этому бизнесу" };
  }

  const { error } = await supabase.rpc("reorder_products", {
    p_business_id: businessId,
    p_ordered_ids: orderedProductIds,
  });
  if (error) {
    console.error("reorderProducts error:", error);
    return { error: "Ошибка изменения порядка товаров" };
  }

  revalidateProductPaths(businessSlug);

  return {};
}

export async function uploadProductImage(
  productId: string,
  formData: FormData,
  businessSlug?: string
): Promise<{ data?: ProductImageForEdit; error?: string }> {
  return uploadProductImageAction(productId, formData, businessSlug);
}

export async function deleteProductImage(
  imageId: string,
  businessSlug?: string
): Promise<{ error?: string }> {
  return deleteProductImageAction(imageId, businessSlug);
}

export async function reorderProductImages(
  productId: string,
  orderedIds: string[],
  businessSlug?: string
): Promise<{ error?: string }> {
  return reorderProductImagesAction(productId, orderedIds, businessSlug);
}

