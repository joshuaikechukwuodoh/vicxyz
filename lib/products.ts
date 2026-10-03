export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug: string;
  price: number;
  stock: number;
  condition: string;
  description: string;
  image: string;
  featured?: boolean;
};

export const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);
