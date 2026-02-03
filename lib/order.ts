/**
 * Функции для работы с заказами
 * Генерация WhatsApp-сообщений и ссылок для связи
 * Client-side only, без серверной логики
 */

import type { Order, Business, DeliveryType } from '@/types';

/** Способы получения по умолчанию, если в БД не задано или пусто */
export const DEFAULT_DELIVERY_TYPES: DeliveryType[] = ['delivery', 'pickup', 'dine-in'];

/** Нормализует delivery_types из Supabase в DeliveryType[]. Невалидные значения отбрасываются. */
export function parseDeliveryTypes(raw: unknown): DeliveryType[] {
  const valid: DeliveryType[] = ['delivery', 'pickup', 'dine-in'];
  if (!Array.isArray(raw)) return DEFAULT_DELIVERY_TYPES;
  const filtered = (raw as string[]).filter((v): v is DeliveryType =>
    typeof v === 'string' && valid.includes(v as DeliveryType)
  );
  return filtered.length > 0 ? filtered : DEFAULT_DELIVERY_TYPES;
}

/**
 * Генерирует текстовое сообщение заказа для отправки
 */
export function generateOrderMessage(order: Order): string {
  const lines: string[] = [];

  // Заголовок
  lines.push('🛒 *Новый заказ*');
  lines.push(`*Номер заказа:* ${order.orderNumber}`);
  lines.push('');

  // Список товаров
  lines.push('*Товары:*');
  order.items.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    lines.push(
      `${index + 1}. ${item.name} - ${item.quantity} шт. × ${formatPrice(item.price)} = ${formatPrice(itemTotal)}`
    );
  });

  lines.push('');

  // Итого
  lines.push(`*Итого:* ${formatPrice(order.totalPrice)}`);
  lines.push(`*Количество товаров:* ${order.totalQuantity} шт.`);

  // Комментарий, если есть
  if (order.comment) {
    lines.push('');
    lines.push(`*Комментарий:* ${order.comment}`);
  }

  // Промокод, если есть
  if (order.promoCode) {
    lines.push('');
    lines.push(`*Промокод:* ${order.promoCode}`);
  }

  // Способ получения заказа
  if (order.deliveryType) {
    lines.push('');
    const deliveryLabels: Record<string, string> = {
      delivery: "Доставка",
      pickup: "Самовывоз",
      "dine-in": "В зале",
    };
    lines.push(`*Способ получения:* ${deliveryLabels[order.deliveryType] || order.deliveryType}`);
    if (order.deliveryType === "delivery" && order.deliveryAddress) {
      lines.push(`*Адрес доставки:* ${order.deliveryAddress}`);
    }
    // Точка/филиал для самовывоза и «В зале»
    if (
      (order.deliveryType === "pickup" || order.deliveryType === "dine-in") &&
      order.selectedPoint
    ) {
      lines.push(`*Филиал:* ${order.selectedPoint.title}`);
      if (order.selectedPoint.address) {
        lines.push(`*Адрес:* ${order.selectedPoint.address}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Форматирует цену в читаемый формат
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Создаёт WhatsApp deep-link с сообщением
 */
export function createWhatsAppLink(phone: string, message: string): string {
  // Убираем все нецифровые символы из номера
  const cleanPhone = phone.replace(/\D/g, '');

  // Кодируем сообщение для URL
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Создаёт tel: ссылку для звонка
 */
export function createPhoneLink(phone: string): string {
  // Убираем все нецифровые символы из номера
  const cleanPhone = phone.replace(/\D/g, '');

  return `tel:${cleanPhone}`;
}

/**
 * Создаёт Telegram deep-link с сообщением
 */
export function createTelegramLink(username: string, message: string): string {
  // Убираем @ если есть
  const cleanUsername = username.replace(/^@/, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://t.me/${cleanUsername}?text=${encodedMessage}`;
}

/**
 * Возвращает ссылку для связи с бизнесом (или с точкой, если выбрана и у неё есть контакты).
 * Приоритет: выбранная точка (WhatsApp > Telegram > телефон) → контакты бизнеса.
 */
export function getOrderContactLink(
  business: Business,
  order: Order
): { url: string; type: 'whatsapp' | 'telegram' | 'phone' } {
  const message = generateOrderMessage(order);
  const phone = order.selectedPoint?.phone ?? business.phone ?? null;
  const whatsapp = order.selectedPoint?.whatsapp ?? business.whatsapp ?? null;
  const telegram = order.selectedPoint?.telegram ?? business.telegram ?? null;

  if (whatsapp) {
    return { url: createWhatsAppLink(whatsapp, message), type: 'whatsapp' };
  }
  if (telegram) {
    return { url: createTelegramLink(telegram, message), type: 'telegram' };
  }
  if (phone) {
    return { url: createPhoneLink(phone), type: 'phone' };
  }

  throw new Error('У бизнеса нет контактов для связи');
}
