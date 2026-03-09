import { describe, expect, it, vi } from "vitest";

import {
  AUTHENTICATED_NO_BUSINESS_REDIRECT,
  AUTHENTICATED_WITH_BUSINESS_REDIRECT,
  buildBusinessRedirectUrl,
  getBusinessSlugForUser,
  resolveBusinessHomeRedirect,
  resolveRedirectAfterLogin,
} from "./auth-redirect";

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
        async limit() {
          const key = JSON.stringify(state.filters);
          return { data: resolvers[table]?.[key] };
        },
        async single() {
          const key = JSON.stringify(state.filters);
          return { data: resolvers[table]?.[key] };
        },
      };

      return builder;
    },
  };
}

describe("auth redirect helpers", () => {
  it("returns the linked business slug for the current user", async () => {
    const supabase = createSupabaseMock({
      business_user: {
        '{"user_id":"user-1"}': [{ business_id: "business-1" }],
      },
      business: {
        '{"id":"business-1"}': { slug: "acme" },
      },
    });

    await expect(
      getBusinessSlugForUser(supabase as never, "user-1")
    ).resolves.toBe("acme");
  });

  it("returns null when the user is not linked to any business", async () => {
    const supabase = createSupabaseMock({
      business_user: {
        '{"user_id":"user-2"}': [],
      },
    });

    await expect(
      getBusinessSlugForUser(supabase as never, "user-2")
    ).resolves.toBeNull();
  });

  it("builds a redirect URL only inside the configured root domain zone", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "catlg.ru");

    expect(
      buildBusinessRedirectUrl({
        slug: "acme",
        protocol: "https",
        port: null,
        host: "admin.catlg.ru",
      })
    ).toBe("https://acme.catlg.ru");

    expect(
      buildBusinessRedirectUrl({
        slug: "acme",
        protocol: "https",
        port: null,
        host: "localhost:3000",
      })
    ).toBeNull();

    vi.unstubAllEnvs();
  });

  it("routes authenticated users without a business to the catalog root", () => {
    expect(
      resolveRedirectAfterLogin({
        slug: null,
        protocol: "https",
        port: null,
        host: "admin.catlg.ru",
      })
    ).toBe(AUTHENTICATED_NO_BUSINESS_REDIRECT);
  });

  it("falls back to the catalog root when subdomain redirect is not allowed", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "catlg.ru");

    expect(
      resolveRedirectAfterLogin({
        slug: "acme",
        protocol: "http",
        port: "3000",
        host: "localhost:3000",
      })
    ).toBe(AUTHENTICATED_WITH_BUSINESS_REDIRECT);

    vi.unstubAllEnvs();
  });

  it("falls back to the catalog root when catalog subdomain redirect is unavailable", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "catlg.ru");

    expect(
      resolveBusinessHomeRedirect({
        slug: "acme",
        protocol: "http",
        port: "3000",
        host: "localhost:3000",
      })
    ).toBe(AUTHENTICATED_WITH_BUSINESS_REDIRECT);

    vi.unstubAllEnvs();
  });
});
