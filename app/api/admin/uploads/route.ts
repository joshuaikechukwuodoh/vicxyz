import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { uploadImages } from "@/services/uploads";
export const runtime = "nodejs";
export const POST = api(async (request) => {
  await requireAdmin(request);
  return uploadImages(request);
}, 201);
