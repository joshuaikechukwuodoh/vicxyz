import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [algorithm, salt, stored] = hash.split("$");
  if (algorithm !== "scrypt" || !salt || !stored || stored.length !== 128)
    return false;
  const key = await derive(password, salt);
  return timingSafeEqual(key, Buffer.from(stored, "hex"));
}
