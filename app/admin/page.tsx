/**
 * Главная страница админ-зоны
 * Минимальная реализация без бизнес-логики
 */
export default function AdminPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Добро пожаловать в админ-панель</h2>
      <p className="text-muted-foreground">
        Здесь будет управление бизнесами, товарами и категориями.
      </p>
    </div>
  )
}
