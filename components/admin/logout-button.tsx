'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'

/**
 * Кнопка выхода из админ-панели
 */
export function LogoutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogout() {
    setIsLoading(true)
    
    try {
      // Очищаем сессию на клиенте
      await supabase.auth.signOut()
      
      // Очищаем localStorage (если есть)
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      // Вызываем server action для очистки cookies
      await logout()
      
      // Делаем редирект на страницу входа
      window.location.href = '/login'
    } catch (error) {
      console.error('Ошибка при выходе:', error)
      // Всё равно делаем редирект
      window.location.href = '/login'
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      disabled={isLoading}
      className="ml-auto"
    >
      {isLoading ? 'Выход...' : 'Выйти'}
    </Button>
  )
}
