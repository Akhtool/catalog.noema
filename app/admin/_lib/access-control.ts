import type { createServerClient } from "@/lib/supabase-server";

export type ServerSupabase = Awaited<ReturnType<typeof createServerClient>>;

type AccessControlSupabase = Pick<ServerSupabase, "from" | "auth">;
type AccessControlledTable = "product" | "category" | "brand" | "business_location";

export async function getAuthenticatedUser(supabase: AccessControlSupabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getFirstBusinessIdForUser(
  supabase: AccessControlSupabase,
  userId: string
) {
  const { data: businessUsers, error } = await supabase
    .from("business_user")
    .select("business_id")
    .eq("user_id", userId)
    .limit(1);

  if (error || !businessUsers || businessUsers.length === 0) {
    return null;
  }

  return businessUsers[0].business_id;
}

export async function userHasAccessToBusinessId(
  supabase: AccessControlSupabase,
  userId: string,
  businessId: string
) {
  const { data: businessUser } = await supabase
    .from("business_user")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .single();

  return !!businessUser;
}

export async function getEntityBusinessId(
  supabase: AccessControlSupabase,
  table: AccessControlledTable,
  entityId: string
) {
  const { data, error } = await supabase
    .from(table)
    .select("business_id")
    .eq("id", entityId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.business_id;
}

export async function getAccessibleEntityBusinessId(
  supabase: AccessControlSupabase,
  userId: string,
  table: AccessControlledTable,
  entityId: string,
  notFoundError: string,
  forbiddenError: string
): Promise<{ businessId?: string; error?: string }> {
  const businessId = await getEntityBusinessId(supabase, table, entityId);

  if (!businessId) {
    return { error: notFoundError };
  }

  const hasAccess = await userHasAccessToBusinessId(supabase, userId, businessId);
  if (!hasAccess) {
    return { error: forbiddenError };
  }

  return { businessId };
}

export async function validateEntityBelongsToBusiness(
  supabase: AccessControlSupabase,
  table: Extract<AccessControlledTable, "category" | "brand">,
  entityId: string,
  businessId: string,
  notFoundError: string,
  wrongBusinessError: string
): Promise<{ error?: string }> {
  const entityBusinessId = await getEntityBusinessId(supabase, table, entityId);

  if (!entityBusinessId) {
    return { error: notFoundError };
  }

  if (entityBusinessId !== businessId) {
    return { error: wrongBusinessError };
  }

  return {};
}
