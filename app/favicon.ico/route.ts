// app/favicon.ico/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Route handler для динамического favicon.ico
 * Определяет slug из referer и возвращает соответствующий логотип
 */
export async function GET(request: NextRequest) {
  try {
    // Получаем referer из заголовков
    const referer = request.headers.get("referer");
    
    if (!referer) {
      return new NextResponse(null, { status: 404 });
    }

    // Извлекаем slug из URL referer
    const url = new URL(referer);
    const pathname = url.pathname;
    
    // Проверяем, что путь соответствует формату /[slug]
    const slugMatch = pathname.match(/^\/([^\/]+)$/);
    
    if (!slugMatch) {
      return new NextResponse(null, { status: 404 });
    }

    const slug = slugMatch[1];

    // Получаем бизнес по slug
    const { data: business } = await supabase
      .from("business")
      .select("logo_url")
      .eq("slug", slug)
      .single();

    if (!business || !business.logo_url) {
      return new NextResponse(null, { status: 404 });
    }

    // Перенаправляем на логотип
    return NextResponse.redirect(business.logo_url);
  } catch (error) {
    console.error("Ошибка при получении favicon:", error);
    return new NextResponse(null, { status: 404 });
  }
}
