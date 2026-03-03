import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getBusinessSlugForUser } from '@/lib/auth-redirect'
import { buildBusinessCatalogUrl } from '@/lib/host'
import { OnboardingForm } from './onboarding-form'

const ONBOARDING_ACCESS_KEY = process.env.ONBOARDING_ACCESS_KEY?.trim()

/**
 * Внутренняя страница команды: регистрация владельца и создание бизнеса.
 * Не ссылается с /login. Опционально защищается ONBOARDING_ACCESS_KEY (?key=...).
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (ONBOARDING_ACCESS_KEY) {
    const params = await searchParams
    const key = typeof params?.key === 'string' ? params.key : undefined
    if (key !== ONBOARDING_ACCESS_KEY) {
      redirect('/login')
    }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const slug = await getBusinessSlugForUser(supabase, user.id)
    if (slug) {
      redirect(buildBusinessCatalogUrl(slug))
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#222]">Подключение нового бизнеса</h1>
            <p className="text-[#666] mt-2">Данные бизнеса для витрины. После создания отправьте клиенту ссылку на вход и учётные данные.</p>
          </div>
          <OnboardingForm initialMode="business" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#222]">Подключение нового бизнеса</h1>
          <p className="text-[#666] mt-2">Шаг 1: создайте учётную запись владельца (логин и пароль потом передайте клиенту)</p>
        </div>
        <OnboardingForm initialMode="signup" />
      </div>
    </div>
  )
}
