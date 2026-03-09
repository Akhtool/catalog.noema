"use server";

import { createServerClient } from "@/lib/supabase-server";
import { getAuthenticatedUser, userHasAccessToBusinessId } from "../_lib/access-control";

import { revalidateProductPaths } from "./product-action-helpers";

export interface BulkProductItem {
  name: string;
  categoryName: string;
  price: number;
  subtitle?: string | null;
  description?: string | null;
  brandName?: string | null;
  inStock?: boolean;
}

export interface ProductForExport {
  name: string;
  categoryName: string;
  price: number;
  subtitle: string | null;
  description: string | null;
  brandName: string | null;
  inStock: boolean;
}

export interface BulkCreateResult {
  created: number;
  errors: { row: number; message: string }[];
}

export async function getProductsForExport(
  businessId: string
): Promise<{ data?: ProductForExport[]; error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const hasAccess = await userHasAccessToBusinessId(supabase, user.id, businessId);
  if (!hasAccess) {
    return { error: "Нет доступа к этому бизнесу" };
  }

  const { data: rows, error } = await supabase
    .from("product")
    .select("name, subtitle, description, price, in_stock, category(name), brand(name)")
    .eq("business_id", businessId)
    .order("order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("getProductsForExport error:", error);
    return { error: "Ошибка загрузки товаров" };
  }

  const getCatName = (r: (typeof rows)[0]) => {
    const c = r.category as { name?: string } | { name?: string }[] | null;
    if (Array.isArray(c)) return c[0]?.name ?? "";
    return c?.name ?? "";
  };
  const getBrandName = (r: (typeof rows)[0]) => {
    const b = r.brand as { name?: string } | { name?: string }[] | null;
    if (Array.isArray(b)) return b[0]?.name ?? "";
    return b?.name ?? "";
  };

  const data: ProductForExport[] = (rows ?? []).map((r) => ({
    name: r.name ?? "",
    categoryName: getCatName(r),
    price: Number(r.price) ?? 0,
    subtitle: r.subtitle?.trim() || null,
    description: r.description?.trim() || null,
    brandName: getBrandName(r)?.trim() || null,
    inStock: r.in_stock ?? true,
  }));

  return { data };
}

export async function createProductsBulk(
  businessId: string,
  items: BulkProductItem[],
  businessSlug?: string
): Promise<{ data?: BulkCreateResult; error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "Не авторизован" };
  }

  const hasAccess = await userHasAccessToBusinessId(supabase, user.id, businessId);
  if (!hasAccess) {
    return { error: "Нет доступа к этому бизнесу" };
  }

  const result: BulkCreateResult = { created: 0, errors: [] };

  const { data: categories } = await supabase
    .from("category")
    .select("id, name")
    .eq("business_id", businessId);
  const categoryByName = new Map<string, string>(
    (categories ?? []).map((c) => [c.name.toLowerCase().trim(), c.id])
  );

  const { data: brands } = await supabase
    .from("brand")
    .select("id, name")
    .eq("business_id", businessId)
    .eq("is_active", true);
  const brandByName = new Map<string, string>(
    (brands ?? []).map((b) => [b.name.toLowerCase().trim(), b.id])
  );

  const { data: maxOrderRow } = await supabase
    .from("product")
    .select("order")
    .eq("business_id", businessId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextOrder = (maxOrderRow?.order ?? -1) + 1;

  const toInsert: {
    business_id: string;
    category_id: string;
    brand_id: string | null;
    name: string;
    subtitle: string | null;
    description: string | null;
    price: number;
    has_discount: boolean;
    original_price: number | null;
    discount_date_from: null;
    discount_date_to: null;
    in_stock: boolean;
    is_active: boolean;
    order: number;
  }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = i + 2;

    const name = item.name?.trim();
    if (!name) {
      result.errors.push({ row: rowNum, message: "Название обязательно" });
      continue;
    }
    if (name.length > 70) {
      result.errors.push({
        row: rowNum,
        message: "Название не более 70 символов",
      });
      continue;
    }

    const catName = item.categoryName?.trim();
    if (!catName) {
      result.errors.push({ row: rowNum, message: "Категория обязательна" });
      continue;
    }

    let categoryId = categoryByName.get(catName.toLowerCase());
    if (!categoryId) {
      const { data: newCat, error: catErr } = await supabase
        .from("category")
        .insert({
          business_id: businessId,
          name: catName,
          order: 9999,
          is_active: true,
        })
        .select("id")
        .single();
      if (catErr || !newCat?.id) {
        result.errors.push({
          row: rowNum,
          message: "Ошибка создания категории",
        });
        continue;
      }
      const newCategoryId = newCat.id as string;
      categoryId = newCategoryId;
      categoryByName.set(catName.toLowerCase(), newCategoryId);
    }

    const price = Number(item.price);
    if (Number.isNaN(price) || price < 0) {
      result.errors.push({ row: rowNum, message: "Укажите корректную цену" });
      continue;
    }

    let brandId: string | null = null;
    if (item.brandName?.trim()) {
      const bName = item.brandName.trim().toLowerCase();
      brandId = brandByName.get(bName) ?? null;
      if (!brandId) {
        const { data: newBrand, error: brandErr } = await supabase
          .from("brand")
          .insert({
            business_id: businessId,
            name: item.brandName.trim(),
            is_active: true,
          })
          .select("id")
          .single();
        if (!brandErr && newBrand?.id) {
          const newBrandId = newBrand.id as string;
          brandId = newBrandId;
          brandByName.set(bName, newBrandId);
        }
      }
    }

    const subtitle = item.subtitle?.trim() || null;
    if (subtitle && subtitle.length > 60) {
      result.errors.push({
        row: rowNum,
        message: "Подзаголовок не более 60 символов",
      });
      continue;
    }

    const description = item.description?.trim() || null;
    if (description && description.length > 2000) {
      result.errors.push({
        row: rowNum,
        message: "Описание не более 2000 символов",
      });
      continue;
    }

    toInsert.push({
      business_id: businessId,
      category_id: categoryId,
      brand_id: brandId,
      name,
      subtitle,
      description,
      price,
      has_discount: false,
      original_price: null,
      discount_date_from: null,
      discount_date_to: null,
      in_stock: item.inStock ?? true,
      is_active: true,
      order: nextOrder++,
    });
  }

  if (toInsert.length === 0) {
    revalidateProductPaths(businessSlug);
    return { data: result };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("product")
    .insert(toInsert)
    .select("id");

  if (insertError) {
    console.error("createProductsBulk insert error:", insertError);
    return { error: "Ошибка сохранения товаров" };
  }

  result.created = inserted?.length ?? 0;

  revalidateProductPaths(businessSlug);

  return { data: result };
}
