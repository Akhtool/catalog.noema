import type { ReactNode } from "react";

import {
  getContactErrorMessage,
  normalizePhone as normalizeContactPhone,
  normalizeTelegram as normalizeContactTelegram,
  normalizeWhatsapp as normalizeContactWhatsapp,
  validatePhone as validateContactPhone,
  validateTelegram as validateContactTelegram,
  validateWhatsapp as validateContactWhatsapp,
} from "@/lib/contacts";


const DEFAULT_BRAND_HEX = "#ffd600";
const DEFAULT_BRAND_HSL = "50.4 100% 50%";

export type ThemeBrandForeground = "black" | "white";

export type ThemeScopeSnapshot = {
  brandYellow: string;
  brandYellowForeground: string;
  primary: string;
  primaryForeground: string;
  ring: string;
};

export type BusinessImageKind = "logo" | "cover";

export type BusinessImageSelectionResult =
  | { kind: "selected"; objectUrl: string }
  | { kind: "error"; message: string }
  | { kind: "empty" };

export type BusinessImageMessages = {
  uploaded: string;
  uploadFailed: string;
  uploadThrowable: string;
};

export type LocationContactValidationResult = {
  errors: {
    phone?: string;
    whatsapp?: string;
    telegram?: string;
  };
  normalized: {
    phone: string;
    whatsapp: string;
    telegram: string;
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function getDefaultBrandHex() {
  return DEFAULT_BRAND_HEX;
}

export function getDefaultBrandHsl() {
  return DEFAULT_BRAND_HSL;
}

export function selectBusinessImageFile(
  file: File | null | undefined,
  maxFileSize: number
): BusinessImageSelectionResult {
  if (!file) {
    return { kind: "empty" };
  }
  if (!file.type.startsWith("image/")) {
    return { kind: "error", message: "Файл должен быть изображением" };
  }
  if (file.size > maxFileSize) {
    return { kind: "error", message: "Размер файла не должен превышать 5MB" };
  }

  return { kind: "selected", objectUrl: URL.createObjectURL(file) };
}

export function buildBusinessImageStoragePath(
  businessId: string,
  type: BusinessImageKind,
  fileName: string,
  now = Date.now()
) {
  const fileExt = fileName.split(".").pop() ?? "jpg";
  return `${businessId}/${type}-${now}.${fileExt}`;
}

export function getBusinessImageMessages(type: BusinessImageKind): BusinessImageMessages {
  if (type === "logo") {
    return {
      uploaded: "Логотип загружен",
      uploadFailed: "Ошибка загрузки изображения",
      uploadThrowable: "Ошибка загрузки логотипа",
    };
  }

  return {
    uploaded: "Обложка загружена",
    uploadFailed: "Ошибка загрузки изображения",
    uploadThrowable: "Ошибка загрузки обложки",
  };
}


export function normalizeBusinessContactFields(formData: FormData) {
  const phoneNorm = normalizeContactPhone(String(formData.get("phone") ?? "")).normalized;
  const whatsappNorm = normalizeContactWhatsapp(String(formData.get("whatsapp") ?? "")).normalized;
  const whatsappDeliveryNorm = normalizeContactWhatsapp(
    String(formData.get("whatsapp_delivery") ?? "")
  ).normalized;
  const whatsappPickupNorm = normalizeContactWhatsapp(
    String(formData.get("whatsapp_pickup") ?? "")
  ).normalized;
  const whatsappDineInNorm = normalizeContactWhatsapp(
    String(formData.get("whatsapp_dine_in") ?? "")
  ).normalized;
  const telegramNorm = normalizeContactTelegram(String(formData.get("telegram") ?? "")).normalized;

  formData.set("phone", phoneNorm);
  formData.set("whatsapp", whatsappNorm);
  formData.set("whatsapp_delivery", whatsappDeliveryNorm);
  formData.set("whatsapp_pickup", whatsappPickupNorm);
  formData.set("whatsapp_dine_in", whatsappDineInNorm);
  formData.set("telegram", telegramNorm);
}

export function validateAndNormalizeLocationContacts(input: {
  phone: string;
  whatsapp: string;
  telegram: string;
}): LocationContactValidationResult {
  const phoneRes = validateContactPhone(input.phone);
  const whatsappRes = validateContactWhatsapp(input.whatsapp);
  const telegramRes = validateContactTelegram(input.telegram);

  const errors: LocationContactValidationResult["errors"] = {};
  if (!phoneRes.isValid && phoneRes.errorCode) {
    errors.phone = getContactErrorMessage(phoneRes.errorCode);
  }
  if (!whatsappRes.isValid && whatsappRes.errorCode) {
    errors.whatsapp = getContactErrorMessage(whatsappRes.errorCode);
  }
  if (!telegramRes.isValid && telegramRes.errorCode) {
    errors.telegram = getContactErrorMessage(telegramRes.errorCode);
  }

  return {
    errors,
    normalized: {
      phone: normalizeContactPhone(input.phone).normalized,
      whatsapp: normalizeContactWhatsapp(input.whatsapp).normalized,
      telegram: normalizeContactTelegram(input.telegram).normalized,
    },
  };
}

export function normalizeHex(hex: string) {
  const value = hex.trim().toLowerCase();
  if (!value.startsWith("#")) return null;
  if (value.length !== 7) return null;
  if (!/^#[0-9a-f]{6}$/.test(value)) return null;
  return value;
}

export function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return { r, g, b };
}

export function rgbToHex(rgb: { r: number; g: number; b: number }) {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function rgbToHslTriple(rgb: { r: number; g: number; b: number }) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const hue = Math.round(h * 10) / 10;
  const sat = Math.round(s * 1000) / 10;
  const lig = Math.round(l * 1000) / 10;
  return `${hue} ${sat}% ${lig}%`;
}

export function hslTripleToRgb(triple: string) {
  const parts = triple.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const h = Number(parts[0]);
  const s = Number(parts[1].replace("%", ""));
  const l = Number(parts[2].replace("%", ""));
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;

  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s / 100, 0, 1);
  const ll = clamp(l / 100, 0, 1);

  if (ss === 0) {
    const v = Math.round(ll * 255);
    return { r: v, g: v, b: v };
  }

  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let rr = 0;
  let gg = 0;
  let bb = 0;
  if (hh < 60) [rr, gg, bb] = [c, x, 0];
  else if (hh < 120) [rr, gg, bb] = [x, c, 0];
  else if (hh < 180) [rr, gg, bb] = [0, c, x];
  else if (hh < 240) [rr, gg, bb] = [0, x, c];
  else if (hh < 300) [rr, gg, bb] = [x, 0, c];
  else [rr, gg, bb] = [c, 0, x];

  return {
    r: Math.round((rr + m) * 255),
    g: Math.round((gg + m) * 255),
    b: Math.round((bb + m) * 255),
  };
}

export function pickForeground(rgb: { r: number; g: number; b: number }): ThemeBrandForeground {
  const srgb = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  const contrastWhite = (1 + 0.05) / (luminance + 0.05);
  const contrastBlack = (luminance + 0.05) / 0.05;
  return contrastBlack >= contrastWhite ? "black" : "white";
}

type BrandIconProps = {
  className?: string;
};

function BrandIconFrame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {children}
    </svg>
  );
}

export function WhatsAppIcon({ className }: BrandIconProps) {
  return (
    <BrandIconFrame className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </BrandIconFrame>
  );
}

export function TelegramIcon({ className }: BrandIconProps) {
  return (
    <BrandIconFrame className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </BrandIconFrame>
  );
}
