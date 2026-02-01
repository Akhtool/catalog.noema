"use client";

import { useState, useEffect, useCallback } from "react";
import { Business } from "@/types";
import { BusinessProfileEditorSheet } from "./business-profile-editor-sheet";
import { ProductEditorSheet } from "./product-editor-sheet";
import { ProfileEditorContext } from "./profile-editor-context";
import { useRouter } from "next/navigation";
import { checkBusinessAccess } from "@/app/admin/business/actions";
import {
  deleteProduct as deleteProductAction,
  restoreProduct as restoreProductAction,
} from "@/app/admin/product/actions";

interface BusinessProfileEditorWrapperProps {
  business: Business;
  children: React.ReactNode;
}

/**
 * Обёртка для управления слайдерами: редактор профиля и редактор позиции.
 * Предоставляет контекст openEditor, openProductEditor(productId?), hasAccess.
 */
export function BusinessProfileEditorWrapper({
  business,
  children,
}: BusinessProfileEditorWrapperProps) {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProductEditorOpen, setIsProductEditorOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    checkBusinessAccess(business.slug).then((result) => {
      setHasAccess(result.hasAccess ?? false);
    });
  }, [business.slug]);

  function handleProfileSuccess() {
    router.refresh();
  }

  function openProductEditor(productId?: string) {
    setEditingProductId(productId ?? null);
    setIsProductEditorOpen(true);
  }

  function handleProductEditorOpenChange(open: boolean) {
    setIsProductEditorOpen(open);
    if (!open) setEditingProductId(null);
  }

  const handleDeleteProduct = useCallback(
    async (productId: string) => {
      await deleteProductAction(productId, business.slug);
      router.refresh();
    },
    [business.slug, router]
  );

  const handleRestoreProduct = useCallback(
    async (productId: string) => {
      await restoreProductAction(productId, business.slug);
      router.refresh();
    },
    [business.slug, router]
  );

  return (
    <ProfileEditorContext.Provider
      value={{
        openEditor: () => setIsProfileOpen(true),
        openProductEditor,
        deleteProduct: handleDeleteProduct,
        restoreProduct: handleRestoreProduct,
        hasAccess,
      }}
    >
      <div className="min-h-screen bg-background-light pb-16 relative">
        {children}
      </div>

      <BusinessProfileEditorSheet
        business={business}
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        onSuccess={handleProfileSuccess}
      />

      <ProductEditorSheet
        business={business}
        open={isProductEditorOpen}
        onOpenChange={handleProductEditorOpenChange}
        productId={editingProductId}
      />
    </ProfileEditorContext.Provider>
  );
}
