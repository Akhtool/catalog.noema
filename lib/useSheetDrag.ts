"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface UseSheetDragOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  closeThreshold?: number
}

/** Объект для spread на элемент-хедер sheet (ref + стили + опционально onMouseDown) */
export interface SheetDragHandlers {
  onPointerDownCapture: (e: React.PointerEvent) => void
  onPointerMoveCapture: (e: React.PointerEvent) => void
  onPointerUpCapture: (e: React.PointerEvent) => void
  onPointerCancelCapture: (e: React.PointerEvent) => void
  style: React.CSSProperties
}

interface UseSheetDragReturn {
  dragY: number
  isDragging: boolean
  dragHandlers: SheetDragHandlers
  sheetStyle: React.CSSProperties
  scrollableStyle: React.CSSProperties
}

/**
 * Хук для интерактивного перетаскивания Sheet компонентов.
 * Закрытие свайпом вниз по хедеру. На мобильных использует нативные touch-события
 * в фазе capture, чтобы срабатывать до скролла и Radix (iOS/Android).
 */
export function useSheetDrag({
  open,
  onOpenChange,
  closeThreshold = 150,
}: UseSheetDragOptions): UseSheetDragReturn {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const startYRef = useRef(0)
  const trackingRef = useRef(false)
  const dragYRef = useRef(0)
  const activePointerIdRef = useRef<number | null>(null)
  const closeThresholdRef = useRef(closeThreshold)
  const onOpenChangeRef = useRef(onOpenChange)
  closeThresholdRef.current = closeThreshold
  onOpenChangeRef.current = onOpenChange
  dragYRef.current = dragY

  useEffect(() => {
    if (open) {
      setDragY(0)
      setIsDragging(false)
      trackingRef.current = false
      activePointerIdRef.current = null
    }
  }, [open])

  const endDrag = useCallback(() => {
    if (!trackingRef.current) return
    trackingRef.current = false
    activePointerIdRef.current = null
    const currentY = dragYRef.current
    if (currentY >= closeThresholdRef.current) {
      onOpenChangeRef.current(false)
    } else {
      setDragY(0)
      dragYRef.current = 0
    }
    setIsDragging(false)
  }, [])

  const onPointerDownCapture = useCallback((e: React.PointerEvent) => {
    // Только primary pointer (один палец / основная кнопка мыши)
    if (!e.isPrimary) return
    // Не ломаем клики по кнопкам (крестик и т.п.)
    const target = e.target as HTMLElement
    if (target.closest?.("button")) return

    // На мобилках браузер может “забрать” жест под scroll / pull-to-refresh ещё до движения.
    // Поэтому предотвращаем дефолт уже на старте (вне кнопок).
    if (e.cancelable) e.preventDefault()
    e.stopPropagation()

    activePointerIdRef.current = e.pointerId
    startYRef.current = e.clientY
    trackingRef.current = true

    // Держим pointer внутри элемента даже если палец/курсор “уехал”
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [])

  const onPointerMoveCapture = useCallback((e: React.PointerEvent) => {
    if (!trackingRef.current) return
    if (activePointerIdRef.current !== e.pointerId) return
    const deltaY = e.clientY - startYRef.current
    if (deltaY > 0) {
      if (e.cancelable) e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
      setDragY(deltaY)
      dragYRef.current = deltaY
    }
  }, [])

  const onPointerUpCapture = useCallback((e: React.PointerEvent) => {
    if (activePointerIdRef.current !== e.pointerId) return
    endDrag()
  }, [endDrag])

  const onPointerCancelCapture = useCallback((e: React.PointerEvent) => {
    if (activePointerIdRef.current !== e.pointerId) return
    trackingRef.current = false
    activePointerIdRef.current = null
    setDragY(0)
    dragYRef.current = 0
    setIsDragging(false)
  }, [])

  const opacity = Math.max(0, 1 - dragY / closeThreshold)

  useEffect(() => {
    const overlay = document.querySelector(
      "[data-radix-dialog-overlay]"
    ) as HTMLElement
    if (overlay) {
      if (open) {
        overlay.style.opacity = opacity.toString()
      } else {
        overlay.style.opacity = ""
      }
    }
  }, [opacity, open])

  const sheetStyle: React.CSSProperties = {
    transform: `translateY(${dragY}px)`,
    transition: isDragging ? "none" : "transform 0.3s ease-out",
  }

  const scrollableStyle: React.CSSProperties = {
    overflow: isDragging ? "hidden" : "auto",
    touchAction: isDragging ? "none" : "auto",
  }

  const dragHandleStyle: React.CSSProperties = {
    touchAction: "none",
    overscrollBehavior: "contain",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    userSelect: "none",
  }

  return {
    dragY,
    isDragging,
    dragHandlers: {
      onPointerDownCapture,
      onPointerMoveCapture,
      onPointerUpCapture,
      onPointerCancelCapture,
      style: dragHandleStyle,
    },
    sheetStyle,
    scrollableStyle,
  }
}
