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

function createBrandSupabase() {
  let insertedPayload: Record<string, unknown> | null = null;
  let updatedPayload: Record<string, unknown> | null = null;
  let deletedBrandId: string | null = null;
  let deactivatedBrandId: string | null = null;

  const supabase = {
    from(table: string) {
      if (table === "brand") {
        return {
          insert(payload: Record<string, unknown>) {
            insertedPayload = payload;
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: {
                        id: "brand-1",
                        business_id: "business-1",
                        name: "Acme",
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
                expect(value).toBe("brand-1");
                return Promise.resolve({ error: null });
              },
            };
          },
          delete() {
            return {
              eq(column: string, value: unknown) {
                expect(column).toBe("id");
                deletedBrandId = String(value);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }

      if (table === "product") {
        return {
          update(payload: Record<string, unknown>) {
            expect(payload).toEqual({ is_active: false });
            return {
              eq(column: string, value: unknown) {
                expect(column).toBe("brand_id");
                deactivatedBrandId = String(value);
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
    getDeletedBrandId: () => deletedBrandId,
    getDeactivatedBrandId: () => deactivatedBrandId,
  };
}

describe("brand actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("creates a brand for an accessible business and revalidates paths", async () => {
    const supabaseState = createBrandSupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockUserHasAccessToBusinessId.mockResolvedValue(true);

    const { createBrand } = await import("./actions");
    const result = await createBrand("business-1", "  Acme  ", "acme");

    expect(result).toMatchObject({
      data: {
        id: "brand-1",
        businessId: "business-1",
        name: "Acme",
      },
    });
    expect(supabaseState.getInsertedPayload()).toEqual({
      business_id: "business-1",
      name: "Acme",
      is_active: true,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/business");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/acme");
  });

  it("updates a brand name through the shared entity access guard", async () => {
    const supabaseState = createBrandSupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetAccessibleEntityBusinessId.mockResolvedValue({ businessId: "business-1" });

    const { updateBrand } = await import("./actions");
    const result = await updateBrand("brand-1", "  Roasters  ", "acme");

    expect(result).toEqual({});
    expect(supabaseState.getUpdatedPayload()).toEqual({ name: "Roasters" });
  });

  it("deactivates related products before deleting a brand when requested", async () => {
    const supabaseState = createBrandSupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetAccessibleEntityBusinessId.mockResolvedValue({ businessId: "business-1" });

    const { deleteBrand } = await import("./actions");
    const result = await deleteBrand("brand-1", true, "acme");

    expect(result).toEqual({});
    expect(supabaseState.getDeactivatedBrandId()).toBe("brand-1");
    expect(supabaseState.getDeletedBrandId()).toBe("brand-1");
  });
});
