"use server";

import {
  getAccessibleEntityBusinessId,
  getAuthenticatedUser,
  userHasAccessToBusinessId,
} from "@/app/admin/_lib/access-control";
import { createServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import type { Brand } from "@/types";

function mapRowToBrand(row: {
  id: string;
  business_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): Brand {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getBrands(
  businessId: string,
  activeOnly = false
): Promise<{ data?: Brand[]; error?: string }> {
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
    .from("brand")
    .select("id, business_id, name, is_active, created_at, updated_at")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("getBrands error:", error);
    return { error: "Ошибка загрузки брендов" };
  }

  const data = (rows || []).map(mapRowToBrand);
  return { data };
}

export async function createBrand(
  businessId: string,
  name: string,
  businessSlug?: string
): Promise<{ data?: Brand; error?: string }> {
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
    return { error: "Название бренда обязательно" };
  }

  const { data: row, error } = await supabase
    .from("brand")
    .insert({
      business_id: businessId,
      name: trimmedName,
      is_active: true,
    })
    .select("id, business_id, name, is_active, created_at, updated_at")
    .single();

  if (error) {
    console.error("createBrand error:", error);
    return { error: "Ошибка создания бренда" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

  return { data: mapRowToBrand(row) };
}

export async function updateBrand(
  brandId: string,
  name: string,
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const brandAccess = await getAccessibleEntityBusinessId(
    supabase,
    user.id,
    "brand",
    brandId,
    "Бренд не найден",
    "Нет доступа к этому бренду"
  );
  if (brandAccess.error) {
    return { error: brandAccess.error };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Название бренда обязательно" };
  }

  const { error } = await supabase
    .from("brand")
    .update({ name: trimmedName })
    .eq("id", brandId);

  if (error) {
    console.error("updateBrand error:", error);
    return { error: "Ошибка сохранения" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

  return {};
}

export async function getProductCountByBrand(
  brandId: string
): Promise<{ count?: number; error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const brandAccess = await getAccessibleEntityBusinessId(
    supabase,
    user.id,
    "brand",
    brandId,
    "Бренд не найден",
    "Нет доступа к этому бренду"
  );
  if (brandAccess.error) {
    return { error: brandAccess.error };
  }

  const { data: products, error } = await supabase
    .from("product")
    .select("id")
    .eq("brand_id", brandId);

  if (error) {
    console.error("getProductCountByBrand error:", error);
    return { error: "Ошибка загрузки" };
  }

  return { count: products?.length ?? 0 };
}

export async function deleteBrand(
  brandId: string,
  deleteRelatedProducts: boolean,
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const brandAccess = await getAccessibleEntityBusinessId(
    supabase,
    user.id,
    "brand",
    brandId,
    "Бренд не найден",
    "Нет доступа к этому бренду"
  );
  if (brandAccess.error) {
    return { error: brandAccess.error };
  }

  if (deleteRelatedProducts) {
    const { error: updateError } = await supabase
      .from("product")
      .update({ is_active: false })
      .eq("brand_id", brandId);

    if (updateError) {
      console.error("deleteBrand (deactivate products) error:", updateError);
      return { error: "Ошибка при деактивации товаров" };
    }
  }

  const { error } = await supabase.from("brand").delete().eq("id", brandId);

  if (error) {
    console.error("deleteBrand error:", error);
    return { error: "Ошибка удаления бренда" };
  }

  revalidatePath("/admin/business");
  if (businessSlug) revalidatePath(`/${businessSlug}`);

  return {};
}
