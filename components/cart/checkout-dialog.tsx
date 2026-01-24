"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Business, DeliveryType } from "@/types"
import { Phone, ChevronRight, X, Truck, Store, UtensilsCrossed } from "lucide-react"
import { useCartStore } from "@/store/cart"

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
  const [step, setStep] = useState<"delivery" | "contact">("delivery")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const deliveryType = useCartStore((state) => state.deliveryType)
  const deliveryAddressStore = useCartStore((state) => state.deliveryAddress)
  const setDeliveryType = useCartStore((state) => state.setDeliveryType)
  const setDeliveryAddressStore = useCartStore((state) => state.setDeliveryAddress)

  const deliveryOptionsAll: Array<{
    type: DeliveryType
    label: string
    icon: React.ReactNode
  }> = [
    { type: "delivery", label: "Доставка", icon: <Truck className="h-6 w-6" /> },
    { type: "pickup", label: "Самовывоз", icon: <Store className="h-6 w-6" /> },
    { type: "dine-in", label: "В зале", icon: <UtensilsCrossed className="h-6 w-6" /> },
  ]

  const deliveryOptionsFiltered = deliveryOptionsAll.filter((o) =>
    business.deliveryTypes.includes(o.type)
  )

  useEffect(() => {
    if (!open) return
    if (deliveryAddressStore) setDeliveryAddress(deliveryAddressStore)
    const allowed = business.deliveryTypes
    const currentInvalid = deliveryType && !allowed.includes(deliveryType)
    if (currentInvalid) {
      setDeliveryType(null)
      setDeliveryAddressStore(null)
      setDeliveryAddress("")
      setStep("delivery")
      return
    }
    if (deliveryType && deliveryType !== "delivery") {
      setStep("contact")
    } else if (deliveryType === "delivery" && deliveryAddressStore) {
      setStep("contact")
    } else {
      setStep("delivery")
    }
  }, [open, deliveryType, deliveryAddressStore, business.deliveryTypes, setDeliveryType, setDeliveryAddressStore])

  const availableContacts: Array<{
    type: "whatsapp" | "phone" | "telegram"
    label: string
    icon: React.ReactNode
    available: boolean
  }> = [
    {
      type: "whatsapp",
      label: "WhatsApp",
      icon: (
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="#25D366"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      ),
      available: !!business.whatsapp,
    },
    {
      type: "telegram",
      label: "Telegram",
      icon: (
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="#0088CC"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.169 1.858-.896 6.375-1.268 8.453-.164.936-.488 1.25-.8 1.282-.68.062-1.194-.45-1.852-.882-1.029-.693-1.61-1.124-2.608-1.8-1.215-.81-.428-1.257.265-1.986.182-.188 3.308-3.03 3.37-3.289.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.062 3.345-.479.27-.913.402-1.302.395-.428-.008-1.252-.242-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.118.095.151.223.167.313.017.09.037.297.021.46z" />
        </svg>
      ),
      available: !!business.telegram,
    },
    {
      type: "phone",
      label: "Телефон",
      icon: <Phone className="h-6 w-6" />,
      available: !!business.phone,
    },
  ]

  const availableOptions = availableContacts.filter((c) => c.available)

  if (availableOptions.length === 0) {
    return null
  }

  const handleDeliveryTypeSelect = (type: DeliveryType) => {
    setDeliveryType(type)
    if (type === "delivery") {
      // Остаемся на этом шаге для ввода адреса
    } else {
      // Переходим к выбору способа связи
      setStep("contact")
    }
  }

  const handleAddressContinue = () => {
    if (deliveryAddress.trim()) {
      setDeliveryAddressStore(deliveryAddress.trim())
      setStep("contact")
    }
  }

  const handleBack = () => {
    if (step === "contact") {
      setStep("delivery")
    } else {
      onOpenChange(false)
    }
  }

  const handleContactSelect = (type: "whatsapp" | "phone" | "telegram") => {
    // Сохраняем адрес, если выбран способ доставки
    if (deliveryType === "delivery" && deliveryAddress.trim()) {
      setDeliveryAddressStore(deliveryAddress.trim())
    }
    onSelectContact(type)
    onOpenChange(false)
  }

  // Сбрасываем состояние при закрытии
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep("delivery")
      setDeliveryAddress("")
    }
    onOpenChange(open)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="w-full rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
        showCloseButton={false}
      >
        {/* Заголовок с кнопкой закрытия */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between mb-2">
            <SheetTitle className="text-xl font-bold">
              {step === "delivery" ? "Способ получения заказа" : "Выберите способ связи"}
            </SheetTitle>
            <button
              onClick={handleBack}
              className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label={step === "delivery" ? "Закрыть" : "Назад"}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SheetDescription className="text-sm text-gray-600 mt-2">
            {step === "delivery"
              ? "Выберите, как вы хотите получить заказ"
              : "Выберите, как вы хотите связаться с продавцом для оформления заказа"}
          </SheetDescription>
        </div>

        {/* Контент в зависимости от шага */}
        <div className="px-6 pb-6 space-y-4">
          {step === "delivery" ? (
            <>
              {/* Выбор способа получения */}
              <div className="space-y-2">
                {deliveryOptionsFiltered.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => handleDeliveryTypeSelect(option.type)}
                    className={`w-full flex items-center justify-between p-4 bg-white border-2 rounded-xl transition-colors text-left ${
                      deliveryType === option.type
                        ? "border-brand-yellow bg-brand-yellow/5"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 text-gray-700">
                        {option.icon}
                      </div>
                      <span className="font-medium text-base">{option.label}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>

              {/* Поле для адреса доставки */}
              {deliveryType === "delivery" && (
                <div className="space-y-2">
                  <label
                    htmlFor="delivery-address"
                    className="text-sm font-medium block"
                  >
                    Адрес доставки
                  </label>
                  <Input
                    id="delivery-address"
                    placeholder="Введите адрес доставки..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="bg-gray-50 border-gray-200 rounded-lg text-[16px]"
                  />
                  <Button
                    onClick={handleAddressContinue}
                    disabled={!deliveryAddress.trim()}
                    className="w-full bg-brand-yellow hover:bg-brand-yellow/90 text-black font-bold"
                  >
                    Продолжить
                  </Button>
                </div>
              )}

              {/* Кнопка продолжения для самовывоза и в зале */}
              {deliveryType && deliveryType !== "delivery" && (
                <Button
                  onClick={() => setStep("contact")}
                  className="w-full bg-brand-yellow hover:bg-brand-yellow/90 text-black font-bold"
                >
                  Продолжить
                </Button>
              )}
            </>
          ) : (
            /* Выбор способа связи */
            <div className="space-y-2">
              {availableOptions.map((contact) => (
                <button
                  key={contact.type}
                  onClick={() => handleContactSelect(contact.type)}
                  className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {contact.icon}
                    </div>
                    <span className="font-medium text-base">{contact.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
