"use client";

import { useHasAccess } from "./profile-editor-context";
import { LogoutButton } from "@/components/admin/logout-button";

/** Стиль кнопки на баннере — в духе приложения: brand-yellow, тёмный текст */
const BANNER_BUTTON_CLASS =
  "bg-brand-yellow text-brand-yellow-foreground hover:bg-brand-yellow/90 font-medium rounded-xl shadow-md border-0";

/**
 * Кнопка «Выйти» в профиле бизнеса. Видна только при наличии доступа (owner/admin).
 * @param variant — "banner" для тёмного баннера, "default" для светлого фона
 */
export function BannerLogoutButton({
  variant = "banner",
}: {
  variant?: "banner" | "default";
}) {
  const hasAccess = useHasAccess();

  if (hasAccess !== true) return null;

  const className = variant === "banner" ? BANNER_BUTTON_CLASS : undefined;
  return <LogoutButton className={className} />;
}
