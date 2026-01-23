"use client"

import { Button } from "@/components/ui/button"
import { Phone, MessageCircle } from "lucide-react"
import { Business } from "@/types"

interface ContactButtonProps {
  business: Business
}

export function ContactButton({ business }: ContactButtonProps) {
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
