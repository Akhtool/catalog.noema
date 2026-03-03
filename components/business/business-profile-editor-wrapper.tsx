"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Business } from "@/types";
import { ProfileEditorContext } from "./profile-editor-context";

const BusinessProfileEditorSheet = dynamic(
  () => import("./business-profile-editor-sheet").then((m) => m.BusinessProfileEditorSheet),
  { ssr: false },
);
const ProductEditorSheet = dynamic(
  () => import("./product-editor-sheet").then((m) => m.ProductEditorSheet),
  { ssr: false },
);
const BulkImportSheet = dynamic(
  () => import("./bulk-import-sheet").then((m) => m.BulkImportSheet),
  { ssr: false },
);
import { useRouter } from "next/navigation";
import { checkBusinessAccess } from "@/app/admin/business/actions";
import {
  deleteProduct as deleteProductAction,
  restoreProduct as restoreProductAction,
} from "@/app/admin/product/actions";

interface BusinessProfileEditorWrapperProps {
  business: Business;
  /** Передаётся с сервера при рендере страницы — чтобы кнопки админа показывались сразу, без ожидания клиентской проверки */
  initialHasAccess?: boolean | null;
  children: React.ReactNode;
}

/**
 * Обёртка для управления слайдерами: редактор профиля и редактор позиции.
 * Предоставляет контекст openEditor, openProductEditor(productId?), hasAccess.
 */
export function BusinessProfileEditorWrapper({
  business,
  initialHasAccess = null,
  children,
}: BusinessProfileEditorWrapperProps) {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProductEditorOpen, setIsProductEditorOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [hasOpenedBulkImport, setHasOpenedBulkImport] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(initialHasAccess ?? null);

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
        openBulkImport: () => {
          setHasOpenedBulkImport(true);
          setIsBulkImportOpen(true);
        },
        deleteProduct: handleDeleteProduct,
        restoreProduct: handleRestoreProduct,
        hasAccess,
      }}
    >
      <main className="min-h-screen bg-background-light pb-16 relative">
        {children}
      </main>

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
      {hasOpenedBulkImport && (
        <BulkImportSheet
          business={business}
          open={isBulkImportOpen}
          onOpenChange={setIsBulkImportOpen}
        />
      )}
    </ProfileEditorContext.Provider>
  );
}
