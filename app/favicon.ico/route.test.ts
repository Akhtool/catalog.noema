import { describe, expect, it, vi } from "vitest";

const mockSingle = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    })),
  },
}));

describe("favicon route", () => {
  it("returns 404 outside business subdomains", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://catlg.ru/favicon.ico", {
        headers: {
          host: "catlg.ru",
        },
      }) as never
    );

    expect(response.status).toBe(404);
  });

  it("redirects to the business logo for a valid business subdomain", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        logo_url: "https://cdn.catlg.ru/acme-logo.png",
      },
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://acme.catlg.ru/favicon.ico", {
        headers: {
          host: "acme.catlg.ru",
        },
      }) as never
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://cdn.catlg.ru/acme-logo.png");
  });
});
