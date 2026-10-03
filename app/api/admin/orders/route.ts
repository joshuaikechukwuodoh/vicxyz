import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { orderFilters } from "@/validators";
import { listOrders } from "@/services/orders";
export const runtime = "nodejs";
export const GET = api(async (request) => {
  await requireAdmin(request);
  return listOrders(
    orderFilters.parse(Object.fromEntries(new URL(request.url).searchParams)),
  );
});
