"use client";

import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

type Product = { id: string; name: string; price_cents: number };
type Line = Product & { quantity: number };
type CartContext = {
  lines: Line[];
  add: (product: Product) => void;
  change: (id: string, amount: number) => void;
  clear: () => void;
  token: string;
};
const Cart = createContext<CartContext | null>(null);
const euro = (cents: number) => new Intl.NumberFormat("nl-NL", {
  style: "currency", currency: "EUR",
}).format(cents / 100);

function useCart() {
  const context = useContext(Cart);
  if (!context) throw new Error("Orderformulier buiten QR-menu");
  return context;
}

export function GuestOrderProvider({ children, token }: {
  children: ReactNode; token: string;
}) {
  const [lines, setLines] = useState<Line[]>([]);


  function add(product: Product) {


    setLines((before) => {
      const old = before.find((line) => line.id === product.id);
      if (old) return before.map((line) => line.id === product.id
        ? { ...line, quantity: Math.min(20, line.quantity + 1) } : line);
      return before.length >= 30 ? before : [...before, { ...product, quantity: 1 }];
    });
  }
  function change(id: string, amount: number) {


    setLines((before) => before.map((line) => line.id === id
      ? { ...line, quantity: Math.max(0, Math.min(20, line.quantity + amount)) }
      : line).filter((line) => line.quantity > 0));
  }
  return <Cart.Provider value={{ lines, add, change, clear: () => setLines([]), token }}>{children}</Cart.Provider>;
}

export function OrderAddButton({ item }: { item: Product }) {
  const { add } = useCart();
  return <button type="button" onClick={() => add(item)}
    style={{ marginTop: 14, padding: "10px 17px", border: 0, borderRadius: 12,
      background: "#293923", color: "#fffaf2", fontWeight: 700, cursor: "pointer" }}>
    + Toevoegen
  </button>;
}

export function GuestCart() {
  const { lines, change, clear, token } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const key = useRef<string | null>(null);
  const total = lines.reduce((n, line) => n + line.price_cents * line.quantity, 0);

  async function submit() {
    if (lines.length === 0 || submitting) return;
    setSubmitting(true);
    setMessage("");
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/guest/qr-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          token,
          clientRequestId: key.current,
          items: lines.map((line) => ({ id: line.id, quantity: line.quantity })),
        }),
      });
      const result = (await response.json()) as {
        error?: string; id?: string; total_cents?: number;
      };
      if (!response.ok || !result.id) {
        throw new Error(result.error || "Bestellen is niet gelukt.");
      }
      setMessage("Bestelling ontvangen. Totaal: " + euro(result.total_cents ?? total) +
        ". De bediening verwerkt deze bestelling.");
      // Keep the confirmation visible; prevent another submission of the same cart.
      setSubmitting(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Probeer het opnieuw.");
      setSubmitting(false);
    }
  }
  if (lines.length === 0) return null;
  return (
    <section aria-label="Je bestelling" style={{
      maxWidth: 820, margin: "20px auto", padding: 20,
      borderRadius: 18, border: "1px solid #cdb98d", background: "#fffaf1",
      boxShadow: "0 8px 24px #42382119",
    }}>
      <h2 style={{ fontSize: 25, margin: "0 0 15px", color: "#293923" }}>
        Je bestelling
      </h2>
      <div style={{ display: "grid", gap: 10 }}>
        {lines.map((line) => <div key={line.id} style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
          borderBottom: "1px solid #e9decb", paddingBottom: 10,
        }}>
          <span style={{ flex: 1, minWidth: 135 }}>{line.name}</span>
          <button type="button" aria-label={"Eén minder " + line.name}
            disabled={submitting} onClick={() => change(line.id, -1)}>−</button>
          <strong>{line.quantity}</strong>
          <button type="button" aria-label={"Eén meer " + line.name}
            disabled={submitting || line.quantity >= 20}
            onClick={() => change(line.id, 1)}>+</button>
          <span style={{ minWidth: 75, textAlign: "right" }}>
            {euro(line.quantity * line.price_cents)}
          </span>
        </div>)}
      </div>
      <p style={{ fontSize: 19, fontWeight: 700 }}>Totaal: {euro(total)}</p>
      <p style={{ fontSize: 13, color: "#59604b" }}>
        Je betaalt niet online. De rekening en betaling lopen via het restaurant.
      </p>
      <button type="button" disabled={submitting} onClick={submit}
        style={{ width: "100%", border: 0, borderRadius: 12, padding: 15,
          background: "#293923", color: "white", fontWeight: 700,
          cursor: submitting ? "default" : "pointer" }}>
        {submitting ? "Bestelling verwerkt" : "Bestelling plaatsen"}
      </button>
      {message && <p role="status" style={{ marginTop: 12 }}>{message}</p>}
      {submitting && message.startsWith("Bestelling ontvangen") &&
        <button type="button" onClick={() => {
          clear(); key.current = null; setSubmitting(false); setMessage("");
        }} style={{ marginTop: 12, border: "1px solid #bba580", padding: 12,
          borderRadius: 10, background: "white", cursor: "pointer" }}>
          Nieuwe bestelling beginnen
        </button>}
    </section>
  );
}
