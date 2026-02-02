import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { isRootDomainHost, normalizeHost } from '@/lib/host'

/**
 * Guard для сегмента `app/[slug]`.
 * Запрещает доступ к каталогам по пути `catlg.ru/{slug}/*` (анти-дубли).
 * Каталог должен открываться только на поддомене `{slug}.catlg.ru` (через rewrite в middleware).
 */
export default async function SlugLayout({ children }: { children: React.ReactNode }) {
  const host = normalizeHost((await headers()).get('host'))
  if (host && isRootDomainHost(host)) {
    notFound()
  }

  return children
}

