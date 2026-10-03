"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useApi, type CategoryDto } from "@/lib/catalog-client";
export default function CategoryGrid() {
  const { data, loading, error, retry } =
    useApi<CategoryDto[]>("/api/categories");
  if (loading) return <p role="status">Loading categories…</p>;
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button className="button dark" onClick={retry}>
          Try again
        </button>
      </div>
    );
  if (!data?.length) return <p>New collections are coming soon.</p>;
  return (
    <div className="category-grid">
      {data.map((category, i) => (
        <Link
          href={`/category/${category.slug}`}
          key={category.id}
          className={`category-card c${i + 1}`}
        >
          <img src={category.imageUrl} alt={category.name} />
          <div className="overlay" />
          <span className="category-index">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="category-name">
            <h3>{category.name}</h3>
            <ArrowRight />
          </div>
        </Link>
      ))}
    </div>
  );
}
