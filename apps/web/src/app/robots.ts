import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Korunan uygulama alanları dizinlenmez.
        disallow: ["/api/", "/dashboard", "/settings", "/select-business", "/login", "/register", "/verify-email"],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
