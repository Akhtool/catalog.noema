import Image from "next/image"
import Link from "next/link"

const NOEMA_URL = "https://noema.digital/"
const NOEMA_LOGO_ALT = "NOEMA"
const NOEMA_LOGO_PATH = "/noema-logo.jpeg"
const NOEMA_LOGO_WIDTH = 50
const NOEMA_LOGO_HEIGHT = 14

/** Футер с текстом «Разработано командой» и кликабельным логотипом NOEMA. */
export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-inherit py-6">
      <div className="container flex flex-col items-center justify-center gap-2 px-4">
        <p className="text-sm text-muted-foreground">
          Разработано командой
        </p>
        <Link
          href={NOEMA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label="Перейти на сайт NOEMA"
        >
          <Image
            src={NOEMA_LOGO_PATH}
            alt={NOEMA_LOGO_ALT}
            width={NOEMA_LOGO_WIDTH}
            height={NOEMA_LOGO_HEIGHT}
            className="h-3.5 w-auto"
            sizes="50px"
            priority={false}
          />
        </Link>
      </div>
    </footer>
  )
}
