"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Product } from "@/types";
import { ProductCard } from "./product-card";

interface SortableProductCardProps {
  product: Product;
  viewMode: "grid" | "list";
  showAdminActions: boolean;
  onEdit?: () => void;
  onHide?: () => void | Promise<void>;
  onRestore?: () => void | Promise<void>;
}

/**
 * Обёртка ProductCard с поддержкой drag-and-drop для админа.
 * Handle (иконка захвата) активирует перетаскивание; на тач-устройствах — long-press.
 */
export function SortableProductCard({
  product,
  viewMode,
  showAdminActions,
  onEdit,
  onHide,
  onRestore,
}: SortableProductCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-60 z-50" : undefined}>
      <div className="relative">
        {showAdminActions && (
          <button
            type="button"
            className="absolute top-2 left-2 z-10 p-1.5 rounded-full bg-white/90 shadow border border-gray-200 hover:bg-gray-50 touch-none"
            aria-label="Переместить"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-gray-500" />
          </button>
        )}
        <ProductCard
          product={product}
          viewMode={viewMode}
          showAdminActions={showAdminActions}
          onEdit={onEdit}
          onHide={onHide}
          onRestore={onRestore}
        />
      </div>
    </div>
  );
}
