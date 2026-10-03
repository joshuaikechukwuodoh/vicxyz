import ProductCard from "@/components/ProductCard"
import { products } from "@/lib/products"

export default function ShopPage() {
  return <section className="section-pad page-section"><div className="page-hero"><p className="eyebrow">All products</p><h1>Shop the collection.</h1><p>Explore currently available cars, motorcycles, motor parts and accessories.</p></div><div className="product-grid">{products.map((p) => <ProductCard product={p} key={p.id}/>)}</div></section>
}
