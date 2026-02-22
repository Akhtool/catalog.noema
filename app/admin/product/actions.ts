"use server";

import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

/** Проверяет, что пользователь имеет доступ (owner/admin) к бизнесу */
async function ensureBusinessAccess(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  businessId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("business_user")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .single();
  return !!data;
}

/** Элемент изображения товара для редактора */
export interface ProductImageForEdit {
  id: string;
  url: string;
  position: number;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const hasAccess = await ensureBusinessAccess(
    supabase,
    user.id,
    row.business_id
  );
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  const hasAccess = await ensureBusinessAccess(supabase, user.id, businessId);
  if (!hasAccess) {
    return { error: "Нет доступа к этому бизнесу" };
  }

  const name = payload.name?.trim();
  if (!name) {
    return { error: "Название обязательно" };
  }
  if (!payload.categoryId) {
    return { error: "Выберите категорию" };
  }
  const price = Number(payload.price);
  if (Number.isNaN(price) || price < 0) {
    return { error: "Укажите корректную цену" };
  }

  const { data: maxOrderRow } = await supabase
    .from("product")
    .select("order")
    .eq("business_id", businessId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxOrderRow?.order ?? -1) + 1;

  const hasDiscount = payload.hasDiscount ?? false;
  const originalPrice =
    hasDiscount && payload.originalPrice != null && payload.originalPrice > price
      ? payload.originalPrice
      : null;

  const { data: row, error } = await supabase
    .from("product")
    .insert({
      business_id: businessId,
      category_id: payload.categoryId,
      brand_id: payload.brandId ?? null,
      name,
      subtitle: payload.subtitle?.trim() || null,
      description: payload.description?.trim() || null,
      price,
      has_discount: hasDiscount,
      original_price: originalPrice,
      discount_date_from: payload.discountDateFrom || null,
      discount_date_to: payload.discountDateTo || null,
      in_stock: payload.inStock ?? true,
      is_active: payload.isActive ?? false,
      order: nextOrder,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createProduct error:", error);
    return { error: "Ошибка создания товара" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  const { data: product } = await supabase
    .from("product")
    .select("business_id")
    .eq("id", productId)
    .single();

  if (!product) {
    return { error: "Товар не найден" };
  }

  const hasAccess = await ensureBusinessAccess(
    supabase,
    user.id,
    product.business_id
  );
  if (!hasAccess) {
    return { error: "Нет доступа к этому товару" };
  }

  const name = payload.name?.trim();
  if (!name) {
    return { error: "Название обязательно" };
  }
  if (!payload.categoryId) {
    return { error: "Выберите категорию" };
  }
  const price = Number(payload.price);
  if (Number.isNaN(price) || price < 0) {
    return { error: "Укажите корректную цену" };
  }

  const hasDiscount = payload.hasDiscount ?? false;
  const originalPrice =
    hasDiscount && payload.originalPrice != null && payload.originalPrice > price
      ? payload.originalPrice
      : null;

  const { error: updateError } = await supabase
    .from("product")
    .update({
      category_id: payload.categoryId,
      brand_id: payload.brandId ?? null,
      name,
      subtitle: payload.subtitle?.trim() || null,
      description: payload.description?.trim() || null,
      price,
      has_discount: hasDiscount,
      original_price: originalPrice,
      discount_date_from: payload.discountDateFrom ?? null,
      discount_date_to: payload.discountDateTo ?? null,
      in_stock: payload.inStock ?? true,
      is_active: payload.isActive ?? false,
    })
    .eq("id", productId);

  if (updateError) {
    console.error("updateProduct error:", updateError);
    return { error: "Ошибка сохранения товара" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  const { data: product } = await supabase
    .from("product")
    .select("business_id")
    .eq("id", productId)
    .single();

  if (!product) {
    return { error: "Товар не найден" };
  }

  const hasAccess = await ensureBusinessAccess(
    supabase,
    user.id,
    product.business_id
  );
  if (!hasAccess) {
    return { error: "Нет доступа к этому товару" };
  }

  const { error: deleteError } = await supabase
    .from("product")
    .update({ is_active: false })
    .eq("id", productId);

  if (deleteError) {
    console.error("deleteProduct error:", deleteError);
    return { error: "Ошибка удаления товара" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  const { data: product } = await supabase
    .from("product")
    .select("business_id")
    .eq("id", productId)
    .single();

  if (!product) {
    return { error: "Товар не найден" };
  }

  const hasAccess = await ensureBusinessAccess(
    supabase,
    user.id,
    product.business_id
  );
  if (!hasAccess) {
    return { error: "Нет доступа к этому товару" };
  }

  const { error: updateError } = await supabase
    .from("product")
    .update({ is_active: true })
    .eq("id", productId);

  if (updateError) {
    console.error("restoreProduct error:", updateError);
    return { error: "Ошибка восстановления товара" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  const hasAccess = await ensureBusinessAccess(supabase, user.id, businessId);
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

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

  return {};
}

const PRODUCT_IMAGE_MAX_COUNT = 12;
const PRODUCT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Загружает изображение товара в Storage и создаёт запись в product_image.
 */
export async function uploadProductImage(
  productId: string,
  formData: FormData,
  businessSlug?: string
): Promise<{ data?: ProductImageForEdit; error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  const { data: product } = await supabase
    .from("product")
    .select("business_id")
    .eq("id", productId)
    .single();

  if (!product) {
    return { error: "Товар не найден" };
  }

  const hasAccess = await ensureBusinessAccess(
    supabase,
    user.id,
    product.business_id
  );
  if (!hasAccess) {
    return { error: "Нет доступа к этому товару" };
  }

  const file = formData.get("file") as File | null;
  if (!file || !file.size) {
    return { error: "Файл не выбран" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Файл должен быть изображением" };
  }
  if (file.size > PRODUCT_IMAGE_MAX_SIZE_BYTES) {
    return { error: "Размер файла не должен превышать 5 МБ" };
  }

  const { count } = await supabase
    .from("product_image")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  if ((count ?? 0) >= PRODUCT_IMAGE_MAX_COUNT) {
    return { error: `Максимум ${PRODUCT_IMAGE_MAX_COUNT} фото на товар` };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${productId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("product")
    .upload(filePath, file, { contentType: file.type, upsert: false, cacheControl: 'public, max-age=31536000, immutable' });

  if (uploadError) {
    console.error("uploadProductImage storage error:", uploadError);
    return { error: "Ошибка загрузки изображения" };
  }

  const { data: urlData } = supabase.storage
    .from("product")
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    return { error: "Не удалось получить URL изображения" };
  }

  const { data: maxPos } = await supabase
    .from("product_image")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (maxPos?.position ?? -1) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("product_image")
    .insert({
      product_id: productId,
      url: urlData.publicUrl,
      position,
    })
    .select("id, url, position")
    .single();

  if (insertError) {
    console.error("uploadProductImage insert error:", insertError);
    return { error: "Ошибка сохранения записи об изображении" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

  return {
    data: {
      id: inserted.id,
      url: inserted.url,
      position: inserted.position,
    },
  };
}

/**
 * Удаляет изображение товара из product_image и при возможности из Storage.
 */
export async function deleteProductImage(
  imageId: string,
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  const { data: row } = await supabase
    .from("product_image")
    .select("product_id, url")
    .eq("id", imageId)
    .single();

  if (!row) {
    return { error: "Изображение не найдено" };
  }

  const { data: product } = await supabase
    .from("product")
    .select("business_id")
    .eq("id", row.product_id)
    .single();

  if (!product) {
    return { error: "Товар не найден" };
  }

  const hasAccess = await ensureBusinessAccess(
    supabase,
    user.id,
    product.business_id
  );
  if (!hasAccess) {
    return { error: "Нет доступа к этому товару" };
  }

  try {
    const url = new URL(row.url);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/product\/(.+)/);
    if (pathMatch?.[1]) {
      await supabase.storage.from("product").remove([pathMatch[1]]);
    }
  } catch {
    // игнорируем ошибки удаления из Storage
  }

  const { error: deleteError } = await supabase
    .from("product_image")
    .delete()
    .eq("id", imageId);

  if (deleteError) {
    console.error("deleteProductImage error:", deleteError);
    return { error: "Ошибка удаления изображения" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

  return {};
}

/**
 * Меняет порядок изображений товара по переданному списку id (индекс = position).
 */
export async function reorderProductImages(
  productId: string,
  orderedIds: string[],
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  const { data: product } = await supabase
    .from("product")
    .select("business_id")
    .eq("id", productId)
    .single();

  if (!product) {
    return { error: "Товар не найден" };
  }

  const hasAccess = await ensureBusinessAccess(
    supabase,
    user.id,
    product.business_id
  );
  if (!hasAccess) {
    return { error: "Нет доступа к этому товару" };
  }

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("product_image")
      .update({ position: i })
      .eq("id", orderedIds[i])
      .eq("product_id", productId);
    if (error) {
      console.error("reorderProductImages error:", error);
      return { error: "Ошибка изменения порядка фото" };
    }
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

  return {};
}
