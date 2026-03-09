import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockHeaders = vi.fn();
const mockRedirect = vi.fn();
const mockCreateServerClient = vi.fn();

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerClient: mockCreateServerClient,
}));

vi.mock("@/components/admin/logout-button", () => ({
  LogoutButton: () => <button type="button">logout</button>,
}));

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "catlg.ru");
  });

  it("redirects non-root hosts away from platform admin", async () => {
    mockHeaders.mockResolvedValue({
      get: vi.fn().mockReturnValue("acme.catlg.ru"),
    });
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    const { default: AdminLayout } = await import("./layout");
    await expect(AdminLayout({ children: <div>admin</div> })).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("allows authenticated users on the root host", async () => {
    mockHeaders.mockResolvedValue({
      get: vi.fn().mockReturnValue("catlg.ru"),
    });
    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-1" },
          },
        }),
      },
    });

    const { default: AdminLayout } = await import("./layout");
    const result = await AdminLayout({ children: <div>admin</div> });

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
