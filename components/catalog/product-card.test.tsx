import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ProductCard } from './product-card'
import type { Product } from '@/types'

const { toast, cartStoreState } = vi.hoisted(() => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  cartStoreState: {
    addItem: vi.fn(),
    increaseQuantity: vi.fn(),
    decreaseQuantity: vi.fn(),
    getItems: vi.fn(() => []),
    getItemQuantity: vi.fn(() => 0),
  },
}))

vi.mock('next/image', () => ({
  default: ({ fill: _fill, priority: _priority, ...props }: Record<string, unknown>) => (
    <img {...props} />
  ),
}))

vi.mock('sonner', () => ({
  toast,
}))

vi.mock('@/store/cart', () => ({
  useCartStore: <T,>(selector: (state: typeof cartStoreState) => T) => selector(cartStoreState),
}))

vi.mock('./product-detail-card', () => ({
  ProductDetailCard: () => null,
}))

const baseProduct: Product = {
  id: 'product-1',
  businessId: 'business-1',
  categoryId: 'category-1',
  name: 'Product',
  subtitle: null,
  description: 'Description',
  price: 1000,
  hasDiscount: false,
  originalPrice: null,
  discountDateFrom: null,
  discountDateTo: null,
  images: ['https://example.com/product.jpg'],
  brand: null,
  inStock: true,
  isActive: true,
  order: 1,
  createdAt: '2026-03-09T00:00:00.000Z',
  updatedAt: '2026-03-09T00:00:00.000Z',
}

describe('ProductCard owner actions', () => {
  it('reads only product quantity from the cart store selector', () => {
    render(<ProductCard product={baseProduct} viewMode="grid" />)

    expect(cartStoreState.getItemQuantity).toHaveBeenCalledWith('business-1', 'product-1')
    expect(cartStoreState.getItems).not.toHaveBeenCalled()
  })

  it('does not enter hidden success state when hide action fails', async () => {
    render(
      <ProductCard
        product={baseProduct}
        viewMode="grid"
        showAdminActions
        onHide={() => Promise.reject(new Error('Нет доступа к этому бизнесу'))}
      />
    )

    fireEvent.click(screen.getByLabelText('Скрыть из каталога'))
    fireEvent.click(await screen.findByRole('button', { name: 'Скрыть' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Нет доступа к этому бизнесу')
    })

    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Вернуть в каталог' })).not.toBeInTheDocument()
  })

  it('does not enter restored success state when restore action fails', async () => {
    render(
      <ProductCard
        product={{
          ...baseProduct,
          isActive: false,
        }}
        viewMode="grid"
        showAdminActions
        onRestore={() => Promise.reject(new Error('Ошибка восстановления товара'))}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Вернуть в каталог' }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Ошибка восстановления товара')
    })

    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Вернуть в каталог' })).toBeInTheDocument()
  })
})
