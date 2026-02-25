/**
 * Генерация Excel-шаблона для массового импорта товаров.
 * Используется на клиенте (BulkImportSheet).
 * Библиотека write-excel-file — без известных уязвимостей (альтернатива xlsx/SheetJS).
 */

import writeXlsxFile from "write-excel-file/browser";

/** Названия колонок шаблона (соответствуют парсеру) */
export const BULK_IMPORT_COLUMNS = [
  "Название",
  "Категория",
  "Цена",
  "Подзаголовок",
  "Описание",
  "Бренд",
  "В наличии",
] as const;

/** Пример строки для шаблона */
const EXAMPLE_ROW = [
  "Латте",
  "Напитки",
  "350",
  "мл 300",
  "Классический кофейный напиток",
  "",
  "да",
];

/**
 * Создаёт и скачивает .xlsx файл с шаблоном для импорта товаров.
 * Заголовки в первой строке, пример заполнения во второй.
 */
export async function generateImportTemplate(): Promise<void> {
  const data = [
    BULK_IMPORT_COLUMNS as unknown as string[],
    EXAMPLE_ROW,
  ];
  await writeXlsxFile(data, {
    fileName: "шаблон_импорта_товаров.xlsx",
  });
}
