"use server";

import { createServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { Category } from "@/types";

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

/** Преобразует строку категории из БД в тип Category */
function mapRowToCategory(row: {
  id: string;
  business_id: string;
  name: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): Category {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    order: row.order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Возвращает список категорий бизнеса.
 * @param businessId — ID бизнеса
 * @param activeOnly — если true, только активные (для выбора в товаре)
 */
export async function getCategories(
  businessId: string,
  activeOnly = false
): Promise<{ data?: Category[]; error?: string }> {
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

  let query = supabase
    .from("category")
    .select("id, business_id, name, order, is_active, created_at, updated_at")
    .eq("business_id", businessId)
    .order("order", { ascending: true })
    .order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("getCategories error:", error);
    return { error: "Ошибка загрузки категорий" };
  }

  const data = (rows || []).map(mapRowToCategory);
  return { data };
}

/**
 * Создаёт категорию для бизнеса. order = max(order)+1 среди активных категорий.
 */
export async function createCategory(
  businessId: string,
  name: string,
  businessSlug?: string
): Promise<{ data?: Category; error?: string }> {
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

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Название категории обязательно" };
  }

  const { data: maxOrderRow } = await supabase
    .from("category")
    .select("order")
    .eq("business_id", businessId)
    .order("order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrderRow?.order ?? -1) + 1;

  const { data: row, error } = await supabase
    .from("category")
    .insert({
      business_id: businessId,
      name: trimmedName,
      order: nextOrder,
      is_active: true,
    })
    .select("id, business_id, name, order, is_active, created_at, updated_at")
    .single();

  if (error) {
    console.error("createCategory error:", error);
    return { error: "Ошибка создания категории" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

  return { data: mapRowToCategory(row) };
}

/**
 * Обновляет название или порядок категории.
 */
export async function updateCategory(
  categoryId: string,
  payload: { name?: string },
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  const { data: category } = await supabase
    .from("category")
    .select("business_id")
    .eq("id", categoryId)
    .single();

  if (!category) {
    return { error: "Категория не найдена" };
  }

  const hasAccess = await ensureBusinessAccess(
    supabase,
    user.id,
    category.business_id
  );
  if (!hasAccess) {
    return { error: "Нет доступа к этой категории" };
  }

  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) return { error: "Название категории обязательно" };
    updateData.name = trimmed;
  }

  if (Object.keys(updateData).length === 0) {
    return {};
  }

  const { error } = await supabase
    .from("category")
    .update(updateData)
    .eq("id", categoryId);

  if (error) {
    console.error("updateCategory error:", error);
    return { error: "Ошибка сохранения" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

  return {};
}

/**
 * Возвращает количество товаров в категории (для модалки удаления).
 */
export async function getProductCountByCategory(
  categoryId: string
): Promise<{ count?: number; error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  const { data: category } = await supabase
    .from("category")
    .select("business_id")
    .eq("id", categoryId)
    .single();

  if (!category) {
    return { error: "Категория не найдена" };
  }

  const hasAccess = await ensureBusinessAccess(
    supabase,
    user.id,
    category.business_id
  );
  if (!hasAccess) {
    return { error: "Нет доступа к этой категории" };
  }

  const { data: products, error } = await supabase
    .from("product")
    .select("id")
    .eq("category_id", categoryId);

  if (error) {
    console.error("getProductCountByCategory error:", error);
    return { error: "Ошибка загрузки" };
  }

  return { count: products?.length ?? 0 };
}

/**
 * Удаляет категорию.
 * Без галочки «удалить связанные товары»: удалить можно только если в категории нет товаров.
 * С галочкой: товары в этой категории деактивируются (is_active = false), затем категория удаляется.
 */
export async function deleteCategory(
  categoryId: string,
  deleteRelatedProducts: boolean,
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  const { data: category } = await supabase
    .from("category")
    .select("business_id")
    .eq("id", categoryId)
    .single();

  if (!category) {
    return { error: "Категория не найдена" };
  }

  const hasAccess = await ensureBusinessAccess(
    supabase,
    user.id,
    category.business_id
  );
  if (!hasAccess) {
    return { error: "Нет доступа к этой категории" };
  }

  if (deleteRelatedProducts) {
    const { error: updateError } = await supabase
      .from("product")
      .update({ is_active: false })
      .eq("category_id", categoryId);

    if (updateError) {
      console.error("deleteCategory (deactivate products) error:", updateError);
      return { error: "Ошибка при деактивации товаров" };
    }
  } else {
    const { data: products } = await supabase
      .from("product")
      .select("id")
      .eq("category_id", categoryId);

    if (products && products.length > 0) {
      return {
        error:
          "Нельзя удалить категорию: в ней есть товары. Отметьте «удалить связанные товары» или перенесите товары в другую категорию.",
      };
    }
  }

  const { error } = await supabase
    .from("category")
    .delete()
    .eq("id", categoryId);

  if (error) {
    console.error("deleteCategory error:", error);
    return { error: "Ошибка удаления категории" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

  return {};
}
