import { saveImageUrl } from "@/app/admin/business/actions";
import { supabase } from "@/lib/supabase";

import {
  buildBusinessImageStoragePath,
  getBusinessImageMessages,
  type BusinessImageKind,
} from "./business-profile-editor-utils";

type UploadBusinessProfileImageParams = {
  businessId: string;
  businessSlug?: string | null;
  croppedFile: File;
  type: BusinessImageKind;
};

export async function uploadBusinessProfileImage({
  businessId,
  businessSlug,
  croppedFile,
  type,
}: UploadBusinessProfileImageParams): Promise<{ publicUrl?: string; error?: string }> {
  const imageMessages = getBusinessImageMessages(type);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Не авторизован" };
  }

  const fileName = buildBusinessImageStoragePath(businessId, type, croppedFile.name);
  const { error: uploadError } = await supabase.storage.from("business").upload(fileName, croppedFile, {
    contentType: croppedFile.type,
    upsert: true,
    cacheControl: "public, max-age=31536000, immutable",
  });

  if (uploadError) {
    console.error("Ошибка загрузки изображения:", uploadError);
    return { error: imageMessages.uploadFailed };
  }

  const { data: urlData } = supabase.storage.from("business").getPublicUrl(fileName);

  if (!urlData?.publicUrl) {
    return { error: "Не удалось получить URL изображения" };
  }

  const saveResult = await saveImageUrl(urlData.publicUrl, type, businessId, businessSlug ?? undefined);
  if (saveResult.error) {
    return { error: saveResult.error };
  }

  return { publicUrl: urlData.publicUrl };
}
