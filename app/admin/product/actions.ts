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

  return {};
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
