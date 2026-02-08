"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSwipeable } from "react-swipeable"

interface UseSheetDragOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  closeThreshold?: number
}

/** Объект для spread на элемент-хедер sheet (ref + стили + опционально onMouseDown) */
export interface SheetDragHandlers {
  ref: (el: HTMLElement | null) => void
  onMouseDown?: (e: React.MouseEvent) => void
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
    }
  }, [open])

  // Мышь — через react-swipeable (десктоп)
  const swipeable = useSwipeable({
    onSwiping: (eventData) => {
      if (eventData.deltaY > 0) {
        setIsDragging(true)
        setDragY(eventData.deltaY)
      }
    },
    onSwipedDown: (eventData) => {
      if (eventData.deltaY >= closeThreshold) {
        onOpenChange(false)
      } else {
        setDragY(0)
      }
      setIsDragging(false)
    },
    onTouchEndOrOnMouseUp: () => {
      if (dragYRef.current < closeThreshold) {
        setDragY(0)
      }
      setIsDragging(false)
    },
    trackMouse: true,
    trackTouch: false, // touch делаем сами с capture
    preventScrollOnSwipe: true,
  })

  // Touch — свои слушатели в capture, чтобы перехватить до скролла на iOS/Android
  const attachTouch = useCallback((el: HTMLElement | null) => {
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return
      if ((e.target as HTMLElement).closest?.("button")) return
      startYRef.current = e.touches[0].clientY
      trackingRef.current = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!trackingRef.current || !e.touches.length) return
      const deltaY = e.touches[0].clientY - startYRef.current
      if (deltaY > 0) {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
        setDragY(deltaY)
        dragYRef.current = deltaY
      }
    }

    const onTouchEnd = () => {
      if (!trackingRef.current) return
      trackingRef.current = false
      const currentY = dragYRef.current
      if (currentY >= closeThresholdRef.current) {
        onOpenChangeRef.current(false)
      } else {
        setDragY(0)
        dragYRef.current = 0
      }
      setIsDragging(false)
    }

    const opts: AddEventListenerOptions = { capture: true, passive: false }
    el.addEventListener("touchstart", onTouchStart, opts)
    el.addEventListener("touchmove", onTouchMove, opts)
    el.addEventListener("touchend", onTouchEnd, opts)

    return () => {
      el.removeEventListener("touchstart", onTouchStart, opts)
      el.removeEventListener("touchmove", onTouchMove, opts)
      el.removeEventListener("touchend", onTouchEnd, opts)
    }
  }, [])

  const elRef = useRef<HTMLElement | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      swipeable.ref(el)
      if (elRef.current === el) return
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      elRef.current = el
      if (el) {
        cleanupRef.current = attachTouch(el)
      }
    },
    [attachTouch, swipeable.ref]
  )

  useEffect(() => () => {
    cleanupRef.current?.()
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
    WebkitUserSelect: "none",
    userSelect: "none",
  }

  return {
    dragY,
    isDragging,
    dragHandlers: {
      ref: setRef,
      onMouseDown: swipeable.onMouseDown,
      style: dragHandleStyle,
    },
    sheetStyle,
    scrollableStyle,
  }
}
