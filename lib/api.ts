import { NextResponse } from "next/server";
import { SITE } from "./config";
import { ZodError } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assertOrigin(request: Request, required = false) {
  const origin = request.headers.get("origin");
  if (!origin) {
    if (required) throw new ApiError(403, "Request origin is not allowed");
    return;
  }
  // Trust only explicit configuration and this project's known deployment URLs.
  // Never authorize arbitrary *.vercel.app sites or a caller-supplied Host header.
  const allowed = new Set<string>();
  const add = (value?: string) => {
    if (!value) return;
    try {
      const url = new URL(value);
      if (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      )
        allowed.add(url.origin);
    } catch {
      /* Ignore invalid configuration; fail closed. */
    }
  };
  add(process.env.APP_URL);
  add(SITE.url);
  add("https://vicxyz.vercel.app");
  for (const host of [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
  ])
    if (host) add(`https://${host}`);
  for (const value of (process.env.ALLOWED_ORIGINS ?? "").split(","))
    add(value.trim());
  if (process.env.NODE_ENV !== "production") add(new URL(request.url).origin);
  if (!allowed.has(origin))
    throw new ApiError(403, "Request origin is not allowed");
}
export async function readLimitedBody(
  request: Request,
  maximum: number,
): Promise<Buffer> {
  if (Number(request.headers.get("content-length") ?? 0) > maximum)
    throw new ApiError(413, "Request is too large");
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new ApiError(413, "Request is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiError(415, "Content-Type must be application/json");
  const raw = (await readLimitedBody(request, 65536)).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Invalid JSON");
  }
}
function pgCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { code?: string; cause?: unknown };
  return e.code ?? (e.cause ? pgCode(e.cause) : undefined);
}
export function api(
  handler: (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ) => Promise<unknown>,
  status = 200,
) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ) => {
    try {
      const result = await handler(request, context);
      return result instanceof Response
        ? result
        : NextResponse.json(
            { data: result },
            { status, headers: { "Cache-Control": "no-store" } },
          );
    } catch (error) {
      if (error instanceof ApiError)
        return NextResponse.json(
          { error: { message: error.message } },
          { status: error.status },
        );
      if (error instanceof ZodError)
        return NextResponse.json(
          {
            error: {
              message: "Validation failed",
              issues: error.issues.map((i) => ({
                path: i.path,
                message: i.message,
              })),
            },
          },
          { status: 422 },
        );
      const code = pgCode(error);
      if (code === "23505")
        return NextResponse.json(
          { error: { message: "This value already exists" } },
          { status: 409 },
        );
      if (code === "23503")
        return NextResponse.json(
          {
            error: {
              message:
                "Referenced record is missing or this record is still in use",
            },
          },
          { status: 409 },
        );
      console.error("API request failed", {
        path: new URL(request.url).pathname,
        code,
        type: error instanceof Error ? error.name : "unknown",
      });
      return NextResponse.json(
        {
          error: {
            message: "Unable to complete the request. Please try again.",
          },
        },
        { status: 500 },
      );
    }
  };
}
