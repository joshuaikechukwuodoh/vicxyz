"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import CatalogGrid from "./CatalogGrid";
import { useApi, type CategoryDto } from "@/lib/catalog-client";
export default function ShopCatalog() {
  const [category, setCategory] = useState("");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const {
    data: categories,
    error,
    retry,
  } = useApi<CategoryDto[]>("/api/categories");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);
  return (
    <div className="shop-catalog">
      <div className="shop-toolbar">
        <div
          className="shop-category-tabs"
          role="group"
          aria-label="Filter products by category"
        >
          <button
            className={!category ? "active" : ""}
            aria-pressed={!category}
            onClick={() => setCategory("")}
          >
            All products
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              className={category === c.slug ? "active" : ""}
              aria-pressed={category === c.slug}
              onClick={() => setCategory(c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <label className="shop-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search products</span>
          <input
            type="search"
            placeholder="Search cars, parts and more"
            maxLength={120}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="checkout-error">
          Categories could not load.{" "}
          <button onClick={retry}>Retry categories</button>
        </p>
      )}
      {(category || input) && (
        <div className="shop-filter-summary">
          <span>
            {categories?.find((c) => c.slug === category)?.name ||
              "All products"}
            {search && ` · Search: ${search}`}
          </span>
          <button
            onClick={() => {
              setCategory("");
              setInput("");
              setSearch("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <CatalogGrid
        key={`${category}:${search}`}
        category={category || undefined}
        search={search || undefined}
      />
    </div>
  );
}
