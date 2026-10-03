import { randomBytes, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { users, adminSessions } from "@/db/schema";
import { ApiError, assertOrigin } from "./api";
import { hashPassword, verifyPassword } from "./password";
import { consumeRateLimit } from "./rate-limit";
const cookieName =
  process.env.NODE_ENV === "production" ? "__Host-vp-admin" : "vp-admin";
const maxAge = 8 * 60 * 60;
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge,
};
function tokenHash(token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret).update(token).digest("hex");
}
let dummyHash: Promise<string> | undefined;
export async function login(email: string, password: string) {
  await consumeRateLimit("login:global", 1000, 15 * 60);
  await consumeRateLimit(`login:${email}`, 10, 15 * 60);
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email));
  dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
  const valid = await verifyPassword(
    password,
    user?.passwordHash ?? (await dummyHash),
  );
  if (!user || !valid || user.role !== "ADMIN")
    throw new ApiError(401, "Invalid email or password");
  const token = randomBytes(32).toString("hex");
  await db
    .insert(adminSessions)
    .values({
      userId: user.id,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + maxAge * 1000),
    });
  (await cookies()).set(cookieName, token, cookieOptions);
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
export async function requireAdmin(request?: Request) {
  if (request && !["GET", "HEAD"].includes(request.method))
    assertOrigin(request, true);
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new ApiError(401, "Admin login required");
  const [user] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(adminSessions)
    .innerJoin(users, eq(users.id, adminSessions.userId))
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash(token)),
        gt(adminSessions.expiresAt, new Date()),
      ),
    );
  if (!user || user.role !== "ADMIN")
    throw new ApiError(401, "Admin login required");
  return user;
}
export async function logout() {
  const token = (await cookies()).get(cookieName)?.value;
  if (token)
    await getDb()
      .delete(adminSessions)
      .where(eq(adminSessions.tokenHash, tokenHash(token)));
  (await cookies()).set(cookieName, "", { ...cookieOptions, maxAge: 0 });
  return { loggedOut: true };
}
