"use client";

import { createContext, useContext } from "react";

interface ProfileEditorContextValue {
  openEditor: () => void;
  /** Открыть редактор позиции: без id — новая позиция, с id — редактирование */
  openProductEditor: (productId?: string) => void;
  /** Скрыть позицию из каталога (soft delete), затем обновить страницу */
  deleteProduct: (productId: string) => Promise<void>;
  /** Восстановить скрытую позицию (is_active = true), затем обновить страницу */
  restoreProduct: (productId: string) => Promise<void>;
  /** Есть ли у пользователя доступ к админке (owner/admin) */
  hasAccess: boolean | null;
}

const ProfileEditorContext = createContext<ProfileEditorContextValue | null>(
  null
);

/**
 * Хук для получения функции открытия редактора профиля
 */
export function useProfileEditor() {
  const ctx = useContext(ProfileEditorContext);
  return ctx?.openEditor ?? null;
}

/**
 * Хук для получения функции открытия редактора позиции (добавить/редактировать товар)
 */
export function useProductEditor() {
  const ctx = useContext(ProfileEditorContext);
  return ctx?.openProductEditor ?? null;
}

/**
 * Хук для проверки доступа к админке (для отображения кнопок на карточках)
 */
export function useHasAccess() {
  const ctx = useContext(ProfileEditorContext);
  return ctx?.hasAccess ?? false;
}

/**
 * Хук для скрытия позиции (с подтверждением вызывается извне)
 */
export function useDeleteProduct() {
  const ctx = useContext(ProfileEditorContext);
  return ctx?.deleteProduct ?? null;
}

/**
 * Хук для восстановления скрытой позиции
 */
export function useRestoreProduct() {
  const ctx = useContext(ProfileEditorContext);
  return ctx?.restoreProduct ?? null;
}

export { ProfileEditorContext };
