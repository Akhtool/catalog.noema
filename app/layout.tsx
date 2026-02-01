import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { HeaderWrapper } from "@/components/header-wrapper"
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
      <body className={inter.className}>
        <HeaderWrapper />
        {children}
        <ScrollToTop />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
