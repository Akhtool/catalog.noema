import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { buildBusinessCatalogUrl } from "@/lib/host"

/** Главная страница — лендинг платформы Catalog Noema. */
export default function Home() {
  const testSlug = "crusty"
  const testCatalogUrl = buildBusinessCatalogUrl(testSlug, {
    // В dev нужен http + порт dev-сервера, чтобы ссылка открывалась локально.
    protocol: process.env.NODE_ENV === "production" ? "https" : "http",
    port: process.env.NODE_ENV === "production" ? null : "3000",
  })

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Catalog Noema
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl">
          Платформа для создания онлайн-каталогов товаров и услуг
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href={testCatalogUrl}>Открыть тестовый каталог</Link>
        </Button>
      </section>

      {/* Краткие преимущества */}
      <section className="border-t border-border bg-muted/30 px-4 py-12">
        <div className="mx-auto max-w-3xl grid gap-6 sm:grid-cols-3 text-center">
          <div>
            <h3 className="font-semibold">Свой каталог</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Отдельная страница для каждого бизнеса по slug
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Товары и услуги</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Удобное управление карточками и категориями
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Онлайн</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Доступ к каталогу с любого устройства
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
