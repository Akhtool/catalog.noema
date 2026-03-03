import { getBusiness } from './actions'
import { BusinessForm } from './business-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Страница редактирования профиля бизнеса
 * Server-side data fetching + client-side form
 */
export default async function BusinessPage() {
  const result = await getBusiness()

  if ('error' in result) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Редактирование бизнеса</h2>
        <p className="text-destructive">{result.error}</p>
        {result.error === 'Бизнес не найден' && (
          <div className="mt-4">
            <Button asChild>
              <Link href="/admin/business/new">Зарегистрировать бизнес</Link>
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Редактирование бизнеса</h2>
      <BusinessForm business={result.data} />
    </div>
  )
}
