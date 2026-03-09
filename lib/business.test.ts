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
  businessInsertError?: unknown;
  businessUserInsertError?: unknown;
}) {
  const takenSlugs = new Set(options?.takenSlugs ?? []);

  return {
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
          insert(payload: { name: string; slug: string }) {
            return {
              select() {
                return this;
              },
              async single() {
                if (options?.businessInsertError) {
                  return { data: null, error: options.businessInsertError };
                }

                return {
                  data: { id: "business-1", slug: payload.slug },
                  error: null,
                };
              },
            };
          },
        };
      }

      if (table === "business_user") {
        return {
          async insert() {
            return { error: options?.businessUserInsertError ?? null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
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
    expect(mockRevalidatePath).toHaveBeenCalledWith("/acme-2");
  });

  it("returns an error when business creation succeeds but owner linking fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateServerClient.mockResolvedValue(
      createServerSupabase({ id: "user-1", email: "owner@example.com" })
    );
    mockCreateAdminClient.mockReturnValue(
      createAdminSupabase({
        businessUserInsertError: new Error("insert failed"),
      })
    );

    const formData = new FormData();
    formData.set("name", "Acme");

    const { createBusiness } = await import("./business");
    const result = await createBusiness(formData);

    expect(result).toHaveProperty("error");
    expect("error" in result && result.error).toContain("не удалось привязать пользователя");
    consoleErrorSpy.mockRestore();
  });
});
