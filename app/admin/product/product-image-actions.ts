"use server";

import { createServerClient } from "@/lib/supabase-server";
import { getAuthenticatedUser } from "../_lib/access-control";

import {
  getAccessibleProductBusinessId,
  revalidateProductPaths,
} from "./product-action-helpers";

export interface ProductImageForEdit {
  id: string;
  url: string;
  position: number;
}

const PRODUCT_IMAGE_MAX_COUNT = 12;
const PRODUCT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

function validateProductImageFile(file: File | null): { file?: File; error?: string } {
  if (!file || !file.size) {
    return { error: "Файл не выбран" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Файл должен быть изображением" };
  }
  if (file.size > PRODUCT_IMAGE_MAX_SIZE_BYTES) {
    return { error: "Размер файла не должен превышать 5 МБ" };
  }

  return { file };
}

function buildProductImagePath(productId: string, fileName: string): string {
  const ext = fileName.split(".").pop() || "jpg";
  return `${productId}/${crypto.randomUUID()}.${ext}`;
}

function extractProductStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/product\/(.+)/);
    return pathMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function uploadProductImage(
  productId: string,
  formData: FormData,
  businessSlug?: string
): Promise<{ data?: ProductImageForEdit; error?: string }> {
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

  const fileValidation = validateProductImageFile(formData.get("file") as File | null);
  if (fileValidation.error) {
    return { error: fileValidation.error };
  }
  const file = fileValidation.file!;

  const { count } = await supabase
    .from("product_image")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  if ((count ?? 0) >= PRODUCT_IMAGE_MAX_COUNT) {
    return { error: `Максимум ${PRODUCT_IMAGE_MAX_COUNT} фото на товар` };
  }

  const filePath = buildProductImagePath(productId, file.name);

  const { error: uploadError } = await supabase.storage.from("product").upload(filePath, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: "public, max-age=31536000, immutable",
  });

  if (uploadError) {
    console.error("uploadProductImage storage error:", uploadError);
    return { error: "Ошибка загрузки изображения" };
  }

  const { data: urlData } = supabase.storage.from("product").getPublicUrl(filePath);

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

  revalidateProductPaths(businessSlug);

  return {
    data: {
      id: inserted.id,
      url: inserted.url,
      position: inserted.position,
    },
  };
}

export async function deleteProductImage(
  imageId: string,
  businessSlug?: string
): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const user = await getAuthenticatedUser(supabase);

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

  const productAccess = await getAccessibleProductBusinessId(
    supabase,
    user.id,
    row.product_id
  );
  if (productAccess.error) {
    return { error: productAccess.error };
  }

  const storagePath = extractProductStoragePath(row.url);
  if (storagePath) {
    try {
      await supabase.storage.from("product").remove([storagePath]);
    } catch {
      // Ignore storage deletion failures.
    }
  }

  const { error: deleteError } = await supabase
    .from("product_image")
    .delete()
    .eq("id", imageId);

  if (deleteError) {
    console.error("deleteProductImage error:", deleteError);
    return { error: "Ошибка удаления изображения" };
  }

  revalidateProductPaths(businessSlug);

  return {};
}

export async function reorderProductImages(
  productId: string,
  orderedIds: string[],
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

  revalidateProductPaths(businessSlug);

  return {};
}
