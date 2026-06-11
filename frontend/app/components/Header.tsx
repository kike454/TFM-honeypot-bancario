"use client";

import { useEffect, useState } from "react";

export default function Header() {
  const [nombre, setNombre]       = useState("");
  const [logoHref, setLogoHref]   = useState("/");

  useEffect(() => {
    const token = localStorage.getItem("fc_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          setNombre(payload.sub || "");
          setLogoHref("/dashboard");
        } else {
          localStorage.clear();
        }
      } catch {
        localStorage.clear();
      }
    }
  }, []);

  return (
    <header style={{ backgroundColor: "white", borderBottom: "1px solid #eaedf3", padding: "0 2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href={logoHref} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, backgroundColor: "#FF6200", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e" }}>FinConnect</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {nombre && (
            <>
              <span style={{ fontSize: 14, color: "#6b7280" }}>
                Hola, <strong style={{ color: "#1a1a2e" }}>{nombre.split("@")[0]}</strong>
              </span>
              <button
                onClick={() => { localStorage.clear(); window.location.href = "/"; }}
                style={{ fontSize: 13, color: "#9ca3af", background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}
              >
                Cerrar sesión
              </button>
            </>
          )}
          {!nombre && (
            <nav style={{ display: "flex", gap: 24 }}>
              <a href="/register" style={{ fontSize: 14, color: "#6b7280", textDecoration: "none", fontWeight: 500 }}>Registro</a>
              <a href="/password-reset" style={{ fontSize: 14, color: "#6b7280", textDecoration: "none", fontWeight: 500 }}>Ayuda</a>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}