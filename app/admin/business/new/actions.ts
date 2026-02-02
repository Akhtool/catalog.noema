'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase-server'
import { slugify } from '@/lib/slug'
import { ensureProfileAfterAuth } from '@/app/login/actions'

const MIN_SLUG_LENGTH = 3
const MAX_SLUG_LENGTH = 64
const OWNER_ROLE = 'owner' as const
const MAX_SLUG_ATTEMPTS = 10

type CreateBusinessResult =
  | { success: true; slug: string }
  | { error: string }

type AdminClient = ReturnType<typeof createAdminClient>

/** Обрезает пробелы и возвращает null для пустых строк. */
function normalizeString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Проверяет, занято ли значение slug в таблице business. */
async function isSlugTaken(admin: AdminClient, slug: string): Promise<boolean> {
  const { data, error } = await admin.from('business').select('id').eq('slug', slug).limit(1)
  if (error) {
    // Безопаснее считать slug занятым, чем создать дубль при проблемах с запросом
    return true
  }
  return Array.isArray(data) && data.length > 0
}

/** Генерирует уникальный slug на основе baseSlug, добавляя суффиксы при необходимости. */
async function generateUniqueSlug(admin: AdminClient, baseSlug: string): Promise<string | null> {
  if (!(await isSlugTaken(admin, baseSlug))) return baseSlug

  for (let i = 2; i <= MAX_SLUG_ATTEMPTS; i++) {
    const candidate = `${baseSlug}-${i}`
    if (!(await isSlugTaken(admin, candidate))) return candidate
  }

  return null
}

/**
 * Создаёт бизнес и привязывает текущего пользователя как owner.
 * Делает insert через service role, чтобы обойти RLS (см. migrations/v2_auth.sql).
 */
export async function createBusiness(formData: FormData): Promise<CreateBusinessResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Не авторизован' }

  // Гарантируем наличие профиля (нужен для FK business_user.user_id → profile.id)
  const profileResult = await ensureProfileAfterAuth()
  if ('error' in profileResult) return { error: profileResult.error ?? 'Ошибка создания профиля' }

  const name = normalizeString(formData.get('name'))
  if (!name) return { error: 'Название бизнеса обязательно' }

  const desiredSlug = normalizeString(formData.get('slug'))
  const baseSlug = slugify(desiredSlug ?? name)

  if (!baseSlug) return { error: 'Slug не может быть пустым' }
  if (baseSlug.length < MIN_SLUG_LENGTH) {
    return { error: `Slug слишком короткий (минимум ${MIN_SLUG_LENGTH} символа)` }
  }
  if (baseSlug.length > MAX_SLUG_LENGTH) {
    return { error: `Slug слишком длинный (максимум ${MAX_SLUG_LENGTH} символа)` }
  }

  const admin = createAdminClient()
  const uniqueSlug = await generateUniqueSlug(admin, baseSlug)
  if (!uniqueSlug) return { error: 'Не удалось подобрать уникальный slug. Попробуйте другой.' }

  const { data: business, error: businessError } = await admin
    .from('business')
    .insert({ name, slug: uniqueSlug })
    .select('id, slug')
    .single()

  if (businessError || !business) {
    console.error('Ошибка создания business:', businessError)
    return { error: 'Ошибка создания бизнеса' }
  }

  const { error: linkError } = await admin.from('business_user').insert({
    business_id: business.id,
    user_id: user.id,
    role: OWNER_ROLE,
  })

  if (linkError) {
    console.error('Ошибка привязки business_user:', linkError)
    return { error: 'Бизнес создан, но не удалось привязать пользователя. Обратитесь к администратору.' }
  }

  // Ревалидация публичной страницы каталога (роут /[slug] в dev/prod переписывается с поддомена).
  revalidatePath(`/${business.slug}`)

  return { success: true, slug: business.slug }
}

