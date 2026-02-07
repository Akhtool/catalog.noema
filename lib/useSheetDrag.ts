"use client"

import { useState, useEffect } from "react"
import { useSwipeable } from "react-swipeable"

interface UseSheetDragOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  closeThreshold?: number
}

interface UseSheetDragReturn {
  dragY: number
  isDragging: boolean
  dragHandlers: ReturnType<typeof useSwipeable>
  sheetStyle: React.CSSProperties
  scrollableStyle: React.CSSProperties
}

/**
 * Хук для интерактивного перетаскивания Sheet компонентов
 * Позволяет закрывать модальные окна свайпом вниз
 */
export function useSheetDrag({
  open,
  onOpenChange,
  closeThreshold = 150,
}: UseSheetDragOptions): UseSheetDragReturn {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Сбрасываем позицию при открытии/закрытии
  useEffect(() => {
    if (open) {
      setDragY(0)
      setIsDragging(false)
    }
  }, [open])

  // Обработчик перетаскивания
  const dragHandlers = useSwipeable({
    onSwiping: (eventData) => {
      // Разрешаем перетаскивание только вниз
      if (eventData.deltaY > 0) {
        setIsDragging(true)
        setDragY(eventData.deltaY)
      }
    },
    onSwipedDown: (eventData) => {
      // Если потянули достаточно далеко, закрываем
      if (eventData.deltaY >= closeThreshold) {
        onOpenChange(false)
      } else {
        // Иначе возвращаем на место
        setDragY(0)
      }
      setIsDragging(false)
    },
    onTouchEndOrOnMouseUp: () => {
      // Если не достигли порога, возвращаем на место
      if (dragY < closeThreshold) {
        setDragY(0)
      }
      setIsDragging(false)
    },
    trackMouse: true,
    trackTouch: true,
    preventScrollOnSwipe: true,
  })

  // Вычисляем прозрачность фона в зависимости от позиции
  const opacity = Math.max(0, 1 - dragY / closeThreshold)

  // Управляем прозрачностью overlay при перетаскивании
  useEffect(() => {
    const overlay = document.querySelector(
      '[data-radix-dialog-overlay]'
    ) as HTMLElement
    if (overlay) {
      if (open) {
        overlay.style.opacity = opacity.toString()
      } else {
        // Сбрасываем стиль при закрытии
        overlay.style.opacity = ""
      }
    }
  }, [opacity, open])

  // Стили для SheetContent
  const sheetStyle: React.CSSProperties = {
    transform: `translateY(${dragY}px)`,
    transition: isDragging ? "none" : "transform 0.3s ease-out",
  }

  // Стили для прокручиваемого контента
  const scrollableStyle: React.CSSProperties = {
    overflow: isDragging ? "hidden" : "auto",
    touchAction: isDragging ? "none" : "auto",
  }

  return {
    dragY,
    isDragging,
    dragHandlers,
    sheetStyle,
    scrollableStyle,
  }
}
