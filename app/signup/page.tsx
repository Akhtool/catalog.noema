import { redirect } from 'next/navigation'

/**
 * Единая точка входа — онбординг (регистрация + создание бизнеса).
 * Редирект на /onboarding.
 */
export default function SignupPage() {
  redirect('/onboarding')
}
