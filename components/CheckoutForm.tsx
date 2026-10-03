"use client";
import { useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { formatPrice } from "@/lib/products";
import type { Product } from "@/lib/products";
type CheckoutResult = {
  order: { reference: string; totalAmount: string };
  whatsapp: { url: string };
};
export default function CheckoutForm({
  items,
}: {
  items: (Product & { quantity: number })[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<CheckoutResult>();
  const inFlight = useRef(false);
  const retryKey = useRef<{ fingerprint: string; key: string } | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !items.length) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    setSaved(undefined);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("customerEmail") ?? "").trim();
    const payload = {
      customerName: String(form.get("customerName") ?? "").trim(),
      customerPhone: String(form.get("customerPhone") ?? "").trim(),
      ...(email ? { customerEmail: email } : {}),
      items: items
        .map((i) => ({ productId: i.id, quantity: i.quantity }))
        .sort((a, b) => a.productId.localeCompare(b.productId)),
    };
    try {
      const fingerprint = JSON.stringify(payload);
      let previous: { fingerprint: string; key: string } | null =
        retryKey.current;
      try {
        previous =
          JSON.parse(sessionStorage.getItem("vp-checkout") ?? "null") ??
          previous;
      } catch {
        /* Generate a new key if stored data is invalid. */
      }
      const key =
        previous?.fingerprint === fingerprint
          ? previous.key
          : crypto.randomUUID();
      retryKey.current = { fingerprint, key };
      try {
        sessionStorage.setItem(
          "vp-checkout",
          JSON.stringify({ fingerprint, key }),
        );
      } catch {
        /* In-memory retries still work when storage is disabled. */
      }
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.issues?.[0]?.message ??
            result.error?.message ??
            "Unable to save your order",
        );
      const checkout = result.data as CheckoutResult;
      setSaved(checkout);
      window.location.assign(checkout.whatsapp.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your order. Please try again.",
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <form
      className="checkout-form"
      onSubmit={submit}
      onChange={() => setSaved(undefined)}
    >
      <label>
        Your name
        <input
          name="customerName"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
        />
      </label>
      <label>
        Phone number
        <input
          name="customerPhone"
          type="tel"
          autoComplete="tel"
          required
          minLength={7}
          maxLength={24}
        />
      </label>
      <label>
        Email <span>(optional)</span>
        <input
          name="customerEmail"
          type="email"
          autoComplete="email"
          maxLength={254}
        />
      </label>
      {error && (
        <p role="alert" className="checkout-error">
          {error}
        </p>
      )}
      <button className="button dark full" type="submit" disabled={pending}>
        {pending ? (
          "Saving your order…"
        ) : (
          <>
            <MessageCircle size={18} /> Proceed on WhatsApp
          </>
        )}
      </button>
      {saved && (
        <p role="status">
          Order <strong>{saved.order.reference}</strong> saved. Total:{" "}
          {formatPrice(Number(saved.order.totalAmount))}.{" "}
          <a className="text-link" href={saved.whatsapp.url}>
            Open WhatsApp
          </a>
        </p>
      )}
      <p className="tiny-note">
        We save your order first, then open WhatsApp with your reference and
        confirmed catalog prices ready to send. Tap Send to discuss and
        negotiate. Stock is confirmed by Victor Pedro.
      </p>
    </form>
  );
}
