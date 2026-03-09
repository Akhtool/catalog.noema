'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { updateBusiness } from '@/app/admin/business/actions'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Business, BusinessLocation } from '@/types'
import { X } from 'lucide-react'
import { useSheetDrag } from '@/lib/useSheetDrag'
import { BusinessLocationDeleteDialog } from './business-location-delete-dialog'
import { BusinessProfileAboutSection } from './business-profile-about-section'
import { BusinessImageCropSheet } from './business-image-crop-sheet'
import { BusinessProfileMediaSection } from './business-profile-media-section'
import { BusinessProfileSaveFooter } from './business-profile-save-footer'
import { BusinessProfileSettingsSection } from './business-profile-settings-section'
import { uploadBusinessProfileImage } from './business-profile-image-upload'
import {
  removeBusinessLocation,
  toggleBusinessLocationVisibility,
} from './business-location-ops'
import { saveBusinessLocation } from './business-location-save'
import {
  getBusinessImageMessages,
  getDefaultBrandHex,
  getDefaultBrandHsl,
  hexToRgb,
  hslTripleToRgb,
  normalizeBusinessContactFields,
  pickForeground,
  rgbToHex,
  selectBusinessImageFile,
  validateAndNormalizeLocationContacts,
  type ThemeBrandForeground,
  type ThemeScopeSnapshot,
} from './business-profile-editor-utils'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const DEFAULT_BRAND_HEX = getDefaultBrandHex()
const DEFAULT_BRAND_HSL = getDefaultBrandHsl()

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

/** Снапшот полей формы для сравнения состояния "ничего не изменено". */
type FormSnapshot = {
  name: string
  description: string
  phone: string
  whatsapp: string
  whatsapp_delivery: string
  whatsapp_pickup: string
  whatsapp_dine_in: string
  telegram: string
  logoUrl: string | null
  coverUrl: string | null
  themeBrandHsl: string | null
  themeBrandForeground: ThemeBrandForeground | null
}

/**
 * Слайдер редактирования профиля бизнеса.
 * Открывается снизу страницы.
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
  /** Оптимистичное отображение видимости до router.refresh(). */
  const [locationVisibilityOverride, setLocationVisibilityOverride] = useState<Record<string, boolean>>({})
  /** Оптимистично скрываем удалённые локации из списка. */
  const [deletedLocationIds, setDeletedLocationIds] = useState<string[]>([])
  /** Локация, для которой сейчас идёт удаление. */
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null)
  /** Показывает loader-карточку при добавлении локации. */
  const [isAddingLocation, setIsAddingLocation] = useState(false)
  /** Раскрытая карточка локации с подробностями. */
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null)
  /** Раскрыта ли секция локаций во вкладке настроек. */
  const [locationsSectionOpen, setLocationsSectionOpen] = useState(false)
  /** Раскрыта ли секция промокода во вкладке настроек. */
  const [promoSectionOpen, setPromoSectionOpen] = useState(false)
  /** Раскрыта ли секция акцентного цвета во вкладке настроек. */
  const [accentColorSectionOpen, setAccentColorSectionOpen] = useState(false)
  /** Ошибки валидации контактов для формы локации. */
  const [locationErrors, setLocationErrors] = useState<LocationFormErrors>({})
  const previousPickupPointsLengthRef = useRef((business.pickupPoints ?? []).length)
  const themeScopeSnapshotRef = useRef<ThemeScopeSnapshot | null>(null)
  const skipRestoreOnCloseRef = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const initialSnapshotRef = useRef<FormSnapshot | null>(null)
  const [isDirty, setIsDirty] = useState(false)

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

  const buildInitialSnapshot = useCallback((): FormSnapshot => {
    return {
      name: business.name,
      description: business.description ?? '',
      phone: business.phone ?? '',
      whatsapp: business.whatsapp ?? '',
      whatsapp_delivery: business.whatsappDelivery ?? '',
      whatsapp_pickup: business.whatsappPickup ?? '',
      whatsapp_dine_in: business.whatsappDineIn ?? '',
      telegram: business.telegram ?? '',
      logoUrl: business.logoUrl ?? null,
      coverUrl: business.coverUrl ?? null,
      themeBrandHsl: business.themeBrandHsl ?? null,
      themeBrandForeground:
        business.themeBrandForeground ??
        (initialBrandRgbFromBusiness ? pickForeground(initialBrandRgbFromBusiness) : null),
    }
  }, [business, initialBrandRgbFromBusiness])

  const checkDirty = useCallback(() => {
    const init = initialSnapshotRef.current
    if (!init) return
    const form = formRef.current
    if (!form) {
      setIsDirty(false)
      return
    }
    const fd = new FormData(form)
    const str = (v: FormDataEntryValue | null) => (v == null ? '' : String(v).trim())
    const current: FormSnapshot = {
      name: str(fd.get('name')),
      description: str(fd.get('description')),
      phone: str(fd.get('phone')),
      whatsapp: str(fd.get('whatsapp')),
      whatsapp_delivery: str(fd.get('whatsapp_delivery')),
      whatsapp_pickup: str(fd.get('whatsapp_pickup')),
      whatsapp_dine_in: str(fd.get('whatsapp_dine_in')),
      telegram: str(fd.get('telegram')),
      logoUrl,
      coverUrl,
      themeBrandHsl,
      themeBrandForeground,
    }
    const dirty =
      current.name !== init.name ||
      current.description !== init.description ||
      current.phone !== init.phone ||
      current.whatsapp !== init.whatsapp ||
      current.whatsapp_delivery !== init.whatsapp_delivery ||
      current.whatsapp_pickup !== init.whatsapp_pickup ||
      current.whatsapp_dine_in !== init.whatsapp_dine_in ||
      current.telegram !== init.telegram ||
      (current.logoUrl ?? '') !== (init.logoUrl ?? '') ||
      (current.coverUrl ?? '') !== (init.coverUrl ?? '') ||
      (current.themeBrandHsl ?? '') !== (init.themeBrandHsl ?? '') ||
      (current.themeBrandForeground ?? '') !== (init.themeBrandForeground ?? '')
    setIsDirty(dirty)
  }, [logoUrl, coverUrl, themeBrandHsl, themeBrandForeground])

  useEffect(() => {
    if (!open) {
      initialSnapshotRef.current = null
      return
    }
    initialSnapshotRef.current = buildInitialSnapshot()
    setIsDirty(false)
  }, [open, business.id, buildInitialSnapshot])

  useEffect(() => {
    if (!open) return
    checkDirty()
  }, [open, logoUrl, coverUrl, themeBrandHsl, themeBrandForeground, checkDirty])

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

  // После router.refresh() бизнес пропсы обновятся и live-preview можно безопасно убрать.
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

  /** Валидация формы и контактов через `lib/contacts`. */
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

  /** Открывает cropper для логотипа или обложки. */
  function handleLogoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const result = selectBusinessImageFile(e.target.files?.[0], MAX_FILE_SIZE)
    if (result.kind === 'empty') return
    if (result.kind === 'error') {
      setMessage({ type: 'error', text: result.message })
      return
    }
    setCropImageSrc(result.objectUrl)
    setCropType('logo')
    setCropOpen(true)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  function handleCoverFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const result = selectBusinessImageFile(e.target.files?.[0], MAX_FILE_SIZE)
    if (result.kind === 'empty') return
    if (result.kind === 'error') {
      setMessage({ type: 'error', text: result.message })
      return
    }
    setCropImageSrc(result.objectUrl)
    setCropType('cover')
    setCropOpen(true)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  /** Загружает обрезанное изображение в Storage и сохраняет URL. */
  async function handleCropComplete(croppedFile: File) {
    const type = cropType
    const imageMessages = getBusinessImageMessages(type)
    if (cropImageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropImageSrc)
    }
    setCropOpen(false)
    setCropImageSrc(null)

    if (type === 'logo') setIsUploadingLogo(true)
    else setIsUploadingCover(true)
    setMessage(null)

    try {
      const uploadResult = await uploadBusinessProfileImage({
        businessId: business.id,
        businessSlug: business.slug,
        croppedFile,
        type,
      })
      if (uploadResult.error) {
        setMessage({ type: 'error', text: uploadResult.error })
        return
      }
      const publicUrl = uploadResult.publicUrl!

      if (type === 'logo') setLogoUrl(publicUrl)
      else setCoverUrl(publicUrl)
      setMessage({ type: 'success', text: imageMessages.uploaded })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error(`Ошибка загрузки ${type}:`, error)
      const text = imageMessages.uploadThrowable
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
    const locationContacts = validateAndNormalizeLocationContacts({
      phone: locationForm.phone,
      whatsapp: locationForm.whatsapp,
      telegram: locationForm.telegram,
    })
    if (Object.keys(locationContacts.errors).length > 0) {
      setLocationErrors(locationContacts.errors)
      setLocationMessage({ type: 'error', text: 'Проверьте формат контактов' })
      return
    }
    const phoneNorm = locationContacts.normalized.phone
    const whatsappNorm = locationContacts.normalized.whatsapp
    const telegramNorm = locationContacts.normalized.telegram
    setLocationSubmitting(true)
    try {
      if (editingLocationId === 'new') {
        setEditingLocationId(null)
        setIsAddingLocation(true)
      }

      const saveResult = editingLocationId
        ? await saveBusinessLocation({
            businessId: business.id,
            editingLocationId,
            locationForm,
            normalizedContacts: {
              phone: phoneNorm,
              whatsapp: whatsappNorm,
              telegram: telegramNorm,
            },
          })
        : null

      if (!saveResult) {
        return
      }

      if (saveResult.status === 'error') {
        setLocationMessage({ type: 'error', text: saveResult.message })
        toast.error(saveResult.message)
        if (editingLocationId === 'new') {
          setIsAddingLocation(false)
        }
        return
      }

      if (editingLocationId === 'new') {
        setLocationMessage({ type: 'success', text: saveResult.message })
        toast.success(saveResult.message)
        onSuccess?.()
        setTimeout(() => setLocationMessage(null), 1500)
      } else {
        setLocationMessage({ type: 'success', text: saveResult.message })
        toast.success(saveResult.message)
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
    setTogglingLocationId(loc.id)
    setLocationMessage(null)
    try {
      const result = await toggleBusinessLocationVisibility(loc)
      if (result.status === 'error') {
        setLocationMessage({ type: 'error', text: result.message })
        toast.error(result.message)
        return
      }
      setLocationVisibilityOverride((prev) => ({ ...prev, [loc.id]: result.nextActive }))
      toast.success(result.message)
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
      const result = await removeBusinessLocation(locId)
      if (result.status === 'error') {
        setLocationMessage({ type: 'error', text: result.message })
        toast.error(result.message)
        setDeletingLocationId(null)
        return
      }
      setDeletedLocationIds((prev) => (prev.includes(locId) ? prev : [...prev, locId]))
      setEditingLocationId(null)
      toast.success(result.message)
      onSuccess?.()
    } finally {
      setDeletingLocationId(null)
    }
  }

  /** Отправка формы бизнеса. */
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

    normalizeBusinessContactFields(formData)

    setIsSubmitting(true)

    try {
      const result = await updateBusiness(formData)
      
      if ('error' in result) {
        const text = result.error ?? 'Неизвестная ошибка'
        setMessage({ type: 'error', text })
        toast.error(text)
      } else {
        setMessage({ type: 'success', text: 'Данные успешно сохранены' })
        // Не откатываем live-preview при закрытии: после refresh тема станет постоянной.
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
        {/* Шапка с ручкой свайпа и кнопкой закрытия. */}
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

        {/* Заголовок тоже поддерживает закрытие свайпом вниз. */}
        <div
          {...dragHandlers}
          className="px-6 pt-4 pb-3 border-b cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <SheetTitle className="text-xl font-bold">Редактор профиля</SheetTitle>
          <SheetDescription className="text-sm text-gray-500 mt-2">
            Логотип и данные отображаются на странице каталога
          </SheetDescription>
        </div>

        {/* Форма: прокручиваемая область и фиксированный footer снизу. */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          onInput={checkDirty}
          onChange={checkDirty}
          className="flex flex-1 flex-col min-h-0"
        >
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
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="profile" className="flex-1 text-xs">
                Профиль
              </TabsTrigger>
              <TabsTrigger value="about" className="flex-1 text-xs">
                О себе
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 text-xs">
                Настройки
              </TabsTrigger>
            </TabsList>

            {/* Фиксируем минимальную высоту, чтобы вкладки не дёргали layout. */}
            <div className="min-h-[500px]">
            {/* Вкладка "Профиль" с изображениями. */}
            <TabsContent value="profile" className="space-y-4">
              <BusinessProfileMediaSection
                logoUrl={logoUrl}
                coverUrl={coverUrl}
                logoInputRef={logoInputRef}
                coverInputRef={coverInputRef}
                isUploadingLogo={isUploadingLogo}
                isUploadingCover={isUploadingCover}
                handleLogoFileSelect={handleLogoFileSelect}
                handleCoverFileSelect={handleCoverFileSelect}
              />
            </TabsContent>

            {/* Вкладка "О себе" с текстовыми данными. */}
            <TabsContent value="about" className="space-y-4">
              <BusinessProfileAboutSection
                business={business}
                isSubmitting={isSubmitting}
                errors={errors}
              />
            </TabsContent>

            {/* Вкладка "Настройки". */}
          <TabsContent value="settings" className="space-y-4">
            <BusinessProfileSettingsSection
              business={business}
              isSubmitting={isSubmitting}
              locationsSectionOpen={locationsSectionOpen}
              setLocationsSectionOpen={setLocationsSectionOpen}
              editingLocationId={editingLocationId}
              openAddLocation={openAddLocation}
              locationMessage={locationMessage}
              locationForm={locationForm}
              setLocationForm={setLocationForm}
              locationSubmitting={locationSubmitting}
              locationErrors={locationErrors}
              handleSaveLocation={handleSaveLocation}
              setEditingLocationId={setEditingLocationId}
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
              promoSectionOpen={promoSectionOpen}
              setPromoSectionOpen={setPromoSectionOpen}
              accentColorSectionOpen={accentColorSectionOpen}
              setAccentColorSectionOpen={setAccentColorSectionOpen}
              themeBrandHex={themeBrandHex}
              themeBrandHsl={themeBrandHsl}
              themeBrandForeground={themeBrandForeground}
              setThemeBrandHex={setThemeBrandHex}
              setThemeBrandHsl={setThemeBrandHsl}
              setThemeBrandForeground={setThemeBrandForeground}
            />
          </TabsContent>
            </div>
        </Tabs>
            </div>
          </div>

          <BusinessProfileSaveFooter isSubmitting={isSubmitting} isDirty={isDirty} />
        </form>
      </SheetContent>
      <BusinessImageCropSheet
        open={cropOpen}
        onOpenChange={handleCropClose}
        type={cropType}
        imageSrc={cropImageSrc}
        onComplete={handleCropComplete}
      />

      <BusinessLocationDeleteDialog
        open={locationToDeleteId !== null}
        onOpenChange={(open) => !open && setLocationToDeleteId(null)}
        onCancel={() => setLocationToDeleteId(null)}
        onConfirm={handleConfirmDeleteLocation}
        submitting={locationSubmitting}
      />
    </Sheet>
  )
}
