"use client";

import Link from "next/link";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import Brand from "./Brand";
import { useCartStore } from "@/store/cart-store";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const count = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  return (
    <header className="nav-shell">
      <Link href="/" className="brand">
        <Brand />
      </Link>
      <nav className={open ? "nav-links open" : "nav-links"}>
        <Link href="/">Home</Link>
        <Link href="/shop">Shop</Link>
        <Link href="/#categories">Categories</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/admin" onClick={() => setOpen(false)}>
          Admin
        </Link>
      </nav>
      <div className="nav-actions">
        <Link href="/cart" className="cart-button">
          <ShoppingBag size={18} />
          <span>Cart</span>
          <b>{count}</b>
        </Link>
        <button
          className="menu-button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
