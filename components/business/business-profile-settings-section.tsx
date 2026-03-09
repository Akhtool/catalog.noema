"use client"

import type { Dispatch, SetStateAction } from "react"
import type { Business, BusinessLocation } from "@/types"
import { Settings } from "lucide-react"
import { BusinessAccentColorSection } from "./business-accent-color-section"
import { BusinessLocationsSection } from "./business-locations-section"
import { BusinessPromoSection } from "./business-promo-section"
import type { ThemeBrandForeground } from "./business-profile-editor-utils"

type LocationFormState = {
  title: string
  address: string
  phone: string
  whatsapp: string
  telegram: string
  orderPosition: number
  isActive: boolean
}

type LocationFormErrors = {
  phone?: string
  whatsapp?: string
  telegram?: string
}

type MessageState = {
  type: "success" | "error"
  text: string
} | null

type Props = {
  business: Business
  isSubmitting: boolean
  locationsSectionOpen: boolean
  setLocationsSectionOpen: Dispatch<SetStateAction<boolean>>
  editingLocationId: string | null | "new"
  openAddLocation: () => void
  locationMessage: MessageState
  locationForm: LocationFormState
  setLocationForm: Dispatch<SetStateAction<LocationFormState>>
  locationSubmitting: boolean
  locationErrors: LocationFormErrors
  handleSaveLocation: () => void
  setEditingLocationId: Dispatch<SetStateAction<string | null | "new">>
  pickupPoints: BusinessLocation[]
  isAddingLocation: boolean
  locationVisibilityOverride: Record<string, boolean>
  deletingLocationId: string | null
  expandedLocationId: string | null
  setExpandedLocationId: Dispatch<SetStateAction<string | null>>
  handleToggleLocationVisibility: (loc: BusinessLocation) => void
  togglingLocationId: string | null
  openEditLocation: (loc: BusinessLocation, effectiveActive?: boolean) => void
  setLocationToDeleteId: Dispatch<SetStateAction<string | null>>
  promoSectionOpen: boolean
  setPromoSectionOpen: Dispatch<SetStateAction<boolean>>
  accentColorSectionOpen: boolean
  setAccentColorSectionOpen: Dispatch<SetStateAction<boolean>>
  themeBrandHex: string
  themeBrandHsl: string | null
  themeBrandForeground: ThemeBrandForeground | null
  setThemeBrandHex: Dispatch<SetStateAction<string>>
  setThemeBrandHsl: Dispatch<SetStateAction<string | null>>
  setThemeBrandForeground: Dispatch<SetStateAction<ThemeBrandForeground | null>>
}

export function BusinessProfileSettingsSection({
  business,
  isSubmitting,
  locationsSectionOpen,
  setLocationsSectionOpen,
  editingLocationId,
  openAddLocation,
  locationMessage,
  locationForm,
  setLocationForm,
  locationSubmitting,
  locationErrors,
  handleSaveLocation,
  setEditingLocationId,
  pickupPoints,
  isAddingLocation,
  locationVisibilityOverride,
  deletingLocationId,
  expandedLocationId,
  setExpandedLocationId,
  handleToggleLocationVisibility,
  togglingLocationId,
  openEditLocation,
  setLocationToDeleteId,
  promoSectionOpen,
  setPromoSectionOpen,
  accentColorSectionOpen,
  setAccentColorSectionOpen,
  themeBrandHex,
  themeBrandHsl,
  themeBrandForeground,
  setThemeBrandHex,
  setThemeBrandHsl,
  setThemeBrandForeground,
}: Props) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-brand-yellow" />
        <h3 className="text-lg font-semibold">Настройки</h3>
      </div>

      <BusinessLocationsSection
        locationsSectionOpen={locationsSectionOpen}
        onToggleSection={() => setLocationsSectionOpen((v) => !v)}
        editingLocationId={editingLocationId}
        openAddLocation={openAddLocation}
        locationMessage={locationMessage}
        locationForm={locationForm}
        setLocationForm={setLocationForm}
        locationSubmitting={locationSubmitting}
        locationErrors={locationErrors}
        handleSaveLocation={handleSaveLocation}
        onCancelEdit={() => setEditingLocationId(null)}
        pickupPoints={pickupPoints}
        isAddingLocation={isAddingLocation}
        locationVisibilityOverride={locationVisibilityOverride}
        deletingLocationId={deletingLocationId}
        expandedLocationId={expandedLocationId}
        setExpandedLocationId={setExpandedLocationId}
        handleToggleLocationVisibility={handleToggleLocationVisibility}
        togglingLocationId={togglingLocationId}
        openEditLocation={openEditLocation}
        setLocationToDeleteId={setLocationToDeleteId}
      />

      <BusinessPromoSection
        business={business}
        isSubmitting={isSubmitting}
        promoSectionOpen={promoSectionOpen}
        onToggleSection={() => setPromoSectionOpen((v) => !v)}
      />

      <BusinessAccentColorSection
        accentColorSectionOpen={accentColorSectionOpen}
        onToggleSection={() => setAccentColorSectionOpen((v) => !v)}
        themeBrandHex={themeBrandHex}
        themeBrandHsl={themeBrandHsl}
        themeBrandForeground={themeBrandForeground}
        setThemeBrandHex={setThemeBrandHex}
        setThemeBrandHsl={setThemeBrandHsl}
        setThemeBrandForeground={setThemeBrandForeground}
      />
    </div>
  )
}
