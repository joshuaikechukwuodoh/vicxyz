import { api, jsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { categorySchema } from "@/validators";
import { saveCategory } from "@/services/catalog";
import { listCategories } from "@/repositories/catalog";
export const runtime = "nodejs";
export const GET = api(async (request) => {
  await requireAdmin(request);
  return listCategories();
});
export const POST = api(async (request) => {
  await requireAdmin(request);
  return saveCategory(categorySchema.parse(await jsonBody(request)));
}, 201);
