import React from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { createServerClient } from '@/lib/supabase-server'
import { LogoutButton } from '@/components/admin/logout-button'
import { isRootDomainHost, normalizeHost } from '@/lib/host'

/**
 * Layout для admin-зоны с проверкой авторизации
 * Если пользователь не авторизован → редирект на /login
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const host = normalizeHost((await headers()).get('host'))
  if (!host || !isRootDomainHost(host)) {
    redirect('/')
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center px-4">
          <h1 className="text-lg font-semibold">Админ-панель</h1>
          <LogoutButton />
        </div>
      </header>
      <main className="container px-4 py-6">{children}</main>
    </div>
  )
}
