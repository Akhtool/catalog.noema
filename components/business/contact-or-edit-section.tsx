"use client";

import React, { useEffect, useState } from "react";
import { checkBusinessAccess } from "@/app/admin/business/actions";
import { ContactButton } from "@/components/contact-button";
import { useProfileEditor, useProductEditor } from "./profile-editor-context";
import { Business } from "@/types";
import { Button } from "@/components/ui/button";
import { Pencil, Plus } from "lucide-react";
import { hasAnyOrderContact } from "@/lib/order";

const ADMIN_BUTTON_BASE =
  "w-full h-12 px-5 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2.5";

/** Стиль кнопки «Редактировать профиль» — outline, вторичное действие */
const EDIT_PROFILE_CLASS = `${ADMIN_BUTTON_BASE} bg-white border-2 border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99] shadow-soft`;

/** Стиль кнопки «Добавить позицию» — основной CTA, brand-yellow */
const ADD_POSITION_CLASS = `${ADMIN_BUTTON_BASE} bg-brand-yellow text-brand-yellow-foreground hover:bg-brand-yellow/90 border-2 border-transparent active:scale-[0.99] shadow-soft`;

interface ContactOrEditSectionProps {
  business: Business;
  /** Передаётся с сервера — чтобы кнопки показывались сразу при входе владельца, без ожидания клиентской проверки */
  initialHasAccess?: boolean | null;
}

/**
 * Секция "Связаться с нами" или кнопки админа (редактировать профиль, добавить позицию).
 * Для admin/owner показывает кнопки редактирования, для остальных — ContactButton.
 */
export function ContactOrEditSection({ business, initialHasAccess = null }: ContactOrEditSectionProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(initialHasAccess ?? null);
  const openEditor = useProfileEditor();
  const openProductEditor = useProductEditor();
  const hasOrderContactsConfigured = hasAnyOrderContact(business);

  useEffect(() => {
    async function checkAccess() {
      const result = await checkBusinessAccess(business.slug);
      setHasAccess(result.hasAccess ?? false);
    }
    checkAccess();
  }, [business.slug]);

  if (hasAccess === null) {
    return (
      <div className="px-3 my-2.5">
        <Button disabled className={EDIT_PROFILE_CLASS}>
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </Button>
      </div>
    );
  }

  if (hasAccess === true && (openEditor || openProductEditor)) {
    return (
      <div className="px-3 my-2.5 space-y-2.5">
        {!hasOrderContactsConfigured && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Чтобы принять первый заказ, добавьте WhatsApp, Telegram или телефон в настройках профиля.
          </div>
        )}
        {openEditor && (
          <Button onClick={openEditor} className={EDIT_PROFILE_CLASS}>
            <Pencil className="w-5 h-5 text-gray-600" />
            Редактировать профиль
          </Button>
        )}
        {openProductEditor && (
          <Button onClick={() => openProductEditor()} className={ADD_POSITION_CLASS}>
            <Plus className="w-5 h-5" />
            Добавить позицию
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 my-2.5">
      <ContactButton business={business} variant="wide" />
    </div>
  );
}
