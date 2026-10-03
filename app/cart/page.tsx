"use client"

import Link from "next/link"
import { Minus, Plus, Trash2, MessageCircle, ArrowLeft } from "lucide-react"
import { formatPrice } from "@/lib/products"
import { getOrderWhatsAppUrl } from "@/lib/whatsapp"
import { useCartStore } from "@/store/cart-store"

export default function CartPage() {
  const { items, increase, decrease, removeItem, clear } = useCartStore()
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const whatsappUrl = getOrderWhatsAppUrl(items)
  return <section className="section-pad page-section cart-page"><div className="page-hero"><p className="eyebrow">Your selection</p><h1>Shopping cart.</h1><p>Review your selection, then proceed on WhatsApp to discuss your order and negotiate with Victor Pedro.</p></div>{!items.length ? <div className="empty-cart"><h2>Your cart is empty.</h2><p>Add some products and they will appear here.</p><Link href="/shop" className="button dark"><ArrowLeft size={17}/> Go to shop</Link></div> : <div className="cart-layout"><div className="cart-list">{items.map((item) => <article className="cart-row" key={item.id}><img src={item.image} alt={item.name}/><div className="cart-main"><p className="eyebrow">{item.category}</p><h3>{item.name}</h3><strong>{formatPrice(item.price)}</strong></div><div className="qty"><button onClick={() => decrease(item.id)}><Minus size={15}/></button><span>{item.quantity}</span><button onClick={() => increase(item.id)}><Plus size={15}/></button></div><strong className="line-total">{formatPrice(item.price * item.quantity)}</strong><button className="remove" onClick={() => removeItem(item.id)}><Trash2 size={17}/></button></article>)}</div><aside className="cart-summary"><p className="eyebrow">Order summary</p><div className="summary-line"><span>Items</span><span>{items.reduce((s,i)=>s+i.quantity,0)}</span></div><div className="summary-line total"><span>Estimated total</span><strong>{formatPrice(total)}</strong></div><a className="button dark full" href={whatsappUrl ?? undefined} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/> Proceed on WhatsApp</a><button className="clear-cart" onClick={clear}>Clear cart</button><p className="tiny-note">Your items, quantities and estimated total will be filled in automatically. Tap Send in WhatsApp to start the conversation. Final price, delivery and payment are agreed with Victor Pedro.</p></aside></div>}</section>
}
