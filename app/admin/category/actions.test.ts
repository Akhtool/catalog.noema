import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServerClient = vi.fn();
const mockGetAuthenticatedUser = vi.fn();
const mockUserHasAccessToBusinessId = vi.fn();
const mockGetAccessibleEntityBusinessId = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: mockCreateServerClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/app/admin/_lib/access-control", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
  userHasAccessToBusinessId: mockUserHasAccessToBusinessId,
  getAccessibleEntityBusinessId: mockGetAccessibleEntityBusinessId,
}));

function createCategorySupabase(options?: {
  maxOrder?: number;
  products?: { id: string }[];
}) {
  let insertedPayload: Record<string, unknown> | null = null;
  let updatedPayload: Record<string, unknown> | null = null;
  let deletedId: string | null = null;

  const supabase = {
    from(table: string) {
      if (table === "category") {
        return {
          select(columns: string) {
            if (columns === "order") {
              return {
                eq(column: string, value: unknown) {
                  expect(column).toBe("business_id");
                  expect(value).toBe("business-1");
                  return {
                    order() {
                      return {
                        limit() {
                          return {
                            async single() {
                              return { data: { order: options?.maxOrder ?? 2 } };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            }

            if (
              columns ===
              "id, business_id, name, order, is_active, created_at, updated_at"
            ) {
              return {
                async single() {
                  return {
                    data: {
                      id: "category-1",
                      business_id: "business-1",
                      name: "Coffee",
                      order: 3,
                      is_active: true,
                      created_at: "2026-03-01T00:00:00.000Z",
                      updated_at: "2026-03-01T00:00:00.000Z",
                    },
                    error: null,
                  };
                },
              };
            }

            throw new Error(`Unexpected category.select: ${columns}`);
          },
          insert(payload: Record<string, unknown>) {
            insertedPayload = payload;
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: {
                        id: "category-1",
                        business_id: "business-1",
                        name: "Coffee",
                        order: 3,
                        is_active: true,
                        created_at: "2026-03-01T00:00:00.000Z",
                        updated_at: "2026-03-01T00:00:00.000Z",
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
          update(payload: Record<string, unknown>) {
            updatedPayload = payload;
            return {
              eq(column: string, value: unknown) {
                expect(column).toBe("id");
                expect(value).toBe("category-1");
                return Promise.resolve({ error: null });
              },
            };
          },
          delete() {
            return {
              eq(column: string, value: unknown) {
                expect(column).toBe("id");
                deletedId = String(value);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }

      if (table === "product") {
        return {
          select(columns: string) {
            expect(columns).toBe("id");
            return {
              eq(column: string, value: unknown) {
                expect(column).toBe("category_id");
                expect(value).toBe("category-1");
                return Promise.resolve({ data: options?.products ?? [] });
              },
            };
          },
          update(payload: Record<string, unknown>) {
            expect(payload).toEqual({ is_active: false });
            return {
              eq(column: string, value: unknown) {
                expect(column).toBe("category_id");
                expect(value).toBe("category-1");
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return {
    supabase,
    getInsertedPayload: () => insertedPayload,
    getUpdatedPayload: () => updatedPayload,
    getDeletedId: () => deletedId,
  };
}

describe("category actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("creates a category with the next order for an accessible business", async () => {
    const supabaseState = createCategorySupabase({ maxOrder: 2 });
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockUserHasAccessToBusinessId.mockResolvedValue(true);

    const { createCategory } = await import("./actions");
    const result = await createCategory("business-1", "  Coffee  ", "acme");

    expect(result).toMatchObject({
      data: {
        id: "category-1",
        businessId: "business-1",
        name: "Coffee",
        order: 3,
      },
    });
    expect(supabaseState.getInsertedPayload()).toEqual({
      business_id: "business-1",
      name: "Coffee",
      order: 3,
      is_active: true,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/business");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/acme");
  });

  it("updates a category name through the shared entity access guard", async () => {
    const supabaseState = createCategorySupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetAccessibleEntityBusinessId.mockResolvedValue({ businessId: "business-1" });

    const { updateCategory } = await import("./actions");
    const result = await updateCategory("category-1", { name: "  Tea  " }, "acme");

    expect(result).toEqual({});
    expect(supabaseState.getUpdatedPayload()).toEqual({ name: "Tea" });
  });

  it("blocks category deletion when related products still exist", async () => {
    const supabaseState = createCategorySupabase({
      products: [{ id: "product-1" }],
    });
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetAccessibleEntityBusinessId.mockResolvedValue({ businessId: "business-1" });

    const { deleteCategory } = await import("./actions");
    const result = await deleteCategory("category-1", false, "acme");

    expect(result).toHaveProperty("error");
    expect(supabaseState.getDeletedId()).toBeNull();
  });
});
