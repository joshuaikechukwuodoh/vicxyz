"use client";
import { useApi, type CategoryDto } from "@/lib/catalog-client";
import CatalogGrid from "./CatalogGrid";
export default function CategoryCatalog({ slug }: { slug: string }) {
  const { data, loading, error, retry } = useApi<CategoryDto>(
    `/api/categories/${encodeURIComponent(slug)}`,
  );
  if (loading)
    return (
      <section className="section-pad">
        <p role="status">Loading category…</p>
      </section>
    );
  if (error || !data)
    return (
      <section className="section-pad" role="alert">
        <p>{error ?? "Category not found"}</p>
        <button className="button dark" onClick={retry}>
          Try again
        </button>
      </section>
    );
  return (
    <section className="section-pad page-section">
      <div className="page-hero">
        <p className="eyebrow">Category</p>
        <h1>{data.name}</h1>
        <p>Explore the products in this collection.</p>
      </div>
      <CatalogGrid category={data.slug} />
    </section>
  );
}
