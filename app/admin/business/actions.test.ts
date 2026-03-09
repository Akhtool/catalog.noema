import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServerClient = vi.fn();
const mockGetAuthenticatedUser = vi.fn();
const mockUserHasAccessToBusinessId = vi.fn();
const mockGetAccessibleEntityBusinessId = vi.fn();
const mockRevalidatePath = vi.fn();
const mockBuildBusinessUpdatePayload = vi.fn();
const mockRevalidateBusinessPath = vi.fn();
const mockGetAccessibleCurrentBusinessContext = vi.fn();
const mockAssertBusinessMatchesCurrentHost = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: mockCreateServerClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("../_lib/access-control", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
  userHasAccessToBusinessId: mockUserHasAccessToBusinessId,
  getAccessibleEntityBusinessId: mockGetAccessibleEntityBusinessId,
}));

vi.mock("./business-action-helpers", () => ({
  buildBusinessUpdatePayload: mockBuildBusinessUpdatePayload,
  revalidateBusinessPath: mockRevalidateBusinessPath,
  getAccessibleCurrentBusinessContext: mockGetAccessibleCurrentBusinessContext,
  assertBusinessMatchesCurrentHost: mockAssertBusinessMatchesCurrentHost,
}));

function createBusinessSupabase(options?: {
  slugBusiness?: { id: string } | null;
  businessById?: { id: string; slug: string; name?: string } | null;
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
                if (column === "slug") {
                  expect(value).toBe("acme");
                  return {
                    async single() {
                      return {
                        data: options?.slugBusiness ?? { id: "business-1" },
                        error: null,
                      };
                    },
                  };
                }

                if (column === "id") {
                  expect(value).toBe("business-1");
                  return {
                    async single() {
                      return {
                        data:
                          options?.businessById ?? {
                            id: "business-1",
                            slug: "acme",
                            name: "Acme",
                          },
                        error: null,
                      };
                    },
                  };
                }

                throw new Error(`Unexpected column for business.eq: ${column}`);
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

  it("loads the business bound to the current host context", async () => {
    const supabaseState = createBusinessSupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetAccessibleCurrentBusinessContext.mockResolvedValue({
      data: { businessId: "business-1", slug: "acme" },
    });

    const { getBusiness } = await import("./actions");
    const result = await getBusiness();

    expect(result).toEqual({
      data: { id: "business-1", slug: "acme", name: "Acme" },
    });
    expect(mockGetAccessibleCurrentBusinessContext).toHaveBeenCalledWith(
      supabaseState.supabase,
      "user-1"
    );
  });

  it("reports access for the current host business when owner/admin membership exists", async () => {
    const supabaseState = createBusinessSupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetAccessibleCurrentBusinessContext.mockResolvedValue({
      data: { businessId: "business-1", slug: "acme" },
    });

    const { checkBusinessAccess } = await import("./actions");
    const result = await checkBusinessAccess("acme");

    expect(result).toEqual({ hasAccess: true, businessId: "business-1" });
    expect(mockGetAccessibleCurrentBusinessContext).toHaveBeenCalledWith(
      supabaseState.supabase,
      "user-1"
    );
  });

  it("denies access when the requested slug does not match the current host business", async () => {
    const supabaseState = createBusinessSupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetAccessibleCurrentBusinessContext.mockResolvedValue({
      data: { businessId: "business-1", slug: "acme" },
    });

    const { checkBusinessAccess } = await import("./actions");
    const result = await checkBusinessAccess("other-business");

    expect(result).toEqual({
      hasAccess: false,
      error: "Текущий домен не соответствует бизнесу",
    });
  });

  it("updates a location only inside the current host business and revalidates the business path", async () => {
    const supabaseState = createBusinessSupabase();
    mockCreateServerClient.mockResolvedValue(supabaseState.supabase);
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetAccessibleEntityBusinessId.mockResolvedValue({ businessId: "business-1" });
    mockAssertBusinessMatchesCurrentHost.mockResolvedValue({ slug: "acme" });

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
    expect(mockAssertBusinessMatchesCurrentHost).toHaveBeenCalledWith(
      supabaseState.supabase,
      "business-1"
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
