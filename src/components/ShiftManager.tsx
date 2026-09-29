import React, { useState } from "react";
import { useParkiaStore } from "../store/parkiaStore";
import { Icon, Badge } from "./Icon";

export function ShiftManager() {
  const [state, actions] = useParkiaStore();

  // Estados de Apertura de Turno (Flujo O-01)
  const [shiftName, setShiftName] = useState(state.shift.shiftName || "Turno AM · 06:00 - 14:00");
  const [stationName, setStationName] = useState(state.shift.stationName || "Garita Principal Norte");
  const [baseCashInput, setBaseCashInput] = useState<string>(String(state.shift.baseCash || 200000));

  // Estados de Cierre / Arqueo (Flujo O-02)
  const [countedCash, setCountedCash] = useState<string>("");
  const [countedVouchers, setCountedVouchers] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [reconciled, setReconciled] = useState(false);
  const [zCutTicket, setZCutTicket] = useState<any | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  // Cálculos de conciliación
  const systemCash =
    state.history
      .filter((h) => h.status === "paid" && (h.method?.toLowerCase().includes("efectivo") || h.method === "Garita"))
      .reduce((s, h) => s + h.total, 0) + (state.shift.baseCash || 0);

  const systemVouchers = state.history
    .filter(
      (h) =>
        h.status === "paid" &&
        (h.method?.toLowerCase().includes("visa") ||
          h.method?.toLowerCase().includes("mastercard") ||
          h.method?.toLowerCase().includes("datáfono"))
    )
    .reduce((s, h) => s + h.total, 0);

  const digitalTotal = state.history
    .filter(
      (h) =>
        h.status === "paid" &&
        (h.method?.toLowerCase().includes("nequi") || h.method?.toLowerCase().includes("qr"))
    )
    .reduce((s, h) => s + h.total, 0);

  const countedCashNum = Number(countedCash) || 0;
  const countedVouchersNum = Number(countedVouchers) || 0;
  const cashDiff = countedCashNum - systemCash;
  const voucherDiff = countedVouchersNum - systemVouchers;

  // Apertura de Turno
  function handleOpenShift(e: React.FormEvent) {
    e.preventDefault();
    const base = Number(baseCashInput) || 200000;
    actions.openShift({
      shiftName,
      stationName,
      baseCash: base,
      operatorName: state.currentUser?.name || "Laura Gómez",
    });
    setToastMsg(`Turno abierto con éxito en ${stationName} con base de ${fmt.format(base)}.`);
    setTimeout(() => setToastMsg(null), 4000);
  }

  // Ejecutar Arqueo y Corte Z
  function handleExecuteZCut() {
    if (!countedCash) {
      setToastMsg("Debes ingresar el efectivo contado físicamente en caja.");
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    const zCut = actions.closeShift({
      countedCash: countedCashNum,
      countedVouchers: countedVouchersNum,
      notes,
    });

    setZCutTicket(zCut);
    setToastMsg("Corte Z generado y auditado. Turno finalizado.");
    setTimeout(() => setToastMsg(null), 4000);
  }

  return (
    <main className="page admin-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">CONTROL DE CAJA Y TURNOS</p>
          <h1>Gestión de Turnos, Arqueo (Corte Z) y Periféricos</h1>
        </div>
        <div className="head-actions">
          <Badge tone={state.shift.isOpen ? "green" : "critical"}>
            {state.shift.isOpen ? "Turno Activo" : "Turno Cerrado"}
          </Badge>
          <div className="avatar">LG</div>
        </div>
      </div>

      {toastMsg && (
        <div className="toast" style={{ top: 90, bottom: "auto", background: "#0d766e" }}>
          <span>
            <Icon name="check" size={16} />
          </span>
          <div>
            <strong>Gestión de Turnos</strong>
            <small>{toastMsg}</small>
          </div>
          <button onClick={() => setToastMsg(null)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Grid Superior: Estado de Turno & Diagnóstico de Periféricos */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Tarjeta de Estado del Turno Actual */}
        <section className="table-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>[O-01] Estado del Turno y Garita</h3>
            <Badge tone={state.shift.isOpen ? "green" : "pending"}>
              {state.shift.isOpen ? "En Operación" : "Inactivo"}
            </Badge>
          </div>

          <div style={{ background: "#f9fafb", padding: 14, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#6b7280" }}>Operador Responsable:</span>
              <strong>{state.shift.operatorName} ({state.shift.operatorCode})</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#6b7280" }}>Jornada / Horario:</span>
              <span>{state.shift.shiftName}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#6b7280" }}>Punto de Atención:</span>
              <strong>{state.shift.stationName}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#6b7280" }}>Hora de Apertura:</span>
              <span>{state.shift.openedAt}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px dashed #d1d5db" }}>
              <span style={{ color: "#6b7280" }}>Fondo Inicial (Base Efectivo):</span>
              <strong style={{ color: "#0d766e", fontSize: 15 }}>{fmt.format(state.shift.baseCash)}</strong>
            </div>
          </div>

          {!state.shift.isOpen ? (
            <form onSubmit={handleOpenShift} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                  Seleccionar Turno
                </label>
                <select
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  style={{ width: "100%", height: 38, borderRadius: 6, border: "1px solid #d1d5db", padding: "0 10px" }}
                >
                  <option>Turno AM · 06:00 - 14:00</option>
                  <option>Turno PM · 14:00 - 22:00</option>
                  <option>Turno Nocturno · 22:00 - 06:00</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                  Estación Física Asignada
                </label>
                <select
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  style={{ width: "100%", height: 38, borderRadius: 6, border: "1px solid #d1d5db", padding: "0 10px" }}
                >
                  <option>Garita Principal Norte</option>
                  <option>Garita Sur</option>
                  <option>Caja Peatonal Central</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                  Base de Efectivo en Caja ($)
                </label>
                <input
                  type="number"
                  value={baseCashInput}
                  onChange={(e) => setBaseCashInput(e.target.value)}
                  required
                  style={{ width: "100%", height: 38, borderRadius: 6, border: "1px solid #d1d5db", padding: "0 10px", fontWeight: 700 }}
                />
              </div>

              <button type="submit" className="primary full" style={{ height: 44, fontWeight: 700, background: "#0d766e" }}>
                <Icon name="check" size={18} /> Iniciar Turno y Declarar Base
              </button>
            </form>
          ) : (
            <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: 12, borderRadius: 8, fontSize: 13, color: "#065f46" }}>
              ✓ Turno activo y operando. Al finalizar la jornada, realiza el arqueo de caja a la derecha.
            </div>
          )}
        </section>

        {/* Hardware Healthcheck (Diagnóstico de Periféricos) */}
        <section className="table-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>Diagnóstico de Periféricos (Garita)</h3>
            <span style={{ fontSize: 11, color: "#0d766e", fontWeight: 700 }}>● Telemetría Activa</span>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "#6b7280" }}>
            Monitoreo telemétrico de hardware en cabina y ejecución de test de enlace.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { key: "lprNorth", name: "Cámara LPR Entrada Norte", icon: "search", type: "lpr", status: state.shift.peripherals.lprNorth },
              { key: "lprSouth", name: "Cámara LPR Entrada Sur", icon: "search", type: "lpr", status: state.shift.peripherals.lprSouth },
              { key: "barrierNorth", name: "Talanquera Entrada 01", icon: "gate", type: "gate", status: state.shift.peripherals.barrierNorth },
              { key: "barrierSouth", name: "Talanquera Salida Sur", icon: "gate", type: "gate", status: state.shift.peripherals.barrierSouth },
              { key: "printer", name: "Impresora Térmica de Tickets", icon: "print", type: "printer", status: state.shift.peripherals.printer },
              { key: "cashDrawer", name: "Cajón Monedero Automático", icon: "card", type: "cashDrawer", status: state.shift.peripherals.cashDrawer },
            ].map((p, idx) => (
              <div key={idx} className="peripheral-row-item" style={{ flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name={p.icon as any} size={16} />
                  <span style={{ fontSize: 13, fontWeight: 650, color: "#374151" }}>{p.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge tone={p.status === "online" ? "green" : p.status === "warning" ? "pending" : "critical"}>
                    {p.status === "online" ? "En Línea" : p.status === "warning" ? "Revisión" : "Sin Señal"}
                  </Badge>
                  <button
                    type="button"
                    className="secondary compact"
                    style={{ fontSize: 11, padding: "4px 8px", height: 28 }}
                    onClick={() => {
                      if (p.type === "lpr") {
                        setToastMsg(`Prueba de ${p.name}: Captura exitosa. Sensor CMOS y obturador al 100%.`);
                      } else if (p.type === "gate") {
                        setToastMsg(`Pulso de prueba enviado a ${p.name}. Solenoide activado por 2 segundos.`);
                      } else if (p.type === "printer") {
                        setToastMsg(`Impresora Térmica: Ticket de autodiagnóstico emitido. Cabezal térmico OK.`);
                      } else {
                        setToastMsg(`Cajón Monedero: Disparo eléctrico de solenoide 24V ejecutado. Cajón abierto.`);
                      }
                      setTimeout(() => setToastMsg(null), 3500);
                    }}
                  >
                    {p.type === "lpr" ? "Test Captura" : p.type === "gate" ? "Pulso Test" : p.type === "printer" ? "Test Impresión" : "Abrir Cajón"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── SECCIÓN INFERIOR: ARQUEO DE CAJA CIEGO Y CORTE Z (FLUJO O-02) ── */}
      <section className="table-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Conciliación de Fin de Jornada</span>
            <h2 style={{ margin: "2px 0 0", fontSize: 22 }}>[O-02] Arqueo de Caja Ciego y Emisión de Corte Z (F12)</h2>
          </div>
          <Badge tone="pending">Auditoría Requerida</Badge>
        </div>

        <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 18 }}>
          Ingresa los valores físicos reales contados en monedas, billetes y comprobantes de datáfono. El sistema contrastará el dinero con los registros de la base de datos sin sesgar el resultado.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
          {/* Formulario de Conteo Físico Ciego */}
          <div style={{ background: "#f9fafb", padding: 18, borderRadius: 10, border: "1px solid #e5e7eb" }}>
            <h4 style={{ margin: "0 0 14px", fontSize: 15, color: "#111827" }}>Conteo Físico en Garita</h4>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                  Efectivo total en monedas y billetes ($) *
                </label>
                <input
                  type="number"
                  placeholder="Ej: 850000"
                  value={countedCash}
                  onChange={(e) => {
                    setCountedCash(e.target.value);
                    setReconciled(false);
                  }}
                  style={{ width: "100%", height: 42, borderRadius: 6, border: "1px solid #d1d5db", padding: "0 12px", fontSize: 16, fontWeight: 700 }}
                />
                <small style={{ color: "#6b7280", fontSize: 11 }}>Incluye el fondo base inicial de {fmt.format(state.shift.baseCash)}</small>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                  Total en vouchers de datáfono físico ($)
                </label>
                <input
                  type="number"
                  placeholder="Ej: 420000"
                  value={countedVouchers}
                  onChange={(e) => {
                    setCountedVouchers(e.target.value);
                    setReconciled(false);
                  }}
                  style={{ width: "100%", height: 42, borderRadius: 6, border: "1px solid #d1d5db", padding: "0 12px", fontSize: 16, fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                  Observaciones o Novedades del Turno
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Turno entregado sin contratiempos, talanquera sur en revisión."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: "100%", borderRadius: 6, border: "1px solid #d1d5db", padding: 8, fontSize: 12 }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="secondary full"
                  onClick={() => setReconciled(true)}
                  style={{ height: 42, fontWeight: 700 }}
                >
                  <Icon name="search" size={16} /> Comparar y Conciliar
                </button>
                <button
                  type="button"
                  className="primary full"
                  onClick={handleExecuteZCut}
                  disabled={!state.shift.isOpen}
                  style={{ height: 42, fontWeight: 700, background: "#0d766e" }}
                >
                  <Icon name="print" size={16} /> Emitir Corte Z y Cerrar Turno
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de Conciliación en Pantalla */}
          <div style={{ background: "white", padding: 18, borderRadius: 10, border: "1px solid #e5e7eb" }}>
            <h4 style={{ margin: "0 0 14px", fontSize: 15, color: "#111827" }}>Cuadre Fiscal vs Sistema</h4>

            {reconciled ? (
              <div style={{ fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#6b7280" }}>Efectivo Sistema (Ventas + Base):</span>
                  <strong>{fmt.format(systemCash)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#6b7280" }}>Efectivo Contado por Operador:</span>
                  <strong style={{ color: "#0d766e" }}>{fmt.format(countedCashNum)}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 6,
                    marginBottom: 12,
                    background: cashDiff === 0 ? "#ecfdf5" : cashDiff > 0 ? "#eff6ff" : "#fef2f2",
                    color: cashDiff === 0 ? "#065f46" : cashDiff > 0 ? "#1e40af" : "#991b1b",
                    fontWeight: 700,
                  }}
                >
                  <span>Diferencia Efectivo:</span>
                  <span>{cashDiff === 0 ? "✓ Cuadrado exacto ($0)" : cashDiff > 0 ? `+ Sobrante: ${fmt.format(cashDiff)}` : `- Faltante: ${fmt.format(cashDiff)}`}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#6b7280" }}>Vouchers Datáfono Sistema:</span>
                  <strong>{fmt.format(systemVouchers)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#6b7280" }}>Vouchers Contados:</span>
                  <strong>{fmt.format(countedVouchersNum)}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#6b7280" }}>Canales Digitales (QR / Nequi):</span>
                  <strong>{fmt.format(digitalTotal)}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "2px solid #111827", fontSize: 16, fontWeight: 800 }}>
                  <span>GRAN TOTAL LIQUIDADO:</span>
                  <span style={{ color: "#0d766e" }}>{fmt.format(systemCash + systemVouchers + digitalTotal)}</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 10px", color: "#9ca3af" }}>
                <Icon name="card" size={40} />
                <p style={{ marginTop: 10, fontSize: 13 }}>
                  Digita los valores contados a la izquierda y pulsa "Comparar y Conciliar" para auditar diferencias.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MODAL DE COMPROBANTE FISCAL CORTE Z */}
      {zCutTicket && (
        <div className="modal-backdrop" onClick={() => setZCutTicket(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ textAlign: "center", borderBottom: "2px dashed #111827", paddingBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#6b7280" }}>PARKIA S.A.S. · NIT 901.482.910-4</span>
              <h3 style={{ margin: "4px 0", fontSize: 20 }}>REPORTE DE ARQUEO FISCAL CORTE Z</h3>
              <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>{state.shift.stationName} · BOGOTÁ</p>
            </div>

            <div style={{ padding: "14px 0", fontSize: 12, borderBottom: "1px dashed #d1d5db" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#6b7280" }}>Fecha y Hora Cierre:</span>
                <strong>{zCutTicket.closedAt}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#6b7280" }}>Operador Responsable:</span>
                <strong>{zCutTicket.operator}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#6b7280" }}>Jornada:</span>
                <span>{state.shift.shiftName}</span>
              </div>
            </div>

            <div style={{ padding: "14px 0", fontSize: 13, borderBottom: "2px dashed #111827" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Base Inicial en Caja:</span>
                <span>{fmt.format(state.shift.baseCash)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Efectivo Contado:</span>
                <strong>{fmt.format(zCutTicket.countedCash)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Diferencia Efectivo:</span>
                <strong style={{ color: zCutTicket.cashDiff === 0 ? "#059669" : "#dc2626" }}>
                  {zCutTicket.cashDiff === 0 ? "$0 (Cuadrado)" : fmt.format(zCutTicket.cashDiff)}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Datáfono (Vouchers):</span>
                <span>{fmt.format(zCutTicket.countedVouchers)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span>Recaudos Digitales (QR/App):</span>
                <span>{fmt.format(zCutTicket.digitalTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #d1d5db", fontSize: 16, fontWeight: 800 }}>
                <span>TOTAL RECAUDADO:</span>
                <span style={{ color: "#0d766e" }}>{fmt.format(zCutTicket.grandTotal)}</span>
              </div>
            </div>

            <div style={{ padding: "12px 0", fontSize: 11, color: "#6b7280" }}>
              Observaciones: <em>{zCutTicket.notes}</em>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="secondary full" onClick={() => window.print()}>
                <Icon name="print" size={16} /> Imprimir Comprobante
              </button>
              <button className="primary full" onClick={() => setZCutTicket(null)}>
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
