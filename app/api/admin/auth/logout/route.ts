import { api } from "@/lib/api";
import { requireAdmin, logout } from "@/lib/auth";
export const runtime = "nodejs";
export const POST = api(async (request) => {
  await requireAdmin(request);
  return logout();
});
