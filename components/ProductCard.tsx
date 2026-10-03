"use client"

import Link from "next/link"
import { ArrowUpRight, ShoppingBag } from "lucide-react"
import { formatPrice, type Product } from "@/lib/products"
import { useCartStore } from "@/store/cart-store"

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem)
  return (
    <article className="product-card">
      <Link href={`/product/${product.slug}`} className="product-image-wrap">
        <img src={product.image} alt={product.name} className="product-image"/>
        <span className="product-condition">{product.condition}</span>
      </Link>
      <div className="product-copy">
        <div>
          <p className="eyebrow">{product.category}</p>
          <Link href={`/product/${product.slug}`} className="product-title">{product.name}</Link>
        </div>
        <div className="product-meta"><strong>{formatPrice(product.price)}</strong><span>{product.stock} in stock</span></div>
        <div className="product-actions">
          <button onClick={() => addItem(product)} className="button dark"><ShoppingBag size={17}/> Add to cart</button>
          <Link className="icon-button" href={`/product/${product.slug}`} aria-label="View product"><ArrowUpRight size={18}/></Link>
        </div>
      </div>
    </article>
  )
}
