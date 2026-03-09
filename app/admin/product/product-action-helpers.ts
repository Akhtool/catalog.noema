import { revalidatePath } from "next/cache";

import {
  getAccessibleEntityBusinessId,
  type ServerSupabase as ProductServerSupabase,
} from "../_lib/access-control";

export async function getAccessibleProductBusinessId(
  supabase: ProductServerSupabase,
  userId: string,
  productId: string
): Promise<{ businessId?: string; error?: string }> {
  return getAccessibleEntityBusinessId(
    supabase,
    userId,
    "product",
    productId,
    "Товар не найден",
    "Нет доступа к этому товару"
  );
}

export function revalidateProductPaths(businessSlug?: string) {
  revalidatePath("/admin/business");
  if (businessSlug) {
    revalidatePath(`/${businessSlug}`);
  }
}
