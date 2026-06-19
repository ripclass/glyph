import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/landing/products";
import { WRITING_PIECES } from "@/lib/landing/writing";

/**
 * sitemap.xml for khamhealth.com — the map search engines crawl to
 * discover every public page. Data-driven from the product and writing
 * content, so new products/essays appear automatically.
 *
 * Public marketing surfaces only. The clinical app (/doctor, /intake,
 * /center, /wallet, /api, …) is intentionally excluded and also blocked
 * in robots.ts.
 */

const BASE = "https://khamhealth.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified, changeFrequency: "monthly", priority: 1 },
    {
      url: `${BASE}/writing`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/partners`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const productRoutes: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: `${BASE}/${p.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const writingRoutes: MetadataRoute.Sitemap = WRITING_PIECES.filter(
    (w) => w.published
  ).map((w) => ({
    url: `${BASE}/writing/${w.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: w.kind === "paper" ? 0.8 : 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...writingRoutes];
}
