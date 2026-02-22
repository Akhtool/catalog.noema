import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { getRootDomain } from "@/lib/host";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rootDomain = getRootDomain();

  const { data: businesses } = await supabase
    .from("business")
    .select("slug, updated_at")
    .order("created_at", { ascending: false });

  const businessEntries: MetadataRoute.Sitemap = (businesses || []).map(
    (biz) => ({
      url: `https://${biz.slug}.${rootDomain}`,
      lastModified: biz.updated_at ? new Date(biz.updated_at) : new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    }),
  );

  return [
    {
      url: `https://${rootDomain}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...businessEntries,
  ];
}
