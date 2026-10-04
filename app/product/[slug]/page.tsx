import { cache } from "react";
import { notFound } from "next/navigation";
import ProductDetails from "@/components/ProductDetails";
import { findProduct } from "@/repositories/catalog";
import { pageMetadata, safeJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/config";
export const dynamic = "force-dynamic";
const getProduct = cache(findProduct);
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  return pageMetadata(
    product.name + " for Sale in Lagos",
    product.description.slice(0, 160),
    "/product/" + product.slug,
    product.images[0]?.imageUrl,
  );
}
export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const url = SITE.url + "/product/" + product.slug;
  const condition = /used/i.test(product.condition)
    ? "https://schema.org/UsedCondition"
    : /^new$/i.test(product.condition)
      ? "https://schema.org/NewCondition"
      : undefined;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.imageUrl),
    sku: product.id,
    category: product.category.name,
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "NGN",
      price: product.price,
      availability:
        product.quantity > 0 && product.status !== "OUT_OF_STOCK"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: condition,
      seller: { "@id": SITE.url + "/#business" },
    },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Shop",
        item: SITE.url + "/shop",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category.name,
        item: SITE.url + "/category/" + product.category.slug,
      },
      { "@type": "ListItem", position: 3, name: product.name, item: url },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }}
      />
      <ProductDetails
        slug={product.slug}
        initialProduct={JSON.parse(JSON.stringify(product))}
      />
    </>
  );
}
