"use client";

import { useState } from "react";

type RequestType = "service" | "bill";

export default function ServiceActions({
  token,
}: {
  token: string;
}) {
  const [loading, setLoading] = useState<RequestType | null>(null);
  const [message, setMessage] = useState("");

  async function sendRequest(type: RequestType) {
    try {
      setLoading(type);
      setMessage("");

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      if (!url || !key) {
        throw new Error("Supabase configuratie ontbreekt");
      }

      const response = await fetch(
        `${url}/rest/v1/rpc/create_service_request`,
        {
          method: "POST",
          headers: {
            apikey: key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_token: token,
            p_request_type: type,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setMessage(
        type === "service"
          ? "Bediening is op de hoogte."
          : "De rekening is aangevraagd."
      );
    } catch {
      setMessage(
        "Het verzoek kon niet worden verstuurd. Probeer het opnieuw."
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <section
      style={{
        maxWidth: "820px",
        margin: "26px auto 0",
        padding: "0 20px",
      }}
    >
      <div
        style={{
          background: "#171714",
          color: "#fff",
          borderRadius: "24px",
          padding: "24px",
        }}
      >
        <p
          style={{
            margin: "0 0 6px",
            color: "#d4aa66",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: ".14em",
            textTransform: "uppercase",
          }}
        >
          Tafelservice
        </p>

        <h2
          style={{
            margin: "0 0 18px",
            fontSize: "22px",
          }}
        >
          Waar kunnen we u mee helpen?
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "10px",
          }}
        >
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => sendRequest("service")}
            style={{
              border: "1px solid rgba(255,255,255,.18)",
              borderRadius: "16px",
              padding: "16px 18px",
              background: "#fff",
              color: "#171714",
              fontSize: "15px",
              fontWeight: 800,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading === "service"
              ? "Versturen..."
              : "Bediening roepen"}
          </button>

          <button
            type="button"
            disabled={loading !== null}
            onClick={() => sendRequest("bill")}
            style={{
              border: "1px solid rgba(255,255,255,.28)",
              borderRadius: "16px",
              padding: "16px 18px",
              background: "transparent",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 800,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading === "bill"
              ? "Versturen..."
              : "Rekening vragen"}
          </button>
        </div>

        {message && (
          <p
            style={{
              margin: "16px 0 0",
              color: "#e8dfd0",
              fontSize: "14px",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
