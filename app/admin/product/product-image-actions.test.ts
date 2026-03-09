import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServerClient = vi.fn();
const mockGetAuthenticatedUser = vi.fn();
const mockGetAccessibleProductBusinessId = vi.fn();
const mockRevalidateProductPaths = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: mockCreateServerClient,
}));

vi.mock("../_lib/access-control", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("./product-action-helpers", () => ({
  getAccessibleProductBusinessId: mockGetAccessibleProductBusinessId,
  revalidateProductPaths: mockRevalidateProductPaths,
}));

function createImageSupabase(options?: {
  publicUrl?: string | null;
  insertError?: unknown;
  existingImageIds?: string[];
  reorderUpdateError?: unknown;
}) {
  const removedPaths: string[][] = [];
  const reorderedIds: string[] = [];

  return {
    removedPaths,
    reorderedIds,
    supabase: {
      from(table: string) {
        if (table !== "product_image") {
          throw new Error(`Unexpected table: ${table}`);
        }

        return {
          select(columns: string, selectOptions?: { count?: string; head?: boolean }) {
            if (columns === "id" && selectOptions?.count === "exact" && selectOptions?.head) {
              return {
                async eq(column: string, value: unknown) {
                  expect(column).toBe("product_id");
                  expect(value).toBe("product-1");
                  return { count: 0 };
                },
              };
            }

            if (columns !== "position") {
              if (columns === "id") {
                return {
                  async eq(column: string, value: unknown) {
                    expect(column).toBe("product_id");
                    expect(value).toBe("product-1");
                    return {
                      data: (options?.existingImageIds ?? ["image-1", "image-2", "image-3"]).map(
                        (id) => ({ id })
                      ),
                      error: null,
                    };
                  },
                };
              }

              throw new Error(`Unexpected select columns: ${columns}`);
            }

            return {
              eq(column: string, value: unknown) {
                expect(column).toBe("product_id");
                expect(value).toBe("product-1");
                return {
                  order(orderColumn: string) {
                    expect(orderColumn).toBe("position");
                    return {
                      limit(limitValue: number) {
                        expect(limitValue).toBe(1);
                        return {
                          async single() {
                            return { data: { position: 2 } };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          insert() {
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: null,
                      error: options?.insertError ?? null,
                    };
                  },
                };
              },
            };
          },
          update() {
            return {
              eq(column: string, value: unknown) {
                expect(column).toBe("id");
                reorderedIds.push(String(value));
                return {
                  async eq(productColumn: string, productValue: unknown) {
                    expect(productColumn).toBe("product_id");
                    expect(productValue).toBe("product-1");
                    return { error: options?.reorderUpdateError ?? null };
                  },
                };
              },
            };
          },
        };
      },
      storage: {
        from(bucket: string) {
          expect(bucket).toBe("product");
          return {
            async upload() {
              return { error: null };
            },
            getPublicUrl() {
              return {
                data: {
                  publicUrl:
                    options?.publicUrl === undefined
                      ? "https://catlg.ru/storage/v1/object/public/product/product-1/file.jpg"
                      : options.publicUrl,
                },
              };
            },
            async remove(paths: string[]) {
              removedPaths.push(paths);
              return { error: null };
            },
          };
        },
      },
    },
  };
}

describe("product image actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetAccessibleProductBusinessId.mockResolvedValue({ businessId: "business-1" });
  });

  it("removes the uploaded file when public URL generation fails", async () => {
    const state = createImageSupabase({ publicUrl: null });
    mockCreateServerClient.mockResolvedValue(state.supabase);

    const formData = new FormData();
    formData.set("file", new File(["image"], "photo.jpg", { type: "image/jpeg" }));

    const { uploadProductImage } = await import("./product-image-actions");
    const result = await uploadProductImage("product-1", formData, "acme");

    expect(result).toEqual({ error: "Не удалось получить URL изображения" });
    expect(state.removedPaths).toHaveLength(1);
    expect(state.removedPaths[0]?.[0]).toMatch(/^product-1\//);
  });

  it("removes the uploaded file when product_image insert fails", async () => {
    const state = createImageSupabase({ insertError: new Error("insert failed") });
    mockCreateServerClient.mockResolvedValue(state.supabase);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const formData = new FormData();
    formData.set("file", new File(["image"], "photo.jpg", { type: "image/jpeg" }));

    const { uploadProductImage } = await import("./product-image-actions");
    const result = await uploadProductImage("product-1", formData, "acme");

    expect(result).toEqual({ error: "Ошибка сохранения записи об изображении" });
    expect(state.removedPaths).toHaveLength(1);
    expect(state.removedPaths[0]?.[0]).toMatch(/^product-1\//);
    consoleErrorSpy.mockRestore();
  });

  it("rejects reorderProductImages when the client sends an incomplete image list", async () => {
    const state = createImageSupabase({
      existingImageIds: ["image-1", "image-2"],
    });
    mockCreateServerClient.mockResolvedValue(state.supabase);

    const { reorderProductImages } = await import("./product-image-actions");
    const result = await reorderProductImages("product-1", ["image-1"], "acme");

    expect(result).toEqual({ error: "Некорректный список изображений для сортировки" });
    expect(state.reorderedIds).toEqual([]);
  });
});
