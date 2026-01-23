// app/[slug]/page.tsx
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { ContactButton } from '@/components/contact-button'
import { Catalog } from '@/components/catalog/catalog'
import { BusinessProvider } from '@/components/business-provider'
import { Business, Category, Product } from '@/types'
import { Phone, Clock } from 'lucide-react'

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
      <div className="min-h-screen bg-background">
        {/* Обложка */}
        {businessTyped.coverUrl && (
          <div className="relative w-full h-48 sm:h-64 md:h-80 overflow-hidden">
            <Image
              src={businessTyped.coverUrl}
              alt={`Обложка ${businessTyped.name}`}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Логотип и основная информация */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6">
            {businessTyped.logoUrl && (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden border border-border">
                <Image
                  src={businessTyped.logoUrl}
                  alt={`Логотип ${businessTyped.name}`}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{businessTyped.name}</h1>
              {businessTyped.description && (
                <p className="text-muted-foreground text-sm sm:text-base mb-4">
                  {businessTyped.description}
                </p>
              )}
            </div>
          </div>

          {/* Контакты */}
          <div className="space-y-3 mb-6">
            {businessTyped.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${businessTyped.phone}`} className="text-foreground hover:underline">
                  {businessTyped.phone}
                </a>
              </div>
            )}
            
            {businessTyped.workingHours && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{businessTyped.workingHours}</span>
              </div>
            )}
          </div>

          {/* Кнопка "Связаться" */}
          <ContactButton business={businessTyped} />

          {/* Каталог */}
          <div className="mt-12">
            <Catalog categories={categoriesTyped} products={productsTyped} />
          </div>
        </div>
      </div>
    </BusinessProvider>
  )
}
