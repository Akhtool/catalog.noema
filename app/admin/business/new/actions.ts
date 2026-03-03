'use server'

import { createBusiness as createBusinessImpl } from '@/lib/business'

export async function createBusiness(formData: FormData) {
  return createBusinessImpl(formData)
}
