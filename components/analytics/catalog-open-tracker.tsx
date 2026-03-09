"use client";

import { useEffect } from "react";

import { trackClientEvent } from "@/lib/client-observability";

interface CatalogOpenTrackerProps {
  businessId: string;
  slug: string;
}

export function CatalogOpenTracker({
  businessId,
  slug,
}: CatalogOpenTrackerProps) {
  useEffect(() => {
    trackClientEvent("catalog_opened", {
      businessId,
      slug,
    });
  }, [businessId, slug]);

  return null;
}
