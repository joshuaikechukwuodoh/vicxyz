import { SITE } from "./config"
import { formatPrice } from "./products"

type OrderItem = { name: string; quantity: number; price: number }

export function getWhatsAppUrl(message: string) {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`
}

export function getOrderWhatsAppUrl(items: OrderItem[]) {
  if (!items.length) return null
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const lines = items.map((item, i) => `${i + 1}. ${item.name}\n   Quantity: ${item.quantity} | Unit price: ${formatPrice(item.price)} | Subtotal: ${formatPrice(item.price * item.quantity)}`)
  return getWhatsAppUrl(`Hello Victor Pedro, I would like to discuss this order:\n\n${lines.join("\n\n")}\n\nEstimated total: ${formatPrice(total)}\n\nPlease confirm availability. I would like to negotiate the final price and discuss delivery and payment. Thank you.`)
}
