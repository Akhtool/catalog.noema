import { describe, expect, it } from "vitest";

import {
  getAccessibleEntityBusinessId,
  getEntityBusinessId,
  userHasAccessToBusinessId,
  validateEntityBelongsToBusiness,
} from "./access-control";

function createSupabaseMock(resolvers: Record<string, Record<string, unknown>>) {
  return {
    auth: {
      async getUser() {
        return { data: { user: null } };
      },
    },
    from(table: string) {
      const state = {
        filters: {} as Record<string, unknown>,
      };

      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          state.filters[column] = value;
          return builder;
        },
        in() {
          return builder;
        },
        limit() {
          return builder;
        },
        async single() {
          const key = JSON.stringify(state.filters);
          return { data: resolvers[table]?.[key] };
        },
        async maybeSingle() {
          const key = JSON.stringify(state.filters);
          const entry = resolvers[table]?.[key];
          if (entry instanceof Error) {
            return { data: undefined, error: entry };
          }
          return { data: entry };
        },
      };

      return builder;
    },
  };
}

describe("access control helpers", () => {
  it("grants access only when owner/admin membership exists", async () => {
    const allowedSupabase = createSupabaseMock({
      business_user: {
        '{"business_id":"business-1","user_id":"user-1"}': { business_id: "business-1" },
      },
    });
    const deniedSupabase = createSupabaseMock({
      business_user: {},
    });

    await expect(
      userHasAccessToBusinessId(allowedSupabase as never, "user-1", "business-1")
    ).resolves.toBe(true);
    await expect(
      userHasAccessToBusinessId(deniedSupabase as never, "user-2", "business-1")
    ).resolves.toBe(false);
  });

  it("returns the business id for a known entity", async () => {
    const supabase = createSupabaseMock({
      product: {
        '{"id":"product-1"}': { business_id: "business-1" },
      },
    });

    await expect(
      getEntityBusinessId(supabase as never, "product", "product-1")
    ).resolves.toBe("business-1");
  });

  it("returns null when the entity does not exist", async () => {
    const supabase = createSupabaseMock({
      category: {},
    });

    await expect(
      getEntityBusinessId(supabase as never, "category", "missing-category")
    ).resolves.toBeNull();
  });

  it("returns the expected not-found and forbidden errors", async () => {
    const missingSupabase = createSupabaseMock({
      brand: {},
    });
    const deniedSupabase = createSupabaseMock({
      brand: {
        '{"id":"brand-1"}': { business_id: "business-1" },
      },
      business_user: {},
    });

    await expect(
      getAccessibleEntityBusinessId(
        missingSupabase as never,
        "user-1",
        "brand",
        "brand-1",
        "Бренд не найден",
        "Нет доступа"
      )
    ).resolves.toEqual({ error: "Бренд не найден" });

    await expect(
      getAccessibleEntityBusinessId(
        deniedSupabase as never,
        "user-1",
        "brand",
        "brand-1",
        "Бренд не найден",
        "Нет доступа"
      )
    ).resolves.toEqual({ error: "Нет доступа" });
  });

  it("detects when an entity belongs to another business", async () => {
    const supabase = createSupabaseMock({
      category: {
        '{"id":"category-1"}': { business_id: "business-2" },
      },
    });

    await expect(
      validateEntityBelongsToBusiness(
        supabase as never,
        "category",
        "category-1",
        "business-1",
        "Категория не найдена",
        "Категория не принадлежит этому бизнесу"
      )
    ).resolves.toEqual({
      error: "Категория не принадлежит этому бизнесу",
    });
  });
});
