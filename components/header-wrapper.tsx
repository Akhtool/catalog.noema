import { createServerClient } from "@/lib/supabase-server"
import { Header } from "@/components/header"

/**
 * Рендерит Header только для неавторизованных пользователей.
 * После входа хедер не показывается.
 */
export async function HeaderWrapper() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) return null

  return <Header />
}
