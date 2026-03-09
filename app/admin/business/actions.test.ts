import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServerClient = vi.fn();
const mockGetAuthenticatedUser = vi.fn();
const mockGetFirstBusinessIdForUser = vi.fn();
const mockUserHasAccessToBusinessId = vi.fn();
const mockGetAccessibleEntityBusinessId = vi.fn();
const mockRevalidatePath = vi.fn();
const mockResolveBusinessIdForUpdate = vi.fn();
const mockBuildBusinessUpdatePayload = vi.fn();
const mockRevalidateBusinessPath = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: mockCreateServerClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("../_lib/access-control", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
  getFirstBusinessIdForUser: mockGetFirstBusinessIdForUser,
  userHasAccessToBusinessId: mockUserHasAccessToBusinessId,
  getAccessibleEntityBusinessId: mockGetAccessibleEntityBusinessId,
}));

vi.mock("./business-action-helpers", () => ({
  buildBusinessUpdatePayload: mockBuildBusinessUpdatePayload,
  revalidateBusinessPath: mockRevalidateBusinessPath,
  resolveBusinessIdForUpdate: mockResolveBusinessIdForUpdate,
}));

function createBusinessSupabase(options?: {
  slugBusiness?: { id: string } | null;
  updateError?: unknown;
}) {
  let updatedLocationPayload: Record<string, unknown> | null = null;

  const supabase = {
    from(table: string) {
      if (table === "business") {
        return {
          select() {
            return {
              eq(column: string, value: unknown) {
                expect(column).toBe("slug");
                expect(value).toBe("acme");
                return {
                  async single() {
                    return {
                      data: options?.slugBusiness ?? { id: "business-1" },
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "business_location") {
        return {
          update(payload: Record<string, unknown>) {
            updatedLocationPayload = payload;
            return {
              eq(column: string, value: unknown) {
                expect(column).toBe("id");
                expect(value).toBe("location-1");
                return Promise.resolve({ error: options?.updateError ?? null });
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
    getUpdatedLocationPayload: () => updatedLocationPayload,
  };
}

describe("business actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("reports access for an owner/admin on business slug", async () => {
    const supabaseState = createBusinessSupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockUserHasAccessToBusinessId.mockResolvedValue(true);

    const { checkBusinessAccess } = await import("./actions");
    const result = await checkBusinessAccess("acme");

    expect(result).toEqual({ hasAccess: true, businessId: "business-1" });
    expect(mockUserHasAccessToBusinessId).toHaveBeenCalledWith(
      supabaseState.supabase,
      "user-1",
      "business-1"
    );
  });

  it("returns business id but denies access when membership is missing", async () => {
    const supabaseState = createBusinessSupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockUserHasAccessToBusinessId.mockResolvedValue(false);

    const { checkBusinessAccess } = await import("./actions");
    const result = await checkBusinessAccess("acme");

    expect(result).toEqual({ hasAccess: false, businessId: "business-1" });
  });

  it("updates a location through the shared access helper and revalidates the business path", async () => {
    const supabaseState = createBusinessSupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetAccessibleEntityBusinessId.mockResolvedValue({ businessId: "business-1" });

    const { updateLocation } = await import("./actions");
    const result = await updateLocation("location-1", {
      title: "  Main hall  ",
      address: "  Arbat 1  ",
      phone: "  +79990000000  ",
      whatsapp: "  +79991112233  ",
      telegram: "  @acme  ",
      orderPosition: 4,
      isActive: false,
    });

    expect(result).toEqual({ success: true });
    expect(mockGetAccessibleEntityBusinessId).toHaveBeenCalledWith(
      supabaseState.supabase,
      "user-1",
      "business_location",
      "location-1",
      "Точка не найдена",
      "Нет доступа"
    );
    expect(supabaseState.getUpdatedLocationPayload()).toEqual({
      title: "Main hall",
      address: "Arbat 1",
      phone: "+79990000000",
      whatsapp: "+79991112233",
      telegram: "@acme",
      order_position: 4,
      is_active: false,
    });
    expect(mockRevalidateBusinessPath).toHaveBeenCalledWith(
      supabaseState.supabase,
      "business-1"
    );
  });
});
