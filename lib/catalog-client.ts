"use client";
import { useEffect, useState } from "react";
import type { Product } from "./products";
import type { ProductStatus } from "@/types/api";
export type CategoryDto = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
};
export type ProductDto = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  quantity: number;
  condition: string;
  status: ProductStatus;
  category: CategoryDto;
  images: { id: string; imageUrl: string }[];
};
export function storefrontProduct(
  product: ProductDto,
): Product & { images: string[]; status: ProductStatus } {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    stock: product.status === "OUT_OF_STOCK" ? 0 : product.quantity,
    condition: product.condition,
    category: product.category.name,
    categorySlug: product.category.slug,
    image: product.images[0]?.imageUrl ?? "/images/victor-pedro/logo.png",
    images: product.images.map((i) => i.imageUrl),
    status: product.status,
  };
}
export function useApi<T>(url: string) {
  const [state, setState] = useState<{
    data?: T;
    error?: string;
    loading: boolean;
  }>({ loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error?.message ?? "Unable to load the catalog",
          );
        setState({ data: result.data, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            error:
              error instanceof Error
                ? error.message
                : "Unable to load the catalog",
            loading: false,
          });
      });
    return () => controller.abort();
  }, [url, attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
