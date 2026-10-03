import { api, jsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { statusBody, idSchema } from "@/validators";
import { changeOrderStatus } from "@/services/orders";
export const runtime = "nodejs";
export const PATCH = api(async (request, { params }) => {
  await requireAdmin(request);
  return changeOrderStatus(
    idSchema.parse((await params).id),
    statusBody.parse(await jsonBody(request)).status,
  );
});
