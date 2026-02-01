"use server";

import { createServerClient } from "@/lib/supabase-server";
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
      "id, business_id, category_id, brand_id, name, subtitle, description, price, in_stock, is_active"
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

  let categoryName: string | null = null;
  let brandName: string | null = null;
  if (row.category_id) {
    const { data: cat } = await supabase
      .from("category")
      .select("name")
      .eq("id", row.category_id)
      .single();
    categoryName = cat?.name ?? null;
  }
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
  categoryId: string;
  brandId?: string | null;
  inStock?: boolean;
  isActive?: boolean;
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
      in_stock: payload.inStock ?? true,
      is_active: payload.isActive ?? false,
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

  const { error: updateError } = await supabase
    .from("product")
    .update({
      category_id: payload.categoryId,
      brand_id: payload.brandId ?? null,
      name,
      subtitle: payload.subtitle?.trim() || null,
      description: payload.description?.trim() || null,
      price,
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
    .upload(filePath, file, { contentType: file.type, upsert: false });

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
