/**
 * Парсинг Excel/CSV файла для массового импорта товаров.
 * Клиентская валидация строк.
 * Использует read-excel-file и papaparse (без уязвимостей xlsx/SheetJS).
 */

import readXlsxFile from "read-excel-file/browser";
import Papa from "papaparse";
import { BULK_IMPORT_COLUMNS } from "./bulk-import-template";

const NAME_MAX_LENGTH = 70;
const SUBTITLE_MAX_LENGTH = 60;
const DESCRIPTION_MAX_LENGTH = 2000;

/** Максимум строк за один импорт */
export const BULK_IMPORT_MAX_ROWS = 300;

/** Результат парсинга одной строки */
export interface ParsedRow {
  rowNumber: number;
  name: string;
  categoryName: string;
  price: number;
  subtitle?: string;
  description?: string;
  brandName?: string;
  inStock: boolean;
  errors: string[];
}

/** Маппинг заголовков (варианты написания для поиска) */
const HEADER_ALIASES: Record<string, (typeof BULK_IMPORT_COLUMNS)[number]> = {
  название: "Название",
  категория: "Категория",
  цена: "Цена",
  подзаголовок: "Подзаголовок",
  описание: "Описание",
  бренд: "Бренд",
  "в наличии": "В наличии",
};

function normalizeHeader(h: string): string {
  return String(h ?? "")
    .trim()
    .toLowerCase();
}

/** Карта: canonical column -> индекс в строке (по заголовкам) */
function buildHeaderIndexMap(
  headers: (string | number | boolean | Date)[]
): Partial<Record<(typeof BULK_IMPORT_COLUMNS)[number], number>> {
  const map: Partial<Record<(typeof BULK_IMPORT_COLUMNS)[number], number>> = {};
  headers.forEach((h, i) => {
    const normalized = normalizeHeader(String(h ?? ""));
    const canonical = HEADER_ALIASES[normalized];
    if (canonical) map[canonical] = i;
  });
  return map;
}

function getCellFromRow(
  row: (string | number | boolean | Date | null | undefined)[],
  headerMap: Partial<Record<(typeof BULK_IMPORT_COLUMNS)[number], number>>,
  col: (typeof BULK_IMPORT_COLUMNS)[number]
): string {
  const idx = headerMap[col];
  if (idx == null) return "";
  const v = row[idx];
  if (v == null) return "";
  return String(v).trim();
}

function parseInStock(value: string): boolean {
  const v = value.toLowerCase().trim();
  if (v === "да" || v === "yes" || v === "1" || v === "true" || v === "+")
    return true;
  if (v === "нет" || v === "no" || v === "0" || v === "false" || v === "-")
    return false;
  return true;
}

function parsePrice(value: string): number | null {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return null;
  return n;
}

function validateRow(
  row: (string | number | boolean | Date | null | undefined)[],
  headerMap: Partial<Record<(typeof BULK_IMPORT_COLUMNS)[number], number>>,
  rowNumber: number
): ParsedRow {
  const errors: string[] = [];

  const name = getCellFromRow(row, headerMap, "Название");
  const categoryName = getCellFromRow(row, headerMap, "Категория");
  const priceStr = getCellFromRow(row, headerMap, "Цена");
  const subtitle = getCellFromRow(row, headerMap, "Подзаголовок");
  const description = getCellFromRow(row, headerMap, "Описание");
  const brandName = getCellFromRow(row, headerMap, "Бренд");
  const inStockStr = getCellFromRow(row, headerMap, "В наличии");

  if (!name) errors.push("Название обязательно");
  else if (name.length > NAME_MAX_LENGTH)
    errors.push(`Название не более ${NAME_MAX_LENGTH} символов`);

  if (!categoryName) errors.push("Категория обязательна");

  const price = parsePrice(priceStr);
  if (price === null) {
    if (priceStr) errors.push("Цена должна быть числом");
    else errors.push("Цена обязательна");
  } else if (price < 0) errors.push("Цена не может быть отрицательной");

  if (subtitle && subtitle.length > SUBTITLE_MAX_LENGTH)
    errors.push(`Подзаголовок не более ${SUBTITLE_MAX_LENGTH} символов`);

  if (description && description.length > DESCRIPTION_MAX_LENGTH)
    errors.push(`Описание не более ${DESCRIPTION_MAX_LENGTH} символов`);

  return {
    rowNumber,
    name: name || "",
    categoryName: categoryName || "",
    price: price ?? 0,
    subtitle: subtitle || undefined,
    description: description || undefined,
    brandName: brandName || undefined,
    inStock: parseInStock(inStockStr || "да"),
    errors,
  };
}

/** Проверка на дубликаты имён — добавляет предупреждение в errors (не блокирует импорт) */
function addDuplicateWarnings(rows: ParsedRow[]): void {
  const nameCounts = new Map<string, number[]>();
  rows.forEach((r, i) => {
    if (r.name) {
      const key = r.name.toLowerCase();
      if (!nameCounts.has(key)) nameCounts.set(key, []);
      nameCounts.get(key)!.push(i);
    }
  });
  nameCounts.forEach((indices) => {
    if (indices.length > 1) {
      indices.forEach((i) => {
        rows[i].errors.push("Дубликат названия (импорт возможен)");
      });
    }
  });
}

function processRows(
  rows: (string | number | boolean | Date | null | undefined)[][],
  headerMap: Partial<Record<(typeof BULK_IMPORT_COLUMNS)[number], number>>
): ParsedRow[] {
  const result: ParsedRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNumber = i + 2;
    const parsed = validateRow(raw, headerMap, rowNumber);
    if (
      !parsed.name &&
      !parsed.categoryName &&
      !parsed.price &&
      !parsed.subtitle &&
      !parsed.description &&
      !parsed.brandName
    ) {
      continue;
    }
    result.push(parsed);
  }
  addDuplicateWarnings(result);
  return result;
}

/**
 * Парсит загруженный файл (.xlsx или .csv) и возвращает массив ParsedRow.
 * Первая строка — заголовки. Пустые строки пропускаются.
 */
export async function parseImportFile(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "csv") {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    const rows = parsed.data;
    if (!rows.length) return [];
    const headers = Object.keys(rows[0]);
    const headerMap = buildHeaderIndexMap(headers);
    const rowsAsArrays = rows.map((r) => headers.map((h) => r[h] ?? ""));
    const result = processRows(rowsAsArrays, headerMap);
    if (result.length > BULK_IMPORT_MAX_ROWS) {
      throw new Error(
        `Максимум ${BULK_IMPORT_MAX_ROWS} строк за раз. Разбейте файл на части.`
      );
    }
    return result;
  }

  const rows = await readXlsxFile(file);
  if (!rows.length) return [];
  const headerRow = rows[0].map((c) => String(c ?? ""));
  const headerMap = buildHeaderIndexMap(headerRow);
  const dataRows = rows.slice(1).map((row) =>
    row.map((c) => {
      if (c == null) return null;
      if (typeof c === "function") return undefined;
      return c as string | number | boolean | Date;
    })
  );
  const result = processRows(dataRows, headerMap);
  if (result.length > BULK_IMPORT_MAX_ROWS) {
    throw new Error(
      `Максимум ${BULK_IMPORT_MAX_ROWS} строк за раз. Разбейте файл на части.`
    );
  }
  return result;
}
