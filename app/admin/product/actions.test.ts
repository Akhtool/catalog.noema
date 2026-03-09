import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServerClient = vi.fn();
const mockGetAuthenticatedUser = vi.fn();
const mockUserHasAccessToBusinessId = vi.fn();
const mockValidateProductPayloadBasics = vi.fn();
const mockValidateProductRelationsBelongToBusiness = vi.fn();
const mockGetAccessibleProductBusinessId = vi.fn();
const mockRevalidateProductPaths = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: mockCreateServerClient,
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("../_lib/access-control", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
  userHasAccessToBusinessId: mockUserHasAccessToBusinessId,
}));

vi.mock("./product-guards", () => ({
  validateProductPayloadBasics: mockValidateProductPayloadBasics,
  validateProductRelationsBelongToBusiness: mockValidateProductRelationsBelongToBusiness,
}));

vi.mock("./product-action-helpers", () => ({
  getAccessibleProductBusinessId: mockGetAccessibleProductBusinessId,
  revalidateProductPaths: mockRevalidateProductPaths,
}));

vi.mock("./product-bulk-actions", () => ({
  createProductsBulk: vi.fn(),
  getProductsForExport: vi.fn(),
}));

vi.mock("./product-image-actions", () => ({
  uploadProductImage: vi.fn(),
  deleteProductImage: vi.fn(),
  reorderProductImages: vi.fn(),
}));

function createProductSupabase(options?: {
  maxOrder?: number | null;
  insertError?: unknown;
  updateError?: unknown;
}) {
  let insertedPayload: Record<string, unknown> | null = null;
  let updatedPayload: Record<string, unknown> | null = null;

  const supabase = {
    from(table: string) {
      if (table !== "product") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select(columns: string) {
          if (columns === "order") {
            return {
              eq(column: string, value: unknown) {
                expect(column).toBe("business_id");
                expect(value).toBeDefined();
                return {
                  order() {
                    return {
                      limit() {
                        return {
                          async maybeSingle() {
                            return {
                              data:
                                options?.maxOrder === null
                                  ? null
                                  : { order: options?.maxOrder ?? 3 },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          }

          if (columns === "id") {
            return {
              async single() {
                return { data: { id: "product-1" }, error: options?.insertError ?? null };
              },
            };
          }

          throw new Error(`Unexpected select columns: ${columns}`);
        },
        insert(payload: Record<string, unknown>) {
          insertedPayload = payload;
          return {
            select() {
              return {
                async single() {
                  return { data: { id: "product-1" }, error: options?.insertError ?? null };
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
              expect(value).toBe("product-1");
              return Promise.resolve({ error: options?.updateError ?? null });
            },
          };
        },
      };
    },
  };

  return {
    supabase,
    getInsertedPayload: () => insertedPayload,
    getUpdatedPayload: () => updatedPayload,
  };
}

describe("product actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockValidateProductPayloadBasics.mockReturnValue({ name: "Espresso", price: 199 });
    mockValidateProductRelationsBelongToBusiness.mockResolvedValue({});
  });

  it("rejects product creation when the user is not authenticated", async () => {
    mockCreateServerClient.mockResolvedValue({});
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const { createProduct } = await import("./actions");
    const result = await createProduct("business-1", {
      name: "Espresso",
      categoryId: "category-1",
      price: 199,
    });

    expect(result).toEqual({ error: "Не авторизован" });
  });

  it("creates a product, persists the normalized payload, and revalidates paths", async () => {
    const supabaseState = createProductSupabase({ maxOrder: 3 });
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockUserHasAccessToBusinessId.mockResolvedValue(true);

    const { createProduct } = await import("./actions");
    const result = await createProduct(
      "business-1",
      {
        name: "  Espresso  ",
        subtitle: "  250 ml  ",
        description: "  Strong coffee  ",
        categoryId: "category-1",
        brandId: "brand-1",
        price: 199,
        hasDiscount: true,
        originalPrice: 249,
        discountDateFrom: "2026-03-01",
        discountDateTo: "2026-03-31",
        inStock: true,
        isActive: true,
      },
      "acme"
    );

    expect(result).toEqual({ data: { id: "product-1" } });
    expect(mockUserHasAccessToBusinessId).toHaveBeenCalledWith(
      supabaseState.supabase,
      "user-1",
      "business-1"
    );
    expect(mockValidateProductRelationsBelongToBusiness).toHaveBeenCalledWith(
      supabaseState.supabase,
      "business-1",
      expect.objectContaining({
        categoryId: "category-1",
        brandId: "brand-1",
      })
    );
    expect(supabaseState.getInsertedPayload()).toEqual({
      business_id: "business-1",
      category_id: "category-1",
      brand_id: "brand-1",
      name: "Espresso",
      subtitle: "250 ml",
      description: "Strong coffee",
      price: 199,
      has_discount: true,
      original_price: 249,
      discount_date_from: "2026-03-01",
      discount_date_to: "2026-03-31",
      in_stock: true,
      is_active: true,
      order: 4,
    });
    expect(mockRevalidateProductPaths).toHaveBeenCalledWith("acme");
  });

  it("updates a product inside the resolved business and clears invalid original price", async () => {
    const supabaseState = createProductSupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetAccessibleProductBusinessId.mockResolvedValue({ businessId: "business-1" });

    const { updateProduct } = await import("./actions");
    const result = await updateProduct(
      "product-1",
      {
        name: "Cappuccino",
        subtitle: "  300 ml ",
        description: "  Milk coffee ",
        categoryId: "category-2",
        brandId: null,
        price: 220,
        hasDiscount: true,
        originalPrice: 200,
        inStock: false,
        isActive: true,
      },
      "acme"
    );

    expect(result).toEqual({ data: { id: "product-1" } });
    expect(mockGetAccessibleProductBusinessId).toHaveBeenCalledWith(
      supabaseState.supabase,
      "user-1",
      "product-1"
    );
    expect(mockValidateProductRelationsBelongToBusiness).toHaveBeenCalledWith(
      supabaseState.supabase,
      "business-1",
      expect.objectContaining({
        categoryId: "category-2",
      })
    );
    expect(supabaseState.getUpdatedPayload()).toEqual({
      category_id: "category-2",
      brand_id: null,
      name: "Espresso",
      subtitle: "300 ml",
      description: "Milk coffee",
      price: 199,
      has_discount: true,
      original_price: 200,
      discount_date_from: null,
      discount_date_to: null,
      in_stock: false,
      is_active: true,
    });
    expect(mockRevalidateProductPaths).toHaveBeenCalledWith("acme");
  });
});
