"use client";

import { useState } from "react";

export default function PasswordResetPage() {
  const [step, setStep]               = useState<"email" | "otp" | "newpass" | "done">("email");
  const [email, setEmail]             = useState("");
  const [otp, setOtp]                 = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const handleEmail = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true); setError("");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStep("otp");
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, codigo: otp }),
      });
      if (res.ok) {
        setStep("newpass");
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

 const handleNewPassword = async (ev: React.FormEvent) => {
  ev.preventDefault();
  setError("");
  if (newPassword.length < 8) { setError("Mínimo 8 caracteres."); return; }
  if (newPassword !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, new_password: newPassword }),
    });
    if (res.ok) {
      setStep("done");
    } else {
      setError("Error al cambiar la contraseña.");
    }
  } catch {
    setError("Error de conexión.");
  }
};
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: "#f5f6fa", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>

        <div style={{ marginBottom: 24 }}>
          <a href="/" style={{ fontSize: 13, color: "#FF6200", textDecoration: "none", fontWeight: 500 }}>← Volver al inicio de sesión</a>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)", padding: 32 }}>

          {step === "email" && (
            <>
              <div style={{ marginBottom: 24 }}>
                
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>Recuperar contraseña</h2>
                <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6 }}>
                  Introduce tu email y te enviaremos un código para restablecer tu contraseña.
                </p>
              </div>
              <form onSubmit={handleEmail}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
                  <input type="email" value={email} required
                    onChange={(ev) => setEmail(ev.target.value)}
                    placeholder="tu@email.com"
                    style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", color: "#1a1a2e", backgroundColor: "#f9fafb" }}
                    onFocus={(ev) => { ev.target.style.borderColor = "#FF6200"; ev.target.style.backgroundColor = "white"; }}
                    onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; ev.target.style.backgroundColor = "#f9fafb"; }}
                  />
                </div>
                {error && <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ width: "100%", padding: 13, fontSize: 15, fontWeight: 700, backgroundColor: loading ? "#e5e7eb" : "#FF6200", color: "white", border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {loading ? <div className="spinner" /> : "Enviar código →"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>Revisa tu email</h2>
                <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.5 }}>
                  Hemos enviado un código de 6 dígitos a <strong style={{ color: "#1a1a2e" }}>{email}</strong>
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
                {error && <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>{error}</div>}
                <button type="submit" disabled={loading || otp.length < 6} style={{ width: "100%", padding: 13, fontSize: 15, fontWeight: 700, backgroundColor: otp.length === 6 ? "#FF6200" : "#e5e7eb", color: otp.length === 6 ? "white" : "#9ca3af", border: "none", borderRadius: 10, cursor: otp.length === 6 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {loading ? <div className="spinner" /> : "Verificar código"}
                </button>
                <button type="button" onClick={() => { setStep("email"); setOtp(""); }}
                  style={{ width: "100%", marginTop: 10, padding: 10, fontSize: 13, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>
                  ← Volver
                </button>
              </form>
            </>
          )}

          {step === "newpass" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, backgroundColor: "#fff3ec", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 22 }}>🔐</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>Nueva contraseña</h2>
                <p style={{ fontSize: 14, color: "#9ca3af" }}>Introduce tu nueva contraseña.</p>
              </div>
              <form onSubmit={handleNewPassword}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Nueva contraseña</label>
                  <input type="password" value={newPassword} required
                    onChange={(ev) => setNewPassword(ev.target.value)}
                    placeholder="••••••••"
                    style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", color: "#1a1a2e", backgroundColor: "#f9fafb" }}
                    onFocus={(ev) => { ev.target.style.borderColor = "#FF6200"; ev.target.style.backgroundColor = "white"; }}
                    onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; ev.target.style.backgroundColor = "#f9fafb"; }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Confirmar contraseña</label>
                  <input type="password" value={confirmPassword} required
                    onChange={(ev) => setConfirmPassword(ev.target.value)}
                    placeholder="••••••••"
                    style={{ width: "100%", padding: "11px 14px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", color: "#1a1a2e", backgroundColor: "#f9fafb" }}
                    onFocus={(ev) => { ev.target.style.borderColor = "#FF6200"; ev.target.style.backgroundColor = "white"; }}
                    onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; ev.target.style.backgroundColor = "#f9fafb"; }}
                  />
                </div>
                {error && <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>{error}</div>}
                <button type="submit" style={{ width: "100%", padding: 13, fontSize: 15, fontWeight: 700, backgroundColor: "#FF6200", color: "white", border: "none", borderRadius: 10, cursor: "pointer" }}>
                  Cambiar contraseña
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
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Contraseña actualizada</h2>
              <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>
                Tu contraseña ha sido actualizada correctamente.
              </p>
              <button onClick={() => window.location.href = "/"}
                style={{ padding: "13px 32px", fontSize: 15, fontWeight: 700, backgroundColor: "#FF6200", color: "white", border: "none", borderRadius: 12, cursor: "pointer" }}>
                Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}