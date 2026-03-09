"use client"

import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Business } from "@/types"
import { Clock, Phone, User } from "lucide-react"
import {
  TelegramIcon,
  WhatsAppIcon,
} from "./business-profile-editor-utils"

type FormErrors = {
  name?: string
  phone?: string
  whatsapp?: string
  whatsappDelivery?: string
  whatsappPickup?: string
  whatsappDineIn?: string
  telegram?: string
}

type Props = {
  business: Business
  isSubmitting: boolean
  errors: FormErrors
}

export function BusinessProfileAboutSection({
  business,
  isSubmitting,
  errors,
}: Props) {
  return (
    <TabsContentWrapper>
      <div className="mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-brand-yellow" />
        <h3 className="text-lg font-semibold">О себе</h3>
      </div>

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-red-600">
          ИМЯ*
        </label>
        <Input
          id="name"
          name="name"
          defaultValue={business.name}
          required
          disabled={isSubmitting}
          className={cn(errors.name && "border-red-500")}
          maxLength={35}
        />
        {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium text-red-600">
          О СЕБЕ / ОБЩАЯ ИНФОРМАЦИЯ*
        </label>
        <Textarea
          id="description"
          name="description"
          defaultValue={business.description || ""}
          rows={4}
          disabled={isSubmitting}
          placeholder="Краткое и подробное описание бизнеса"
          maxLength={500}
        />
      </div>

      <div className="space-y-4">
        <label className="text-sm font-medium text-red-600">КОНТАКТЫ*</label>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
              <Phone className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 space-y-1">
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={business.phone || ""}
                placeholder="+7 (999) 123-45-67"
                disabled={isSubmitting}
                className={cn(errors.phone && "border-red-500")}
              />
              {errors.phone ? (
                <p className="text-sm text-red-600">{errors.phone}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Например: +7 999 123-45-67</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
              <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
            </div>
            <div className="flex-1 space-y-1">
              <Input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                defaultValue={business.whatsapp || ""}
                placeholder="+7 (999) 123-45-67 или wa.me/79991234567"
                disabled={isSubmitting}
                className={cn(errors.whatsapp && "border-red-500")}
              />
              {errors.whatsapp ? (
                <p className="text-sm text-red-600">{errors.whatsapp}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Основной номер, используется как запасной, если не указаны отдельные
                </p>
              )}
            </div>
          </div>

          <p className="-mt-1 text-xs text-muted-foreground">
            Отдельные номера для способа получения (опционально):
          </p>

          <div className="space-y-2">
            <DeliveryContactRow
              label="Доставка"
              id="whatsapp_delivery"
              name="whatsapp_delivery"
              defaultValue={business.whatsappDelivery || ""}
              isSubmitting={isSubmitting}
              error={errors.whatsappDelivery}
            />
            <DeliveryContactRow
              label="Самовывоз"
              id="whatsapp_pickup"
              name="whatsapp_pickup"
              defaultValue={business.whatsappPickup || ""}
              isSubmitting={isSubmitting}
              error={errors.whatsappPickup}
            />
            <DeliveryContactRow
              label="В зале"
              id="whatsapp_dine_in"
              name="whatsapp_dine_in"
              defaultValue={business.whatsappDineIn || ""}
              isSubmitting={isSubmitting}
              error={errors.whatsappDineIn}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
              <TelegramIcon className="h-4 w-4 text-[#0088cc]" />
            </div>
            <div className="flex-1 space-y-1">
              <Input
                id="telegram"
                name="telegram"
                type="text"
                defaultValue={business.telegram || ""}
                placeholder="@username или t.me/username"
                disabled={isSubmitting}
                className={cn(errors.telegram && "border-red-500")}
              />
              {errors.telegram ? (
                <p className="text-sm text-red-600">{errors.telegram}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Например: @username (латиница, 5-32 символа)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <label className="text-sm font-medium text-gray-700">
          ОТОБРАЖЕНИЕ НА СТРАНИЦЕ
        </label>

        <div className="space-y-2">
          <InfoRow
            id="delivery_regions"
            name="delivery_regions"
            defaultValue={business.deliveryRegions || ""}
            placeholder="Регионы доставки"
            hint="Например: Грозный, Аргун"
            disabled={isSubmitting}
            icon={
              <svg
                className="h-4 w-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />

          <InfoRow
            id="city_delivery"
            name="city_delivery"
            defaultValue={business.cityDelivery || ""}
            placeholder="Условия доставки"
            hint="Например: По тарифу такси, От 500₽"
            disabled={isSubmitting}
            icon={
              <svg
                className="h-4 w-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            }
          />

          <InfoRow
            id="working_hours"
            name="working_hours"
            defaultValue={business.workingHours || ""}
            placeholder="Часы работы"
            hint="Например: Пн-Вс: с 10:00 до 22:00"
            disabled={isSubmitting}
            icon={<Clock className="h-4 w-4 text-gray-600" />}
          />
        </div>
      </div>
    </TabsContentWrapper>
  )
}

function TabsContentWrapper({ children }: { children: ReactNode }) {
  return <div className="space-y-4 rounded-lg border p-4">{children}</div>
}

function DeliveryContactRow({
  label,
  id,
  name,
  defaultValue,
  isSubmitting,
  error,
}: {
  label: string
  id: string
  name: string
  defaultValue: string
  isSubmitting: boolean
  error?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 flex-shrink-0 text-xs">{label}</span>
      <div className="flex-1 space-y-1">
        <Input
          id={id}
          name={name}
          type="tel"
          defaultValue={defaultValue}
          placeholder="+7 (999) 123-45-67"
          disabled={isSubmitting}
          className={cn(error && "border-red-500")}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}

function InfoRow({
  id,
  name,
  defaultValue,
  placeholder,
  hint,
  disabled,
  icon,
}: {
  id: string
  name: string
  defaultValue: string
  placeholder: string
  hint: string
  disabled: boolean
  icon: ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
        {icon}
      </div>
      <div className="flex-1 space-y-1">
        <Input
          id={id}
          name={name}
          type="text"
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}
