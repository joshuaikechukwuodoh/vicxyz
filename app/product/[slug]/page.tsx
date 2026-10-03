import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"
import AddToCartButton from "@/components/AddToCartButton"
import { formatPrice, products } from "@/lib/products"

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = products.find((p) => p.slug === slug)
  if (!product) notFound()
  return <section className="section-pad product-detail-page"><Link href="/shop" className="back-link"><ArrowLeft size={16}/> Back to shop</Link><div className="product-detail"><div className="detail-image"><img src={product.image} alt={product.name}/></div><div className="detail-copy"><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><div className="detail-price">{formatPrice(product.price)}</div><p className="detail-description">{product.description}</p><div className="detail-facts"><span><Check size={16}/> {product.condition}</span><span><Check size={16}/> {product.stock} currently in stock</span><span><Check size={16}/> WhatsApp ordering available</span></div><AddToCartButton product={product}/><p className="tiny-note">Final availability and payment details are confirmed with the seller.</p></div></div></section>
}
