import { getBusiness } from './actions'
import { BusinessForm } from './business-form'

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
