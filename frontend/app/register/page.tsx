"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [step, setStep]         = useState<"form" | "otp" | "done">("form");
  const [nombre, setNombre]     = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [otp, setOtp]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleRegister = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError("");

    // Validaciones frontend
    if (!email.includes("@") || !email.includes(".")) {
      setError("Introduce un email válido."); return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres."); return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden."); return;
    }

    setLoading(true);
    try {
      const res = await fetch("${process.env.NEXT_PUBLIC_API_URL}/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("fc_email", email);
        setStep("otp");
      } else {
        setError(data.detail || "Error al crear la cuenta.");
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
      const res = await fetch("${process.env.NEXT_PUBLIC_API_URL}/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, codigo: otp }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("fc_token", data.access_token);
        localStorage.setItem("fc_nombre", data.nombre);
        setStep("done");
      } else {
        setError("Código incorrecto o expirado.");
        setOtp("");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: "#f5f6fa", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        <div style={{ marginBottom: 24 }}>
          <a href="/" style={{ fontSize: 13, color: "#FF6200", textDecoration: "none", fontWeight: 500 }}>← Volver al inicio de sesión</a>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)", padding: 32 }}>

          {step === "form" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, backgroundColor: "#FF6200", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>Crear cuenta FinConnect</h2>
                <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6 }}>Gestiona todas tus cuentas bancarias en un solo lugar.</p>
                </div>

              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Nombre completo</label>
                  <input type="text" value={nombre} required
                    onChange={(ev) => setNombre(ev.target.value)}
                    placeholder="Tu nombre"
                    style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", color: "#1a1a2e", backgroundColor: "#f9fafb" }}
                    onFocus={(ev) => { ev.target.style.borderColor = "#FF6200"; ev.target.style.backgroundColor = "white"; }}
                    onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; ev.target.style.backgroundColor = "#f9fafb"; }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
                  <input type="email" value={email} required
                    onChange={(ev) => setEmail(ev.target.value)}
                    placeholder="tu@email.com"
                    style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", color: "#1a1a2e", backgroundColor: "#f9fafb" }}
                    onFocus={(ev) => { ev.target.style.borderColor = "#FF6200"; ev.target.style.backgroundColor = "white"; }}
                    onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; ev.target.style.backgroundColor = "#f9fafb"; }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Contraseña</label>
                  <input type="password" value={password} required
                    onChange={(ev) => setPassword(ev.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", color: "#1a1a2e", backgroundColor: "#f9fafb" }}
                    onFocus={(ev) => { ev.target.style.borderColor = "#FF6200"; ev.target.style.backgroundColor = "white"; }}
                    onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; ev.target.style.backgroundColor = "#f9fafb"; }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Confirmar contraseña</label>
                  <input type="password" value={confirm} required
                    onChange={(ev) => setConfirm(ev.target.value)}
                    placeholder="••••••••"
                    style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", color: "#1a1a2e", backgroundColor: "#f9fafb" }}
                    onFocus={(ev) => { ev.target.style.borderColor = "#FF6200"; ev.target.style.backgroundColor = "white"; }}
                    onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; ev.target.style.backgroundColor = "#f9fafb"; }}
                  />
                </div>

                {error && (
                  <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{ width: "100%", padding: 13, fontSize: 15, fontWeight: 700, backgroundColor: loading ? "#e5e7eb" : "#FF6200", color: "white", border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {loading ? <div className="spinner" /> : "Crear cuenta →"}
                </button>

                <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", marginTop: 16 }}>
                  ¿Ya tienes cuenta?{" "}
                  <a href="/" style={{ color: "#FF6200", textDecoration: "none", fontWeight: 600 }}>Inicia sesión</a>
                </p>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, backgroundColor: "#fff3ec", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>📧</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>Verifica tu email</h2>
                <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.5 }}>
                  Hemos enviado un código de verificación a <strong style={{ color: "#1a1a2e" }}>{email}</strong>
                </p>
              </div>
              <form onSubmit={handleOtp}>
                <input type="text" value={otp} required maxLength={6}
                  onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  style={{ width: "100%", padding: 14, fontSize: 28, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", textAlign: "center", letterSpacing: "0.4em", fontFamily: "monospace", color: "#1a1a2e", backgroundColor: "#f9fafb", marginBottom: 16 }}
                  onFocus={(ev) => { ev.target.style.borderColor = "#FF6200"; }}
                  onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; }}
                />
                {error && (
                  <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading || otp.length < 6} style={{ width: "100%", padding: 13, fontSize: 15, fontWeight: 700, backgroundColor: otp.length === 6 ? "#FF6200" : "#e5e7eb", color: otp.length === 6 ? "white" : "#9ca3af", border: "none", borderRadius: 10, cursor: otp.length === 6 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {loading ? <div className="spinner" /> : "Verificar y acceder"}
                </button>
              </form>
            </>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, backgroundColor: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>¡Cuenta creada!</h2>
              <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>
                Tu cuenta ha sido verificada. Ya puedes acceder a FinConnect.
              </p>
              <button onClick={() => window.location.href = "/dashboard"}
                style={{ padding: "13px 32px", fontSize: 15, fontWeight: 700, backgroundColor: "#FF6200", color: "white", border: "none", borderRadius: 12, cursor: "pointer" }}>
                Ir al dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}