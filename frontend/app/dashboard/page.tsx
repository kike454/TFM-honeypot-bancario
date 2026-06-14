"use client";

import { useState, useEffect, useMemo } from "react";

const ENTIDADES: Record<string, { color: string; nombre: string }> = {
  ING:       { color: "#FF6200", nombre: "ING" },
  BBVA:      { color: "#004481", nombre: "BBVA" },
  SANTANDER: { color: "#EC0000", nombre: "Santander" },
  CAIXABANK: { color: "#007EAE", nombre: "CaixaBank" },
};

const CATEGORIAS = [
  "Todas", "Supermercado", "Restaurante", "Gasolinera", "Farmacia",
  "Amazon", "Netflix", "Spotify", "Electricidad", "Alquiler",
  "Gimnasio", "Transporte", "Ropa", "Salud", "Nómina", "Transferencia recibida",
];

type Cuenta = {
  resourceId: string;
  iban: string;
  ownerName: string;
  product: string;
  cashAccountType: string;
  currency: string;
  status: string;
  balances: { balanceAmount: { amount: string; currency: string } }[];
  _entidad: string;
  _links: { balances: { href: string }; transactions: { href: string } };
};

type Movimiento = {
  transactionId: string;
  bookingDate: string;
  transactionAmount: { amount: string; currency: string };
  remittanceInformationUnstructured: string;
  proprietaryBankTransactionCode: string;
};

export default function DashboardPage() {
  const [cuentas, setCuentas]           = useState<Cuenta[]>([]);
  const [movimientos, setMovimientos]   = useState<Movimiento[]>([]);
  const [cuentaActiva, setCuentaActiva] = useState<Cuenta | null>(null);
  const [loading, setLoading]           = useState(true);
  const [loadingMovs, setLoadingMovs]   = useState(false);
  const [saldoTotal, setSaldoTotal]     = useState(0);
  const [ultimaSync, setUltimaSync]     = useState<Date | null>(null);
  const [busqueda, setBusqueda]         = useState("");
  const [categoria, setCategoria]       = useState("Todas");

  useEffect(() => {
    const token = localStorage.getItem("fc_token");
    if (!token) { window.location.href = "/"; return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.clear();
        window.location.href = "/?expired=true";
        return;
      }
    } catch {
      localStorage.clear();
      window.location.href = "/";
      return;
    }
    fetchCuentas(token);
  }, []);

  const fetchCuentas = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { window.location.href = "/"; return; }
      const data = await res.json();
      const lista: Cuenta[] = data.accounts;
      setCuentas(lista);
      if (lista.length > 0) {
        const total = lista.reduce((acc, c) => {
          const s = c.balances?.[0]?.balanceAmount?.amount;
          return acc + (s ? parseFloat(s) : 0);
        }, 0);
        setSaldoTotal(total);
        setCuentaActiva(lista[0]);
        fetchMovimientos(lista[0], token);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMovimientos = async (cuenta: Cuenta, token?: string) => {
    const t = token || localStorage.getItem("fc_token") || "";
    setLoadingMovs(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/accounts/${cuenta.resourceId}/transactions`,
        { headers: { Authorization: `Bearer ${t}` } }
      );
      const data = await res.json();
      setMovimientos(data.transactions.booked.slice(0, 50));
      setUltimaSync(new Date());
    } finally {
      setLoadingMovs(false);
    }
  };

  const handleSelectCuenta = (cuenta: Cuenta) => {
    setCuentaActiva(cuenta);
    setBusqueda("");
    setCategoria("Todas");
    fetchMovimientos(cuenta);
  };

  const formatImporte = (amount: string) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(parseFloat(amount));

  const formatSync = (fecha: Date) => {
    const diff = Math.floor((Date.now() - fecha.getTime()) / 1000);
    if (diff < 60) return "Actualizado ahora";
    if (diff < 3600) return `Actualizado hace ${Math.floor(diff / 60)} min`;
    return `Actualizado hace ${Math.floor(diff / 3600)} h`;
  };

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((mov) => {
      const coincideBusqueda = mov.remittanceInformationUnstructured
        .toLowerCase().includes(busqueda.toLowerCase());
      const coincideCategoria =
        categoria === "Todas" ||
        mov.proprietaryBankTransactionCode === categoria ||
        mov.remittanceInformationUnstructured.toLowerCase().includes(categoria.toLowerCase());
      return coincideBusqueda && coincideCategoria;
    });
  }, [movimientos, busqueda, categoria]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f5f6fa" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#FF6200", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Cargando tus cuentas...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: "100vh", backgroundColor: "#f5f6fa" }}>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>

        {/* RESUMEN TOTAL */}
        <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", borderRadius: 20, padding: "2rem 2.5rem", marginBottom: 24, color: "white", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, backgroundColor: "#FF6200", borderRadius: "50%", opacity: 0.08 }} />
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Saldo total agregado
          </p>
          <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
            {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(saldoTotal)}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            {cuentas.length} cuenta{cuentas.length !== 1 ? "s" : ""} conectada{cuentas.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>

          {/* CUENTAS */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Mis cuentas
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cuentas.map((cuenta) => {
                const ent    = ENTIDADES[cuenta._entidad] || { color: "#6b7280", nombre: cuenta._entidad };
                const saldo  = parseFloat(cuenta.balances?.[0]?.balanceAmount?.amount ?? "0");
                const activa = cuentaActiva?.resourceId === cuenta.resourceId;
                return (
                  <button
                    key={cuenta.resourceId}
                    onClick={() => handleSelectCuenta(cuenta)}
                    style={{
                      backgroundColor: "white",
                      border:          activa ? `2px solid ${ent.color}` : "2px solid transparent",
                      borderRadius:    14,
                      padding:         "16px 18px",
                      textAlign:       "left",
                      cursor:          "pointer",
                      transition:      "all 0.2s",
                      boxShadow:       activa ? `0 4px 20px ${ent.color}22` : "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: ent.color }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: ent.color }}>{ent.nombre}</span>
                          <span style={{ fontSize: 11, color: "#d1d5db", backgroundColor: "#f9fafb", padding: "1px 6px", borderRadius: 4, border: "1px solid #eaedf3" }}>
                            {cuenta.cashAccountType === "CACC" ? "Corriente" : "Ahorro"}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>
                          {cuenta.iban.slice(0, 8)}...{cuenta.iban.slice(-4)}
                        </p>
                      </div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: saldo >= 0 ? "#1a1a2e" : "#dc2626" }}>
                        {formatImporte(cuenta.balances?.[0]?.balanceAmount?.amount ?? "0")}
                      </p>
                    </div>
                  </button>
                );
              })}

              <button
                onClick={() => window.location.href = "/consent"}
                style={{ backgroundColor: "#f9fafb", border: "2px dashed #e5e7eb", borderRadius: 14, padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              >
                <div style={{ width: 28, height: 28, backgroundColor: "#eaedf3", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#9ca3af" }}>
                  +
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af" }}>Conectar otro banco</span>
              </button>
            </div>
          </div>

          {/* MOVIMIENTOS */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Movimientos {cuentaActiva && `— ${ENTIDADES[cuentaActiva._entidad]?.nombre}`}
              </p>
              {ultimaSync && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#16a34a" }} />
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{formatSync(ultimaSync)}</span>
                </div>
              )}
            </div>

            {/* Buscador y filtro */}
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <input
                type="text"
                value={busqueda}
                onChange={(ev) => setBusqueda(ev.target.value)}
                placeholder="Buscar movimiento..."
                style={{ flex: 1, padding: "9px 14px", fontSize: 13, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", backgroundColor: "white", color: "#1a1a2e" }}
                onFocus={(ev) => { ev.target.style.borderColor = "#FF6200"; }}
                onBlur={(ev) => { ev.target.style.borderColor = "#e5e7eb"; }}
              />
              <select
                value={categoria}
                onChange={(ev) => setCategoria(ev.target.value)}
                style={{ padding: "9px 14px", fontSize: 13, border: "1.5px solid #e5e7eb", borderRadius: 10, outline: "none", backgroundColor: "white", color: "#1a1a2e", cursor: "pointer" }}
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Lista de movimientos */}
            <div style={{ backgroundColor: "white", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              {loadingMovs ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ width: 28, height: 28, border: "2px solid #e5e7eb", borderTopColor: "#FF6200", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 10px" }} />
                  <p style={{ fontSize: 13, color: "#9ca3af" }}>Cargando movimientos...</p>
                </div>
              ) : movimientosFiltrados.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#9ca3af" }}>No se encontraron movimientos.</p>
                </div>
              ) : (
                <div>
                  {movimientosFiltrados.map((mov, i) => {
                    const importe   = parseFloat(mov.transactionAmount.amount);
                    const esIngreso = importe > 0;
                    return (
                      <div
                        key={mov.transactionId}
                        style={{
                          display:      "flex",
                          alignItems:   "center",
                          justifyContent: "space-between",
                          padding:      "14px 20px",
                          borderBottom: i < movimientosFiltrados.length - 1 ? "1px solid #f3f4f6" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{
                            width:           36,
                            height:          36,
                            borderRadius:    10,
                            backgroundColor: esIngreso ? "#f0fdf4" : "#f9fafb",
                            display:         "flex",
                            alignItems:      "center",
                            justifyContent:  "center",
                            flexShrink:      0,
                            fontSize:        11,
                            fontWeight:      700,
                            color:           esIngreso ? "#16a34a" : "#6b7280",
                          }}>
                            {esIngreso
                              ? "+"
                              : mov.remittanceInformationUnstructured.slice(0, 2).toUpperCase()
                            }
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 2 }}>
                              {mov.remittanceInformationUnstructured}
                            </p>
                            <p style={{ fontSize: 12, color: "#9ca3af" }}>
                              {new Date(mov.bookingDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 700, color: esIngreso ? "#16a34a" : "#1a1a2e", flexShrink: 0 }}>
                          {esIngreso ? "+" : ""}{formatImporte(mov.transactionAmount.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
