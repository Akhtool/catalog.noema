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
 * Сохраняет изменения бизнеса
 */
export async function updateBusiness(formData: FormData) {
  const supabase = await createServerClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Не авторизован' }
  }

  // Проверяем доступ к бизнесу
  const { data: businessUsers, error: businessUserError } = await supabase
    .from('business_user')
    .select('business_id')
    .eq('user_id', user.id)
    .limit(1)

  if (businessUserError || !businessUsers || businessUsers.length === 0) {
    return { error: 'Бизнес не найден' }
  }

  const businessId = businessUsers[0].business_id

  // Подготавливаем данные для обновления
  const updateData: Record<string, string | null> = {
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    phone: formData.get('phone') as string || null,
    whatsapp: formData.get('whatsapp') as string || null,
    telegram: formData.get('telegram') as string || null,
    yandex_metrika: formData.get('yandex_metrika') as string || null,
  }

  // Обновляем бизнес
  const { error } = await supabase
    .from('business')
    .update(updateData)
    .eq('id', businessId)

  if (error) {
    return { error: 'Ошибка сохранения данных' }
  }

  revalidatePath('/admin/business')
  return { success: true }
}
