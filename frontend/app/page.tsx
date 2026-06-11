"use client";

import { useState, useEffect } from "react";

const ENTIDADES = [
  { id: "ING",       nombre: "ING",       color: "#FF6200" },
  { id: "BBVA",      nombre: "BBVA",      color: "#004481" },
  { id: "SANTANDER", nombre: "Santander", color: "#EC0000" },
  { id: "CAIXABANK", nombre: "CaixaBank", color: "#007EAE" },
];

export default function LoginPage() {
  const [step, setStep]         = useState<"login" | "2fa">("login");
  const [entidad, setEntidad]   = useState("ING");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);

  const e = ENTIDADES.find((x) => x.id === entidad)!;

  useEffect(() => {
    if (window.location.search.includes("expired=true")) {
      setSessionExpired(true);
    }
  }, []);

  const handleLogin = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true); setError("");

    if (!email.includes("@") || !email.includes(".")) {
      setError("Introduce un email válido.");
      setLoading(false); return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setLoading(false); return;
    }

    try {
      const res = await fetch("${process.env.NEXT_PUBLIC_API_URL}/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        localStorage.setItem("fc_email", email);
        setStep("2fa");
      } else {
        const data = await res.json();
        setError(data.detail || "Email o contraseña incorrectos.");
      }
    } catch {
      setError("Error de conexión. Inténtalo más tarde.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true); setError("");
    try {
      const emailGuardado = localStorage.getItem("fc_email") || email;
      const res = await fetch("${process.env.NEXT_PUBLIC_API_URL}/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailGuardado, codigo: otp }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("fc_token", data.access_token);
        localStorage.setItem("fc_nombre", data.nombre);
        window.location.href = "/dashboard";
      } else {
        const data = await res.json();
        setError(data.detail || "Código incorrecto o expirado.");
        setOtp("");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: "100vh", backgroundColor: "#f5f6fa", display: "flex", flexDirection: "column" }}>
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1rem" }}>
        <div style={{ display: "flex", gap: 80, alignItems: "center", maxWidth: 1000, width: "100%" }}>

          {/* LEFT */}
          <div style={{ flex: 1 }} className="animate-fade-up">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: "#fff3ec", border: "1px solid #ffd9c0", borderRadius: 100, padding: "4px 12px", marginBottom: 24 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#FF6200" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#FF6200" }}>Regulado por Banco de España · PSD2</span>
            </div>
            <h1 style={{ fontSize: 40, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 16 }}>
              Todas tus cuentas,<br />
              <span style={{ color: "#FF6200" }}>un solo lugar.</span>
            </h1>
            <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.7, marginBottom: 32, maxWidth: 380 }}>
              Conecta tus bancos de forma segura y visualiza todos tus saldos y movimientos en tiempo real.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                {text: "Conexión cifrada de extremo a extremo" },
                {text: "Compatible con +50 bancos españoles" },
                {text: "Actualización en tiempo real" },
              ].map((item) => (
                <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}></span>
                  <span style={{ fontSize: 14, color: "#4b5563", fontWeight: 500 }}>{item.text}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 40, paddingTop: 32, borderTop: "1px solid #eaedf3" }}>
              <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Entidades compatibles</p>
              <div style={{ display: "flex", gap: 12 }}>
                {ENTIDADES.map((ent) => (
                  <div key={ent.id} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #eaedf3", backgroundColor: "white", fontSize: 12, fontWeight: 700, color: ent.color }}>
                    {ent.nombre}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="animate-fade-up-delay" style={{ width: 400, backgroundColor: "white", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: "1px solid #eaedf3" }}>
              {ENTIDADES.map((ent) => (
                <button key={ent.id} onClick={() => setEntidad(ent.id)} style={{
                  flex: 1, padding: "14px 0", fontSize: 11, fontWeight: 700,
                  border: "none", cursor: "pointer", transition: "all 0.2s",
                  backgroundColor: entidad === ent.id ? "white" : "#f9fafb",
                  color: entidad === ent.id ? ent.color : "#9ca3af",
                  borderBottom: entidad === ent.id ? `2px solid ${ent.color}` : "2px solid transparent",
                }}>
                  {ent.nombre}
                </button>
              ))}
            </div>

            <div style={{ padding: 32 }}>
              {sessionExpired && (
                <div style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#92400e" }}>
                  Tu sesión ha expirado. Por favor inicia sesión de nuevo.
                </div>
              )}

              {step === "login" ? (
                <>
                  <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Accede a FinConnect</h2>
                    <p style={{ fontSize: 13, color: "#9ca3af" }}>Introduce tu email y contraseña</p>
                  </div>

                  <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
                      <input type="email" value={email} required
                        onChange={(ev) => setEmail(ev.target.value)}
                        placeholder="tu@email.com"
                        style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", color: "#1a1a2e", backgroundColor: "#f9fafb" }}
                        onFocus={(ev) => { ev.target.style.borderColor = e.color; ev.target.style.backgroundColor = "white"; }}
                        onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; ev.target.style.backgroundColor = "#f9fafb"; }}
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Contraseña</label>
                      <div style={{ position: "relative" }}>
                        <input type={showPass ? "text" : "password"} value={password} required
                          onChange={(ev) => setPassword(ev.target.value)}
                          placeholder="••••••••"
                          style={{ width: "100%", padding: "11px 40px 11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", color: "#1a1a2e", backgroundColor: "#f9fafb" }}
                          onFocus={(ev) => { ev.target.style.borderColor = e.color; ev.target.style.backgroundColor = "white"; }}
                          onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; ev.target.style.backgroundColor = "#f9fafb"; }}
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15 }}>
                          {showPass ? "Ocultar" : "Mostrar"}
                        </button>
                      </div>
                      <div style={{ textAlign: "right", marginTop: 6 }}>
                        <a href="/password-reset" style={{ fontSize: 12, color: e.color, textDecoration: "none", fontWeight: 500 }}>¿Olvidaste tu contraseña?</a>
                      </div>
                    </div>

                    {error && (
                      <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>
                        {error}
                      </div>
                    )}

                    <button type="submit" disabled={loading} style={{ width: "100%", padding: 13, fontSize: 15, fontWeight: 700, backgroundColor: loading ? "#e5e7eb" : e.color, color: "white", border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      {loading ? <div className="spinner" /> : "Acceder"}
                    </button>

                    <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", marginTop: 16 }}>
                      ¿No tienes cuenta?{" "}
                      <a href="/register" style={{ color: "#FF6200", textDecoration: "none", fontWeight: 600 }}>Regístrate gratis</a>
                    </p>
                  </form>

                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
                    <p style={{ fontSize: 11, color: "#d1d5db" }}> Conexión segura · PSD2 · ISO 27001</p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ width: 56, height: 56, backgroundColor: "#fff3ec", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>📧</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Verifica tu identidad</h2>
                    <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.5 }}>
                      Hemos enviado un código de 6 dígitos a <strong style={{ color: "#1a1a2e" }}>{email}</strong>
                    </p>
                  </div>

                  <form onSubmit={handleOtp}>
                    <input type="text" value={otp} required maxLength={6}
                      onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      style={{ width: "100%", padding: 14, fontSize: 28, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", textAlign: "center", letterSpacing: "0.4em", fontFamily: "monospace", color: "#1a1a2e", backgroundColor: "#f9fafb", marginBottom: 16 }}
                      onFocus={(ev) => { ev.target.style.borderColor = e.color; }}
                      onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; }}
                    />
                    {error && (
                      <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>
                        {error}
                      </div>
                    )}
                    <button type="submit" disabled={loading || otp.length < 6} style={{ width: "100%", padding: 13, fontSize: 15, fontWeight: 700, backgroundColor: otp.length === 6 ? e.color : "#e5e7eb", color: otp.length === 6 ? "white" : "#9ca3af", border: "none", borderRadius: 10, cursor: otp.length === 6 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      {loading ? <div className="spinner" /> : "Verificar y entrar"}
                    </button>
                    <button type="button" onClick={() => { setStep("login"); setOtp(""); setError(""); }}
                      style={{ width: "100%", marginTop: 10, padding: 10, fontSize: 13, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>
                      ← Volver
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}