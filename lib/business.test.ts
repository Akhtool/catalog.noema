import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServerClient = vi.fn();
const mockCreateAdminClient = vi.fn();
const mockEnsureProfileAfterAuth = vi.fn();
const mockRevalidatePath = vi.fn();
const mockSlugify = vi.fn((value: string) => value.trim().toLowerCase().replace(/\s+/g, "-"));

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: mockCreateServerClient,
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/app/login/actions", () => ({
  ensureProfileAfterAuth: mockEnsureProfileAfterAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/slug", () => ({
  slugify: mockSlugify,
}));

vi.mock("server-only", () => ({}));

function createServerSupabase(user: { id: string; email?: string } | null) {
  return {
    auth: {
      async getUser() {
        return { data: { user } };
      },
    },
  };
}

function createAdminSupabase(options?: {
  takenSlugs?: string[];
  createBusinessRpcError?: unknown;
}) {
  const takenSlugs = new Set(options?.takenSlugs ?? []);
  let createBusinessRpcPayload: Record<string, unknown> | null = null;

  return {
    getCreateBusinessRpcPayload() {
      return createBusinessRpcPayload;
    },
    from(table: string) {
      if (table === "business") {
        return {
          select() {
            return this;
          },
          eq(column: string, value: unknown) {
            if (column === "slug") {
              return {
                limit: async () => ({
                  data: takenSlugs.has(String(value)) ? [{ id: "existing" }] : [],
                  error: null,
                }),
              };
            }

            throw new Error(`Unexpected business.eq call: ${column}`);
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
    async rpc(name: string, payload: Record<string, unknown>) {
      expect(name).toBe("create_business_with_owner");
      createBusinessRpcPayload = payload;

      if (options?.createBusinessRpcError) {
        return { data: null, error: options.createBusinessRpcError };
      }

      return {
        data: [{ business_id: "business-1", business_slug: String(payload.p_slug) }],
        error: null,
      };
    }
  };
}

describe("createBusiness", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockEnsureProfileAfterAuth.mockResolvedValue({ success: true });
  });

  it("returns an auth error when there is no current user", async () => {
    mockCreateServerClient.mockResolvedValue(createServerSupabase(null));

    const { createBusiness } = await import("./business");
    const result = await createBusiness(new FormData());

    expect(result).toEqual({ error: "Не авторизован" });
  });

  it("creates a business, picks a unique slug, links the owner, and revalidates the catalog", async () => {
    mockCreateServerClient.mockResolvedValue(
      createServerSupabase({ id: "user-1", email: "owner@example.com" })
    );
    mockCreateAdminClient.mockReturnValue(
      createAdminSupabase({
        takenSlugs: ["acme"],
      })
    );

    const formData = new FormData();
    formData.set("name", "Acme");

    const { createBusiness } = await import("./business");
    const result = await createBusiness(formData);

    expect(result).toEqual({ success: true, slug: "acme-2" });
    expect(mockEnsureProfileAfterAuth).toHaveBeenCalledTimes(1);
    expect(mockCreateAdminClient.mock.results[0]?.value.getCreateBusinessRpcPayload()).toEqual({
      p_name: "Acme",
      p_slug: "acme-2",
      p_user_id: "user-1",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/acme-2");
  });

  it("returns an error when the atomic create_business_with_owner rpc fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateServerClient.mockResolvedValue(
      createServerSupabase({ id: "user-1", email: "owner@example.com" })
    );
    mockCreateAdminClient.mockReturnValue(
      createAdminSupabase({
        createBusinessRpcError: new Error("rpc failed"),
      })
    );

    const formData = new FormData();
    formData.set("name", "Acme");

    const { createBusiness } = await import("./business");
    const result = await createBusiness(formData);

    expect(result).toEqual({ error: "Ошибка создания бизнеса" });
    consoleErrorSpy.mockRestore();
  });
});
