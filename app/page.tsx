import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-24 text-center space-y-6 max-w-2xl">
        <h1 className="text-4xl font-bold">Catalog Noema</h1>
        <p className="text-lg text-muted-foreground">
          Платформа для создания онлайн-каталогов товаров и услуг
        </p>
        <div className="pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Для просмотра каталога перейдите по ссылке бизнеса
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button asChild size="lg">
              <Link href="/muscool">Открыть тестовый каталог (muscool)</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Или используйте любой другой slug: <code className="px-2 py-1 bg-muted rounded">/your-business-slug</code>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
