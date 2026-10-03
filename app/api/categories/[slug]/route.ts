import { api, ApiError } from "@/lib/api";
import { findCategory } from "@/repositories/catalog";
export const runtime = "nodejs";
export const GET = api(async (_request, { params }) => {
  const row = await findCategory((await params).slug);
  if (!row) throw new ApiError(404, "Category not found");
  return row;
});
