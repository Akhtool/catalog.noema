import { beforeEach, describe, expect, it } from "vitest";

import { useCatalogFiltersStore } from "@/store/catalog-filters";

describe("catalog filters store", () => {
  beforeEach(() => {
    useCatalogFiltersStore.setState({ filtersByBusinessId: {} });
  });

  it("keeps filters isolated between businesses", () => {
    const store = useCatalogFiltersStore.getState();

    store.setSearchQuery("business-1", "coffee");
    store.setShowDiscounted("business-1", true);
    store.setSearchQuery("business-2", "tea");

    const state = useCatalogFiltersStore.getState();
    expect(state.filtersByBusinessId["business-1"]).toMatchObject({
      searchQuery: "coffee",
      showDiscounted: true,
    });
    expect(state.filtersByBusinessId["business-2"]).toMatchObject({
      searchQuery: "tea",
      showDiscounted: false,
    });
  });

  it("toggles brand selection and reports active filters", () => {
    const store = useCatalogFiltersStore.getState();

    store.toggleBrand("business-1", "Noema");
    expect(useCatalogFiltersStore.getState().filtersByBusinessId["business-1"].selectedBrands).toEqual(["Noema"]);
    expect(store.hasActiveFilters("business-1")).toBe(true);

    store.toggleBrand("business-1", "Noema");
    expect(useCatalogFiltersStore.getState().filtersByBusinessId["business-1"].selectedBrands).toEqual([]);
    expect(store.hasActiveFilters("business-1")).toBe(false);
  });
});
