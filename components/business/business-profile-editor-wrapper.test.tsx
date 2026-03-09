import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useDeleteProduct,
  useRestoreProduct,
} from './profile-editor-context'

const mockRefresh = vi.fn()
const mockCheckBusinessAccess = vi.fn()
const mockDeleteProductAction = vi.fn()
const mockRestoreProductAction = vi.fn()

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

vi.mock('@/app/admin/business/actions', () => ({
  checkBusinessAccess: mockCheckBusinessAccess,
}))

vi.mock('@/app/admin/product/actions', () => ({
  deleteProduct: mockDeleteProductAction,
  restoreProduct: mockRestoreProductAction,
}))

function Consumer() {
  const deleteProduct = useDeleteProduct()
  const restoreProduct = useRestoreProduct()

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          deleteProduct?.('product-1').catch((error: Error) => {
            document.body.dataset.deleteError = error.message
          })
        }}
      >
        delete
      </button>
      <button
        type="button"
        onClick={() => {
          restoreProduct?.('product-1').catch((error: Error) => {
            document.body.dataset.restoreError = error.message
          })
        }}
      >
        restore
      </button>
    </div>
  )
}

describe('BusinessProfileEditorWrapper', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    delete document.body.dataset.deleteError
    delete document.body.dataset.restoreError
    mockCheckBusinessAccess.mockResolvedValue({ hasAccess: true })
  })

  it('rethrows deleteProduct errors and does not refresh on failed action', async () => {
    mockDeleteProductAction.mockResolvedValue({ error: 'Нет доступа' })

    const { BusinessProfileEditorWrapper } = await import('./business-profile-editor-wrapper')
    render(
      <BusinessProfileEditorWrapper
        business={{
          id: 'business-1',
          slug: 'acme',
          name: 'Acme',
          description: '',
          logoUrl: null,
          coverUrl: null,
          themeBrandHsl: null,
          themeBrandForeground: null,
          phone: null,
          whatsapp: null,
          whatsappDelivery: null,
          whatsappPickup: null,
          whatsappDineIn: null,
          telegram: null,
          workingHours: null,
          deliveryRegions: null,
          cityDelivery: null,
          deliveryTypes: [],
          createdAt: '2026-03-09T00:00:00.000Z',
          updatedAt: '2026-03-09T00:00:00.000Z',
        }}
      >
        <Consumer />
      </BusinessProfileEditorWrapper>
    )

    fireEvent.click(screen.getByRole('button', { name: 'delete' }))

    await waitFor(() => {
      expect(document.body.dataset.deleteError).toBe('Нет доступа')
    })

    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('rethrows restoreProduct errors and does not refresh on failed action', async () => {
    mockRestoreProductAction.mockResolvedValue({ error: 'Ошибка восстановления' })

    const { BusinessProfileEditorWrapper } = await import('./business-profile-editor-wrapper')
    render(
      <BusinessProfileEditorWrapper
        business={{
          id: 'business-1',
          slug: 'acme',
          name: 'Acme',
          description: '',
          logoUrl: null,
          coverUrl: null,
          themeBrandHsl: null,
          themeBrandForeground: null,
          phone: null,
          whatsapp: null,
          whatsappDelivery: null,
          whatsappPickup: null,
          whatsappDineIn: null,
          telegram: null,
          workingHours: null,
          deliveryRegions: null,
          cityDelivery: null,
          deliveryTypes: [],
          createdAt: '2026-03-09T00:00:00.000Z',
          updatedAt: '2026-03-09T00:00:00.000Z',
        }}
      >
        <Consumer />
      </BusinessProfileEditorWrapper>
    )

    fireEvent.click(screen.getByRole('button', { name: 'restore' }))

    await waitFor(() => {
      expect(document.body.dataset.restoreError).toBe('Ошибка восстановления')
    })

    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
