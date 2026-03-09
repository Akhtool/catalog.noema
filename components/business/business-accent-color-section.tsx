"use client"

import type { Dispatch, SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, Palette } from "lucide-react"
import {
  getDefaultBrandHex,
  hexToRgb,
  normalizeHex,
  pickForeground,
  rgbToHslTriple,
  type ThemeBrandForeground,
} from "./business-profile-editor-utils"

const DEFAULT_BRAND_HEX = getDefaultBrandHex()

type Props = {
  accentColorSectionOpen: boolean
  onToggleSection: () => void
  themeBrandHex: string
  themeBrandHsl: string | null
  themeBrandForeground: ThemeBrandForeground | null
  setThemeBrandHex: Dispatch<SetStateAction<string>>
  setThemeBrandHsl: Dispatch<SetStateAction<string | null>>
  setThemeBrandForeground: Dispatch<SetStateAction<ThemeBrandForeground | null>>
}

const PRESET_COLORS = [
  "#ffd600",
  "#f97316",
  "#ef4444",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#a855f7",
  "#111827",
] as const

export function BusinessAccentColorSection({
  accentColorSectionOpen,
  onToggleSection,
  themeBrandHex,
  themeBrandHsl,
  themeBrandForeground,
  setThemeBrandHex,
  setThemeBrandHsl,
  setThemeBrandForeground,
}: Props) {
  return (
    <div className="rounded-lg border p-4">
      <button
        type="button"
        onClick={onToggleSection}
        className="flex w-full items-center justify-between gap-2 rounded-md -m-1 p-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-expanded={accentColorSectionOpen}
      >
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-brand-yellow" />
          <h3 className="text-lg font-semibold">Акцентный цвет</h3>
        </div>
        {accentColorSectionOpen ? (
          <ChevronUp className="w-5 h-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {accentColorSectionOpen && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Акцентный цвет влияет на оформление публичной страницы каталога.
          </p>

          <div className="space-y-3 rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Акцентный цвет</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Кнопки, рамки и подсветки будут в этом цвете.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => {
                  setThemeBrandHex(DEFAULT_BRAND_HEX)
                  setThemeBrandHsl(null)
                  setThemeBrandForeground(null)
                }}
              >
                Сбросить
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => {
                    setThemeBrandHex(hex)
                    const rgb = hexToRgb(hex)
                    setThemeBrandHsl(rgb ? rgbToHslTriple(rgb) : null)
                    setThemeBrandForeground(rgb ? pickForeground(rgb) : null)
                  }}
                  className={cn(
                    "h-8 w-8 rounded-full border shadow-sm transition-transform active:scale-95",
                    themeBrandHex.toLowerCase() === hex
                      ? "ring-2 ring-offset-2 ring-brand-yellow"
                      : "hover:scale-[1.02]"
                  )}
                  style={{ backgroundColor: hex }}
                  aria-label={`Пресет ${hex}`}
                />
              ))}

              <div className="relative">
                <input
                  type="color"
                  value={themeBrandHex}
                  onChange={(e) => {
                    const nextHex = normalizeHex(e.target.value) ?? DEFAULT_BRAND_HEX
                    setThemeBrandHex(nextHex)
                    const rgb = hexToRgb(nextHex)
                    setThemeBrandHsl(rgb ? rgbToHslTriple(rgb) : null)
                    setThemeBrandForeground(rgb ? pickForeground(rgb) : null)
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Выбрать цвет"
                />
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
                  aria-label="Выбрать цвет"
                  onClick={(e) => {
                    ;(e.currentTarget.previousElementSibling as HTMLElement | null)?.click()
                  }}
                >
                  <Palette className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-gray-700">Текущее значение:</span>{" "}
                {themeBrandHsl ?? "по умолчанию"}
              </div>
              <div
                className="inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium shadow-md transition-all duration-200 hover:shadow-lg"
                style={{
                  backgroundColor: themeBrandHex,
                  color:
                    (themeBrandForeground ??
                      (hexToRgb(themeBrandHex)
                        ? pickForeground(hexToRgb(themeBrandHex)!)
                        : "black")) === "black"
                      ? "#000000"
                      : "#ffffff",
                }}
              >
                Пример кнопки
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
