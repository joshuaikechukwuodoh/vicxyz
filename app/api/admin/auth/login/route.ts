import { api, assertOrigin, jsonBody } from "@/lib/api";
import { loginSchema } from "@/validators";
import { login } from "@/lib/auth";
export const runtime = "nodejs";
export const POST = api(async (request) => {
  assertOrigin(request, true);
  const input = loginSchema.parse(await jsonBody(request));
  return login(input.email, input.password);
});
