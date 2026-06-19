import type { MetadataRoute } from "next";

/**
 * robots.txt for khamhealth.com. Marketing pages are open to crawlers;
 * the clinical application and its APIs are blocked. Points to the
 * sitemap so search engines can find every public page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/doctor",
          "/intake",
          "/center",
          "/wallet/",
          "/login",
          "/start",
        ],
      },
    ],
    sitemap: "https://khamhealth.com/sitemap.xml",
    host: "https://khamhealth.com",
  };
}
