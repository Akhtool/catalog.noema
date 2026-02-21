import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { ScrollToTop } from "@/components/scroll-to-top"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Catalog Noema",
  description: "Каталог товаров",
}

export const viewport: Viewport = {
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={`${inter.className} min-h-screen flex flex-col items-center`}>
        <div className="w-full max-w-[430px] min-h-screen flex flex-col relative shrink-0">
          {children}
          <ScrollToTop />
          <Toaster richColors position="top-center" />
        </div>
      </body>
    </html>
  )
}
