"use client"

import { useState, useEffect } from "react"
import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Кнопка для прокрутки страницы вверх
 * Появляется когда пользователь прокрутил страницу вниз
 */
export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  // Отслеживаем позицию скролла
  useEffect(() => {
    const toggleVisibility = () => {
      // Показываем кнопку если прокрутили больше 300px
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener("scroll", toggleVisibility)

    return () => {
      window.removeEventListener("scroll", toggleVisibility)
    }
  }, [])

  // Прокручиваем страницу вверх
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 rounded-full shadow-lg transition-all duration-300 bg-brand-yellow hover:bg-brand-yellow/90 text-black",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
      aria-label="Прокрутить вверх"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  )
}
