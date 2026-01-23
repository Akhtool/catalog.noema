"use client"

import { Button } from "@/components/ui/button"
import { Phone, MessageCircle } from "lucide-react"
import { Business } from "@/types"

interface ContactButtonProps {
  business: Business
  variant?: "default" | "icon" | "wide"
}

export function ContactButton({ business, variant = "default" }: ContactButtonProps) {
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

  const hasContact = business.whatsapp || business.telegram || business.phone

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

  // Широкая кнопка
  if (variant === "wide") {
    return (
      <button
        onClick={handleContact}
        className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-colors"
      >
        Связаться с нами
      </button>
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
