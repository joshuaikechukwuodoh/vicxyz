import { api } from "@/lib/api";
import { listProducts } from "@/repositories/catalog";
import { productFilters } from "@/validators";
export const runtime = "nodejs";
export const GET = api(async (request) =>
  listProducts(
    productFilters.parse(Object.fromEntries(new URL(request.url).searchParams)),
  ),
);
