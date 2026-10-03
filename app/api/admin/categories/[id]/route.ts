import { api, jsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { categoryPatch, idSchema } from "@/validators";
import { saveCategory, deleteCategory } from "@/services/catalog";
export const runtime = "nodejs";
export const PATCH = api(async (request, { params }) => {
  await requireAdmin(request);
  return saveCategory(
    categoryPatch.parse(await jsonBody(request)),
    idSchema.parse((await params).id),
  );
});
export const DELETE = api(async (request, { params }) => {
  await requireAdmin(request);
  return deleteCategory(idSchema.parse((await params).id));
});
