"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

/** Хедер: название (ссылка на главную), на странице логина кнопка «Вход» скрыта. */
export function Header() {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link
          href="/"
          className="font-medium text-foreground transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label="На главную"
        >
          noema
        </Link>
        {!isLoginPage && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Вход</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
