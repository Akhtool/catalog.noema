"use server";

import {
  getAccessibleEntityBusinessId,
  getAuthenticatedUser,
  userHasAccessToBusinessId,
} from "@/app/admin/_lib/access-control";
import { createServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { Category } from "@/types";

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

export async function getCategories(
  businessId: string,
  activeOnly = false
): Promise<{ data?: Category[]; error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const hasAccess = await userHasAccessToBusinessId(supabase, user.id, businessId);
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

export async function createCategory(
  businessId: string,
  name: string,
  businessSlug?: string
): Promise<{ data?: Category; error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const hasAccess = await userHasAccessToBusinessId(supabase, user.id, businessId);
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

export async function updateCategory(
  categoryId: string,
  payload: { name?: string },
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const categoryAccess = await getAccessibleEntityBusinessId(
    supabase,
    user.id,
    "category",
    categoryId,
    "Категория не найдена",
    "Нет доступа к этой категории"
  );
  if (categoryAccess.error) {
    return { error: categoryAccess.error };
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

export async function getProductCountByCategory(
  categoryId: string
): Promise<{ count?: number; error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const categoryAccess = await getAccessibleEntityBusinessId(
    supabase,
    user.id,
    "category",
    categoryId,
    "Категория не найдена",
    "Нет доступа к этой категории"
  );
  if (categoryAccess.error) {
    return { error: categoryAccess.error };
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

export async function deleteCategory(
  categoryId: string,
  deleteRelatedProducts: boolean,
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const categoryAccess = await getAccessibleEntityBusinessId(
    supabase,
    user.id,
    "category",
    categoryId,
    "Категория не найдена",
    "Нет доступа к этой категории"
  );
  if (categoryAccess.error) {
    return { error: categoryAccess.error };
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
