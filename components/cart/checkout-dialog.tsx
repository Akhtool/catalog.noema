"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Business } from "@/types"
import { MessageCircle, Phone, Send } from "lucide-react"

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  business: Business
  onSelectContact: (type: "whatsapp" | "phone" | "telegram") => void
}

export function CheckoutDialog({
  open,
  onOpenChange,
  business,
  onSelectContact,
}: CheckoutDialogProps) {
  const availableContacts: Array<{
    type: "whatsapp" | "phone" | "telegram"
    label: string
    icon: React.ReactNode
    available: boolean
  }> = [
    {
      type: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle className="h-5 w-5" />,
      available: !!business.whatsapp,
    },
    {
      type: "telegram",
      label: "Telegram",
      icon: <Send className="h-5 w-5" />,
      available: !!business.telegram,
    },
    {
      type: "phone",
      label: "Телефон",
      icon: <Phone className="h-5 w-5" />,
      available: !!business.phone,
    },
  ]

  const availableOptions = availableContacts.filter((c) => c.available)

  if (availableOptions.length === 0) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Выберите способ связи</DialogTitle>
          <DialogDescription>
            Выберите, как вы хотите связаться с продавцом для оформления заказа
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {availableOptions.map((contact) => (
            <Button
              key={contact.type}
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => {
                onSelectContact(contact.type)
                onOpenChange(false)
              }}
            >
              <div className="flex items-center gap-3">
                {contact.icon}
                <span className="font-medium">{contact.label}</span>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
