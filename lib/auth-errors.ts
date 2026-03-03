/**
 * Маппинг сообщений об ошибках Supabase Auth на русский язык.
 * Используется на страницах входа и регистрации.
 */

const AUTH_ERROR_MAP: Record<string, string> = {
  // Вход
  'Invalid login credentials': 'Неверный email или пароль',
  'invalid login credentials': 'Неверный email или пароль',
  'Email not confirmed': 'Подтвердите email по ссылке из письма',
  'email not confirmed': 'Подтвердите email по ссылке из письма',
  'Too many requests': 'Слишком много попыток. Попробуйте позже',
  'too many requests': 'Слишком много попыток. Попробуйте позже',
  'Token has expired': 'Ссылка устарела. Запросите новую',
  'token has expired': 'Ссылка устарела. Запросите новую',

  // Регистрация / OTP
  'User already registered': 'Этот email уже зарегистрирован',
  'user already registered': 'Этот email уже зарегистрирован',
  'Signup requires a valid password': 'Укажите пароль не короче 6 символов',
  'signup requires a valid password': 'Укажите пароль не короче 6 символов',
  'Unable to validate email address': 'Не удалось отправить письмо. Проверьте email',
  'unable to validate email address': 'Не удалось отправить письмо. Проверьте email',
  'For security purposes, you can only request this once every': 'Запрос ссылки возможен раз в минуту. Подождите',
  'for security purposes, you can only request this once every': 'Запрос ссылки возможен раз в минуту. Подождите',

  // Общие
  'Invalid email or password': 'Неверный email или пароль',
  'invalid email or password': 'Неверный email или пароль',
  'Network request failed': 'Нет соединения с интернетом',
  'network request failed': 'Нет соединения с интернетом',
}

const FALLBACK_MESSAGE = 'Произошла ошибка. Попробуйте ещё раз.'

/**
 * Возвращает пользовательское сообщение на русском для ошибки Auth.
 * Если сообщение неизвестно — возвращает общую фразу.
 */
export function getAuthErrorMessage(errorMessage: string | undefined): string {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return FALLBACK_MESSAGE
  }
  const trimmed = errorMessage.trim()
  const exact = AUTH_ERROR_MAP[trimmed] ?? AUTH_ERROR_MAP[trimmed.toLowerCase()]
  if (exact) return exact
  // Частичное совпадение для длинных сообщений (например, лимит запросов)
  const lower = trimmed.toLowerCase()
  if (lower.includes('for security purposes') || lower.includes('once every')) {
    return 'Запрос ссылки возможен раз в минуту. Подождите'
  }
  return FALLBACK_MESSAGE
}
