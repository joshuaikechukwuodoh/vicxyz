"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Product } from "@/lib/products"

type CartItem = Product & { quantity: number }

type CartStore = {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (id: string) => void
  increase: (id: string) => void
  decrease: (id: string) => void
  clear: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product) => set((state) => {
        const existing = state.items.find((item) => item.id === product.id)
        if (existing) {
          return { items: state.items.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) } : item) }
        }
        return { items: [...state.items, { ...product, quantity: 1 }] }
      }),
      removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      increase: (id) => set((state) => ({ items: state.items.map((item) => item.id === id ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) } : item) })),
      decrease: (id) => set((state) => ({ items: state.items.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item) })),
      clear: () => set({ items: [] }),
    }),
    { name: "motora-cart" }
  )
)
