import { CreateBusinessForm } from './create-business-form'

/**
 * Страница создания бизнеса (для авторизованных пользователей).
 * Нужна, чтобы не добавлять бизнес вручную в Supabase.
 */
export default function NewBusinessPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Регистрация бизнеса</h2>
        <p className="text-muted-foreground mt-2">
          Создайте бизнес и получите публичную страницу каталога.
        </p>
      </div>

      <CreateBusinessForm />
    </div>
  )
}

