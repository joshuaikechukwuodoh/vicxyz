import { randomUUID } from "node:crypto";
import { api, assertOrigin, jsonBody } from "@/lib/api";
import { orderSchema, idSchema } from "@/validators";
import { createOrder } from "@/services/orders";
import { consumeRateLimit } from "@/lib/rate-limit";
export const runtime = "nodejs";
export const POST = api(async (request) => {
  assertOrigin(request);
  const input = orderSchema.parse(await jsonBody(request));
  const key = idSchema.parse(
    request.headers.get("idempotency-key") ?? randomUUID(),
  );
  await consumeRateLimit(`order:${input.customerPhone}`, 20, 3600);
  return createOrder(input, key);
}, 201);
