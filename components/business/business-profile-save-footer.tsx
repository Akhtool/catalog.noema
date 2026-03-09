"use client"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

type Props = {
  isSubmitting: boolean
  isDirty: boolean
}

export function BusinessProfileSaveFooter({ isSubmitting, isDirty }: Props) {
  return (
    <div className="z-10 flex-shrink-0 border-t bg-background px-6 pt-4 pb-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.08)]">
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || !isDirty}
        className="w-full rounded-lg bg-brand-yellow py-6 text-base font-normal text-brand-yellow-foreground hover:bg-brand-yellow/90"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Сохранение...
          </>
        ) : (
          "Сохранить изменения"
        )}
      </Button>
    </div>
  )
}
