/**
 * Утилиты для генерации URL-friendly slug.
 * Держим отдельно, чтобы переиспользовать в формах/роутах.
 */

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

/** Преобразует строку в slug: латиница/цифры/дефисы, без повторяющихся дефисов. */
export function slugify(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return ''

  const transliterated = Array.from(trimmed)
    .map((ch) => {
      const mapped = CYRILLIC_TO_LATIN[ch]
      return mapped !== undefined ? mapped : ch
    })
    .join('')

  return transliterated
    .replace(/[^a-z0-9]+/g, '-') // всё, что не латиница/цифры → дефис
    .replace(/^-+|-+$/g, '') // дефисы по краям
    .replace(/-+/g, '-') // подряд идущие дефисы
}

