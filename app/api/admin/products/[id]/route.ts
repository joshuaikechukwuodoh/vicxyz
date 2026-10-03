import { api, jsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { productPatch, idSchema } from "@/validators";
import { saveProduct, deleteProduct } from "@/services/catalog";
export const runtime = "nodejs";
export const PATCH = api(async (request, { params }) => {
  await requireAdmin(request);
  return saveProduct(
    productPatch.parse(await jsonBody(request)),
    idSchema.parse((await params).id),
  );
});
export const DELETE = api(async (request, { params }) => {
  await requireAdmin(request);
  return deleteProduct(idSchema.parse((await params).id));
});
