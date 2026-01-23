// app/[slug]/page.tsx
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { ContactButton } from '@/components/contact-button'
import { Catalog } from '@/components/catalog/catalog'
import { BusinessProvider } from '@/components/business-provider'
import { CartBottomBar } from '@/components/cart/cart-bottom-bar'
import { Business, Category, Product } from '@/types'
import { Clock } from 'lucide-react'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const { data: business, error: businessError } = await supabase
    .from('business')
    .select('*')
    .eq('slug', slug)
    .single()

  if (businessError || !business) {
    notFound()
  }

  const { data: categories } = await supabase
    .from('category')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('order', { ascending: true })

  const { data: products } = await supabase
    .from('product')
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true)

  // Преобразуем данные из snake_case в camelCase для типизации
  const businessTyped: Business = {
    id: business.id,
    slug: business.slug,
    name: business.name,
    description: business.description || '',
    logoUrl: business.logo_url || null,
    coverUrl: business.cover_url || null,
    phone: business.phone || null,
    whatsapp: business.whatsapp || null,
    telegram: business.telegram || null,
    workingHours: business.working_hours || null,
    deliveryRegions: business.delivery_regions || null,
    cityDelivery: business.city_delivery || null,
    createdAt: business.created_at,
    updatedAt: business.updated_at,
  }

  const categoriesTyped: Category[] = (categories || []).map((cat) => ({
    id: cat.id,
    businessId: cat.business_id,
    name: cat.name,
    order: cat.order,
    isActive: cat.is_active,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
  }))

  const productsTyped: Product[] = (products || []).map((prod) => {
    // Обработка images: может быть массивом или JSON строкой
    let images: string[] = []
    if (prod.images) {
      if (typeof prod.images === 'string') {
        try {
          images = JSON.parse(prod.images)
        } catch {
          images = [prod.images]
        }
      } else if (Array.isArray(prod.images)) {
        images = prod.images
      }
    }

    return {
      id: prod.id,
      businessId: prod.business_id,
      categoryId: prod.category_id,
      name: prod.name,
      description: prod.description || null,
      price: prod.price,
      images,
      brand: prod.brand || null,
      inStock: prod.in_stock,
      isActive: prod.is_active,
      createdAt: prod.created_at,
      updatedAt: prod.updated_at,
    }
  })

  return (
    <BusinessProvider business={businessTyped}>
      <div className="min-h-screen bg-background-light pb-24">
        {/* Баннер с обложкой */}
        {businessTyped.coverUrl && (
          <div className="relative w-full h-[320px] rounded-b-[2.5rem] overflow-hidden shadow-xl z-10">
            {/* Градиенты поверх изображения */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 z-10"></div>
            <div className="absolute inset-0 bg-brand-yellow/10 mix-blend-overlay z-10"></div>
            
            <Image
              src={businessTyped.coverUrl}
              alt={`Обложка ${businessTyped.name}`}
              fill
              className="object-cover"
              priority
            />

            {/* Информация о бизнесе внизу баннера */}
            <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
              <div className="flex items-end gap-4">
                {/* Логотип - круглый, перекрывающий баннер */}
                {businessTyped.logoUrl && (
                  <div className="flex-shrink-0">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-brand-yellow bg-white shadow-lg">
                      <Image
                        src={businessTyped.logoUrl}
                        alt={`Логотип ${businessTyped.name}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none mb-2 drop-shadow-lg">
                    {businessTyped.name}
                  </h1>
                  {businessTyped.description && (
                    <div className="relative">
                      {/* Подложка для лучшей читабельности */}
                      <div className="absolute inset-0 bg-black/40 rounded-lg blur-sm -z-10"></div>
                      <p className="text-white text-sm mt-2 font-medium max-w-[280px] drop-shadow-md leading-relaxed">
                        {businessTyped.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Информационная строка с иконками */}
        <div className="px-5 -mt-6 relative z-20 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-4 space-y-3">
            {/* Доставка по регионам */}
            {businessTyped.deliveryRegions && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-gray-700 font-medium">{businessTyped.deliveryRegions}</span>
              </div>
            )}
            
            {/* Доставка по городу */}
            {businessTyped.cityDelivery && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="text-gray-700 font-medium">{businessTyped.cityDelivery}</span>
              </div>
            )}

            {/* Режим работы */}
            {businessTyped.workingHours && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <span className="text-gray-700 font-medium">{businessTyped.workingHours}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Кнопка "Связаться с нами" */}
        <div className="px-5 mb-6">
          <ContactButton business={businessTyped} variant="wide" />
        </div>

        {/* Каталог */}
        <div className="px-5">
          <Catalog categories={categoriesTyped} products={productsTyped} />
        </div>

        {/* Фиксированная нижняя панель с корзиной */}
        <CartBottomBar />
      </div>
    </BusinessProvider>
  )
}
