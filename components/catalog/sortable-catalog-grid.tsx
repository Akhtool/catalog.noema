"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { reorderProducts } from "@/app/admin/product/actions";
import { SortableProductCard } from "./sortable-product-card";
import { Product } from "@/types";

interface SortableCatalogGridProps {
  products: Product[];
  allProducts: Product[];
  viewMode: "list" | "grid";
  businessId: string;
  businessSlug: string;
  onEdit?: (productId: string) => void;
  onHide?: (productId: string) => void;
  onRestore?: (productId: string) => void;
  setOptimisticOrderIds: (ids: string[] | null) => void;
  pendingOrderIdsRef: React.RefObject<string[] | null>;
}

export function SortableCatalogGrid({
  products,
  allProducts,
  viewMode,
  businessId,
  businessSlug,
  onEdit,
  onHide,
  onRestore,
  setOptimisticOrderIds,
  pendingOrderIdsRef,
}: SortableCatalogGridProps) {
  const router = useRouter();
  const reorderInProgressRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      if (reorderInProgressRef.current) return;

      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedFiltered = arrayMove(products, oldIndex, newIndex);
      const filteredIdsNewOrder = reorderedFiltered.map((p) => p.id);
      const fullIds = allProducts.map((p) => p.id);
      const filteredIdSet = new Set(filteredIdsNewOrder);
      const indicesWhereFiltered = allProducts
        .map((p, i) => (filteredIdSet.has(p.id) ? i : -1))
        .filter((i) => i >= 0);
      const newFullIds = [...fullIds];
      indicesWhereFiltered.forEach((idx, j) => {
        newFullIds[idx] = filteredIdsNewOrder[j];
      });

      setOptimisticOrderIds(newFullIds);
      reorderInProgressRef.current = true;

      const err = await reorderProducts(businessId, newFullIds, businessSlug);
      if (err?.error) {
        toast.error("Не удалось сохранить порядок");
        reorderInProgressRef.current = false;
        return;
      }
      (pendingOrderIdsRef as React.MutableRefObject<string[] | null>).current = newFullIds;
      router.refresh();
      reorderInProgressRef.current = false;
    },
    [products, allProducts, businessId, businessSlug, router, setOptimisticOrderIds, pendingOrderIdsRef],
  );

  if (!isMounted) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={products.map((p) => p.id)}
        strategy={
          viewMode === "grid" ? rectSortingStrategy : verticalListSortingStrategy
        }
      >
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-2 gap-4 mt-2.5 pb-4"
              : "space-y-4 mt-2.5"
          }
        >
          {products.map((product, index) => (
            <SortableProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              showAdminActions
              imagePriority={index === 0}
              onEdit={onEdit ? () => onEdit(product.id) : undefined}
              onHide={product.isActive ? () => onHide?.(product.id) : undefined}
              onRestore={onRestore ? () => onRestore(product.id) : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
