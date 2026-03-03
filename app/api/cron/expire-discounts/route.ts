import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

/**
 * Cron endpoint: сбрасывает истёкшие скидки у всех бизнесов.
 * Защищён секретом CRON_SECRET (передаётся в заголовке Authorization).
 * Вызывать ежедневно через внешний cron (cron-job.org, Vercel Cron, etc.):
 *   GET /api/cron/expire-discounts
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const supabase = createAdminClient();

  const { data: products, error: fetchError } = await supabase
    .from("product")
    .select("id, original_price")
    .eq("has_discount", true)
    .not("original_price", "is", null)
    .not("discount_date_to", "is", null)
    .lt("discount_date_to", today);

  if (fetchError) {
    return NextResponse.json(
      { error: "Fetch error", details: fetchError.message },
      { status: 500 },
    );
  }

  if (!products || products.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  let expired = 0;
  for (const p of products) {
    const { error: updateError } = await supabase
      .from("product")
      .update({
        price: p.original_price,
        has_discount: false,
        original_price: null,
        discount_date_from: null,
        discount_date_to: null,
      })
      .eq("id", p.id);

    if (!updateError) expired++;
  }

  return NextResponse.json({ expired, total: products.length });
}
