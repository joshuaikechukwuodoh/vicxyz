import type { Metadata } from "next";
import { SITE } from "./config";
export function pageMetadata(
  title: string,
  description: string,
  path: string,
  image = "/images/victor-pedro/logo.png",
): Metadata {
  const url = new URL(path, SITE.url).href;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      locale: "en_NG",
      type: "website",
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
