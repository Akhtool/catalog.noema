'use server'

import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import {
  getAccessibleEntityBusinessId,
  getAuthenticatedUser,
  userHasAccessToBusinessId,
} from '../_lib/access-control'
import {
  assertBusinessMatchesCurrentHost,
  buildBusinessUpdatePayload,
  getAccessibleCurrentBusinessContext,
  revalidateBusinessPath,
} from './business-action-helpers'

/** Загружает первый доступный бизнес текущего пользователя. */
export async function getBusiness() {
  const supabase = await createServerClient()
  const user = await getAuthenticatedUser(supabase)

  if (!user) {
    return { error: 'Не авторизован' }
  }

  const currentBusiness = await getAccessibleCurrentBusinessContext(supabase, user.id)
  if (currentBusiness.error) {
    return { error: currentBusiness.error }
  }
  const businessId = currentBusiness.data!.businessId

  // Загружаем данные бизнеса.
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
 * Проверяет, есть ли у текущего пользователя owner/admin доступ к бизнесу по slug.
 * @param slug slug бизнеса
 */
export async function checkBusinessAccess(slug: string): Promise<{
  hasAccess?: boolean
  businessId?: string
  error?: string
}> {
  const supabase = await createServerClient()
  const user = await getAuthenticatedUser(supabase)

  if (!user) {
    return { hasAccess: false, error: 'Не авторизован' }
  }

  const currentBusiness = await getAccessibleCurrentBusinessContext(supabase, user.id)
  if (currentBusiness.error) {
    return { hasAccess: false, error: currentBusiness.error }
  }

  if (currentBusiness.data!.slug !== slug) {
    return { hasAccess: false, error: 'Текущий домен не соответствует бизнесу' }
  }

  return { hasAccess: true, businessId: currentBusiness.data!.businessId }
}

/**
 * Сохраняет URL изображения в бизнес и удаляет старый файл при замене.
 * Используется после клиентской загрузки файла в Supabase Storage.
 */
export async function saveImageUrl(
  imageUrl: string,
  type: 'logo' | 'cover',
  businessId: string,
  businessSlug?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createServerClient()
  const user = await getAuthenticatedUser(supabase)

  if (!user) {
    return { error: 'Не авторизован' }
  }

  // Проверяем доступ к бизнесу.
  if (!(await userHasAccessToBusinessId(supabase, user.id, businessId))) {
    return { error: 'Нет доступа к этому бизнесу' }
  }

  const hostScopeCheck = await assertBusinessMatchesCurrentHost(supabase, businessId)
  if (hostScopeCheck.error) {
    return { error: hostScopeCheck.error }
  }

  // Получаем старое изображение для удаления.
  const { data: businessData } = await supabase
    .from('business')
    .select('logo_url, cover_url, slug')
    .eq('id', businessId)
    .single()

  const oldImageUrl = type === 'logo' ? businessData?.logo_url : businessData?.cover_url

  // Удаляем старое изображение, если оно есть и отличается от нового.
  if (oldImageUrl) {
    const oldUrl = oldImageUrl as string
    if (oldUrl !== imageUrl) {
      // Извлекаем путь из старого URL.
      try {
        const url = new URL(oldUrl)
        const oldPath = url.pathname.split('/storage/v1/object/public/business/')[1]
        if (oldPath) {
          await supabase.storage.from('business').remove([oldPath])
        }
      } catch {
        // Если URL не распарсился, просто пропускаем удаление.
      }
    }
  }

  // Сохраняем URL в базу данных.
  const { error: updateError } = await supabase
    .from('business')
    .update({ [`${type}_url`]: imageUrl })
    .eq('id', businessId)

  if (updateError) {
    console.error('Ошибка сохранения URL в БД:', updateError)
    return { error: 'Ошибка сохранения URL изображения' }
  }

  // Обновляем кэш публичной страницы каталога.
  if (businessSlug || businessData?.slug) {
    revalidatePath(`/${businessSlug ?? businessData?.slug}`)
  }

  return { success: true }
}

/** Нормализует строку: trim и null для пустых значений. */
function normalizeString(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Сохраняет изменения бизнеса. */
export async function updateBusiness(formData: FormData) {
  const supabase = await createServerClient()
  const user = await getAuthenticatedUser(supabase)

  if (!user) {
    return { error: 'Не авторизован' }
  }

  const currentBusiness = await getAccessibleCurrentBusinessContext(supabase, user.id)
  if (currentBusiness.error) {
    return { error: currentBusiness.error }
  }
  const businessId = currentBusiness.data!.businessId

  const formBusinessId = normalizeString(formData.get('business_id') as string) || null
  if (formBusinessId && formBusinessId !== businessId) {
    return { error: 'Нельзя изменять бизнес вне текущего домена' }
  }

  const { name, payload } = buildBusinessUpdatePayload(formData)
  if (!name) {
    return { error: 'Название бизнеса обязательно' }
  }

  // Получаем slug бизнеса для revalidatePath.
  const { data: businessData } = await supabase
    .from('business')
    .select('slug')
    .eq('id', businessId)
    .single()

  // Обновляем бизнес.
  const { error } = await supabase
    .from('business')
    .update(payload)
    .eq('id', businessId)

  if (error) {
    console.error('Ошибка сохранения бизнеса:', error)
    return { error: 'Ошибка сохранения данных' }
  }

  // Обновляем кэш публичной страницы каталога.
  if (businessData?.slug) {
    revalidatePath(`/${businessData.slug}`)
  }

  return { success: true }
}

/**
 * Создаёт филиал или точку бизнеса.
 */
export async function createLocation(
  businessId: string,
  data: {
    title: string
    address?: string | null
    phone?: string | null
    whatsapp?: string | null
    telegram?: string | null
    orderPosition?: number
    isActive?: boolean
  }
) {
  const supabase = await createServerClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) return { error: 'Не авторизован' }
  if (!(await userHasAccessToBusinessId(supabase, user.id, businessId))) {
    return { error: 'Нет доступа к этому бизнесу' }
  }

  const hostScopeCheck = await assertBusinessMatchesCurrentHost(supabase, businessId)
  if (hostScopeCheck.error) {
    return { error: hostScopeCheck.error }
  }

  const title = (data.title ?? '').trim()
  if (!title) return { error: 'Название точки обязательно' }

  const { error } = await supabase.from('business_location').insert({
    business_id: businessId,
    title,
    address: data.address?.trim() || null,
    phone: data.phone?.trim() || null,
    whatsapp: data.whatsapp?.trim() || null,
    telegram: data.telegram?.trim() || null,
    order_position: data.orderPosition ?? 0,
    is_active: data.isActive !== false,
  })

  if (error) {
    console.error('createLocation:', error)
    return { error: 'Ошибка сохранения' }
  }
  await revalidateBusinessPath(supabase, businessId)
  return { success: true }
}

/**
 * Обновляет филиал или точку.
 */
export async function updateLocation(
  locationId: string,
  data: {
    title: string
    address?: string | null
    phone?: string | null
    whatsapp?: string | null
    telegram?: string | null
    orderPosition?: number
    isActive?: boolean
  }
) {
  const supabase = await createServerClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) return { error: 'Не авторизован' }

  const locationAccess = await getAccessibleEntityBusinessId(
    supabase,
    user.id,
    'business_location',
    locationId,
    'Точка не найдена',
    'Нет доступа'
  )
  if (locationAccess.error) return { error: locationAccess.error }
  const businessId = locationAccess.businessId!

  const hostScopeCheck = await assertBusinessMatchesCurrentHost(supabase, businessId)
  if (hostScopeCheck.error) {
    return { error: hostScopeCheck.error }
  }

  const title = (data.title ?? '').trim()
  if (!title) return { error: 'Название точки обязательно' }

  const updatePayload: Record<string, unknown> = {
    title,
    address: data.address?.trim() || null,
    phone: data.phone?.trim() || null,
    whatsapp: data.whatsapp?.trim() || null,
    telegram: data.telegram?.trim() || null,
    order_position: data.orderPosition ?? 0,
  }
  if (data.isActive !== undefined) {
    updatePayload.is_active = data.isActive
  }

  const { error } = await supabase
    .from('business_location')
    .update(updatePayload)
    .eq('id', locationId)

  if (error) {
    console.error('updateLocation:', error)
    return { error: 'Ошибка сохранения' }
  }
  await revalidateBusinessPath(supabase, businessId)
  return { success: true }
}

/**
 * Удаляет филиал или точку.
 */
export async function deleteLocation(locationId: string) {
  const supabase = await createServerClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) return { error: 'Не авторизован' }

  const locationAccess = await getAccessibleEntityBusinessId(
    supabase,
    user.id,
    'business_location',
    locationId,
    'Точка не найдена',
    'Нет доступа'
  )
  if (locationAccess.error) return { error: locationAccess.error }
  const businessId = locationAccess.businessId!

  const hostScopeCheck = await assertBusinessMatchesCurrentHost(supabase, businessId)
  if (hostScopeCheck.error) {
    return { error: hostScopeCheck.error }
  }

  const { error } = await supabase.from('business_location').delete().eq('id', locationId)
  if (error) {
    console.error('deleteLocation:', error)
    return { error: 'Ошибка удаления' }
  }
  await revalidateBusinessPath(supabase, businessId)
  return { success: true }
}



