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
  search,
  limit = 24,
}: {
  category?: string;
  search?: string;
  limit?: number;
}) {
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });
  if (category) query.set("category", category);
  if (search) query.set("search", search);
  const { data, loading, error, retry } = useApi<{
    items: ProductDto[];
    pagination: { totalPages: number };
  }>(`/api/products?${query}`);
  if (loading)
    return (
      <div className="catalog-loading" role="status">
        <p>Loading the collection…</p>
        <div className="product-grid" aria-hidden="true">
          {Array.from({ length: Math.min(limit, 6) }, (_, i) => (
            <div className="product-skeleton" key={i}>
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      </div>
    );
  if (error)
    return (
      <div className="catalog-message" role="alert">
        <p>{error}</p>
        <button className="button dark" onClick={retry}>
          Try again
        </button>
      </div>
    );
  if (!data?.items.length)
    return (
      <div className="catalog-message">
        <h3>No matching products</h3>
        <p>
          {search
            ? "Try another search or choose a different category."
            : "No products have been added to this collection yet."}
        </p>
      </div>
    );
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
