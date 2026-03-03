/**
 * Нормализация и валидация контактов (телефон, Telegram, WhatsApp).
 * Единственный источник правил формата для UI и сохранения.
 */

import { parsePhoneNumber, type CountryCode } from 'libphonenumber-js'

/** Коды ошибок валидации (для UI и локализации) */
export type ContactErrorCode =
  | 'phone_invalid'
  | 'phone_too_short'
  | 'telegram_invalid'
  | 'telegram_too_short'
  | 'whatsapp_invalid'

export interface ContactResult {
  /** Нормализованное значение для сохранения (E.164 для телефона, @username для Telegram, E.164 для WhatsApp) */
  normalized: string
  /** Валидно ли значение (пустая строка считается валидной — поле опционально) */
  isValid: boolean
  errorCode?: ContactErrorCode
}

const DEFAULT_COUNTRY: CountryCode = 'RU'

/** Минимальная длина цифр для телефона (без country code) */
const MIN_PHONE_LENGTH = 10

/** Telegram: 5–32 символа, латиница, цифры, подчёркивание */
const TELEGRAM_USERNAME_REGEX = /^@?[a-zA-Z0-9_]{5,32}$/

/**
 * Нормализует и валидирует телефон.
 * Пустая строка возвращает { normalized: '', isValid: true }.
 */
export function normalizePhone(
  value: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY
): ContactResult {
  const raw = (value ?? '').trim()
  if (raw === '') return { normalized: '', isValid: true }

  try {
    const parsed = parsePhoneNumber(raw, defaultCountry)
    if (!parsed) return { normalized: raw, isValid: false, errorCode: 'phone_invalid' }
    if (!parsed.isValid()) return { normalized: raw, isValid: false, errorCode: 'phone_invalid' }
    const number = parsed.number.replace(/\D/g, '')
    if (number.length < MIN_PHONE_LENGTH + 1)
      return { normalized: raw, isValid: false, errorCode: 'phone_too_short' }
    return { normalized: parsed.format('E.164'), isValid: true }
  } catch {
    return { normalized: raw, isValid: false, errorCode: 'phone_invalid' }
  }
}

/**
 * Нормализует и валидирует Telegram username.
 * Принимает @username или t.me/username; возвращает @username в нижнем регистре.
 */
export function normalizeTelegram(value: string | null | undefined): ContactResult {
  const raw = (value ?? '').trim()
  if (raw === '') return { normalized: '', isValid: true }

  let username = raw
  if (username.startsWith('https://t.me/')) username = username.slice(12).split('?')[0]
  else if (username.startsWith('t.me/')) username = username.slice(5).split('?')[0]
  if (username.startsWith('@')) username = username.slice(1)
  username = username.toLowerCase()

  if (username.length < 5) return { normalized: raw, isValid: false, errorCode: 'telegram_too_short' }
  if (!TELEGRAM_USERNAME_REGEX.test('@' + username)) return { normalized: raw, isValid: false, errorCode: 'telegram_invalid' }
  return { normalized: '@' + username, isValid: true }
}

/**
 * Нормализует и валидирует WhatsApp (номер телефона).
 * Принимает wa.me/номер или просто номер; возвращает E.164.
 */
export function normalizeWhatsapp(
  value: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY
): ContactResult {
  const raw = (value ?? '').trim()
  if (raw === '') return { normalized: '', isValid: true }

  let digits = raw
  if (digits.startsWith('https://wa.me/')) digits = digits.slice(15).split('?')[0]
  else if (digits.startsWith('wa.me/')) digits = digits.slice(6).split('?')[0]
  digits = digits.replace(/\D/g, '')
  if (digits.startsWith('8') && digits.length === 11) digits = '7' + digits.slice(1)
  if (digits.startsWith('7') && digits.length === 11) {
    const withPlus = '+' + digits
    const result = normalizePhone(withPlus, defaultCountry)
    if (result.isValid) return result
  }
  return normalizePhone(raw, defaultCountry)
}

/**
 * Валидирует телефон без изменения значения (для отображения ошибки по текущему вводу).
 */
export function validatePhone(
  value: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY
): ContactResult {
  return normalizePhone(value, defaultCountry)
}

/**
 * Валидирует Telegram без изменения значения.
 */
export function validateTelegram(value: string | null | undefined): ContactResult {
  return normalizeTelegram(value)
}

/**
 * Валидирует WhatsApp без изменения значения.
 */
export function validateWhatsapp(
  value: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY
): ContactResult {
  return normalizeWhatsapp(value, defaultCountry)
}

/** Сообщения для кодов ошибок (подсказки в UI) */
const ERROR_MESSAGES: Record<ContactErrorCode, string> = {
  phone_invalid: 'Введите корректный номер, например +7 999 123-45-67',
  phone_too_short: 'Номер слишком короткий',
  telegram_invalid: 'Введите @username (латиница, цифры, подчёркивание, 5–32 символа)',
  telegram_too_short: 'Username должен быть от 5 до 32 символов',
  whatsapp_invalid: 'Введите номер или wa.me/79991234567',
}

export function getContactErrorMessage(errorCode: ContactErrorCode): string {
  return ERROR_MESSAGES[errorCode] ?? 'Некорректный формат'
}
