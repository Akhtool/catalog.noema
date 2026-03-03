"use client";

import { useEffect, useState } from "react";
import { checkBusinessAccess } from "@/app/admin/business/actions";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface EditProfileButtonProps {
  businessSlug: string;
  onOpenEditor: () => void;
}

/**
 * Кнопка редактирования профиля
 * Показывается только для owner/admin бизнеса
 */
export function EditProfileButton({
  businessSlug,
  onOpenEditor,
}: EditProfileButtonProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    /**
     * Проверяет права доступа к бизнесу
     */
    async function checkAccess() {
      const result = await checkBusinessAccess(businessSlug);
      setHasAccess(result.hasAccess ?? false);
    }

    checkAccess();
  }, [businessSlug]);

  // Показываем кнопку только если есть доступ
  if (hasAccess !== true) {
    return null;
  }

  return (
    <Button
      onClick={onOpenEditor}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Pencil className="w-4 h-4" />
      <span>Редактировать профиль</span>
    </Button>
  );
}
