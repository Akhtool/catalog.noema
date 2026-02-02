'use server'

import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

/**
 * Загружает первый доступный бизнес текущего пользователя
 */
export async function getBusiness() {
  const supabase = await createServerClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Не авторизован' }
  }

  // Получаем бизнесы пользователя через business_user
  const { data: businessUsers, error: businessUserError } = await supabase
    .from('business_user')
    .select('business_id')
    .eq('user_id', user.id)
    .limit(1)

  if (businessUserError || !businessUsers || businessUsers.length === 0) {
    return { error: 'Бизнес не найден' }
  }

  const businessId = businessUsers[0].business_id

  // Загружаем данные бизнеса
  const { data: business, error } = await supabase
    .from('business')
    .select('*')
    .eq('id', businessId)
    .single()

  if (error || !business) {
    return { error: 'Ошибка загрузки данных' }
  }

  return { data: business }
}

/**
 * Получает ID первого бизнеса текущего пользователя
 */
async function getBusinessId(supabase: Awaited<ReturnType<typeof createServerClient>>, userId: string) {
  const { data: businessUsers, error: businessUserError } = await supabase
    .from('business_user')
    .select('business_id')
    .eq('user_id', userId)
    .limit(1)

  if (businessUserError || !businessUsers || businessUsers.length === 0) {
    return null
  }

  return businessUsers[0].business_id
}

/**
 * Определяет ID бизнеса для обновления: из формы (с проверкой доступа) или первый бизнес пользователя
 */
async function resolveBusinessIdForUpdate(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  formBusinessId: string | null
): Promise<string | null> {
  if (formBusinessId) {
    const { data: bu } = await supabase
      .from('business_user')
      .select('business_id')
      .eq('business_id', formBusinessId)
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .single()
    if (bu) return bu.business_id
  }
  return getBusinessId(supabase, userId)
}

/**
 * Проверяет, является ли текущий пользователь owner/admin бизнеса по slug
 * @param slug - slug бизнеса
 * @returns объект с информацией о доступе и бизнесе
 */
export async function checkBusinessAccess(slug: string): Promise<{
  hasAccess?: boolean
  businessId?: string
  error?: string
}> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { hasAccess: false, error: 'Не авторизован' }
  }

  // Получаем бизнес по slug
  const { data: business, error: businessError } = await supabase
    .from('business')
    .select('id')
    .eq('slug', slug)
    .single()

  if (businessError || !business) {
    return { hasAccess: false, error: 'Бизнес не найден' }
  }

  // Проверяем, есть ли у пользователя доступ к этому бизнесу с ролью owner/admin
  const { data: businessUser, error: businessUserError } = await supabase
    .from('business_user')
    .select('role')
    .eq('business_id', business.id)
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .single()

  if (businessUserError || !businessUser) {
    return { hasAccess: false, businessId: business.id }
  }

  return { hasAccess: true, businessId: business.id }
}

/**
 * Сохраняет URL изображения в базу данных и удаляет старое изображение
 * Используется после прямой загрузки файла с клиента в Supabase Storage
 * @param imageUrl - публичный URL загруженного изображения
 * @param type - тип изображения: 'logo' или 'cover'
 * @param businessId - ID бизнеса (передаётся с клиента для избежания лишних запросов)
 * @param businessSlug - slug бизнеса для revalidatePath (опционально)
 * @returns успех или ошибка
 */
export async function saveImageUrl(
  imageUrl: string,
  type: 'logo' | 'cover',
  businessId: string,
  businessSlug?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Не авторизован' }
  }

  // Проверяем доступ к бизнесу
  const userBusinessId = await getBusinessId(supabase, user.id)
  if (!userBusinessId || userBusinessId !== businessId) {
    return { error: 'Нет доступа к этому бизнесу' }
  }

  // Получаем старое изображение для удаления (оба поля для корректной типизации)
  const { data: businessData } = await supabase
    .from('business')
    .select('logo_url, cover_url, slug')
    .eq('id', businessId)
    .single()

  const oldImageUrl = type === 'logo' ? businessData?.logo_url : businessData?.cover_url

  // Удаляем старое изображение, если оно есть и отличается от нового
  if (oldImageUrl) {
    const oldUrl = oldImageUrl as string
    if (oldUrl !== imageUrl) {
      // Извлекаем путь из старого URL
      try {
        const url = new URL(oldUrl)
        const oldPath = url.pathname.split('/storage/v1/object/public/business/')[1]
        if (oldPath) {
          await supabase.storage.from('business').remove([oldPath])
        }
      } catch {
        // Если не удалось распарсить URL, игнорируем
      }
    }
  }

  // Сохраняем URL в базу данных
  const { error: updateError } = await supabase
    .from('business')
    .update({ [`${type}_url`]: imageUrl })
    .eq('id', businessId)

  if (updateError) {
    console.error('Ошибка сохранения URL в БД:', updateError)
    return { error: 'Ошибка сохранения URL изображения' }
  }

  // Обновляем кэш публичной страницы каталога
  if (businessSlug || businessData?.slug) {
    revalidatePath(`/${businessSlug ?? businessData?.slug}`)
  }

  return { success: true }
}

/**
 * Нормализует строку: обрезает пробелы, возвращает null если пустая
 */
function normalizeString(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Нормализует Telegram username: убирает @ если есть, обрезает пробелы
 */
function normalizeTelegram(value: string | null | undefined): string | null {
  const normalized = normalizeString(value)
  if (!normalized) return null
  // Убираем @ в начале, если есть
  return normalized.startsWith('@') ? normalized.slice(1) : normalized
}

/**
 * Сохраняет изменения бизнеса
 * Валидация и нормализация данных перед сохранением
 */
export async function updateBusiness(formData: FormData) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Не авторизован' }
  }

  const formBusinessId = normalizeString(formData.get('business_id') as string) || null
  const businessId = await resolveBusinessIdForUpdate(supabase, user.id, formBusinessId)
  if (!businessId) {
    return { error: 'Бизнес не найден' }
  }

  // Валидация обязательного поля
  const name = normalizeString(formData.get('name') as string)
  if (!name) {
    return { error: 'Название бизнеса обязательно' }
  }

  // Подготавливаем данные для обновления с нормализацией
  // yandex_metrika исключён — колонка может отсутствовать в схеме БД
  const updateData: Record<string, string | null> = {
    name,
    description: normalizeString(formData.get('description') as string),
    phone: normalizeString(formData.get('phone') as string),
    whatsapp: normalizeString(formData.get('whatsapp') as string),
    telegram: normalizeTelegram(formData.get('telegram') as string),
    logo_url: normalizeString(formData.get('logo_url') as string),
    cover_url: normalizeString(formData.get('cover_url') as string),
  }

  // Получаем slug бизнеса для revalidatePath
  const { data: businessData } = await supabase
    .from('business')
    .select('slug')
    .eq('id', businessId)
    .single()

  // Обновляем бизнес
  const { error } = await supabase
    .from('business')
    .update(updateData)
    .eq('id', businessId)

  if (error) {
    console.error('Ошибка сохранения бизнеса:', error)
    return { error: 'Ошибка сохранения данных' }
  }

  // Обновляем кэш публичной страницы каталога
  if (businessData?.slug) {
    revalidatePath(`/${businessData.slug}`)
  }

  return { success: true }
}
