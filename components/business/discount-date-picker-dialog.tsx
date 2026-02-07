"use client";

import { useState, useEffect, useRef } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import { ru } from "date-fns/locale";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSheetDrag } from "@/lib/useSheetDrag";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import "react-day-picker/style.css";

const DISPLAY_DATE_FORMAT = "d MMMM yyyy";

export interface DiscountDateRange {
  from: string | null;
  to: string | null;
}

interface DiscountDatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRange: DiscountDateRange;
  onSelectRange: (range: DiscountDateRange) => void;
}

function toDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  return new Date(iso + "T12:00:00");
}

function toRange(r: DiscountDateRange): DateRange | undefined {
  const from = toDate(r.from);
  const to = toDate(r.to);
  if (!from && !to) return undefined;
  return { from: from ?? to, to: to ?? from };
}

/**
 * Нижний лист выбора диапазона дат скидки (от — до).
 * Стили совпадают с модалкой добавления позиции (ProductEditorSheet).
 */
export function DiscountDatePickerDialog({
  open,
  onOpenChange,
  selectedRange,
  onSelectRange,
}: DiscountDatePickerDialogProps) {
  const initialRange = toRange(selectedRange);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(
    initialRange
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange,
    scrollRef,
  });

  useEffect(() => {
    if (open) {
      setTempRange(toRange(selectedRange));
    }
  }, [open, selectedRange]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTempRange(toRange(selectedRange));
    }
    onOpenChange(next);
  }

  function handleSave() {
    if (tempRange?.from) {
      onSelectRange({
        from: format(tempRange.from, "yyyy-MM-dd"),
        to: tempRange.to
          ? format(tempRange.to, "yyyy-MM-dd")
          : format(tempRange.from, "yyyy-MM-dd"),
      });
    } else {
      onSelectRange({ from: null, to: null });
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="w-full max-h-[95vh] rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
        style={sheetStyle}
        {...dragHandlers}
      >
        <div className="w-full pt-3 pb-2 flex justify-center touch-none select-none pointer-events-none">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" aria-hidden />
        </div>

        <div className="px-6 pt-3 pb-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <SheetTitle className="text-xl font-bold">
              Период скидки (от — до)
            </SheetTitle>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SheetDescription className="text-sm text-gray-500">
            Выберите даты начала и окончания скидки
          </SheetDescription>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-4"
          style={scrollableStyle}
        >
          <div className="flex justify-center pb-4">
            <DayPicker
              mode="range"
              selected={tempRange}
              onSelect={setTempRange}
              locale={ru}
              showOutsideDays
              numberOfMonths={2}
              className="rdp"
            />
          </div>
          <Button
            type="button"
            onClick={handleSave}
            className="w-full mt-4 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black"
          >
            Сохранить
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Форматирует диапазон дат для отображения в кнопке (русская локаль) */
export function formatDiscountDateDisplay(range: DiscountDateRange): string {
  if (!range.from && !range.to) return "Выберите дату";
  try {
    const fromStr = range.from
      ? format(new Date(range.from + "T12:00:00"), DISPLAY_DATE_FORMAT, {
          locale: ru,
        })
      : "";
    const toStr = range.to
      ? format(new Date(range.to + "T12:00:00"), DISPLAY_DATE_FORMAT, {
          locale: ru,
        })
      : "";
    if (fromStr && toStr) return `${fromStr} — ${toStr}`;
    return fromStr || toStr;
  } catch {
    return range.from || range.to || "Выберите дату";
  }
}
