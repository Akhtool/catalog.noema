"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSwipeable } from "react-swipeable";

const SCROLL_TOP_TOLERANCE = 2;
const ENGAGE_THRESHOLD_PX = 5;

interface UseSheetDragOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closeThreshold?: number;
  /** Ref на скролл-контейнер внутри sheet. Если передан, drag вниз из этой области разрешён только при scrollTop <= 0. */
  scrollRef?: React.RefObject<HTMLElement | null>;
}

interface UseSheetDragReturn {
  dragY: number;
  isDragging: boolean;
  dragHandlers: ReturnType<typeof useSwipeable>;
  sheetStyle: React.CSSProperties;
  scrollableStyle: React.CSSProperties;
}

function isInputLike(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const el = target.closest("input, textarea, [contenteditable='true']");
  return !!el;
}

/**
 * Хук для интерактивного перетаскивания Sheet компонентов.
 * Позволяет закрывать модальные окна свайпом вниз в любом месте (при scrollTop=0 в скролл-области).
 * Ref из dragHandlers нужно вешать на SheetContent (overlay тогда определяется по соседу в портале).
 */
export function useSheetDrag({
  open,
  onOpenChange,
  closeThreshold = 150,
  scrollRef,
}: UseSheetDragOptions): UseSheetDragReturn {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const contentRef = useRef<HTMLElement | null>(null);
  const dragEngagedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setDragY(0);
      setIsDragging(false);
      dragEngagedRef.current = false;
    }
  }, [open]);

  const canDragDown = useCallback(
    (target: EventTarget | null): boolean => {
      if (isInputLike(target)) return false;
      if (!scrollRef?.current) return true;
      const el = target instanceof HTMLElement ? target : null;
      if (!el || !scrollRef.current.contains(el)) return true;
      return scrollRef.current.scrollTop <= SCROLL_TOP_TOLERANCE;
    },
    [scrollRef],
  );

  const { ref: swipeableRef, ...restHandlers } = useSwipeable({
    onTouchStartOrOnMouseDown: () => {
      dragEngagedRef.current = false;
    },
    onSwiping: (eventData) => {
      if (eventData.deltaY <= 0) return;

      if (!dragEngagedRef.current) {
        if (eventData.deltaY < ENGAGE_THRESHOLD_PX) return;
        if (!canDragDown(eventData.event?.target ?? null)) return;
        dragEngagedRef.current = true;
      }

      setIsDragging(true);
      setDragY(eventData.deltaY);
    },
    onSwipedDown: (eventData) => {
      if (eventData.deltaY >= closeThreshold) {
        onOpenChange(false);
      } else {
        setDragY(0);
      }
      setIsDragging(false);
      dragEngagedRef.current = false;
    },
    onTouchEndOrOnMouseUp: () => {
      if (dragY < closeThreshold) {
        setDragY(0);
      }
      setIsDragging(false);
      dragEngagedRef.current = false;
    },
    trackMouse: true,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  const mergedRef = useCallback(
    (el: HTMLElement | null) => {
      contentRef.current = el;
      swipeableRef(el);
    },
    [swipeableRef],
  );

  const opacity = Math.max(0, 1 - dragY / closeThreshold);

  useEffect(() => {
    const overlay =
      contentRef.current?.previousElementSibling ??
      document.querySelector("[data-radix-dialog-overlay]");
    const el = overlay as HTMLElement | null;
    if (el) {
      if (open) {
        el.style.opacity = opacity.toString();
      } else {
        el.style.opacity = "";
      }
    }
  }, [opacity, open]);

  const sheetStyle: React.CSSProperties = {
    transform: `translateY(${dragY}px)`,
    transition: isDragging ? "none" : "transform 0.3s ease-out",
  };

  const scrollableStyle: React.CSSProperties = {
    overflow: isDragging ? "hidden" : "auto",
    touchAction: isDragging ? "none" : "auto",
  };

  return {
    dragY,
    isDragging,
    dragHandlers: { ref: mergedRef, ...restHandlers },
    sheetStyle,
    scrollableStyle,
  };
}
