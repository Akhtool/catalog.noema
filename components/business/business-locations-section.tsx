"use client";

import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BusinessLocation } from "@/types";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

type LocationFormState = {
  title: string;
  address: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  orderPosition: number;
  isActive: boolean;
};

type LocationFormErrors = {
  phone?: string;
  whatsapp?: string;
  telegram?: string;
};

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

type Props = {
  locationsSectionOpen: boolean;
  onToggleSection: () => void;
  editingLocationId: string | null | "new";
  openAddLocation: () => void;
  locationMessage: MessageState;
  locationForm: LocationFormState;
  setLocationForm: Dispatch<SetStateAction<LocationFormState>>;
  locationSubmitting: boolean;
  locationErrors: LocationFormErrors;
  handleSaveLocation: () => void;
  onCancelEdit: () => void;
  pickupPoints: BusinessLocation[];
  isAddingLocation: boolean;
  locationVisibilityOverride: Record<string, boolean>;
  deletingLocationId: string | null;
  expandedLocationId: string | null;
  setExpandedLocationId: Dispatch<SetStateAction<string | null>>;
  handleToggleLocationVisibility: (loc: BusinessLocation) => void;
  togglingLocationId: string | null;
  openEditLocation: (loc: BusinessLocation, effectiveActive?: boolean) => void;
  setLocationToDeleteId: Dispatch<SetStateAction<string | null>>;
};

export function BusinessLocationsSection({
  locationsSectionOpen,
  onToggleSection,
  editingLocationId,
  openAddLocation,
  locationMessage,
  locationForm,
  setLocationForm,
  locationSubmitting,
  locationErrors,
  handleSaveLocation,
  onCancelEdit,
  pickupPoints,
  isAddingLocation,
  locationVisibilityOverride,
  deletingLocationId,
  expandedLocationId,
  setExpandedLocationId,
  handleToggleLocationVisibility,
  togglingLocationId,
  openEditLocation,
  setLocationToDeleteId,
}: Props) {
  return (
    <div className="rounded-lg border p-4">
      <button
        type="button"
        onClick={onToggleSection}
        className="flex w-full items-center justify-between gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md -m-1 p-1"
        aria-expanded={locationsSectionOpen}
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-yellow" />
          <h3 className="text-lg font-semibold">Филиалы и самовывоз</h3>
        </div>
        {locationsSectionOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
        )}
      </button>

      {locationsSectionOpen && (
        <div className="space-y-4 mt-4">
          <div className="flex justify-end">
            {editingLocationId === null && (
              <Button
                type="button"
                size="sm"
                onClick={openAddLocation}
                className="bg-brand-yellow text-brand-yellow-foreground hover:bg-brand-yellow/90"
              >
                <Plus className="w-4 h-4 mr-1" />
                Добавить
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Точки самовывоза и залы для способов «Самовывоз» и «В зале». Контакты точки
            подставляются в заказ, если указаны.
          </p>

          {locationMessage && (
            <div
              className={cn(
                "p-3 rounded-md text-sm",
                locationMessage.type === "success"
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              )}
            >
              {locationMessage.text}
            </div>
          )}

          {editingLocationId !== null && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <Input
                placeholder="Название (например, ТЦ Афимолл)"
                value={locationForm.title}
                onChange={(e) => setLocationForm((f) => ({ ...f, title: e.target.value }))}
                required
                disabled={locationSubmitting}
                className="bg-white"
              />
              <Input
                placeholder="Адрес"
                value={locationForm.address}
                onChange={(e) => setLocationForm((f) => ({ ...f, address: e.target.value }))}
                disabled={locationSubmitting}
                className="bg-white"
              />
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Input
                    placeholder="Телефон, например +7 999 123-45-67"
                    value={locationForm.phone}
                    onChange={(e) => setLocationForm((f) => ({ ...f, phone: e.target.value }))}
                    disabled={locationSubmitting}
                    className={cn("bg-white", locationErrors.phone && "border-red-500")}
                  />
                  {locationErrors.phone && (
                    <p className="text-sm text-red-600">{locationErrors.phone}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Input
                    placeholder="WhatsApp: wa.me/79991234567 или +7 999 123-45-67"
                    value={locationForm.whatsapp}
                    onChange={(e) =>
                      setLocationForm((f) => ({ ...f, whatsapp: e.target.value }))
                    }
                    disabled={locationSubmitting}
                    className={cn("bg-white", locationErrors.whatsapp && "border-red-500")}
                  />
                  {locationErrors.whatsapp && (
                    <p className="text-sm text-red-600">{locationErrors.whatsapp}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Input
                    placeholder="Telegram: @username или t.me/username"
                    value={locationForm.telegram}
                    onChange={(e) =>
                      setLocationForm((f) => ({ ...f, telegram: e.target.value }))
                    }
                    disabled={locationSubmitting}
                    className={cn("bg-white", locationErrors.telegram && "border-red-500")}
                  />
                  {locationErrors.telegram && (
                    <p className="text-sm text-red-600">{locationErrors.telegram}</p>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationForm.isActive}
                  onChange={(e) =>
                    setLocationForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  disabled={locationSubmitting}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">
                  Показывать в выборе при оформлении заказа
                </span>
              </label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleSaveLocation}
                  disabled={locationSubmitting}
                  className="bg-brand-yellow text-brand-yellow-foreground hover:bg-brand-yellow/90"
                >
                  {locationSubmitting
                    ? "Сохранение..."
                    : editingLocationId === "new"
                      ? "Добавить"
                      : "Сохранить"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancelEdit}
                  disabled={locationSubmitting}
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {pickupPoints.map((loc) => {
              const effectiveActive = locationVisibilityOverride[loc.id] ?? loc.isActive;
              const isDeleting = deletingLocationId === loc.id;

              return (
                <li
                  key={loc.id}
                  className={cn(
                    "flex items-start justify-between gap-2 p-3 rounded-lg border bg-white min-h-[67px]",
                    !effectiveActive && !isDeleting && "opacity-75"
                  )}
                >
                  {isDeleting ? (
                    <div className="flex flex-1 items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{loc.title}</p>
                          {!effectiveActive && (
                            <Badge variant="secondary" className="text-xs">
                              Скрыт
                            </Badge>
                          )}
                        </div>
                        {loc.address && (
                          <p className="text-sm text-gray-600 mt-0.5">{loc.address}</p>
                        )}
                        {expandedLocationId === loc.id && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-sm">
                            {loc.phone && (
                              <p className="text-gray-600">
                                <span className="text-gray-400">Телефон:</span>{" "}
                                <a href={`tel:${loc.phone}`} className="text-gray-800 underline">
                                  {loc.phone}
                                </a>
                              </p>
                            )}
                            {loc.whatsapp && (
                              <p className="text-gray-600">
                                <span className="text-gray-400">WhatsApp:</span>{" "}
                                <a
                                  href={`https://wa.me/${loc.whatsapp.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-800 underline"
                                >
                                  {loc.whatsapp}
                                </a>
                              </p>
                            )}
                            {loc.telegram && (
                              <p className="text-gray-600">
                                <span className="text-gray-400">Telegram:</span>{" "}
                                <a
                                  href={`https://t.me/${loc.telegram.replace(/^@/, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-800 underline"
                                >
                                  {loc.telegram}
                                </a>
                              </p>
                            )}
                            {!loc.phone && !loc.whatsapp && !loc.telegram && (
                              <p className="text-gray-400 text-xs">Контакты не указаны</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 flex-shrink-0 items-start">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedLocationId((id) => (id === loc.id ? null : loc.id))
                          }
                          className="p-2 rounded-lg hover:bg-gray-100"
                          title={
                            expandedLocationId === loc.id ? "Свернуть" : "Подробные данные"
                          }
                          aria-label={
                            expandedLocationId === loc.id ? "Свернуть" : "Подробные данные"
                          }
                        >
                          {expandedLocationId === loc.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLocationVisibility(loc)}
                          disabled={togglingLocationId !== null}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          title={
                            effectiveActive
                              ? "Скрыть (например, на ремонте)"
                              : "Показать"
                          }
                          aria-label={effectiveActive ? "Скрыть" : "Показать"}
                        >
                          {togglingLocationId === loc.id ? (
                            <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                          ) : effectiveActive ? (
                            <EyeOff className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditLocation(loc, effectiveActive)}
                          disabled={editingLocationId !== null}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          aria-label="Изменить"
                        >
                          <Pencil className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationToDeleteId(loc.id)}
                          disabled={deletingLocationId !== null}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            deletingLocationId !== null
                              ? "cursor-not-allowed bg-gray-100 opacity-50"
                              : "hover:bg-red-50"
                          )}
                          aria-label="Удалить"
                        >
                          <Trash2
                            className={cn(
                              "w-4 h-4",
                              deletingLocationId !== null ? "text-gray-400" : "text-red-600"
                            )}
                          />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}

            {isAddingLocation && (
              <li className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-white min-h-[67px]">
                <div className="flex flex-1 items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                </div>
              </li>
            )}
          </ul>

          {pickupPoints.length === 0 && !isAddingLocation && editingLocationId === null && (
            <p className="text-sm text-muted-foreground">
              Нет добавленных филиалов. Нажмите «Добавить» для первой точки.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
