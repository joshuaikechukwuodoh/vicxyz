import { api, jsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { productSchema, productFilters } from "@/validators";
import { saveProduct } from "@/services/catalog";
import { listProducts } from "@/repositories/catalog";
export const runtime = "nodejs";
export const GET = api(async (request) => {
  await requireAdmin(request);
  return listProducts(
    productFilters.parse(Object.fromEntries(new URL(request.url).searchParams)),
  );
});
export const POST = api(async (request) => {
  await requireAdmin(request);
  return saveProduct(productSchema.parse(await jsonBody(request)));
}, 201);
