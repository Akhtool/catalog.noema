'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { updateBusiness, saveImageUrl } from '@/app/admin/business/actions'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Business, BusinessLocation } from '@/types'
import { Camera, User, Settings, Image as ImageIcon, Frame, X, Phone, Loader2, MapPin, Plus, Pencil, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, Palette, Clock } from 'lucide-react'
import { createLocation, updateLocation, deleteLocation } from '@/app/admin/business/actions'
import { useSheetDrag } from '@/lib/useSheetDrag'
import { BusinessImageCropSheet } from './business-image-crop-sheet'
import { Badge } from '@/components/ui/badge'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const DEFAULT_BRAND_HEX = '#ffd600'
const DEFAULT_BRAND_HSL = '50.4 100% 50%'

type ThemeBrandForeground = 'black' | 'white'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function normalizeHex(hex: string) {
  const value = hex.trim().toLowerCase()
  if (!value.startsWith('#')) return null
  if (value.length !== 7) return null
  if (!/^#[0-9a-f]{6}$/.test(value)) return null
  return value
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToHex(rgb: { r: number; g: number; b: number }) {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

function rgbToHslTriple(rgb: { r: number; g: number; b: number }) {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6
        break
      case g:
        h = (b - r) / delta + 2
        break
      default:
        h = (r - g) / delta + 4
        break
    }
    h *= 60
    if (h < 0) h += 360
  }

  const hue = Math.round(h * 10) / 10
  const sat = Math.round(s * 1000) / 10
  const lig = Math.round(l * 1000) / 10
  return `${hue} ${sat}% ${lig}%`
}

function hslTripleToRgb(triple: string) {
  const parts = triple.trim().split(/\s+/)
  if (parts.length < 3) return null
  const h = Number(parts[0])
  const s = Number(parts[1].replace('%', ''))
  const l = Number(parts[2].replace('%', ''))
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null

  const hh = ((h % 360) + 360) % 360
  const ss = clamp(s / 100, 0, 1)
  const ll = clamp(l / 100, 0, 1)

  if (ss === 0) {
    const v = Math.round(ll * 255)
    return { r: v, g: v, b: v }
  }

  const c = (1 - Math.abs(2 * ll - 1)) * ss
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = ll - c / 2

  let rr = 0, gg = 0, bb = 0
  if (hh < 60) [rr, gg, bb] = [c, x, 0]
  else if (hh < 120) [rr, gg, bb] = [x, c, 0]
  else if (hh < 180) [rr, gg, bb] = [0, c, x]
  else if (hh < 240) [rr, gg, bb] = [0, x, c]
  else if (hh < 300) [rr, gg, bb] = [x, 0, c]
  else [rr, gg, bb] = [c, 0, x]

  return {
    r: Math.round((rr + m) * 255),
    g: Math.round((gg + m) * 255),
    b: Math.round((bb + m) * 255),
  }
}

function pickForeground(rgb: { r: number; g: number; b: number }): ThemeBrandForeground {
  // WCAG relative luminance (sRGB)
  const srgb = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
  const contrastWhite = (1.0 + 0.05) / (L + 0.05)
  const contrastBlack = (L + 0.05) / (0.0 + 0.05)
  return contrastBlack >= contrastWhite ? 'black' : 'white'
}

type ThemeScopeSnapshot = {
  brandYellow: string
  brandYellowForeground: string
  primary: string
  primaryForeground: string
  ring: string
}

/** Иконка WhatsApp (логотип бренда) */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

/** Иконка Telegram (логотип бренда) */
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

interface BusinessProfileEditorSheetProps {
  business: Business
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

import {
  validatePhone as validateContactPhone,
  validateTelegram as validateContactTelegram,
  validateWhatsapp as validateContactWhatsapp,
  getContactErrorMessage,
  normalizePhone as normalizeContactPhone,
  normalizeTelegram as normalizeContactTelegram,
  normalizeWhatsapp as normalizeContactWhatsapp,
} from '@/lib/contacts'

interface FormErrors {
  name?: string
  phone?: string
  whatsapp?: string
  whatsappDelivery?: string
  whatsappPickup?: string
  whatsappDineIn?: string
  telegram?: string
}

interface LocationFormErrors {
  phone?: string
  whatsapp?: string
  telegram?: string
}

/**
 * Слайдер редактирования профиля бизнеса
 * Открывается снизу страницы
 */
export function BusinessProfileEditorSheet({
  business,
  open,
  onOpenChange,
  onSuccess,
}: BusinessProfileEditorSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(business.logoUrl)
  const [coverUrl, setCoverUrl] = useState<string | null>(business.coverUrl)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropType, setCropType] = useState<'logo' | 'cover'>('logo')
  const [editingLocationId, setEditingLocationId] = useState<string | null | 'new'>(null)
  const [locationForm, setLocationForm] = useState({
    title: '',
    address: '',
    phone: '',
    whatsapp: '',
    telegram: '',
    orderPosition: 0,
    isActive: true,
  })
  const [locationMessage, setLocationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [locationSubmitting, setLocationSubmitting] = useState(false)
  const [locationToDeleteId, setLocationToDeleteId] = useState<string | null>(null)
  const [togglingLocationId, setTogglingLocationId] = useState<string | null>(null)
  /** Оптимистичное отображение видимости после переключения (пока не пришёл refresh) */
  const [locationVisibilityOverride, setLocationVisibilityOverride] = useState<Record<string, boolean>>({})
  /** Оптимистично удалённые id — скрываем из списка после успешного delete */
  const [deletedLocationIds, setDeletedLocationIds] = useState<string[]>([])
  /** id филиала, для которого идёт удаление — в карточке показываем loader */
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null)
  /** Идёт добавление филиала — показываем карточку с loader в конце списка */
  const [isAddingLocation, setIsAddingLocation] = useState(false)
  /** id раскрытой карточки филиала (подробные данные) */
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null)
  /** Ошибки валидации контактов в форме филиала */
  const [locationErrors, setLocationErrors] = useState<LocationFormErrors>({})
  const previousPickupPointsLengthRef = useRef((business.pickupPoints ?? []).length)
  const themeScopeSnapshotRef = useRef<ThemeScopeSnapshot | null>(null)
  const skipRestoreOnCloseRef = useRef(false)

  const initialBrandRgbFromBusiness =
    business.themeBrandHsl ? hslTripleToRgb(business.themeBrandHsl) : null
  const initialBrandHex = initialBrandRgbFromBusiness
    ? rgbToHex(initialBrandRgbFromBusiness)
    : DEFAULT_BRAND_HEX
  const [themeBrandHex, setThemeBrandHex] = useState<string>(initialBrandHex)
  const [themeBrandHsl, setThemeBrandHsl] = useState<string | null>(business.themeBrandHsl ?? null)
  const [themeBrandForeground, setThemeBrandForeground] = useState<ThemeBrandForeground | null>(
    business.themeBrandForeground ??
      (initialBrandRgbFromBusiness ? pickForeground(initialBrandRgbFromBusiness) : null)
  )

  function getThemeScopeEl(): HTMLElement | null {
    return document.documentElement
  }

  function snapshotThemeScope(el: HTMLElement): ThemeScopeSnapshot {
    return {
      brandYellow: el.style.getPropertyValue('--brand-yellow'),
      brandYellowForeground: el.style.getPropertyValue('--brand-yellow-foreground'),
      primary: el.style.getPropertyValue('--primary'),
      primaryForeground: el.style.getPropertyValue('--primary-foreground'),
      ring: el.style.getPropertyValue('--ring'),
    }
  }

  function restoreThemeScope(el: HTMLElement, snapshot: ThemeScopeSnapshot) {
    const restoreProp = (name: string, value: string) => {
      if (!value) el.style.removeProperty(name)
      else el.style.setProperty(name, value)
    }
    restoreProp('--brand-yellow', snapshot.brandYellow)
    restoreProp('--brand-yellow-foreground', snapshot.brandYellowForeground)
    restoreProp('--primary', snapshot.primary)
    restoreProp('--primary-foreground', snapshot.primaryForeground)
    restoreProp('--ring', snapshot.ring)
  }

  function applyThemePreview(el: HTMLElement, opts: { hsl: string; foreground: ThemeBrandForeground }) {
    el.style.setProperty('--brand-yellow', opts.hsl)
    el.style.setProperty('--primary', opts.hsl)
    el.style.setProperty('--ring', opts.hsl)
    el.style.setProperty('--brand-yellow-foreground', opts.foreground === 'black' ? '0 0% 0%' : '0 0% 100%')
    el.style.setProperty('--primary-foreground', opts.foreground === 'black' ? '0 0% 0%' : '0 0% 100%')
  }

  // Live preview: пока открыт шит, применяем выбранные значения к theme-scope контейнеру каталога.
  useEffect(() => {
    if (!open) return
    const el = getThemeScopeEl()
    if (!el) return
    if (!themeScopeSnapshotRef.current) themeScopeSnapshotRef.current = snapshotThemeScope(el)
    return () => {
      // cleanup выполняется и при закрытии
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = getThemeScopeEl()
    if (!el) return

    const rgb = hexToRgb(themeBrandHex)
    const fallbackFg: ThemeBrandForeground = rgb ? pickForeground(rgb) : 'black'
    const effectiveHsl = themeBrandHsl ?? DEFAULT_BRAND_HSL
    applyThemePreview(el, { hsl: effectiveHsl, foreground: themeBrandForeground ?? fallbackFg })
  }, [open, themeBrandHex, themeBrandHsl, themeBrandForeground])

  useEffect(() => {
    if (open) return
    const el = getThemeScopeEl()
    const snap = themeScopeSnapshotRef.current
    if (!el || !snap) return

    // Если закрываем после успешного сохранения, не откатываем: скоро будет router.refresh().
    if (skipRestoreOnCloseRef.current) {
      return
    }

    restoreThemeScope(el, snap)
    themeScopeSnapshotRef.current = null
  }, [open])

  // После router.refresh() проп business обновится — тогда можно безопасно убрать inline preview,
  // чтобы тема не "утекала" на другие страницы.
  useEffect(() => {
    if (open) return
    if (!skipRestoreOnCloseRef.current) return
    const el = getThemeScopeEl()
    const snap = themeScopeSnapshotRef.current
    if (!el || !snap) return

    restoreThemeScope(el, snap)
    themeScopeSnapshotRef.current = null
    skipRestoreOnCloseRef.current = false
  }, [open, business.themeBrandHsl, business.themeBrandForeground])

  useEffect(() => {
    return () => {
      const el = getThemeScopeEl()
      const snap = themeScopeSnapshotRef.current
      if (el && snap) restoreThemeScope(el, snap)
    }
  }, [])

  useEffect(() => {
    const currentLength = (business.pickupPoints ?? []).length
    if (isAddingLocation && currentLength > previousPickupPointsLengthRef.current) {
      setIsAddingLocation(false)
    }
    previousPickupPointsLengthRef.current = currentLength
  }, [business.pickupPoints, isAddingLocation])

  useEffect(() => {
    if (!business.pickupPoints?.length) return
    setLocationVisibilityOverride((prev) => {
      const next = { ...prev }
      business.pickupPoints?.forEach((p) => {
        if (prev[p.id] !== undefined && prev[p.id] === p.isActive) delete next[p.id]
      })
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
    setDeletedLocationIds((prev) => prev.filter((id) => business.pickupPoints?.some((p) => p.id === id)))
  }, [business.pickupPoints])

  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange,
  })

  /**
   * Валидация формы (контакты через lib/contacts)
   */
  function validateForm(formData: FormData): boolean {
    const newErrors: FormErrors = {}

    const name = formData.get('name') as string
    if (!name || name.trim() === '') {
      newErrors.name = 'Название бизнеса обязательно'
    }

    const phoneRes = validateContactPhone(formData.get('phone') as string)
    if (!phoneRes.isValid && phoneRes.errorCode) newErrors.phone = getContactErrorMessage(phoneRes.errorCode)

    const whatsappRes = validateContactWhatsapp(formData.get('whatsapp') as string)
    if (!whatsappRes.isValid && whatsappRes.errorCode) newErrors.whatsapp = getContactErrorMessage(whatsappRes.errorCode)
    const whatsappDeliveryRes = validateContactWhatsapp(formData.get('whatsapp_delivery') as string)
    if (!whatsappDeliveryRes.isValid && whatsappDeliveryRes.errorCode) newErrors.whatsappDelivery = getContactErrorMessage(whatsappDeliveryRes.errorCode)
    const whatsappPickupRes = validateContactWhatsapp(formData.get('whatsapp_pickup') as string)
    if (!whatsappPickupRes.isValid && whatsappPickupRes.errorCode) newErrors.whatsappPickup = getContactErrorMessage(whatsappPickupRes.errorCode)
    const whatsappDineInRes = validateContactWhatsapp(formData.get('whatsapp_dine_in') as string)
    if (!whatsappDineInRes.isValid && whatsappDineInRes.errorCode) newErrors.whatsappDineIn = getContactErrorMessage(whatsappDineInRes.errorCode)

    const telegramRes = validateContactTelegram(formData.get('telegram') as string)
    if (!telegramRes.isValid && telegramRes.errorCode) newErrors.telegram = getContactErrorMessage(telegramRes.errorCode)

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Открывает cropper для логотипа или обложки
   */
  function handleLogoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Файл должен быть изображением' })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: 'error', text: 'Размер файла не должен превышать 5MB' })
      return
    }
    setCropImageSrc(URL.createObjectURL(file))
    setCropType('logo')
    setCropOpen(true)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  function handleCoverFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Файл должен быть изображением' })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: 'error', text: 'Размер файла не должен превышать 5MB' })
      return
    }
    setCropImageSrc(URL.createObjectURL(file))
    setCropType('cover')
    setCropOpen(true)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  /**
   * Загружает обрезанное изображение (logo или cover)
   */
  async function handleCropComplete(croppedFile: File) {
    const type = cropType
    if (cropImageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropImageSrc)
    }
    setCropOpen(false)
    setCropImageSrc(null)

    if (type === 'logo') setIsUploadingLogo(true)
    else setIsUploadingCover(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Не авторизован' })
        return
      }

      const fileExt = croppedFile.name.split('.').pop() ?? 'jpg'
      const fileName = `${business.id}/${type}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('business')
        .upload(fileName, croppedFile, {
          contentType: croppedFile.type,
          upsert: true,
        })

      if (uploadError) {
        console.error('Ошибка загрузки изображения:', uploadError)
        setMessage({ type: 'error', text: 'Ошибка загрузки изображения' })
        return
      }

      const { data: urlData } = supabase.storage
        .from('business')
        .getPublicUrl(fileName)

      if (!urlData?.publicUrl) {
        setMessage({ type: 'error', text: 'Не удалось получить URL изображения' })
        return
      }

      const saveResult = await saveImageUrl(urlData.publicUrl, type, business.id, business.slug)
      if (saveResult.error) {
        setMessage({ type: 'error', text: saveResult.error })
        return
      }

      if (type === 'logo') setLogoUrl(urlData.publicUrl)
      else setCoverUrl(urlData.publicUrl)
      setMessage({ type: 'success', text: type === 'logo' ? 'Логотип загружен' : 'Обложка загружена' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error(`Ошибка загрузки ${type}:`, error)
      const text = `Ошибка загрузки ${type === 'logo' ? 'логотипа' : 'обложки'}`
      setMessage({ type: 'error', text })
      toast.error(text)
    } finally {
      if (type === 'logo') setIsUploadingLogo(false)
      else setIsUploadingCover(false)
    }
  }

  function handleCropClose(open: boolean) {
    if (!open && cropImageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropImageSrc)
    }
    setCropOpen(open)
    setCropImageSrc(null)
  }

  const pickupPoints = (business.pickupPoints ?? []).filter((loc) => !deletedLocationIds.includes(loc.id))

  function openAddLocation() {
    setEditingLocationId('new')
    setLocationForm({ title: '', address: '', phone: '', whatsapp: '', telegram: '', orderPosition: pickupPoints.length, isActive: true })
    setLocationMessage(null)
    setLocationErrors({})
  }

  function openEditLocation(loc: BusinessLocation, effectiveActive?: boolean) {
    setEditingLocationId(loc.id)
    setLocationForm({
      title: loc.title,
      address: loc.address ?? '',
      phone: loc.phone ?? '',
      whatsapp: loc.whatsapp ?? '',
      telegram: loc.telegram ?? '',
      orderPosition: loc.orderPosition,
      isActive: effectiveActive ?? locationVisibilityOverride[loc.id] ?? loc.isActive,
    })
    setLocationMessage(null)
    setLocationErrors({})
  }

  async function handleSaveLocation(e?: React.FormEvent) {
    e?.preventDefault()
    setLocationMessage(null)
    setLocationErrors({})
    if (!locationForm.title.trim()) {
      setLocationMessage({ type: 'error', text: 'Название обязательно' })
      return
    }
    const phoneRes = validateContactPhone(locationForm.phone)
    const whatsappRes = validateContactWhatsapp(locationForm.whatsapp)
    const telegramRes = validateContactTelegram(locationForm.telegram)
    const err: LocationFormErrors = {}
    if (!phoneRes.isValid && phoneRes.errorCode) err.phone = getContactErrorMessage(phoneRes.errorCode)
    if (!whatsappRes.isValid && whatsappRes.errorCode) err.whatsapp = getContactErrorMessage(whatsappRes.errorCode)
    if (!telegramRes.isValid && telegramRes.errorCode) err.telegram = getContactErrorMessage(telegramRes.errorCode)
    if (Object.keys(err).length > 0) {
      setLocationErrors(err)
      setLocationMessage({ type: 'error', text: 'Проверьте формат контактов' })
      return
    }
    const phoneNorm = normalizeContactPhone(locationForm.phone).normalized
    const whatsappNorm = normalizeContactWhatsapp(locationForm.whatsapp).normalized
    const telegramNorm = normalizeContactTelegram(locationForm.telegram).normalized
    setLocationSubmitting(true)
    try {
      if (editingLocationId === 'new') {
        setEditingLocationId(null)
        setIsAddingLocation(true)
        const result = await createLocation(business.id, {
          title: locationForm.title.trim(),
          address: locationForm.address.trim() || null,
          phone: phoneNorm || null,
          whatsapp: whatsappNorm || null,
          telegram: telegramNorm || null,
          orderPosition: locationForm.orderPosition,
          isActive: locationForm.isActive,
        })
        if ('error' in result) {
          const text = result.error ?? 'Ошибка'
          setLocationMessage({ type: 'error', text })
          toast.error(text)
          setIsAddingLocation(false)
          return
        }
        setLocationMessage({ type: 'success', text: 'Филиал добавлен' })
        toast.success('Филиал добавлен')
        onSuccess?.()
        setTimeout(() => setLocationMessage(null), 1500)
      } else if (editingLocationId) {
        const result = await updateLocation(editingLocationId, {
          title: locationForm.title.trim(),
          address: locationForm.address.trim() || null,
          phone: phoneNorm || null,
          whatsapp: whatsappNorm || null,
          telegram: telegramNorm || null,
          orderPosition: locationForm.orderPosition,
          isActive: locationForm.isActive,
        })
        if ('error' in result) {
          const text = result.error ?? 'Ошибка'
          setLocationMessage({ type: 'error', text })
          toast.error(text)
          return
        }
        setLocationMessage({ type: 'success', text: 'Филиал сохранён' })
        toast.success('Филиал сохранён')
      }
      if (editingLocationId !== 'new') {
        setEditingLocationId(null)
        setTimeout(() => {
          setLocationMessage(null)
          onSuccess?.()
        }, 1500)
      }
    } finally {
      setLocationSubmitting(false)
    }
  }

  async function handleToggleLocationVisibility(loc: BusinessLocation) {
    const nextActive = !loc.isActive
    setTogglingLocationId(loc.id)
    setLocationMessage(null)
    try {
      const result = await updateLocation(loc.id, {
        title: loc.title,
        address: loc.address ?? null,
        phone: loc.phone ?? null,
        whatsapp: loc.whatsapp ?? null,
        telegram: loc.telegram ?? null,
        orderPosition: loc.orderPosition,
        isActive: nextActive,
      })
      if ('error' in result) {
        const text = result.error ?? 'Ошибка'
        setLocationMessage({ type: 'error', text })
        toast.error(text)
        return
      }
      setLocationVisibilityOverride((prev) => ({ ...prev, [loc.id]: nextActive }))
      toast.success(nextActive ? 'Филиал отображается' : 'Филиал скрыт')
      onSuccess?.()
    } finally {
      setTogglingLocationId(null)
    }
  }

  async function handleConfirmDeleteLocation() {
    if (!locationToDeleteId) return
    const locId = locationToDeleteId
    setLocationToDeleteId(null)
    setDeletingLocationId(locId)
    setLocationMessage(null)
    try {
      const result = await deleteLocation(locId)
      if ('error' in result) {
        const text = result.error ?? 'Ошибка'
        setLocationMessage({ type: 'error', text })
        toast.error(text)
        setDeletingLocationId(null)
        return
      }
      setDeletedLocationIds((prev) => (prev.includes(locId) ? prev : [...prev, locId]))
      setEditingLocationId(null)
      toast.success('Филиал удалён')
      onSuccess?.()
    } finally {
      setDeletingLocationId(null)
    }
  }

  /**
   * Отправка формы
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    setErrors({})
    
    const formData = new FormData(e.currentTarget)
    
    formData.set('business_id', business.id)
    if (logoUrl) {
      formData.set('logo_url', logoUrl)
    }
    if (coverUrl) {
      formData.set('cover_url', coverUrl)
    }

    formData.set('theme_brand_hsl', themeBrandHsl ?? '')
    formData.set('theme_brand_foreground', themeBrandForeground ?? '')
    
    if (!validateForm(formData)) {
      setMessage({ type: 'error', text: 'Пожалуйста, исправьте ошибки в форме' })
      return
    }

    const phoneNorm = normalizeContactPhone(formData.get('phone') as string)
    const whatsappNorm = normalizeContactWhatsapp(formData.get('whatsapp') as string)
    const whatsappDeliveryNorm = normalizeContactWhatsapp(formData.get('whatsapp_delivery') as string)
    const whatsappPickupNorm = normalizeContactWhatsapp(formData.get('whatsapp_pickup') as string)
    const whatsappDineInNorm = normalizeContactWhatsapp(formData.get('whatsapp_dine_in') as string)
    const telegramNorm = normalizeContactTelegram(formData.get('telegram') as string)
    formData.set('phone', phoneNorm.normalized)
    formData.set('whatsapp', whatsappNorm.normalized)
    formData.set('whatsapp_delivery', whatsappDeliveryNorm.normalized)
    formData.set('whatsapp_pickup', whatsappPickupNorm.normalized)
    formData.set('whatsapp_dine_in', whatsappDineInNorm.normalized)
    formData.set('telegram', telegramNorm.normalized)

    setIsSubmitting(true)

    try {
      const result = await updateBusiness(formData)
      
      if ('error' in result) {
        const text = result.error ?? 'Неизвестная ошибка'
        setMessage({ type: 'error', text })
        toast.error(text)
      } else {
        setMessage({ type: 'success', text: 'Данные успешно сохранены' })
        // Не откатываем live-preview при закрытии — через router.refresh() тема станет "официальной".
        skipRestoreOnCloseRef.current = true
        setTimeout(() => {
          setMessage(null)
          onOpenChange(false)
          if (onSuccess) {
            onSuccess()
          }
        }, 1500)
      }
    } catch {
      const text = 'Произошла ошибка при сохранении. Попробуйте ещё раз.'
      setMessage({ type: 'error', text })
      toast.error(text)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="w-full max-h-[95vh] rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
        style={sheetStyle}
      >
        {/* Шапка: полоска свайпа и крестик в одной строке у верхнего края */}
        <header
          {...dragHandlers}
          className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-gray-100 cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-8 flex-shrink-0" aria-hidden />
          <div className="flex-1 flex items-center justify-center min-w-0 py-0.5">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0 touch-manipulation"
            aria-label="Закрыть редактор"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Заголовок — свайп вниз тоже закрывает */}
        <div
          {...dragHandlers}
          className="px-6 pt-4 pb-3 border-b cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <SheetTitle className="text-xl font-bold">Редактор профиля</SheetTitle>
          <SheetDescription className="text-sm text-gray-500 mt-2">
            Логотип и данные отображаются на странице каталога
          </SheetDescription>
        </div>

        {/* Форма: прокручиваемая область + панель сохранения у нижнего края */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4" style={scrollableStyle}>
            {message && (
              <div
                className={cn(
                  'mb-4 p-4 rounded-md border',
                  message.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                )}
              >
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            )}

            <div className="space-y-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="profile" className="flex-1 text-xs">
                Профиль
              </TabsTrigger>
              <TabsTrigger value="about" className="flex-1 text-xs">
                О себе
              </TabsTrigger>
              <TabsTrigger value="locations" className="flex-1 text-xs">
                Филиалы
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 text-xs">
                Настройки
              </TabsTrigger>
            </TabsList>

            {/* Обёртка с фиксированной мин. высотой — избегаем скачка высоты при смене вкладки */}
            <div className="min-h-[500px]">
            {/* Вкладка "Профиль" - только изображения */}
            <TabsContent value="profile" className="space-y-4">
              <div className="space-y-4 rounded-lg border p-4 bg-white">
                {/* Контейнер для обложки и логотипа */}
                <div className="relative w-full pb-12">
                  {/* Обложка */}
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                    {coverUrl ? (
                      <>
                        <Image
                          src={coverUrl}
                          alt="Обложка"
                          fill
                          className="object-cover"
                          sizes="100vw"
                          unoptimized
                        />
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-gray-400 hover:text-gray-600"
                      >
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="text-sm">Загрузить обложку</span>
                      </button>
                    )}
                  </div>
                  {/* Логотип - квадратный с закругленными углами, по центру внизу, вне контейнера обложки */}
                  {logoUrl && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-20">
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border-4 border-white shadow-lg">
                        <Image
                          src={logoUrl}
                          alt="Логотип"
                          fill
                          className="object-cover"
                          sizes="96px"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Кнопки изменения изображений */}
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left disabled:opacity-50"
                    disabled={isUploadingLogo}
                  >
                    <div className="flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      Изменить логотип
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left disabled:opacity-50"
                    disabled={isUploadingCover}
                  >
                    <div className="flex-shrink-0">
                      <Frame className="w-5 h-5 text-gray-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      Изменить фон
                    </span>
                  </button>
                </div>

                {/* Скрытые input для изображений */}
                <input
                  ref={logoInputRef}
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileSelect}
                  disabled={isUploadingLogo}
                  className="hidden"
                />
                <input
                  ref={coverInputRef}
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileSelect}
                  disabled={isUploadingCover}
                  className="hidden"
                />

              </div>
            </TabsContent>

            {/* Вкладка "О себе" - текстовая информация */}
            <TabsContent value="about" className="space-y-4">
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-4">
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
                className={cn(errors.name && 'border-red-500')}
                maxLength={35}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-red-600">
                О СЕБЕ / ОБЩАЯ ИНФОРМАЦИЯ*
              </label>
              <Textarea
                id="description"
                name="description"
                defaultValue={business.description || ''}
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
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={business.phone || ''}
                      placeholder="+7 (999) 123-45-67"
                      disabled={isSubmitting}
                      className={cn(errors.phone && 'border-red-500')}
                    />
                    {errors.phone ? (
                      <p className="text-sm text-red-600">{errors.phone}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Например: +7 999 123-45-67</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input
                      id="whatsapp"
                      name="whatsapp"
                      type="tel"
                      defaultValue={business.whatsapp || ''}
                      placeholder="+7 (999) 123-45-67 или wa.me/79991234567"
                      disabled={isSubmitting}
                      className={cn(errors.whatsapp && 'border-red-500')}
                    />
                    {errors.whatsapp ? (
                      <p className="text-sm text-red-600">{errors.whatsapp}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Основной номер, используется как запасной, если не указаны отдельные</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground -mt-1">Отдельные номера для способа получения (опционально):</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-20 flex-shrink-0">Доставка</span>
                    <div className="flex-1 space-y-1">
                      <Input
                        id="whatsapp_delivery"
                        name="whatsapp_delivery"
                        type="tel"
                        defaultValue={business.whatsappDelivery || ''}
                        placeholder="+7 (999) 123-45-67"
                        disabled={isSubmitting}
                        className={cn(errors.whatsappDelivery && 'border-red-500')}
                      />
                      {errors.whatsappDelivery && (
                        <p className="text-sm text-red-600">{errors.whatsappDelivery}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-20 flex-shrink-0">Самовывоз</span>
                    <div className="flex-1 space-y-1">
                      <Input
                        id="whatsapp_pickup"
                        name="whatsapp_pickup"
                        type="tel"
                        defaultValue={business.whatsappPickup || ''}
                        placeholder="+7 (999) 123-45-67"
                        disabled={isSubmitting}
                        className={cn(errors.whatsappPickup && 'border-red-500')}
                      />
                      {errors.whatsappPickup && (
                        <p className="text-sm text-red-600">{errors.whatsappPickup}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-20 flex-shrink-0">В зале</span>
                    <div className="flex-1 space-y-1">
                      <Input
                        id="whatsapp_dine_in"
                        name="whatsapp_dine_in"
                        type="tel"
                        defaultValue={business.whatsappDineIn || ''}
                        placeholder="+7 (999) 123-45-67"
                        disabled={isSubmitting}
                        className={cn(errors.whatsappDineIn && 'border-red-500')}
                      />
                      {errors.whatsappDineIn && (
                        <p className="text-sm text-red-600">{errors.whatsappDineIn}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <TelegramIcon className="w-4 h-4 text-[#0088cc]" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input
                      id="telegram"
                      name="telegram"
                      type="text"
                      defaultValue={business.telegram || ''}
                      placeholder="@username или t.me/username"
                      disabled={isSubmitting}
                      className={cn(errors.telegram && 'border-red-500')}
                    />
                    {errors.telegram ? (
                      <p className="text-sm text-red-600">{errors.telegram}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Например: @username (латиница, 5–32 символа)</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <label className="text-sm font-medium text-gray-700">ОТОБРАЖЕНИЕ НА СТРАНИЦЕ</label>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-gray-600"
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
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input
                      id="delivery_regions"
                      name="delivery_regions"
                      type="text"
                      defaultValue={business.deliveryRegions || ''}
                      placeholder="Регионы доставки"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">Например: Грозный, Аргун</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-gray-600"
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
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input
                      id="city_delivery"
                      name="city_delivery"
                      type="text"
                      defaultValue={business.cityDelivery || ''}
                      placeholder="Условия доставки"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">Например: По тарифу такси, От 500₽</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input
                      id="working_hours"
                      name="working_hours"
                      type="text"
                      defaultValue={business.workingHours || ''}
                      placeholder="Часы работы"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">Например: Пн-Вс: с 10:00 до 22:00</p>
                  </div>
                </div>
              </div>
            </div>
              </div>
            </TabsContent>

            {/* Вкладка "Филиалы" */}
            <TabsContent value="locations" className="space-y-4">
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-brand-yellow" />
                    <h3 className="text-lg font-semibold">Филиалы / точки</h3>
                  </div>
                  {editingLocationId === null && (
                    <Button type="button" size="sm" onClick={openAddLocation} className="bg-brand-yellow text-brand-yellow-foreground hover:bg-brand-yellow/90">
                      <Plus className="w-4 h-4 mr-1" />
                      Добавить
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Точки самовывоза и залы для способов «Самовывоз» и «В зале». Контакты точки подставляются в заказ, если указаны.
                </p>
                {locationMessage && (
                  <div
                    className={cn(
                      'p-3 rounded-md text-sm',
                      locationMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    )}
                  >
                    {locationMessage.text}
                  </div>
                )}
                {editingLocationId !== null && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                    <Input
                      placeholder="Название (например, ТЦ Афимолл)"
                      value={locationForm.title}
                      onChange={(e) => setLocationForm((f) => ({ ...f, title: e.target.value }))}
                      required
                      disabled={locationSubmitting}
                      className="bg-white"
                    />
                    <Input
                      placeholder="Адрес"
                      value={locationForm.address}
                      onChange={(e) => setLocationForm((f) => ({ ...f, address: e.target.value }))}
                      disabled={locationSubmitting}
                      className="bg-white"
                    />
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <Input
                          placeholder="Телефон, например +7 999 123-45-67"
                          value={locationForm.phone}
                          onChange={(e) => setLocationForm((f) => ({ ...f, phone: e.target.value }))}
                          disabled={locationSubmitting}
                          className={cn('bg-white', locationErrors.phone && 'border-red-500')}
                        />
                        {locationErrors.phone && (
                          <p className="text-sm text-red-600">{locationErrors.phone}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Input
                          placeholder="WhatsApp: wa.me/79991234567 или +7 999 123-45-67"
                          value={locationForm.whatsapp}
                          onChange={(e) => setLocationForm((f) => ({ ...f, whatsapp: e.target.value }))}
                          disabled={locationSubmitting}
                          className={cn('bg-white', locationErrors.whatsapp && 'border-red-500')}
                        />
                        {locationErrors.whatsapp && (
                          <p className="text-sm text-red-600">{locationErrors.whatsapp}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Input
                          placeholder="Telegram: @username или t.me/username"
                          value={locationForm.telegram}
                          onChange={(e) => setLocationForm((f) => ({ ...f, telegram: e.target.value }))}
                          disabled={locationSubmitting}
                          className={cn('bg-white', locationErrors.telegram && 'border-red-500')}
                        />
                        {locationErrors.telegram && (
                          <p className="text-sm text-red-600">{locationErrors.telegram}</p>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={locationForm.isActive}
                        onChange={(e) => setLocationForm((f) => ({ ...f, isActive: e.target.checked }))}
                        disabled={locationSubmitting}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">Показывать в выборе при оформлении заказа</span>
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => handleSaveLocation()}
                        disabled={locationSubmitting}
                        className="bg-brand-yellow text-brand-yellow-foreground hover:bg-brand-yellow/90"
                      >
                        {locationSubmitting ? 'Сохранение…' : editingLocationId === 'new' ? 'Добавить' : 'Сохранить'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingLocationId(null)}
                        disabled={locationSubmitting}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}
                <ul className="space-y-2">
                  {pickupPoints.map((loc) => {
                    const effectiveActive = locationVisibilityOverride[loc.id] ?? loc.isActive
                    const isDeleting = deletingLocationId === loc.id
                    return (
                    <li
                      key={loc.id}
                      className={cn(
                        'flex items-start justify-between gap-2 p-3 rounded-lg border bg-white min-h-[67px]',
                        !effectiveActive && !isDeleting && 'opacity-75'
                      )}
                    >
                      {isDeleting ? (
                        <div className="flex flex-1 items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{loc.title}</p>
                              {!effectiveActive && (
                                <Badge variant="secondary" className="text-xs">Скрыт</Badge>
                              )}
                            </div>
                            {loc.address && (
                              <p className="text-sm text-gray-600 mt-0.5">{loc.address}</p>
                            )}
                            {expandedLocationId === loc.id && (
                              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-sm">
                                {loc.phone && (
                                  <p className="text-gray-600">
                                    <span className="text-gray-400">Телефон:</span>{' '}
                                    <a href={`tel:${loc.phone}`} className="text-gray-800 underline">
                                      {loc.phone}
                                    </a>
                                  </p>
                                )}
                                {loc.whatsapp && (
                                  <p className="text-gray-600">
                                    <span className="text-gray-400">WhatsApp:</span>{' '}
                                    <a
                                      href={`https://wa.me/${loc.whatsapp.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-800 underline"
                                    >
                                      {loc.whatsapp}
                                    </a>
                                  </p>
                                )}
                                {loc.telegram && (
                                  <p className="text-gray-600">
                                    <span className="text-gray-400">Telegram:</span>{' '}
                                    <a
                                      href={`https://t.me/${loc.telegram.replace(/^@/, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-800 underline"
                                    >
                                      {loc.telegram}
                                    </a>
                                  </p>
                                )}
                                {!loc.phone && !loc.whatsapp && !loc.telegram && (
                                  <p className="text-gray-400 text-xs">Контакты не указаны</p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0 items-start">
                            <button
                              type="button"
                              onClick={() => setExpandedLocationId((id) => (id === loc.id ? null : loc.id))}
                              className="p-2 rounded-lg hover:bg-gray-100"
                              title={expandedLocationId === loc.id ? 'Свернуть' : 'Подробные данные'}
                              aria-label={expandedLocationId === loc.id ? 'Свернуть' : 'Подробные данные'}
                            >
                              {expandedLocationId === loc.id ? (
                                <ChevronUp className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLocationVisibility(loc)}
                              disabled={togglingLocationId !== null}
                              className="p-2 rounded-lg hover:bg-gray-100"
                              title={effectiveActive ? 'Скрыть (например, на ремонте)' : 'Показать'}
                              aria-label={effectiveActive ? 'Скрыть' : 'Показать'}
                            >
                              {togglingLocationId === loc.id ? (
                                <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                              ) : effectiveActive ? (
                                <EyeOff className="w-4 h-4 text-gray-600" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditLocation(loc, effectiveActive)}
                              disabled={editingLocationId !== null}
                              className="p-2 rounded-lg hover:bg-gray-100"
                              aria-label="Изменить"
                            >
                              <Pencil className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setLocationToDeleteId(loc.id)}
                              disabled={deletingLocationId !== null}
                              className={cn(
                                'p-2 rounded-lg transition-colors',
                                deletingLocationId !== null
                                  ? 'cursor-not-allowed bg-gray-100 opacity-50'
                                  : 'hover:bg-red-50'
                              )}
                              aria-label="Удалить"
                            >
                              <Trash2
                                className={cn(
                                  'w-4 h-4',
                                  deletingLocationId !== null ? 'text-gray-400' : 'text-red-600'
                                )}
                              />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ); })}
                  {isAddingLocation && (
                    <li className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-white min-h-[67px]">
                      <div className="flex flex-1 items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                      </div>
                    </li>
                  )}
                </ul>
                {pickupPoints.length === 0 && !isAddingLocation && editingLocationId === null && (
                  <p className="text-sm text-muted-foreground">Нет добавленных филиалов. Нажмите «Добавить» для первой точки.</p>
                )}
              </div>
            </TabsContent>

            {/* Вкладка "Настройки" */}
          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-brand-yellow" />
                <h3 className="text-lg font-semibold">Настройки</h3>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Акцентный цвет влияет на оформление публичной страницы каталога.
                </p>

                <div className="rounded-lg border bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Акцентный цвет</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
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
                    {[
                      '#ffd600',
                      '#f97316',
                      '#ef4444',
                      '#22c55e',
                      '#14b8a6',
                      '#3b82f6',
                      '#a855f7',
                      '#111827',
                    ].map((hex) => (
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
                          'h-8 w-8 rounded-full border shadow-sm transition-transform active:scale-95',
                          themeBrandHex.toLowerCase() === hex ? 'ring-2 ring-offset-2 ring-brand-yellow' : 'hover:scale-[1.02]'
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
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        aria-label="Выбрать цвет"
                      />
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full border shadow-sm transition-transform active:scale-95 hover:scale-[1.02] bg-white flex items-center justify-center"
                        aria-label="Выбрать цвет"
                        onClick={(e) => {
                          e.currentTarget.previousElementSibling?.click()
                        }}
                      >
                        <Palette className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-gray-700">Текущее значение:</span>{' '}
                      {themeBrandHsl ?? 'по умолчанию'}
                    </div>
                    <div
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer select-none whitespace-nowrap"
                      style={{
                        backgroundColor: themeBrandHex,
                        color:
                          (themeBrandForeground ??
                            (hexToRgb(themeBrandHex) ? pickForeground(hexToRgb(themeBrandHex)!) : 'black')) === 'black'
                            ? '#000000'
                            : '#ffffff',
                      }}
                    >
                      Пример кнопки
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
            </div>
        </Tabs>
            </div>
          </div>

          {/* Кнопка сохранения — прижата к нижнему краю шита */}
          <div className="flex-shrink-0 z-10 bg-background pt-4 pb-2 border-t px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.08)]">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full bg-brand-yellow hover:bg-brand-yellow/90 text-brand-yellow-foreground font-normal text-base py-6 rounded-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение…
                </>
              ) : (
                'Сохранить изменения'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
      <BusinessImageCropSheet
        open={cropOpen}
        onOpenChange={handleCropClose}
        type={cropType}
        imageSrc={cropImageSrc}
        onComplete={handleCropComplete}
      />

      <Dialog open={locationToDeleteId !== null} onOpenChange={(open) => !open && setLocationToDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить этот филиал?</DialogTitle>
            <DialogDescription>
              Точка будет удалена безвозвратно. Клиенты больше не смогут выбрать её при оформлении заказа.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocationToDeleteId(null)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDeleteLocation}
              disabled={locationSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {locationSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление…
                </>
              ) : (
                'Удалить'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
