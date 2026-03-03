/**
 * Экспорт каталога в Excel.
 * Структура колонок совпадает с шаблоном импорта.
 */

import writeXlsxFile from "write-excel-file/browser";
import type { ProductForExport } from "@/app/admin/product/actions";

const HEADERS = [
  "Название",
  "Категория",
  "Цена",
  "Подзаголовок",
  "Описание",
  "Бренд",
  "В наличии",
];

/**
 * Формирует Excel-файл с товарами и инициирует скачивание.
 * @param products — массив товаров для экспорта
 * @param fileName — имя файла (без расширения или с .xlsx)
 */
export async function exportProductsToExcel(
  products: ProductForExport[],
  fileName: string
): Promise<void> {
  const rows = products.map((p) => [
    p.name,
    p.categoryName,
    String(p.price),
    p.subtitle ?? "",
    p.description ?? "",
    p.brandName ?? "",
    p.inStock ? "да" : "нет",
  ]);
  const data = [HEADERS, ...rows];
  const name = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  await writeXlsxFile(data, {
    fileName: name,
  });
}
