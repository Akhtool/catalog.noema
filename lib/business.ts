'use server'

import { revalidatePath } from 'next/cache'

import { ensureProfileAfterAuth } from '@/app/login/actions'
import { logServerError, trackServerEvent } from '@/lib/observability'
import { slugify } from '@/lib/slug'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@/lib/supabase-server'

const MIN_SLUG_LENGTH = 3
const MAX_SLUG_LENGTH = 64
const OWNER_ROLE = 'owner' as const
const MAX_SLUG_ATTEMPTS = 10

export type CreateBusinessResult =
  | { success: true; slug: string }
  | { error: string }

type AdminClient = ReturnType<typeof createAdminClient>

function normalizeString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function isSlugTaken(admin: AdminClient, slug: string): Promise<boolean> {
  const { data, error } = await admin.from('business').select('id').eq('slug', slug).limit(1)
  if (error) return true
  return Array.isArray(data) && data.length > 0
}

async function generateUniqueSlug(admin: AdminClient, baseSlug: string): Promise<string | null> {
  if (!(await isSlugTaken(admin, baseSlug))) return baseSlug

  for (let i = 2; i <= MAX_SLUG_ATTEMPTS; i++) {
    const candidate = `${baseSlug}-${i}`
    if (!(await isSlugTaken(admin, candidate))) return candidate
  }

  return null
}

/**
 * Creates a business and links the current user as owner.
 * Used by internal onboarding and by admin/business/new.
 */
export async function createBusiness(formData: FormData): Promise<CreateBusinessResult> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Не авторизован' }

  const profileResult = await ensureProfileAfterAuth()
  if ('error' in profileResult) {
    return { error: profileResult.error ?? 'Ошибка создания профиля' }
  }

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
  if (!uniqueSlug) {
    return { error: 'Не удалось подобрать уникальный slug. Попробуйте другой.' }
  }

  const { data: business, error: businessError } = await admin
    .from('business')
    .insert({ name, slug: uniqueSlug })
    .select('id, slug')
    .single()

  if (businessError || !business) {
    logServerError('business.create.insert', businessError, {
      name,
      slug: uniqueSlug,
      userId: user.id,
    })
    return { error: 'Ошибка создания бизнеса' }
  }

  const { error: linkError } = await admin.from('business_user').insert({
    business_id: business.id,
    user_id: user.id,
    role: OWNER_ROLE,
  })

  if (linkError) {
    logServerError('business.create.link-owner', linkError, {
      businessId: business.id,
      slug: business.slug,
      userId: user.id,
    })
    return {
      error:
        'Бизнес создан, но не удалось привязать пользователя. Обратитесь к администратору.',
    }
  }

  revalidatePath(`/${business.slug}`)
  trackServerEvent('business_created', {
    businessId: business.id,
    slug: business.slug,
    userId: user.id,
  })

  return { success: true, slug: business.slug }
}
