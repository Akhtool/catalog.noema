/**
 * Функции для работы с заказами
 * Генерация WhatsApp-сообщений и ссылок для связи
 * Client-side only, без серверной логики
 */

import type { Order, Business } from '@/types';

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
 * Возвращает ссылку для связи с бизнесом
 * Приоритет: WhatsApp > Telegram > телефон
 */
export function getOrderContactLink(
  business: Business,
  order: Order
): { url: string; type: 'whatsapp' | 'telegram' | 'phone' } {
  const message = generateOrderMessage(order);

  // Приоритет: WhatsApp
  if (business.whatsapp) {
    return {
      url: createWhatsAppLink(business.whatsapp, message),
      type: 'whatsapp',
    };
  }

  // Fallback: Telegram
  if (business.telegram) {
    return {
      url: createTelegramLink(business.telegram, message),
      type: 'telegram',
    };
  }

  // Fallback: телефон
  if (business.phone) {
    return {
      url: createPhoneLink(business.phone),
      type: 'phone',
    };
  }

  // Если нет ни WhatsApp, ни Telegram, ни телефона
  throw new Error('У бизнеса нет контактов для связи');
}
