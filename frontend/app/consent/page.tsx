"use client";

import { useState } from "react";

const ENTIDADES = [
  { id: "ING",       nombre: "ING",       color: "#FF6200" },
  { id: "BBVA",      nombre: "BBVA",      color: "#004481" },
  { id: "SANTANDER", nombre: "Santander", color: "#EC0000" },
  { id: "CAIXABANK", nombre: "CaixaBank", color: "#007EAE" },
];

export default function ConsentPage() {
  const [step, setStep]         = useState<"select" | "credentials" | "sca" | "done">("select");
  const [entidad, setEntidad]   = useState("ING");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [error, setError]       = useState("");

  const e = ENTIDADES.find((x) => x.id === entidad)!;

  const handleConsent = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/consents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entidad, username, password, scope: "accounts balances transactions" }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuthCode(data.authCode);
        setStep("sca");
      } else {
        setError("Error al conectar con el banco. Inténtalo de nuevo.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  const handleSca = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setStep("done");
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: "#f5f6fa", minHeight: "100vh", padding: "3rem 1rem" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: "#9ca3af" }}>
          <a href="/dashboard" style={{ color: "#FF6200", textDecoration: "none", fontWeight: 500 }}>Dashboard</a>
          <span>›</span>
          <span>Conectar nuevo banco</span>
        </div>

        
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
          {["Seleccionar banco", "Credenciales", "Verificación"].map((label, i) => {
            const stepIndex = ["select", "credentials", "sca", "done"].indexOf(step);
            const active    = i === (stepIndex === 3 ? 2 : stepIndex);
            const done      = i < (stepIndex === 3 ? 3 : stepIndex);
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    backgroundColor: done ? "#16a34a" : active ? e.color : "#e5e7eb",
                    color: done || active ? "white" : "#9ca3af",
                  }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? e.color : done ? "#16a34a" : "#9ca3af", whiteSpace: "nowrap" }}>{label}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 1, backgroundColor: done ? "#16a34a" : "#e5e7eb", margin: "0 8px", marginBottom: 22 }} />}
              </div>
            );
          })}
        </div>

       
        <div style={{ backgroundColor: "white", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)", overflow: "hidden" }}>

          
          {step === "select" && (
            <div style={{ padding: 32 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>Conecta tu banco</h2>
              <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 28, lineHeight: 1.6 }}>
                Selecciona la entidad bancaria que quieres agregar a tu cuenta FinConnect.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ENTIDADES.map((ent) => (
                  <button
                    key={ent.id}
                    onClick={() => setEntidad(ent.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "16px 18px", border: entidad === ent.id ? `2px solid ${ent.color}` : "2px solid #e5e7eb",
                      borderRadius: 12, backgroundColor: entidad === ent.id ? `${ent.color}08` : "white",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: `${ent.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: ent.color }}>{ent.nombre[0]}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>{ent.nombre}</span>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${entidad === ent.id ? ent.color : "#e5e7eb"}`, backgroundColor: entidad === ent.id ? ent.color : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {entidad === ent.id && <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "white" }} />}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep("credentials")}
                style={{ marginTop: 24, width: "100%", padding: 13, fontSize: 15, fontWeight: 700, backgroundColor: e.color, color: "white", border: "none", borderRadius: 12, cursor: "pointer" }}
              >
                Continuar con {e.nombre} →
              </button>
            </div>
          )}

         
          {step === "credentials" && (
            <div style={{ padding: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${e.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: e.color }}>{e.nombre[0]}</span>
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>Credenciales de {e.nombre}</h2>
                  <p style={{ fontSize: 13, color: "#9ca3af" }}>Introduce tus datos de acceso al banco</p>
                </div>
              </div>

              <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16 }}></span>
                <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                  Tus credenciales se transmiten de forma cifrada y nunca son almacenadas por FinConnect. Conexión regulada bajo PSD2.
                </p>
              </div>

              <form onSubmit={handleConsent}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Usuario / DNI
                  </label>
                  <input
                    type="text" value={username} required
                    onChange={(ev) => setUsername(ev.target.value)}
                    placeholder="Introduce tu usuario"
                    style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", color: "#1a1a2e", backgroundColor: "#f9fafb" }}
                    onFocus={(ev) => { ev.target.style.borderColor = e.color; ev.target.style.backgroundColor = "white"; }}
                    onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; ev.target.style.backgroundColor = "#f9fafb"; }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Contraseña
                  </label>
                  <input
                    type="password" value={password} required
                    onChange={(ev) => setPassword(ev.target.value)}
                    placeholder="••••••••"
                    style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", color: "#1a1a2e", backgroundColor: "#f9fafb" }}
                    onFocus={(ev) => { ev.target.style.borderColor = e.color; ev.target.style.backgroundColor = "white"; }}
                    onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; ev.target.style.backgroundColor = "#f9fafb"; }}
                  />
                </div>

                {error && (
                  <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setStep("select")}
                    style={{ flex: 1, padding: 13, fontSize: 14, fontWeight: 600, backgroundColor: "white", color: "#6b7280", border: "1.5px solid #e5e7eb", borderRadius: 12, cursor: "pointer" }}>
                    ← Volver
                  </button>
                  <button type="submit" disabled={loading}
                    style={{ flex: 2, padding: 13, fontSize: 15, fontWeight: 700, backgroundColor: loading ? "#e5e7eb" : e.color, color: "white", border: "none", borderRadius: 12, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {loading ? <div className="spinner" /> : "Autorizar acceso →"}
                  </button>
                </div>
              </form>
            </div>
          )}

        
          {step === "sca" && (
            <div style={{ padding: 32, textAlign: "center" }}>
             
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Verificación de seguridad</h2>
              <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 28 }}>
                {e.nombre} ha enviado un código de verificación al teléfono vinculado a tu cuenta.
              </p>
              <form onSubmit={handleSca}>
                <input
                  type="text" value={otp} required maxLength={6}
                  onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  style={{ width: "100%", padding: 14, fontSize: 28, border: "1.5px solid #e5e7eb", borderRadius: 12, outline: "none", textAlign: "center", letterSpacing: "0.4em", fontFamily: "monospace", color: "#1a1a2e", backgroundColor: "#f9fafb", marginBottom: 16 }}
                  onFocus={(ev) => { ev.target.style.borderColor = e.color; }}
                  onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; }}
                />
                <button type="submit" disabled={loading || otp.length < 6}
                  style={{ width: "100%", padding: 13, fontSize: 15, fontWeight: 700, backgroundColor: otp.length === 6 ? e.color : "#e5e7eb", color: otp.length === 6 ? "white" : "#9ca3af", border: "none", borderRadius: 12, cursor: otp.length === 6 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {loading ? <div className="spinner" /> : "Confirmar conexión"}
                </button>
              </form>
            </div>
          )}

          
          {step === "done" && (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, backgroundColor: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}></div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>¡Banco conectado!</h2>
              <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 28 }}>
                Tu cuenta de <strong style={{ color: e.color }}>{e.nombre}</strong> se ha conectado correctamente a FinConnect. Ya puedes ver tus saldos y movimientos.
              </p>
              <button
                onClick={() => window.location.href = "/dashboard"}
                style={{ padding: "13px 32px", fontSize: 15, fontWeight: 700, backgroundColor: e.color, color: "white", border: "none", borderRadius: 12, cursor: "pointer" }}
              >
                Ver mis cuentas →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}