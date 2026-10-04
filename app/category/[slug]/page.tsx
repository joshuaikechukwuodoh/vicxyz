import { cache } from "react";
import { notFound } from "next/navigation";
import CatalogGrid from "@/components/CatalogGrid";
import { findCategory } from "@/repositories/catalog";
import { pageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
const getCategory = cache(findCategory);
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const c = await getCategory((await params).slug);
  if (!c) notFound();
  return pageMetadata(
    c.name + " for Sale in Lagos, Nigeria",
    "Browse " +
      c.name.toLowerCase() +
      " from Victor Pedro Automobile in Lagos, Nigeria. View listings, prices and photos and enquire on WhatsApp.",
    "/category/" + c.slug,
  );
}
export default async function CategoryPage({ params }: Props) {
  const c = await getCategory((await params).slug);
  if (!c) notFound();
  return (
    <section className="section-pad page-section">
      <div className="page-hero">
        <p className="eyebrow">Available in Lagos, Nigeria</p>
        <h1>{c.name}</h1>
        <p>
          Browse {c.name.toLowerCase()} from Victor Pedro Automobile. View
          current prices and contact us on WhatsApp to confirm availability.
        </p>
      </div>
      <CatalogGrid category={c.slug} />
    </section>
  );
}
