import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
export const runtime = "nodejs";
export const GET = api(async (request) => requireAdmin(request));
