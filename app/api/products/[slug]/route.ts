import { api, ApiError } from "@/lib/api";
import { findProduct } from "@/repositories/catalog";
export const runtime = "nodejs";
export const GET = api(async (_request, { params }) => {
  const row = await findProduct((await params).slug);
  if (!row) throw new ApiError(404, "Product not found");
  return row;
});
