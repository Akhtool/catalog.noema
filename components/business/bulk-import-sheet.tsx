"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Business } from "@/types";
import { Download, FileSpreadsheet, Loader2, Trash2, Upload } from "lucide-react";
import { generateImportTemplate } from "@/lib/bulk-import-template";
import {
  parseImportFile,
  type ParsedRow,
} from "@/lib/bulk-import-parser";
import {
  createProductsBulk,
  type BulkProductItem,
} from "@/app/admin/product/actions";

type BulkImportState = "upload" | "preview" | "result";

interface BulkImportSheetProps {
  business: Business;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportSheet({
  business,
  open,
  onOpenChange,
}: BulkImportSheetProps) {
  const router = useRouter();
  const [state, setState] = useState<BulkImportState>("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{
    created: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state === "result") {
      closeButtonRef.current?.focus();
    }
  }, [state]);

  function reset() {
    setState("upload");
    setParsedRows([]);
    setImportResult(null);
    setParseError(null);
  }

  /** Сброс к загрузке файла без закрытия Sheet */
  function resetToUpload() {
    setParsedRows([]);
    setImportResult(null);
    setParseError(null);
    setShowOnlyErrors(false);
    setState("upload");
  }

  function handleOpenChange(openVal: boolean) {
    if (!openVal) reset();
    onOpenChange(openVal);
  }

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "csv") {
      setParseError("Поддерживаются только .xlsx и .csv");
      return;
    }
    setIsParsing(true);
    setParseError(null);
    try {
      const rows = await parseImportFile(file);
      setParsedRows(rows);
      setState("preview");
    } catch (e) {
      console.error("parseImportFile error:", e);
      setParseError(e instanceof Error ? e.message : "Не удалось прочитать файл");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const removeErrorRows = useCallback(() => {
    setParsedRows((prev) => prev.filter((r) => r.errors.length === 0));
  }, []);

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const errorRows = parsedRows.filter((r) => r.errors.length > 0);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const rowsToShow = showOnlyErrors ? errorRows : parsedRows;
  const [importBatchCurrent, setImportBatchCurrent] = useState(0);
  const [importBatchTotal, setImportBatchTotal] = useState(0);

  const BATCH_SIZE = 50;

  const handleImport = useCallback(async () => {
    if (validRows.length === 0) {
      toast.error("Нет строк для импорта");
      return;
    }
    const items: BulkProductItem[] = validRows.map((r) => ({
      name: r.name,
      categoryName: r.categoryName,
      price: r.price,
      subtitle: r.subtitle || null,
      description: r.description || null,
      brandName: r.brandName || null,
      inStock: r.inStock,
    }));

    const chunks: BulkProductItem[][] = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      chunks.push(items.slice(i, i + BATCH_SIZE));
    }

    setIsImporting(true);
    setImportBatchTotal(chunks.length);
    setImportBatchCurrent(0);

    let totalCreated = 0;
    const allErrors: { row: number; message: string }[] = [];
    let baseRowOffset = 0;

    for (let i = 0; i < chunks.length; i++) {
      setImportBatchCurrent(i + 1);
      const res = await createProductsBulk(
        business.id,
        chunks[i],
        business.slug
      );

      if (res.error) {
        toast.error(res.error);
        setIsImporting(false);
        setImportBatchCurrent(0);
        setImportBatchTotal(0);
        return;
      }
      if (res.data) {
        totalCreated += res.data.created;
        for (const e of res.data.errors) {
          allErrors.push({ row: baseRowOffset + e.row, message: e.message });
        }
      }
      baseRowOffset += chunks[i].length;
    }

    setIsImporting(false);
    setImportBatchCurrent(0);
    setImportBatchTotal(0);
    setImportResult({ created: totalCreated, errors: allErrors });
    setState("result");
    router.refresh();
    if (totalCreated > 0) {
      toast.success(
        `Создано ${totalCreated} товаров. Добавить фото можно в редакторе.`
      );
    }
  }, [validRows, business.id, business.slug, router]);

  const handleDownloadTemplate = useCallback(async () => {
    await generateImportTemplate();
  }, []);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] flex flex-col rounded-t-3xl"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Импорт товаров</SheetTitle>
          <SheetDescription>
            {state === "upload" &&
              "Загрузите Excel или CSV. Колонки: Название, Категория, Цена (обязательны); Подзаголовок, Описание, Бренд, В наличии (опционально). Максимум 300 строк."}
            {state === "preview" &&
              `Готово к импорту: ${validRows.length} из ${parsedRows.length}`}
            {state === "result" &&
              `Создано: ${importResult?.created ?? 0}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto pt-4">
          {state === "upload" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                  isDragging
                    ? "border-brand-yellow bg-brand-yellow/10"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleInputChange}
                  className="hidden"
                  id="bulk-import-file"
                />
                <label htmlFor="bulk-import-file" className="cursor-pointer">
                  {isParsing ? (
                    <Loader2 className="h-12 w-12 mx-auto text-gray-400 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto text-gray-500 mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        Перетащите файл сюда или нажмите для выбора
                      </p>
                      <p className="text-xs text-gray-500 mt-1">.xlsx или .csv</p>
                    </>
                  )}
                </label>
              </div>
              {parseError && (
                <p className="text-sm text-destructive">{parseError}</p>
              )}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-4 w-4" />
                Скачать шаблон
              </Button>
            </div>
          )}

          {state === "preview" && (
            <div className="space-y-4">
              {errorRows.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-destructive">
                    Ошибки в {errorRows.length} строках
                  </p>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyErrors}
                        onChange={(e) => setShowOnlyErrors(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Только с ошибками
                    </label>
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={removeErrorRows}
                    className="gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Удалить строки с ошибками
                  </Button>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto max-h-[45vh] border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Название</th>
                      <th className="text-left p-2 font-medium">Категория</th>
                      <th className="text-left p-2 font-medium">Цена</th>
                      <th className="text-left p-2 font-medium">Ошибки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsToShow.map((r) => (
                      <tr
                        key={r.rowNumber}
                        className={
                          r.errors.length > 0
                            ? "bg-destructive/5 border-b"
                            : "border-b"
                        }
                      >
                        <td className="p-2">{r.rowNumber}</td>
                        <td className="p-2">{r.name || "—"}</td>
                        <td className="p-2">{r.categoryName || "—"}</td>
                        <td className="p-2">{r.price ?? "—"}</td>
                        <td className="p-2 text-destructive text-xs">
                          {r.errors.join("; ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full gap-2"
                  onClick={handleImport}
                  disabled={validRows.length === 0 || isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {importBatchTotal > 1
                        ? `Импортируем… ${importBatchCurrent} из ${importBatchTotal}`
                        : "Импортируем…"}
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      Импортировать {validRows.length} товаров
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={resetToUpload}
                  disabled={isImporting}
                >
                  Загрузить другой файл
                </Button>
              </div>
            </div>
          )}

          {state === "result" && importResult && (
            <div className="space-y-4">
              <p className="text-lg font-medium">
                Создано товаров: {importResult.created}
              </p>
              {importResult.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-destructive mb-2">
                    Ошибки при импорте:
                  </p>
                  <ul className="text-sm space-y-1 max-h-40 overflow-auto">
                    {importResult.errors.map((e, i) => (
                      <li key={i}>
                        Строка {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  ref={closeButtonRef}
                  className="w-full"
                  onClick={() => handleOpenChange(false)}
                >
                  Закрыть
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={resetToUpload}
                >
                  Загрузить другой файл
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
