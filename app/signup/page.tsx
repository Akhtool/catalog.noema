import { redirect } from 'next/navigation'

/**
 * Public self-service signup is disabled.
 * Root-domain /signup redirects to the landing page.
 */
export default function SignupPage() {
  redirect('/')
}
