"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import AddToCartButton from "./AddToCartButton";
import { formatPrice } from "@/lib/products";
import {
  storefrontProduct,
  useApi,
  type ProductDto,
} from "@/lib/catalog-client";
export default function ProductDetails({ slug }: { slug: string }) {
  const { data, loading, error, retry } = useApi<ProductDto>(
    `/api/products/${encodeURIComponent(slug)}`,
  );
  const [selected, setSelected] = useState(0);
  if (loading)
    return (
      <section className="section-pad">
        <p role="status">Loading product…</p>
      </section>
    );
  if (error || !data)
    return (
      <section className="section-pad" role="alert">
        <p>{error ?? "Product not found"}</p>
        <button className="button dark" onClick={retry}>
          Try again
        </button>
      </section>
    );
  const product = storefrontProduct(data);
  return (
    <section className="section-pad product-detail-page">
      <Link href="/shop" className="back-link">
        <ArrowLeft size={16} /> Back to shop
      </Link>
      <div className="product-detail">
        <div>
          <div className="detail-image">
            <img
              src={product.images[selected] ?? product.image}
              alt={product.name}
            />
          </div>
          {product.images.length > 1 && (
            <div className="product-thumbnails">
              {product.images.map((image, i) => (
                <button
                  key={image + i}
                  onClick={() => setSelected(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={i === selected}
                >
                  <img src={image} alt={`${product.name}, image ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
          {product.videos.length > 0 && (
            <div className="product-videos">
              <h3>Watch this vehicle or part</h3>
              {product.videos.map((url, i) => (
                <video
                  key={url + i}
                  src={url}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={`${product.name}, video ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <div className="detail-price">{formatPrice(product.price)}</div>
          <p className="detail-description">{product.description}</p>
          <div className="detail-facts">
            <span>
              <Check size={16} /> {product.condition}
            </span>
            <span>
              <Check size={16} /> {product.stock} currently in stock
            </span>
            <span>
              <Check size={16} /> WhatsApp ordering available
            </span>
          </div>
          <AddToCartButton product={product} />
          <p className="tiny-note">
            Final availability and payment details are confirmed with the
            seller.
          </p>
        </div>
      </div>
    </section>
  );
}
