"use client"

import { useEffect } from "react"
import { Business } from "@/types"
import { useCurrentBusinessStore } from "@/store/current-business"

interface BusinessProviderProps {
  business: Business
  children: React.ReactNode
}

export function BusinessProvider({ business, children }: BusinessProviderProps) {
  const setBusiness = useCurrentBusinessStore((state) => state.setBusiness)

  useEffect(() => {
    setBusiness(business)
  }, [business, setBusiness])

  return <>{children}</>
}
