import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { idSchema } from "@/validators";
import { findOrder } from "@/services/orders";
export const runtime = "nodejs";
export const GET = api(async (request, { params }) => {
  await requireAdmin(request);
  return findOrder(idSchema.parse((await params).id));
});
