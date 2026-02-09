// app/[slug]/page.tsx
import { supabase } from "@/lib/supabase";
import { expireProductDiscounts } from "@/app/admin/product/actions";
import { createServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { ContactOrEditSection } from "@/components/business/contact-or-edit-section";
import { Catalog } from "@/components/catalog/catalog";
import { BusinessProvider } from "@/components/business-provider";
import { CartBottomBar } from "@/components/cart/cart-bottom-bar";
import { Footer } from "@/components/footer";
import { Business, BusinessLocation, Category, Product } from "@/types";
import { parseDeliveryTypes } from "@/lib/order";
import { Clock } from "lucide-react";
import type { Metadata } from "next";
import { BusinessProfileEditorWrapper } from "@/components/business/business-profile-editor-wrapper";
import { BannerLogoutButton } from "@/components/business/banner-logout-button";
import { isRootDomainHost, normalizeHost } from "@/lib/host";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Генерирует метаданные для страницы бизнеса, включая динамический favicon
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const host = normalizeHost((await headers()).get("host"));
  // Блокируем `catlg.ru/{slug}`: на корневом домене не отдаём каталоги по пути.
  if (host && isRootDomainHost(host)) {
    return {
      title: "Catalog Noema",
      description: "Каталог товаров",
    };
  }

  const { slug } = await params;
  const { data: business } = await supabase
    .from("business")
    .select("name, description, logo_url")
    .eq("slug", slug)
    .single();

  if (!business) {
    return {
      title: "Catalog Noema",
      description: "Каталог товаров",
    };
  }

  const metadata: Metadata = {
    title: business.name || "Catalog Noema",
    description: business.description || "Каталог товаров",
  };

  // Устанавливаем favicon из логотипа бизнеса, если он есть
  if (business.logo_url) {
    metadata.icons = {
      icon: business.logo_url,
      shortcut: business.logo_url,
      apple: business.logo_url,
    };
  }

  return metadata;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const { data: business, error: businessError } = await supabase
    .from("business")
    .select("*")
    .eq("slug", slug)
    .single();

  if (businessError || !business) {
    notFound();
  }

  const { data: categories } = await supabase
    .from("category")
    .select("*")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("order", { ascending: true });

  const { data: locations } = await supabase
    .from("business_location")
    .select("*")
    .eq("business_id", business.id)
    .order("order_position", { ascending: true });

  await expireProductDiscounts(business.id);

  // Для админа загружаем все товары (в т.ч. скрытые) через serverClient; для остальных — только активные через anon
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: bu } = await serverClient
      .from("business_user")
      .select("role")
      .eq("business_id", business.id)
      .eq("user_id", user.id)
      .single();
    isAdmin = !!(bu && (bu.role === "owner" || bu.role === "admin"));
  }
  const productSelect = "*, product_image(url, position), brand(name)";
  const productOrder = { ascending: true as const };
  const { data: products } = isAdmin
    ? await serverClient
        .from("product")
        .select(productSelect)
        .eq("business_id", business.id)
        .order("order", productOrder)
        .order("id", productOrder)
    : await supabase
        .from("product")
        .select(productSelect)
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("order", productOrder)
        .order("id", productOrder);

  // Преобразуем данные из snake_case в camelCase для типизации
  const themeBrandHsl =
    typeof (business as { theme_brand_hsl?: unknown }).theme_brand_hsl === "string"
      ? ((business as { theme_brand_hsl: string }).theme_brand_hsl || null)
      : null;
  const themeBrandForegroundRaw =
    typeof (business as { theme_brand_foreground?: unknown }).theme_brand_foreground === "string"
      ? ((business as { theme_brand_foreground: string }).theme_brand_foreground || null)
      : null;
  const themeBrandForeground =
    themeBrandForegroundRaw === "black" || themeBrandForegroundRaw === "white"
      ? themeBrandForegroundRaw
      : null;

  const businessTyped: Business = {
    id: business.id,
    slug: business.slug,
    name: business.name,
    description: business.description || "",
    logoUrl: business.logo_url || null,
    coverUrl: business.cover_url || null,
    themeBrandHsl,
    themeBrandForeground,
    phone: business.phone || null,
    whatsapp: business.whatsapp || null,
    whatsappDelivery: business.whatsapp_delivery || null,
    whatsappPickup: business.whatsapp_pickup || null,
    whatsappDineIn: business.whatsapp_dine_in || null,
    telegram: business.telegram || null,
    workingHours: business.working_hours || null,
    deliveryRegions: business.delivery_regions || null,
    cityDelivery: business.city_delivery || null,
    deliveryTypes: parseDeliveryTypes(business.delivery_types),
    pickupPoints: (locations || []).map((loc) => ({
      id: loc.id,
      businessId: loc.business_id,
      title: loc.title,
      address: loc.address ?? null,
      phone: loc.phone ?? null,
      whatsapp: loc.whatsapp ?? null,
      telegram: loc.telegram ?? null,
      orderPosition: loc.order_position,
      isActive: loc.is_active !== false,
      createdAt: loc.created_at,
      updatedAt: loc.updated_at,
    })) as BusinessLocation[],
    createdAt: business.created_at,
    updatedAt: business.updated_at,
  };

  const themeCss = themeBrandHsl
    ? [
        ":root{",
        `--brand-yellow:${themeBrandHsl};`,
        `--primary:${themeBrandHsl};`,
        `--ring:${themeBrandHsl};`,
        ...(themeBrandForeground
          ? [
              `--brand-yellow-foreground:${
                themeBrandForeground === "black" ? "0 0% 0%" : "0 0% 100%"
              };`,
              `--primary-foreground:${
                themeBrandForeground === "black" ? "0 0% 0%" : "0 0% 100%"
              };`,
            ]
          : []),
        "}",
      ].join("")
    : null;

  const categoriesTyped: Category[] = (categories || []).map((cat) => ({
    id: cat.id,
    businessId: cat.business_id,
    name: cat.name,
    order: cat.order,
    isActive: cat.is_active,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
  }));

  const productsTyped: Product[] = (products || []).map((prod) => {
    // Изображения из product_image по position (data-model.md)
    const productImages = (prod.product_image ?? []) as { url: string; position: number }[];
    const images = productImages
      .sort((a, b) => a.position - b.position)
      .map((img) => img.url);

    const hasDiscount = (prod as { has_discount?: boolean }).has_discount === true;
    const originalPriceRaw = (prod as { original_price?: number | string | null }).original_price;
    const originalPriceNum =
      originalPriceRaw != null ? Number(originalPriceRaw) : NaN;
    const originalPrice =
      hasDiscount &&
      !Number.isNaN(originalPriceNum) &&
      originalPriceNum > prod.price
        ? originalPriceNum
        : null;

    const raw = prod as {
      discount_date_from?: string | null;
      discount_date_to?: string | null;
    };
    const discountDateFrom =
      typeof raw.discount_date_from === "string" ? raw.discount_date_from : null;
    const discountDateTo =
      typeof raw.discount_date_to === "string" ? raw.discount_date_to : null;

    return {
      id: prod.id,
      businessId: prod.business_id,
      categoryId: prod.category_id,
      name: prod.name,
      description: prod.description || null,
      price: prod.price,
      hasDiscount,
      originalPrice,
      discountDateFrom,
      discountDateTo,
      images,
      brand: (prod.brand as { name: string } | null)?.name ?? null,
      inStock: prod.in_stock,
      isActive: prod.is_active,
      order: typeof (prod as { order?: number }).order === "number" ? (prod as { order: number }).order : 0,
      createdAt: prod.created_at,
      updatedAt: prod.updated_at,
    };
  });

  return (
    <>
      {themeCss ? <style>{themeCss}</style> : null}
      <BusinessProvider business={businessTyped}>
        <BusinessProfileEditorWrapper business={businessTyped}>
          {/* Баннер с обложкой */}
          {businessTyped.coverUrl && (
            <div className="relative w-full min-h-[180px] flex flex-col justify-end rounded-b-[2.5rem] overflow-hidden shadow-xl z-10">
              {/* Градиенты поверх изображения */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 z-10" />
              <div className="absolute inset-0 bg-brand-yellow/10 mix-blend-overlay z-10" />

              <Image
                src={businessTyped.coverUrl}
                alt={`Обложка ${businessTyped.name}`}
                fill
                className="object-cover"
                priority
                sizes="100vw"
                unoptimized
              />

              {/* Информация о бизнесе внизу баннера — в потоке, блок растёт с описанием */}
              <div className="relative p-8 z-20">
                <div className="absolute top-4 right-4 z-30">
                  <BannerLogoutButton />
                </div>
                <div className="flex items-end gap-4">
                  {businessTyped.logoUrl && (
                    <div className="flex-shrink-0 relative">
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-brand-yellow bg-white shadow-lg">
                        <Image
                          src={businessTyped.logoUrl}
                          alt={`Логотип ${businessTyped.name}`}
                          fill
                          className="object-cover"
                          sizes="96px"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none mb-2 drop-shadow-lg [text-shadow:0_2px_4px_rgba(0,0,0,0.85),0_4px_12px_rgba(0,0,0,0.75)]">
                      {businessTyped.name}
                    </h1>
                    {businessTyped.description && (
                      <div className="relative">
                        <div className="absolute inset-0 bg-black/40 rounded-lg blur-sm -z-10" />
                        <p className="text-white text-sm mt-2 font-medium max-w-[280px] drop-shadow-md leading-relaxed line-clamp-4">
                          {businessTyped.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Кнопка «Выйти» при отсутствии обложки */}
          {!businessTyped.coverUrl && (
            <div className="pt-4 px-5 flex justify-end">
              <BannerLogoutButton variant="default" />
            </div>
          )}

          {/* Информационная строка с иконками */}
          <div className="px-5 -mt-6 relative z-20 my-2.5">
            <div className="bg-white rounded-2xl shadow-card p-3 space-y-2">
              {businessTyped.deliveryRegions && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3.5 h-3.5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">
                    {businessTyped.deliveryRegions}
                  </span>
                </div>
              )}
              {businessTyped.cityDelivery && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3.5 h-3.5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">
                    {businessTyped.cityDelivery}
                  </span>
                </div>
              )}
              {businessTyped.workingHours && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-700 font-medium">
                      {businessTyped.workingHours}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Секция "Связаться с нами" или "Редактировать профиль" (для admin/owner) */}
          <ContactOrEditSection business={businessTyped} />

          {/* Каталог */}
          <div className="px-5">
            <Catalog categories={categoriesTyped} products={productsTyped} />
          </div>

          <Footer />

          {/* Фиксированная нижняя панель с корзиной */}
          <CartBottomBar />
        </BusinessProfileEditorWrapper>
      </BusinessProvider>
    </>
  );
}
