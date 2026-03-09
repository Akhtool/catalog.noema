import {
  createLocation,
  updateLocation,
} from "@/app/admin/business/actions";

export type BusinessLocationDraft = {
  title: string;
  address: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  orderPosition: number;
  isActive: boolean;
};

export type SaveBusinessLocationParams = {
  businessId: string;
  editingLocationId: string | "new";
  locationForm: BusinessLocationDraft;
  normalizedContacts: {
    phone: string;
    whatsapp: string;
    telegram: string;
  };
};

export type SaveBusinessLocationResult =
  | { status: "created"; message: string }
  | { status: "updated"; message: string }
  | { status: "error"; message: string };

export async function saveBusinessLocation({
  businessId,
  editingLocationId,
  locationForm,
  normalizedContacts,
}: SaveBusinessLocationParams): Promise<SaveBusinessLocationResult> {
  const payload = {
    title: locationForm.title.trim(),
    address: locationForm.address.trim() || null,
    phone: normalizedContacts.phone || null,
    whatsapp: normalizedContacts.whatsapp || null,
    telegram: normalizedContacts.telegram || null,
    orderPosition: locationForm.orderPosition,
    isActive: locationForm.isActive,
  };

  if (editingLocationId === "new") {
    const result = await createLocation(businessId, payload);
    if ("error" in result) {
      return { status: "error", message: result.error ?? "Ошибка" };
    }
    return { status: "created", message: "Филиал добавлен" };
  }

  const result = await updateLocation(editingLocationId, payload);
  if ("error" in result) {
    return { status: "error", message: result.error ?? "Ошибка" };
  }
  return { status: "updated", message: "Филиал сохранён" };
}
