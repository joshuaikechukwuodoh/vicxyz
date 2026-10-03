export function toCents(value: string | number): bigint {
  const text = String(value);
  if (!/^\d{1,14}(\.\d{1,2})?$/.test(text))
    throw new Error("Invalid monetary amount");
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
export function fromCents(value: bigint): string {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Monetary amount exceeds supported range");
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}
