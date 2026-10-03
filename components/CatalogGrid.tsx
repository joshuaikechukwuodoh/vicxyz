"use client";
import { useState } from "react";
import ProductCard from "./ProductCard";
import {
  storefrontProduct,
  useApi,
  type ProductDto,
} from "@/lib/catalog-client";
export default function CatalogGrid({
  category,
  limit = 24,
}: {
  category?: string;
  limit?: number;
}) {
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });
  if (category) query.set("category", category);
  const { data, loading, error, retry } = useApi<{
    items: ProductDto[];
    pagination: { totalPages: number };
  }>(`/api/products?${query}`);
  if (loading) return <p role="status">Loading the collection…</p>;
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button className="button dark" onClick={retry}>
          Try again
        </button>
      </div>
    );
  if (!data?.items.length)
    return <p>No products are available in this collection yet.</p>;
  return (
    <>
      <div className="product-grid">
        {data.items.map((p) => (
          <ProductCard product={storefrontProduct(p)} key={p.id} />
        ))}
      </div>
      {limit > 3 && data.pagination.totalPages > 1 && (
        <div className="catalog-pagination">
          <button
            className="button dark"
            disabled={page === 1}
            onClick={() => setPage((n) => n - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {data.pagination.totalPages}
          </span>
          <button
            className="button dark"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((n) => n + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
