import { notFound } from "next/navigation"
import ProductCard from "@/components/ProductCard"
import { categories, products } from "@/lib/products"

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = categories.find((c) => c.slug === slug)
  if (!category) notFound()
  const items = products.filter((p) => p.categorySlug === slug)
  return <section className="section-pad page-section"><div className="page-hero"><p className="eyebrow">Category</p><h1>{category.name}</h1><p>{items.length} product{items.length !== 1 ? 's' : ''} currently available.</p></div><div className="product-grid">{items.map((p) => <ProductCard product={p} key={p.id}/>)}</div></section>
}
