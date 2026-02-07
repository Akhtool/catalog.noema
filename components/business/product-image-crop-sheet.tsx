"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { type Area, type MediaSize } from "react-easy-crop";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useSheetDrag } from "@/lib/useSheetDrag";
import { X, Loader2 } from "lucide-react";
import { getCroppedImg } from "@/lib/getCroppedImg";
import { toast } from "sonner";

const CROP_ASPECT = 3 / 4;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

interface ProductImageCropSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Object URL выбранного файла */
  imageSrc: string | null;
  /** Вызов с обрезанным файлом; после вызова закрыть и очистить imageSrc у родителя */
  onComplete: (file: File) => void;
}

/**
 * Модалка обрезки фото перед добавлением к товару. Соотношение 3:4.
 */
export function ProductImageCropSheet({
  open,
  onOpenChange,
  imageSrc,
  onComplete,
}: ProductImageCropSheetProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const { dragHandlers, sheetStyle, scrollableStyle } = useSheetDrag({
    open,
    onOpenChange,
  });

  const onCropAreaChange = useCallback((_croppedArea: Area, croppedAreaPx: Area) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  /** При загрузке изображения задаём начальную область обрезки по центру (3:4) */
  const onMediaLoaded = useCallback((mediaSize: MediaSize) => {
    const { naturalWidth: W, naturalHeight: H } = mediaSize;
    if (W <= 0 || H <= 0) return;
    const aspect = CROP_ASPECT;
    let x: number, y: number, width: number, height: number;
    if (W / H >= aspect) {
      width = Math.round(H * aspect);
      height = H;
      x = Math.round((W - width) / 2);
      y = 0;
    } else {
      width = W;
      height = Math.round(W / aspect);
      x = 0;
      y = Math.round((H - height) / 2);
    }
    setCroppedAreaPixels({ x, y, width, height });
  }, []);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open]);

  async function handleFinish() {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsFinishing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([blob], "image.jpg", { type: "image/jpeg" });
      onComplete(file);
      onOpenChange(false);
    } catch (e) {
      console.error("Crop failed:", e);
      toast.error("Не удалось обрезать изображение");
    } finally {
      setIsFinishing(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="w-full min-h-[85vh] max-h-[95vh] rounded-t-3xl flex flex-col p-0 bg-white border-t-0 !bottom-0 data-[state=open]:duration-500 data-[state=closed]:duration-500"
        style={sheetStyle}
      >
        <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 flex-shrink-0" aria-hidden />
          <div
            {...dragHandlers}
            className="flex-1 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none min-w-0 py-0.5"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div
          {...dragHandlers}
          className="flex-shrink-0 px-6 pt-4 pb-3 border-b cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <SheetTitle className="text-xl font-bold">
            Редактирование фотографии 1 из 1
          </SheetTitle>
          <SheetDescription className="text-sm text-gray-500 mt-1">
            Обрежьте фотографию, чтобы добавить (соотношение 3:4)
          </SheetDescription>
        </div>
        <div className="flex-1 min-h-0 relative" style={scrollableStyle}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={CROP_ASPECT}
              minZoom={ZOOM_MIN}
              maxZoom={ZOOM_MAX}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropAreaChange={onCropAreaChange}
              onMediaLoaded={onMediaLoaded}
              roundCropAreaPixels
              showGrid
            />
          )}
        </div>
        <div className="flex-shrink-0 px-6 py-3 border-t bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Масштаб
          </label>
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-3 accent-gray-900 touch-manipulation"
            aria-label="Масштаб изображения"
          />
        </div>
        <div className="flex-shrink-0 px-6 py-4 border-t">
          <Button
            type="button"
            onClick={handleFinish}
            disabled={!croppedAreaPixels || isFinishing}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black disabled:opacity-70"
          >
            {isFinishing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden />
                Загрузка…
              </>
            ) : (
              "Завершить"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
