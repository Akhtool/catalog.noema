"use client"

import { CartButton } from "@/components/cart/cart-button"

export function Header() {
  return (
    <header className="hidden md:block sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-end px-4">
        <CartButton />
      </div>
    </header>
  )
}
