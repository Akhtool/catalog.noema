import { describe, expect, it } from "vitest";

import {
  ensureBusinessAccess,
  validateProductPayloadBasics,
  validateProductRelationsBelongToBusiness,
} from "@/app/admin/product/product-guards";

function createSupabaseMock(resolvers: Record<string, Record<string, unknown>>) {
  return {
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
        async single() {
          const key = JSON.stringify(state.filters);
          const data = resolvers[table]?.[key];
          return { data };
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

describe("product guards", () => {
  it("allows owner/admin access only when membership exists", async () => {
    const allowedSupabase = createSupabaseMock({
      business_user: {
        '{"business_id":"business-1","user_id":"user-1"}': { business_id: "business-1" },
      },
    });

    const deniedSupabase = createSupabaseMock({
      business_user: {},
    });

    await expect(ensureBusinessAccess(allowedSupabase, "user-1", "business-1")).resolves.toBe(true);
    await expect(ensureBusinessAccess(deniedSupabase, "user-2", "business-1")).resolves.toBe(false);
  });

  it("rejects invalid product basics before create/edit", () => {
    expect(
      validateProductPayloadBasics({
        name: "   ",
        categoryId: "category-1",
        price: 100,
      }).error,
    ).toBe("\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e");

    expect(
      validateProductPayloadBasics({
        name: "Espresso",
        categoryId: "",
        price: 100,
      }).error,
    ).toBe("\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044e");

    expect(
      validateProductPayloadBasics({
        name: "Espresso",
        categoryId: "category-1",
        price: -5,
      }).error,
    ).toBe("\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u0443\u044e \u0446\u0435\u043d\u0443");
  });

  it("returns normalized values for a valid payload", () => {
    expect(
      validateProductPayloadBasics({
        name: "  Espresso  ",
        categoryId: "category-1",
        price: 199,
      }),
    ).toMatchObject({
      name: "Espresso",
      price: 199,
    });
  });

  it("rejects create/edit when category belongs to another business", async () => {
    const supabase = createSupabaseMock({
      category: {
        '{"id":"category-foreign"}': { business_id: "business-2" },
      },
    });

    await expect(
      validateProductRelationsBelongToBusiness(supabase, "business-1", {
        categoryId: "category-foreign",
      }),
    ).resolves.toMatchObject({
      error:
        "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f \u043d\u0435 \u043f\u0440\u0438\u043d\u0430\u0434\u043b\u0435\u0436\u0438\u0442 \u044d\u0442\u043e\u043c\u0443 \u0431\u0438\u0437\u043d\u0435\u0441\u0443",
    });
  });

  it("rejects create/edit when brand belongs to another business", async () => {
    const supabase = createSupabaseMock({
      category: {
        '{"id":"category-1"}': { business_id: "business-1" },
      },
      brand: {
        '{"id":"brand-foreign"}': { business_id: "business-2" },
      },
    });

    await expect(
      validateProductRelationsBelongToBusiness(supabase, "business-1", {
        categoryId: "category-1",
        brandId: "brand-foreign",
      }),
    ).resolves.toMatchObject({
      error:
        "\u0411\u0440\u0435\u043d\u0434 \u043d\u0435 \u043f\u0440\u0438\u043d\u0430\u0434\u043b\u0435\u0436\u0438\u0442 \u044d\u0442\u043e\u043c\u0443 \u0431\u0438\u0437\u043d\u0435\u0441\u0443",
    });
  });

  it("allows create/edit when category and brand belong to the same business", async () => {
    const supabase = createSupabaseMock({
      category: {
        '{"id":"category-1"}': { business_id: "business-1" },
      },
      brand: {
        '{"id":"brand-1"}': { business_id: "business-1" },
      },
    });

    await expect(
      validateProductRelationsBelongToBusiness(supabase, "business-1", {
        categoryId: "category-1",
        brandId: "brand-1",
      }),
    ).resolves.toEqual({});
  });
});
