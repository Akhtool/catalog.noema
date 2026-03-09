import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckBusinessAccess = vi.fn();

vi.mock("@/app/admin/business/actions", () => ({
  checkBusinessAccess: mockCheckBusinessAccess,
}));

vi.mock("@/components/contact-button", () => ({
  ContactButton: () => <div>contact-button</div>,
}));

vi.mock("./profile-editor-context", () => ({
  useProfileEditor: () => vi.fn(),
  useProductEditor: () => vi.fn(),
}));

describe("ContactOrEditSection", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show owner controls when tenant access check fails", async () => {
    mockCheckBusinessAccess.mockResolvedValue({ hasAccess: false });

    const { ContactOrEditSection } = await import("./contact-or-edit-section");
    render(
      <ContactOrEditSection
        business={{
          id: "business-1",
          slug: "acme",
          name: "Acme",
          description: "",
          logoUrl: null,
          coverUrl: null,
          themeBrandHsl: null,
          themeBrandForeground: null,
          phone: null,
          whatsapp: null,
          whatsappDelivery: null,
          whatsappPickup: null,
          whatsappDineIn: null,
          telegram: null,
          workingHours: null,
          deliveryRegions: null,
          cityDelivery: null,
          deliveryTypes: [],
          createdAt: "2026-03-09T00:00:00.000Z",
          updatedAt: "2026-03-09T00:00:00.000Z",
        }}
        initialHasAccess={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("contact-button")).toBeInTheDocument();
    });

    expect(screen.queryByText("Редактировать профиль")).not.toBeInTheDocument();
    expect(screen.queryByText("Добавить позицию")).not.toBeInTheDocument();
  });
});
