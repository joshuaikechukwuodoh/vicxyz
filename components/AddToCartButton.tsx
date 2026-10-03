"use client"
import { ShoppingBag } from "lucide-react"
import type { Product } from "@/lib/products"
import { useCartStore } from "@/store/cart-store"

export default function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem)
  return <button disabled={product.stock <= 0} onClick={() => addItem(product)} className="button dark large"><ShoppingBag size={18}/> {product.stock <= 0 ? "Out of stock" : "Add to cart"}</button>
}
