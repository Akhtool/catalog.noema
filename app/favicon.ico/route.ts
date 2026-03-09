// app/favicon.ico/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSlugFromSubdomain, normalizeHost } from "@/lib/host";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Route handler для динамического favicon.ico
 * Определяет бизнес по текущему subdomain host и возвращает соответствующий логотип
 */
export async function GET(request: NextRequest) {
  try {
    const host = normalizeHost(request.headers.get("host"));
    const slug = host ? getSlugFromSubdomain(host) : null;

    if (!slug) {
      return new NextResponse(null, { status: 404 });
    }

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
