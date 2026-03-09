/**
 * Order helpers: message formatting, contact resolution, and deep links.
 * Client-only logic.
 */

import type { Business, DeliveryType, Order } from "@/types";

const LABEL_NEW_ORDER = "\uD83D\uDED2 *\u041d\u043e\u0432\u044b\u0439 \u0437\u0430\u043a\u0430\u0437*";
const LABEL_ORDER_NUMBER = "*\u041d\u043e\u043c\u0435\u0440 \u0437\u0430\u043a\u0430\u0437\u0430:*";
const LABEL_ITEMS = "*\u0422\u043e\u0432\u0430\u0440\u044b:*";
const LABEL_SUBTOTAL = "*\u041f\u043e\u0434\u044b\u0442\u043e\u0433:*";
const LABEL_DISCOUNT = "*\u0421\u043a\u0438\u0434\u043a\u0430 \u043f\u043e \u043f\u0440\u043e\u043c\u043e\u043a\u043e\u0434\u0443:*";
const LABEL_TOTAL = "*\u0418\u0442\u043e\u0433\u043e:*";
const LABEL_TOTAL_QTY = "*\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0442\u043e\u0432\u0430\u0440\u043e\u0432:*";
const LABEL_PROMO = "*\u041f\u0440\u043e\u043c\u043e\u043a\u043e\u0434:*";
const LABEL_COMMENT = "*\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439:*";
const LABEL_DELIVERY_TYPE = "*\u0421\u043f\u043e\u0441\u043e\u0431 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0438\u044f:*";
const LABEL_DELIVERY_ADDRESS = "*\u0410\u0434\u0440\u0435\u0441 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438:*";
const LABEL_BRANCH = "*\u0424\u0438\u043b\u0438\u0430\u043b:*";
const LABEL_ADDRESS = "*\u0410\u0434\u0440\u0435\u0441:*";
const DELIVERY_LABELS: Record<string, string> = {
  delivery: "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430",
  pickup: "\u0421\u0430\u043c\u043e\u0432\u044b\u0432\u043e\u0437",
  "dine-in": "\u0412 \u0437\u0430\u043b\u0435",
};
const ERR_NO_CONTACTS =
  "\u0423 \u0431\u0438\u0437\u043d\u0435\u0441\u0430 \u043d\u0435\u0442 \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043e\u0432 \u0434\u043b\u044f \u0441\u0432\u044f\u0437\u0438";

/** Fallback delivery types when DB value is missing or invalid. */
export const DEFAULT_DELIVERY_TYPES: DeliveryType[] = ["delivery", "pickup", "dine-in"];

/** Normalizes delivery_types from Supabase into DeliveryType[]. */
export function parseDeliveryTypes(raw: unknown): DeliveryType[] {
  const valid: DeliveryType[] = ["delivery", "pickup", "dine-in"];
  if (!Array.isArray(raw)) return DEFAULT_DELIVERY_TYPES;

  const filtered = (raw as string[]).filter(
    (value): value is DeliveryType =>
      typeof value === "string" && valid.includes(value as DeliveryType),
  );

  return filtered.length > 0 ? filtered : DEFAULT_DELIVERY_TYPES;
}

/** Builds the message text sent to WhatsApp/Telegram. */
export function generateOrderMessage(order: Order): string {
  const lines: string[] = [];

  lines.push(LABEL_NEW_ORDER);
  lines.push(`${LABEL_ORDER_NUMBER} ${order.orderNumber}`);
  lines.push("");
  lines.push(LABEL_ITEMS);

  order.items.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    lines.push(
      `${index + 1}. ${item.name} - ${item.quantity} \u0448\u0442. \u00D7 ${formatPrice(item.price)} = ${formatPrice(itemTotal)}`,
    );
  });

  lines.push("");

  const discountAmount = typeof order.discountAmount === "number" ? order.discountAmount : 0;
  const subtotal =
    typeof order.subtotal === "number"
      ? order.subtotal
      : order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const hasDiscount = discountAmount > 0;

  if (hasDiscount) {
    lines.push(`${LABEL_SUBTOTAL} ${formatPrice(subtotal)}`);
    lines.push(`${LABEL_DISCOUNT} \u2212${formatPrice(discountAmount)}`);
    lines.push(`${LABEL_TOTAL} ${formatPrice(order.totalPrice)}`);
  } else {
    lines.push(`${LABEL_TOTAL} ${formatPrice(order.totalPrice)}`);
  }

  lines.push(`${LABEL_TOTAL_QTY} ${order.totalQuantity} \u0448\u0442.`);

  if (order.promoCode) {
    lines.push("");
    lines.push(`${LABEL_PROMO} ${order.promoCode}`);
  }

  if (order.comment) {
    lines.push("");
    lines.push(`${LABEL_COMMENT} ${order.comment}`);
  }

  if (order.deliveryType) {
    lines.push("");
    lines.push(`${LABEL_DELIVERY_TYPE} ${DELIVERY_LABELS[order.deliveryType] || order.deliveryType}`);

    if (order.deliveryType === "delivery" && order.deliveryAddress) {
      lines.push(`${LABEL_DELIVERY_ADDRESS} ${order.deliveryAddress}`);
    }

    if (
      (order.deliveryType === "pickup" || order.deliveryType === "dine-in") &&
      order.selectedPoint
    ) {
      lines.push(`${LABEL_BRANCH} ${order.selectedPoint.title}`);
      if (order.selectedPoint.address) {
        lines.push(`${LABEL_ADDRESS} ${order.selectedPoint.address}`);
      }
    }
  }

  return lines.join("\n");
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export function createWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function createPhoneLink(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  return `tel:${cleanPhone}`;
}

export function createTelegramLink(username: string, message: string): string {
  const cleanUsername = username.replace(/^@/, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://t.me/${cleanUsername}?text=${encodedMessage}`;
}

/** Resolves the best WhatsApp number for the current order context. */
export function resolveWhatsappForOrder(business: Business, order: Order): string | null {
  if (order.selectedPoint?.whatsapp) return order.selectedPoint.whatsapp;

  const fallback = business.whatsapp ?? null;
  switch (order.deliveryType) {
    case "delivery":
      return business.whatsappDelivery ?? fallback;
    case "pickup":
      return business.whatsappPickup ?? fallback;
    case "dine-in":
      return business.whatsappDineIn ?? fallback;
    default:
      return fallback;
  }
}

/** Returns true when the business has at least one configured contact channel for orders. */
export function hasAnyOrderContact(business: Business): boolean {
  if (business.phone || business.whatsapp || business.telegram) {
    return true;
  }

  return (business.pickupPoints ?? []).some(
    (point) => point.isActive && (point.phone || point.whatsapp || point.telegram),
  );
}

/** Returns the best available contact link for the order. */
export function getOrderContactLink(
  business: Business,
  order: Order
): { url: string; type: "whatsapp" | "telegram" | "phone" } {
  const message = generateOrderMessage(order);
  const phone = order.selectedPoint?.phone ?? business.phone ?? null;
  const whatsapp = resolveWhatsappForOrder(business, order);
  const telegram = order.selectedPoint?.telegram ?? business.telegram ?? null;

  if (whatsapp) {
    return { url: createWhatsAppLink(whatsapp, message), type: "whatsapp" };
  }
  if (telegram) {
    return { url: createTelegramLink(telegram, message), type: "telegram" };
  }
  if (phone) {
    return { url: createPhoneLink(phone), type: "phone" };
  }

  throw new Error(ERR_NO_CONTACTS);
}
