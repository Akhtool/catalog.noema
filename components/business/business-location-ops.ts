import {
  deleteLocation,
  updateLocation,
} from "@/app/admin/business/actions";
import type { BusinessLocation } from "@/types";

export type ToggleBusinessLocationResult =
  | { status: "success"; nextActive: boolean; message: string }
  | { status: "error"; message: string };

export type DeleteBusinessLocationResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export async function toggleBusinessLocationVisibility(
  loc: BusinessLocation
): Promise<ToggleBusinessLocationResult> {
  const nextActive = !loc.isActive;
  const result = await updateLocation(loc.id, {
    title: loc.title,
    address: loc.address ?? null,
    phone: loc.phone ?? null,
    whatsapp: loc.whatsapp ?? null,
    telegram: loc.telegram ?? null,
    orderPosition: loc.orderPosition,
    isActive: nextActive,
  });

  if ("error" in result) {
    return { status: "error", message: result.error ?? "Ошибка" };
  }

  return {
    status: "success",
    nextActive,
    message: nextActive ? "Филиал отображается" : "Филиал скрыт",
  };
}

export async function removeBusinessLocation(
  locationId: string
): Promise<DeleteBusinessLocationResult> {
  const result = await deleteLocation(locationId);
  if ("error" in result) {
    return { status: "error", message: result.error ?? "Ошибка" };
  }

  return { status: "success", message: "Филиал удалён" };
}
