import { api } from "@/lib/api";
import { listCategories } from "@/repositories/catalog";
export const runtime = "nodejs";
export const GET = api(async () => listCategories());
