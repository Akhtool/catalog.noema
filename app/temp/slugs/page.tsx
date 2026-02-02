'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { buildBusinessCatalogUrl } from '@/lib/host'

type TabType = 'business' | 'category' | 'product'

interface BusinessRow {
  id: string
  slug: string
  name: string
  description: string | null
  created_at: string
}

interface CategoryRow {
  id: string
  business_id: string
  name: string
  order: number
  is_active: boolean
  created_at: string
}

interface ProductRow {
  id: string
  business_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  images: string | string[] | null
  brand: string | null
  in_stock: boolean
  is_active: boolean
  created_at: string
}

export default function SlugsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('business')
  const [businesses, setBusinesses] = useState<BusinessRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Формы
  const [businessForm, setBusinessForm] = useState({
    slug: '',
    name: '',
    description: '',
    logo_url: '',
    cover_url: '',
    phone: '',
    whatsapp: '',
    telegram: '',
    working_hours: '',
    delivery_regions: '',
    city_delivery: '',
  })

  const [categoryForm, setCategoryForm] = useState({
    business_id: '',
    name: '',
    order: '0',
    is_active: true,
  })

  const [productForm, setProductForm] = useState({
    business_id: '',
    category_id: '',
    name: '',
    description: '',
    price: '0',
    images: '', // URL через запятую
    brand: '',
    in_stock: true,
    is_active: true,
  })

  // Загрузка данных
  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    try {
      setLoading(true)
      const [businessRes, categoryRes, productRes] = await Promise.all([
        supabase.from('business').select('*').order('created_at', { ascending: false }),
        supabase.from('category').select('*').order('order', { ascending: true }),
        supabase.from('product').select('*').order('created_at', { ascending: false }),
      ])

      if (businessRes.error) throw businessRes.error
      if (categoryRes.error) throw categoryRes.error
      if (productRes.error) throw productRes.error

      setBusinesses(businessRes.data || [])
      setCategories(categoryRes.data || [])
      setProducts(productRes.data || [])
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      setMessage({ type: 'error', text: 'Не удалось загрузить данные' })
    } finally {
      setLoading(false)
    }
  }

  async function handleBusinessSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const { data: existing } = await supabase
        .from('business')
        .select('id')
        .eq('slug', businessForm.slug)
        .single()

      if (existing) {
        setMessage({ type: 'error', text: 'Slug уже существует' })
        setSubmitting(false)
        return
      }

      const { error } = await supabase.from('business').insert({
        slug: businessForm.slug,
        name: businessForm.name,
        description: businessForm.description || null,
        logo_url: businessForm.logo_url || null,
        cover_url: businessForm.cover_url || null,
        phone: businessForm.phone || null,
        whatsapp: businessForm.whatsapp || null,
        telegram: businessForm.telegram || null,
        working_hours: businessForm.working_hours || null,
        delivery_regions: businessForm.delivery_regions || null,
        city_delivery: businessForm.city_delivery || null,
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Бизнес успешно добавлен!' })
      setBusinessForm({
        slug: '',
        name: '',
        description: '',
        logo_url: '',
        cover_url: '',
        phone: '',
        whatsapp: '',
        telegram: '',
        working_hours: '',
        delivery_regions: '',
        city_delivery: '',
      })
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось добавить бизнес'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('category').insert({
        business_id: categoryForm.business_id,
        name: categoryForm.name,
        order: parseInt(categoryForm.order) || 0,
        is_active: categoryForm.is_active,
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Категория успешно добавлена!' })
      setCategoryForm({ business_id: '', name: '', order: '0', is_active: true })
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось добавить категорию'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      // Парсинг изображений (URL через запятую)
      const imagesArray = productForm.images
        ? productForm.images.split(',').map((url) => url.trim()).filter(Boolean)
        : []

      const { error } = await supabase.from('product').insert({
        business_id: productForm.business_id,
        category_id: productForm.category_id,
        name: productForm.name,
        description: productForm.description || null,
        price: parseFloat(productForm.price) || 0,
        images: imagesArray.length > 0 ? imagesArray : null,
        brand: productForm.brand || null,
        in_stock: productForm.in_stock,
        is_active: productForm.is_active,
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Продукт успешно добавлен!' })
      setProductForm({
        business_id: '',
        category_id: '',
        name: '',
        description: '',
        price: '0',
        images: '',
        brand: '',
        in_stock: true,
        is_active: true,
      })
      loadAllData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось добавить продукт'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setSubmitting(false)
    }
  }

  const getBusinessName = (id: string) => businesses.find((b) => b.id === id)?.name || id
  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || id
  const getCategoriesByBusiness = (businessId: string) =>
    categories.filter((c) => c.business_id === businessId)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Управление каталогом (временная страница)</h1>
          <p className="text-gray-600">Добавление бизнесов, категорий и продуктов</p>
        </div>

        {/* Табы */}
        <div className="flex gap-2 mb-6 border-b">
          {(['business', 'category', 'product'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'business' && 'Бизнесы'}
              {tab === 'category' && 'Категории'}
              {tab === 'product' && 'Продукты'}
            </button>
          ))}
        </div>

        {/* Форма бизнеса */}
        {activeTab === 'business' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Добавить бизнес</h2>
            <form onSubmit={handleBusinessSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Slug *</label>
                  <Input
                    value={businessForm.slug}
                    onChange={(e) => setBusinessForm({ ...businessForm, slug: e.target.value })}
                    placeholder="my-business"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Название *</label>
                  <Input
                    value={businessForm.name}
                    onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                    placeholder="Название бизнеса"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Описание</label>
                  <Textarea
                    value={businessForm.description}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, description: e.target.value })
                    }
                    placeholder="Описание бизнеса"
                    disabled={submitting}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Логотип (URL)</label>
                  <Input
                    value={businessForm.logo_url}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, logo_url: e.target.value })
                    }
                    placeholder="https://..."
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Обложка (URL)</label>
                  <Input
                    value={businessForm.cover_url}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, cover_url: e.target.value })
                    }
                    placeholder="https://..."
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Телефон</label>
                  <Input
                    value={businessForm.phone}
                    onChange={(e) => setBusinessForm({ ...businessForm, phone: e.target.value })}
                    placeholder="+7..."
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp</label>
                  <Input
                    value={businessForm.whatsapp}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, whatsapp: e.target.value })
                    }
                    placeholder="+7..."
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telegram</label>
                  <Input
                    value={businessForm.telegram}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, telegram: e.target.value })
                    }
                    placeholder="@username"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Режим работы</label>
                  <Input
                    value={businessForm.working_hours}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, working_hours: e.target.value })
                    }
                    placeholder="Пн-Вс: 9:00-21:00"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Регионы доставки</label>
                  <Input
                    value={businessForm.delivery_regions}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, delivery_regions: e.target.value })
                    }
                    placeholder="Россия / СНГ / Европа"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Доставка по городу</label>
                  <Input
                    value={businessForm.city_delivery}
                    onChange={(e) =>
                      setBusinessForm({ ...businessForm, city_delivery: e.target.value })
                    }
                    placeholder="По городу бесплатно"
                    disabled={submitting}
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-md ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Button type="submit" disabled={submitting}>
                {submitting ? 'Добавление...' : 'Добавить бизнес'}
              </Button>
            </form>
          </div>
        )}

        {/* Форма категории */}
        {activeTab === 'category' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Добавить категорию</h2>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Бизнес *</label>
                <select
                  value={categoryForm.business_id}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, business_id: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                  disabled={submitting}
                >
                  <option value="">Выберите бизнес</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.slug})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Название *</label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Название категории"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Порядок</label>
                  <Input
                    type="number"
                    value={categoryForm.order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, order: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    id="category_active"
                    checked={categoryForm.is_active}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, is_active: e.target.checked })
                    }
                    disabled={submitting}
                    className="w-4 h-4"
                  />
                  <label htmlFor="category_active" className="text-sm font-medium">
                    Активна
                  </label>
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-md ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Button type="submit" disabled={submitting}>
                {submitting ? 'Добавление...' : 'Добавить категорию'}
              </Button>
            </form>
          </div>
        )}

        {/* Форма продукта */}
        {activeTab === 'product' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Добавить продукт</h2>
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Бизнес *</label>
                <select
                  value={productForm.business_id}
                  onChange={(e) => {
                    setProductForm({ ...productForm, business_id: e.target.value, category_id: '' })
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                  disabled={submitting}
                >
                  <option value="">Выберите бизнес</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.slug})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Категория *</label>
                <select
                  value={productForm.category_id}
                  onChange={(e) =>
                    setProductForm({ ...productForm, category_id: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                  disabled={submitting || !productForm.business_id}
                >
                  <option value="">Выберите категорию</option>
                  {getCategoriesByBusiness(productForm.business_id).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Название *</label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Название продукта"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <Textarea
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({ ...productForm, description: e.target.value })
                  }
                  placeholder="Описание продукта"
                  disabled={submitting}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Цена *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="0.00"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Бренд</label>
                  <Input
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    placeholder="Бренд"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Изображения (URL через запятую)
                </label>
                <Textarea
                  value={productForm.images}
                  onChange={(e) => setProductForm({ ...productForm, images: e.target.value })}
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                  disabled={submitting}
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Вставьте URL изображений через запятую
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="product_stock"
                    checked={productForm.in_stock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, in_stock: e.target.checked })
                    }
                    disabled={submitting}
                    className="w-4 h-4"
                  />
                  <label htmlFor="product_stock" className="text-sm font-medium">
                    В наличии
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="product_active"
                    checked={productForm.is_active}
                    onChange={(e) =>
                      setProductForm({ ...productForm, is_active: e.target.checked })
                    }
                    disabled={submitting}
                    className="w-4 h-4"
                  />
                  <label htmlFor="product_active" className="text-sm font-medium">
                    Активен
                  </label>
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-md ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Button type="submit" disabled={submitting}>
                {submitting ? 'Добавление...' : 'Добавить продукт'}
              </Button>
            </form>
          </div>
        )}

        {/* Списки */}
        <div className="space-y-6">
          {/* Список бизнесов */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Бизнесы ({businesses.length})</h2>
            {loading ? (
              <p className="text-gray-500">Загрузка...</p>
            ) : businesses.length === 0 ? (
              <p className="text-gray-500">Нет бизнесов</p>
            ) : (
              <div className="space-y-3">
                {businesses.map((business) => (
                  <div
                    key={business.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{business.name}</h3>
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {buildBusinessCatalogUrl(business.slug)}
                          </span>
                        </div>
                        {business.description && (
                          <p className="text-sm text-gray-600 mb-2">{business.description}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          Создан: {new Date(business.created_at).toLocaleString('ru-RU')}
                        </p>
                      </div>
                      <Link href={buildBusinessCatalogUrl(business.slug)} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">
                          Открыть
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Список категорий */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Категории ({categories.length})</h2>
            {loading ? (
              <p className="text-gray-500">Загрузка...</p>
            ) : categories.length === 0 ? (
              <p className="text-gray-500">Нет категорий</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({getBusinessName(category.business_id)})
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          Порядок: {category.order} |{' '}
                          {category.is_active ? 'Активна' : 'Неактивна'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Список продуктов */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Продукты ({products.length})</h2>
            {loading ? (
              <p className="text-gray-500">Загрузка...</p>
            ) : products.length === 0 ? (
              <p className="text-gray-500">Нет продуктов</p>
            ) : (
              <div className="space-y-2">
                {products.map((product) => {
                  const images = Array.isArray(product.images)
                    ? product.images
                    : typeof product.images === 'string'
                      ? [product.images]
                      : []
                  return (
                    <div
                      key={product.id}
                      className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-sm font-semibold text-blue-600">
                              {product.price} ₽
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 space-x-2">
                            <span>{getBusinessName(product.business_id)}</span>
                            <span>•</span>
                            <span>{getCategoryName(product.category_id)}</span>
                            {product.brand && (
                              <>
                                <span>•</span>
                                <span>Бренд: {product.brand}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{product.in_stock ? 'В наличии' : 'Нет в наличии'}</span>
                            <span>•</span>
                            <span>{product.is_active ? 'Активен' : 'Неактивен'}</span>
                            {images.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{images.length} фото</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
