"use client";

import { useEffect, useState } from "react";
import { checkBusinessAccess } from "@/app/admin/business/actions";
import { ContactButton } from "@/components/contact-button";
import { useProfileEditor, useProductEditor } from "./profile-editor-context";
import { Business } from "@/types";
import { Button } from "@/components/ui/button";
import { Pencil, Plus } from "lucide-react";

const ADMIN_BUTTON_CLASS =
  "w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all duration-300 h-12 flex items-center justify-center gap-2";

interface ContactOrEditSectionProps {
  business: Business;
}

/**
 * Секция "Связаться с нами" или кнопки админа (редактировать профиль, добавить позицию).
 * Для admin/owner показывает кнопки редактирования, для остальных — ContactButton.
 */
export function ContactOrEditSection({ business }: ContactOrEditSectionProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const openEditor = useProfileEditor();
  const openProductEditor = useProductEditor();

  useEffect(() => {
    async function checkAccess() {
      const result = await checkBusinessAccess(business.slug);
      setHasAccess(result.hasAccess ?? false);
    }
    checkAccess();
  }, [business.slug]);

  if (hasAccess === null) {
    return (
      <div className="px-5 my-2.5">
        <Button disabled className={ADMIN_BUTTON_CLASS}>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </Button>
      </div>
    );
  }

  if (hasAccess === true && (openEditor || openProductEditor)) {
    return (
      <div className="px-5 my-2.5 space-y-2.5">
        {openEditor && (
          <Button onClick={openEditor} className={ADMIN_BUTTON_CLASS}>
            <Pencil className="w-5 h-5" />
            Редактировать профиль
          </Button>
        )}
        {openProductEditor && (
          <Button onClick={() => openProductEditor()} className={ADMIN_BUTTON_CLASS}>
            <Plus className="w-5 h-5" />
            Добавить позицию
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 my-2.5">
      <ContactButton business={business} variant="wide" />
    </div>
  );
}
