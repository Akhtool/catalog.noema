"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Phone, MessageCircle } from "lucide-react"
import { Business } from "@/types"

interface ContactButtonProps {
  business: Business
  variant?: "default" | "icon" | "wide"
}

const AUTO_COLLAPSE_TIMEOUT = 5000 // 5 секунд

export function ContactButton({ business, variant = "default" }: ContactButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleContact = () => {
    // Приоритет: WhatsApp > Telegram > Phone
    if (business.whatsapp) {
      const phone = business.whatsapp.replace(/\D/g, "") // Убираем все нецифровые символы
      window.open(`https://wa.me/${phone}`, "_blank")
    } else if (business.telegram) {
      window.open(`https://t.me/${business.telegram.replace(/^@/, "")}`, "_blank")
    } else if (business.phone) {
      window.open(`tel:${business.phone}`, "_self")
    }
  }

  // Очистка таймера
  const clearAutoCollapseTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Обработка сворачивания с анимацией
  const handleCollapse = useCallback(() => {
    setIsCollapsing(true)
    setTimeout(() => {
      setIsExpanded(false)
      setIsCollapsing(false)
    }, 300) // Длительность анимации
  }, [])

  // Установка таймера автоматического сворачивания
  const setAutoCollapseTimer = useCallback(() => {
    clearAutoCollapseTimer()
    timeoutRef.current = setTimeout(() => {
      handleCollapse()
      timeoutRef.current = null
    }, AUTO_COLLAPSE_TIMEOUT)
  }, [clearAutoCollapseTimer, handleCollapse])

  // Эффект для управления таймером
  useEffect(() => {
    if (isExpanded) {
      setAutoCollapseTimer()
    } else {
      clearAutoCollapseTimer()
    }

    return () => {
      clearAutoCollapseTimer()
    }
  }, [isExpanded, setAutoCollapseTimer, clearAutoCollapseTimer])

  const handleWrite = () => {
    clearAutoCollapseTimer()
    if (business.whatsapp) {
      const phone = business.whatsapp.replace(/\D/g, "")
      window.open(`https://wa.me/${phone}`, "_blank")
    } else if (business.telegram) {
      window.open(`https://t.me/${business.telegram.replace(/^@/, "")}`, "_blank")
    }
    handleCollapse()
  }

  const handleCall = () => {
    clearAutoCollapseTimer()
    if (business.phone) {
      window.open(`tel:${business.phone}`, "_self")
    }
    handleCollapse()
  }

  const hasContact = business.whatsapp || business.telegram || business.phone
  const hasWrite = business.whatsapp || business.telegram
  const hasCall = business.phone

  if (!hasContact) {
    return null
  }

  // Вариант иконки для баннера
  if (variant === "icon") {
    return (
      <button
        onClick={handleContact}
        className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-lg hover:scale-105 transition active:scale-95"
        aria-label="Связаться с нами"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    )
  }

  // Широкая кнопка с анимацией раскрытия
  if (variant === "wide") {
    return (
      <div className="relative w-full min-h-[48px]">
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all duration-300"
          >
            Связаться с нами
          </button>
        ) : (
          <div className={`flex ${hasWrite && hasCall ? 'gap-2' : ''}`}>
            {hasWrite && (
              <button
                onClick={handleWrite}
                className={`${hasWrite && hasCall ? 'flex-1' : 'w-full'} px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all duration-300 flex items-center justify-center gap-2 ${
                  isCollapsing 
                    ? `animate-out fade-out duration-300 ${hasCall ? 'slide-out-to-left-4' : 'slide-out-to-top-2'}` 
                    : `animate-in fade-in duration-300 ${hasCall ? 'slide-in-from-left-4' : 'slide-in-from-top-2'}`
                }`}
              >
                <MessageCircle className="h-5 w-5" />
                Написать
              </button>
            )}
            {hasCall && (
              <button
                onClick={handleCall}
                className={`${hasWrite && hasCall ? 'flex-1' : 'w-full'} px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 ${
                  isCollapsing 
                    ? `animate-out fade-out duration-300 ${hasWrite ? 'slide-out-to-right-4' : 'slide-out-to-top-2'}` 
                    : `animate-in fade-in duration-300 ${hasWrite ? 'slide-in-from-right-4' : 'slide-in-from-top-2'}`
                }`}
              >
                <Phone className="h-5 w-5" />
                Позвонить
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Дефолтный вариант
  return (
    <Button onClick={handleContact} size="lg" className="w-full sm:w-auto">
      {business.whatsapp ? (
        <>
          <MessageCircle className="mr-2 h-4 w-4" />
          Написать в WhatsApp
        </>
      ) : business.telegram ? (
        <>
          <MessageCircle className="mr-2 h-4 w-4" />
          Написать в Telegram
        </>
      ) : (
        <>
          <Phone className="mr-2 h-4 w-4" />
          Позвонить
        </>
      )}
    </Button>
  )
}
