import { uploadBusinessImage } from "@/app/admin/business/actions";

import { type BusinessImageKind } from "./business-profile-editor-utils";

type UploadBusinessProfileImageParams = {
  businessId: string;
  businessSlug?: string | null;
  croppedFile: File;
  type: BusinessImageKind;
};

/**
 * Загружает изображение профиля бизнеса через Server Action.
 * Файл уходит на наш сервер, который кладёт его в Supabase Storage —
 * браузер к Supabase не обращается, поэтому работает без VPN.
 */
export async function uploadBusinessProfileImage({
  businessId,
  businessSlug,
  croppedFile,
  type,
}: UploadBusinessProfileImageParams): Promise<{ publicUrl?: string; error?: string }> {
  const formData = new FormData();
  formData.append("file", croppedFile);

  return uploadBusinessImage(formData, type, businessId, businessSlug ?? undefined);
}
