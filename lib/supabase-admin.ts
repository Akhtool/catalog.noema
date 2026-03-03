import 'server-only'

import { createClient } from '@supabase/supabase-js'

/**
 * Создаёт admin Supabase клиент (service role) для операций,
 * которые должны обходить RLS (например, первичное создание Business + BusinessUser).
 *
 * ВАЖНО: Использовать только на сервере.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('Не задан SUPABASE_URL или NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!serviceRoleKey) {
    throw new Error('Не задан SUPABASE_SERVICE_ROLE_KEY (нужен для обхода RLS)')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

