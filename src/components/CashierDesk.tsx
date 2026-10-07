import React, { useState, useEffect } from "react";
import { useParkiaStore, ParkedVehicleSession } from "../store/parkiaStore";
import { Icon, Badge } from "./Icon";
import { downloadTicket } from "../utils/ticketDownload";

export function CashierDesk() {
  const [state, actions] = useParkiaStore();

  // Sub-pestaña de caja: "cobro" (O-05), "ingreso" (O-04), "salida" (O-06)
  const [deskTab, setDeskTab] = useState<"cobro" | "ingreso" | "salida">("cobro");

  // Estados de Cobro (Flujo O-05)
  const [searchPlate, setSearchPlate] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<ParkedVehicleSession | null>(
    state.parkedVehicles.find((v) => v.status === "active") || null
  );
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Datáfono POS" | "QR Digital">("Efectivo");
  const [selectedDiscount, setSelectedDiscount] = useState<{ name: string; pct: number }>({
    name: "Sin convenio (Tarifa regular)",
    pct: 0,
  });
  const [cashReceived, setCashReceived] = useState<string>("");
  const [paidReceipt, setPaidReceipt] = useState<{
    plate: string;
    finalTotal: number;
    subtotal: number;
    discount: number;
    change: number;
    ticketCode: string;
    qrCode: string;
    paidAt: string;
    method: string;
  } | null>(null);

  // Estados de Ingreso Asistido (Flujo O-04)
  const [entryPlate, setEntryPlate] = useState("");
  const [entryType, setEntryType] = useState<"car" | "motorcycle" | "pmr" | "ev">("car");
  const [entryGate, setEntryGate] = useState("Entrada Norte");
  const [entrySuccess, setEntrySuccess] = useState<ParkedVehicleSession | null>(null);

  // Estados de Despacho de Salida (Flujo O-06)
  const [exitPlate, setExitPlate] = useState("");
  const [exitGate, setExitGate] = useState("Salida Norte");
  const [exitResult, setExitResult] = useState<{
    success: boolean;
    reason?: string;
    message: string;
    extraFee?: number;
  } | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sincronizar vehículo seleccionado si cambia la lista
  useEffect(() => {
    if (selectedVehicle) {
      const refreshed = state.parkedVehicles.find((v) => v.id === selectedVehicle.id);
      if (refreshed) setSelectedVehicle(refreshed);
    }
  }, [state.parkedVehicles]);

  // Cálculo dinámico de tarifa para el vehículo seleccionado
  const elapsedMinutes = selectedVehicle
    ? Math.max(1, Math.round((Date.now() - selectedVehicle.entryTimestamp) / (60 * 1000)))
    : 0;

  const currentRate =
    selectedVehicle?.vehicleType === "motorcycle"
      ? state.tariffs.motoRate
      : selectedVehicle?.vehicleType === "ev"
      ? state.tariffs.evRate
      : state.tariffs.carRate;

  const currentCap =
    selectedVehicle?.vehicleType === "motorcycle"
      ? state.tariffs.motoCap
      : selectedVehicle?.vehicleType === "ev"
      ? state.tariffs.evCap
      : state.tariffs.carCap;

  const subtotal = Math.min(elapsedMinutes * currentRate, currentCap);
  const discountAmount = Math.round(subtotal * (selectedDiscount.pct / 100));
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const cashRecNum = Number(cashReceived) || 0;
  const changeAmount = cashRecNum > finalTotal ? cashRecNum - finalTotal : 0;

  const fmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  // Ejecutar Cobro POS
  function handleProcessPayment() {
    if (!selectedVehicle) return;

    if (paymentMethod === "Efectivo" && cashRecNum < finalTotal) {
      setToastMsg(`Efectivo insuficiente. El total a pagar es ${fmt.format(finalTotal)}.`);
      setTimeout(() => setToastMsg(null), 3500);
      return;
    }

    const res = actions.processPosPayment({
      plate: selectedVehicle.plate,
      paymentMethod,
      discountName: selectedDiscount.pct > 0 ? selectedDiscount.name : undefined,
      discountPercent: selectedDiscount.pct,
      receivedCash: cashRecNum,
    });

    if (res.success && res.finalTotal !== undefined) {
      setPaidReceipt({
        plate: selectedVehicle.plate,
        finalTotal: res.finalTotal,
        subtotal: res.subtotal ?? 0,
        discount: res.discount ?? 0,
        change: res.change ?? 0,
        ticketCode: res.ticketCode ?? "",
        qrCode: res.qrCode ?? "",
        paidAt: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        method: paymentMethod,
      });
      setToastMsg(`Cobro liquidado: ${fmt.format(res.finalTotal)}. Ticket QR de salida generado (15 min).`);
      setTimeout(() => setToastMsg(null), 4000);
      setCashReceived("");
    }
  }

  // Ejecutar Ingreso Manual
  function handleProcessEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!entryPlate.trim()) return;

    const session = actions.processManualEntry({
      plate: entryPlate,
      vehicleType: entryType,
      gateName: entryGate,
    });

    setEntrySuccess(session);
    setToastMsg(`Ingreso registrado: ${session.plate} asignado a ${session.floor} ${session.spotCode}.`);
    setEntryPlate("");
    setTimeout(() => setToastMsg(null), 4500);
  }

  // Ejecutar Validación de Salida
  function handleProcessExit(e: React.FormEvent) {
    e.preventDefault();
    if (!exitPlate.trim()) return;

    const res = actions.processExitValidation({
      plate: exitPlate,
      gateName: exitGate,
    });

    setExitResult(res);
    setToastMsg(res.message);
    setTimeout(() => setToastMsg(null), 4500);
  }

  // Filtro de búsqueda rápida
  const filteredVehicles = state.parkedVehicles.filter(
    (v) =>
      v.plate.toUpperCase().includes(searchPlate.toUpperCase().trim()) ||
      v.ticketCode.toUpperCase().includes(searchPlate.toUpperCase().trim())
  );

  return (
    <main className="page admin-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">VENTANILLA Y TERMINAL POS</p>
          <h1>Caja, Liquidación y Control de Puertas</h1>
        </div>
        <div className="head-actions">
          <Badge tone={state.shift.isOpen ? "green" : "critical"}>
            {state.shift.isOpen ? "Caja Abierta · Operando" : "Caja Cerrada"}
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
            <strong>Operación Exitosa</strong>
            <small>{toastMsg}</small>
          </div>
          <button onClick={() => setToastMsg(null)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Subnavegación de Caja Segmentada y Elevada */}
      <div className="operator-tabs">
        <button
          type="button"
          className={deskTab === "cobro" ? "active" : ""}
          onClick={() => setDeskTab("cobro")}
        >
          <Icon name="card" size={16} /> [O-05] Cobro en Ventanilla POS (F2)
        </button>
        <button
          type="button"
          className={deskTab === "ingreso" ? "active" : ""}
          onClick={() => setDeskTab("ingreso")}
        >
          <Icon name="plus" size={16} /> [O-04] Ingreso Asistido & Ticket (F1)
        </button>
        <button
          type="button"
          className={deskTab === "salida" ? "active" : ""}
          onClick={() => setDeskTab("salida")}
        >
          <Icon name="gate" size={16} /> [O-06] Validación y Despacho de Salida
        </button>
      </div>

      {/* ── SUB-PESTAÑA 1: COBRO EN VENTANILLA POS (FLUJO O-05) ── */}
      {deskTab === "cobro" && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: "1.1fr 1fr", gap: 20 }}>
          {/* Columna Izquierda: Búsqueda y Selección de Vehículo */}
          <section className="table-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Búsqueda de Vehículo</h3>
              <small style={{ color: "#6b7280" }}>{state.parkedVehicles.filter(v => v.status === "active").length} vehículos activos</small>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  placeholder="Buscar por placa (ej: JHT-482) o ticket..."
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value)}
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px 0 36px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                />
                <span style={{ position: "absolute", left: 10, top: 12, color: "#9ca3af" }}>
                  <Icon name="search" size={18} />
                </span>
              </div>
            </div>

            {/* Chips de selección rápida de vehículos */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {state.parkedVehicles.slice(0, 6).map((veh) => {
                const isSelected = selectedVehicle?.id === veh.id;
                return (
                  <button
                    key={veh.id}
                    type="button"
                    className={`pos-vehicle-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedVehicle(veh);
                      setPaidReceipt(null);
                    }}
                    style={{
                      background: isSelected ? "#0d766e" : veh.status === "paid" ? "#ecfdf5" : "#ffffff",
                      color: isSelected ? "white" : veh.status === "paid" ? "#065f46" : "#1f2937",
                      borderColor: isSelected ? "#0d766e" : veh.status === "paid" ? "#a7f3d0" : "#d1d5db",
                    }}
                  >
                    <span>{veh.plate}</span>
                    <Badge tone={veh.status === "paid" ? "green" : isSelected ? "white" : "pending"}>
                      {veh.status === "paid" ? "Pagado" : "Activo"}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* Lista detallada de vehículos en patio */}
            <div style={{ maxHeight: 380, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10, padding: "4px 0" }} role="list" aria-label="Vehículos activos en el parqueadero">
              {filteredVehicles.map((v) => {
                const isSel = selectedVehicle?.id === v.id;
                const mins = Math.max(1, Math.round((Date.now() - v.entryTimestamp) / (60 * 1000)));
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`pos-vehicle-row ${isSel ? "selected" : ""}`}
                    aria-label={`Seleccionar vehículo placa ${v.plate}, ${v.brand}, ingresó a las ${v.entryTime} (${mins} minutos), bahía ${v.spotCode}, estado ${v.status === 'paid' ? 'pagado' : 'pendiente de pago'}`}
                    onClick={() => {
                      setSelectedVehicle(v);
                      setPaidReceipt(null);
                    }}
                    style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 14, color: isSel ? "#0d766e" : "#111827" }}>
                          {v.plate}
                        </strong>
                        <Badge tone={v.status === "paid" ? "green" : "pending"}>
                          {v.status === "paid" ? "Pagado" : "Pendiente"}
                        </Badge>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>{v.brand}</span>
                      </div>
                      <small style={{ color: "#9ca3af", fontSize: 11 }}>
                        Entrada: {v.entryTime} ({mins} min) · {v.floor} Bahía {v.spotCode}
                      </small>
                    </div>
                    <Icon name="chevron" size={16} />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Columna Derecha: Tarjeta de Liquidación POS */}
          <section className="table-card" style={{ padding: 20 }}>
            {selectedVehicle ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: 12, marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Liquidación en Ventanilla</span>
                    <h2 style={{ margin: "2px 0 0", fontSize: 22, color: "#111827" }}>{selectedVehicle.plate}</h2>
                  </div>
                  <Badge tone={selectedVehicle.status === "paid" ? "green" : "critical"}>
                    {selectedVehicle.status === "paid" ? "YA PAGADO" : "PENDIENTE"}
                  </Badge>
                </div>

                {selectedVehicle.status === "paid" ? (
                  <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: 18, borderRadius: 10, textAlign: "center" }}>
                    <div style={{ display: "inline-flex", padding: 8, background: "#d1fae5", borderRadius: "50%", color: "#065f46", marginBottom: 8 }}>
                      <Icon name="check" size={24} />
                    </div>
                    <h4 style={{ margin: "0 0 4px", color: "#065f46" }}>Vehículo al día</h4>
                    <p style={{ margin: 0, fontSize: 13, color: "#047857" }}>
                      Liquidado exitosamente por {fmt.format(selectedVehicle.paidAmount || 0)} ({selectedVehicle.paymentMethod}).
                    </p>
                    <small style={{ display: "block", marginTop: 8, color: "#065f46" }}>
                      Ticket QR de salida: <strong>{selectedVehicle.ticketCode}</strong> (Vigencia 15 min)
                    </small>
                  </div>
                ) : (
                  <>
                    {/* Desglose de Liquidación */}
                    <div style={{ background: "#f9fafb", padding: 14, borderRadius: 8, marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                        <span style={{ color: "#6b7280" }}>Hora de Ingreso:</span>
                        <strong>{selectedVehicle.entryTime} ({selectedVehicle.accessGate})</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                        <span style={{ color: "#6b7280" }}>Tiempo Transcurrido:</span>
                        <strong style={{ color: "#0d766e" }}>{Math.floor(elapsedMinutes / 60)} h {elapsedMinutes % 60} min ({elapsedMinutes} min)</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                        <span style={{ color: "#6b7280" }}>Tarifa aplicada:</span>
                        <span>{fmt.format(currentRate)} / minuto (Tope: {fmt.format(currentCap)})</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                        <span style={{ color: "#6b7280" }}>Subtotal Liquidado:</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt.format(subtotal)}</span>
                      </div>
                      {selectedDiscount.pct > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "#059669" }}>
                          <span>Descuento ({selectedDiscount.name}):</span>
                          <span>- {fmt.format(discountAmount)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px dashed #d1d5db", fontSize: 17, fontWeight: 800 }}>
                        <span>TOTAL A PAGAR:</span>
                        <span style={{ color: "#0d766e" }}>{fmt.format(finalTotal)}</span>
                      </div>
                    </div>

                    {/* Selector de Convenio / Descuento (F4) */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                        Convenio comercial o cortesía (F4)
                      </label>
                      <select
                        style={{ width: "100%", height: 38, borderRadius: 6, border: "1px solid #d1d5db", padding: "0 10px", fontSize: 13 }}
                        value={selectedDiscount.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.includes("Éxito")) setSelectedDiscount({ name: val, pct: 50 });
                          else if (val.includes("Cine")) setSelectedDiscount({ name: val, pct: 100 });
                          else if (val.includes("Gimnasio")) setSelectedDiscount({ name: val, pct: 30 });
                          else if (val.includes("Cortesía")) setSelectedDiscount({ name: val, pct: 100 });
                          else setSelectedDiscount({ name: val, pct: 0 });
                        }}
                      >
                        <option>Sin convenio (Tarifa regular)</option>
                        <option>Éxito Supermercado (-50% descuento)</option>
                        <option>CineColombia (2 horas gratis / 100%)</option>
                        <option>Gimnasio Bodytech (-30% descuento)</option>
                        <option>Cortesía Administración (-100%)</option>
                      </select>
                    </div>

                    {/* Método de Pago */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                        Medio de pago en ventanilla
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        {(["Efectivo", "Datáfono POS", "QR Digital"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={`payment-method-tile ${paymentMethod === m ? "active" : ""}`}
                            onClick={() => setPaymentMethod(m)}
                          >
                            <Icon name={m === "Efectivo" ? "card" : m === "Datáfono POS" ? "badge" : "grid"} size={20} />
                            <span>{m}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Campo de Efectivo recibido con cálculo de cambio */}
                    {paymentMethod === "Efectivo" && (
                      <div style={{ background: "#fef3c7", border: "1px solid #fde68a", padding: 14, borderRadius: 10, marginBottom: 16, boxShadow: "0 2px 8px rgba(217, 119, 6, 0.08)" }}>
                        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
                              Efectivo recibido del conductor ($)
                            </label>
                            <input
                              type="number"
                              placeholder="Ej: 20000"
                              value={cashReceived}
                              onChange={(e) => setCashReceived(e.target.value)}
                              style={{
                                width: "100%",
                                height: 42,
                                borderRadius: 8,
                                border: "1px solid #d97706",
                                padding: "0 12px",
                                fontSize: 16,
                                fontWeight: 800,
                              }}
                            />
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: 11, color: "#92400e", fontWeight: 700 }}>Cambio a devolver:</span>
                            <div style={{ fontSize: 22, fontWeight: 800, color: changeAmount > 0 ? "#b45309" : "#6b7280" }}>
                              {fmt.format(changeAmount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botón de Cobro Final */}
                    <button
                      type="button"
                      className="primary full"
                      onClick={handleProcessPayment}
                      style={{
                        height: 50,
                        fontSize: 15,
                        fontWeight: 700,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        boxShadow: "0 6px 20px rgba(13, 118, 110, 0.35)",
                      }}
                    >
                      <Icon name="check" size={20} />
                      Cobrar {fmt.format(finalTotal)} e Imprimir Recibo (F2)
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
                <Icon name="car" size={48} />
                <h4 style={{ margin: "14px 0 6px", color: "#4b5563" }}>Ningún vehículo seleccionado</h4>
                <p style={{ fontSize: 13 }}>Selecciona una placa del panel izquierdo o digita en el buscador.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* MODAL DE RECIBO DE COBRO GENERADO */}
      {paidReceipt && (
        <div className="modal-backdrop" onClick={() => setPaidReceipt(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ textAlign: "center", borderBottom: "1px dashed #d1d5db", paddingBottom: 14 }}>
              <div style={{ display: "inline-flex", background: "#0d766e", color: "white", padding: 10, borderRadius: "50%", marginBottom: 8 }}>
                <Icon name="check" size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: 18 }}>Comprobante de Pago Electrónico</h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>PARKIA CENTRAL · CALLE 93 BOGOTÁ</p>
            </div>

            <div style={{ padding: "16px 0", fontSize: 13, borderBottom: "1px dashed #d1d5db" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#6b7280" }}>Placa:</span>
                <strong>{paidReceipt.plate}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#6b7280" }}>Hora de Pago:</span>
                <span>{paidReceipt.paidAt}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#6b7280" }}>Medio de Pago:</span>
                <span>{paidReceipt.method}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#6b7280" }}>Total Pagado:</span>
                <strong style={{ fontSize: 15, color: "#0d766e" }}>{fmt.format(paidReceipt.finalTotal)}</strong>
              </div>
              {paidReceipt.change > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "#b45309" }}>
                  <span>Cambio devuelto:</span>
                  <strong>{fmt.format(paidReceipt.change)}</strong>
                </div>
              )}
            </div>

            {/* Código QR de Salida */}
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ background: "#f3f4f6", padding: 16, borderRadius: 10, display: "inline-block" }}>
                <div style={{ width: 130, height: 130, background: "#111827", color: "white", display: "grid", placeItems: "center", borderRadius: 8, margin: "0 auto" }}>
                  <Icon name="grid" size={70} />
                </div>
                <small style={{ display: "block", marginTop: 8, fontWeight: 700, color: "#374151" }}>
                  {paidReceipt.qrCode}
                </small>
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#059669", fontWeight: 700 }}>
                ✓ Válido para levantar la talanquera de salida en los próximos 15 minutos
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                type="button"
                className="secondary"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onClick={() =>
                  downloadTicket({
                    id: paidReceipt.ticketCode || `REC-${Date.now().toString(36).toUpperCase()}`,
                    plate: paidReceipt.plate,
                    entryTime: paidReceipt.entryTime || "08:00 a. m.",
                    exitTime: paidReceipt.paidAt,
                    duration: paidReceipt.duration || "Estancia parqueadero",
                    total: paidReceipt.finalTotal,
                    method: paidReceipt.method,
                    qrCode: paidReceipt.qrCode,
                  })
                }
              >
                <Icon name="download" size={16} /> Descargar Ticket
              </button>
              <button
                type="button"
                className="secondary"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onClick={() => window.print()}
              >
                <Icon name="print" size={16} /> Imprimir
              </button>
              <button
                type="button"
                className="primary"
                style={{ flex: 1 }}
                onClick={() => setPaidReceipt(null)}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-PESTAÑA 2: INGRESO ASISTIDO Y TICKET (FLUJO O-04) ── */}
      {deskTab === "ingreso" && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
          <section className="table-card" style={{ padding: 22 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 18 }}>[O-04] Ingreso Vehicular Asistido y Emisión de Ticket</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#6b7280" }}>
              Utiliza este formulario cuando la cámara LPR de entrada no lea la placa o el usuario sea flotante.
            </p>

            <form onSubmit={handleProcessEntry} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                  Placa del vehículo *
                </label>
                <input
                  type="text"
                  placeholder="Ej: KLO 912 o ABC 12D"
                  value={entryPlate}
                  onChange={(e) => setEntryPlate(e.target.value.toUpperCase())}
                  required
                  style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 14px", fontSize: 16, fontWeight: 700, letterSpacing: 1 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                    Tipo de Vehículo
                  </label>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as any)}
                    style={{ width: "100%", height: 42, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 10px" }}
                  >
                    <option value="car">Automóvil / Camioneta</option>
                    <option value="motorcycle">Motocicleta</option>
                    <option value="pmr">PMR (Accesible / Discapacidad)</option>
                    <option value="ev">Eléctrico (Con cargador)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                    Punto de Acceso
                  </label>
                  <select
                    value={entryGate}
                    onChange={(e) => setEntryGate(e.target.value)}
                    style={{ width: "100%", height: 42, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 10px" }}
                  >
                    <option>Entrada Norte</option>
                    <option>Entrada Sur</option>
                  </select>
                </div>
              </div>

              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 12, borderRadius: 8, fontSize: 12, color: "#166534" }}>
                ✓ Esta acción asignará automáticamente una bahía libre, levantará la talanquera de entrada durante 6 segundos y emitirá el ticket térmico para el conductor.
              </div>

              <button
                type="submit"
                className="primary full"
                style={{ height: 48, fontSize: 15, fontWeight: 700, background: "#0d766e" }}
              >
                <Icon name="gate" size={20} /> Autorizar Ingreso e Imprimir Ticket
              </button>
            </form>
          </section>

          {/* Tarjeta de Ticket de Entrada emitido */}
          <section className="table-card" style={{ padding: 22 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Último Ticket de Entrada Generado</h3>
            {entrySuccess ? (
              <div style={{ border: "2px dashed #0d766e", padding: 18, borderRadius: 10, background: "#f0fdfa", textAlign: "center" }}>
                <span style={{ fontSize: 10, textTransform: "uppercase", color: "#0d766e", fontWeight: 800 }}>TICKET DE ENTRADA VÁLIDO</span>
                <h2 style={{ margin: "8px 0", fontSize: 24 }}>{entrySuccess.plate}</h2>
                <div style={{ fontSize: 13, color: "#374151", marginBottom: 12 }}>
                  <div>Hora: <strong>{entrySuccess.entryTime}</strong></div>
                  <div>Bahía Asignada: <strong>{entrySuccess.floor} · {entrySuccess.spotCode}</strong></div>
                  <div>Acceso: <strong>{entrySuccess.accessGate}</strong></div>
                </div>
                <div style={{ background: "white", padding: 12, borderRadius: 8, display: "inline-block", border: "1px solid #d1d5db" }}>
                  <Icon name="grid" size={60} />
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>{entrySuccess.ticketCode}</div>
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
                  <Badge tone="green">Talanquera Levantada (6s)</Badge>
                  <button
                    type="button"
                    className="secondary compact"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    onClick={() =>
                      downloadTicket({
                        id: entrySuccess.ticketCode,
                        plate: entrySuccess.plate,
                        entryTime: entrySuccess.entryTime,
                        duration: "Recién ingresado",
                        total: 0,
                        spot: `${entrySuccess.floor} · ${entrySuccess.spotCode}`,
                        branch: entrySuccess.accessGate,
                        qrCode: entrySuccess.ticketCode,
                      })
                    }
                  >
                    <Icon name="download" size={14} /> Descargar Ticket
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 10px", color: "#9ca3af" }}>
                <Icon name="print" size={40} />
                <p style={{ marginTop: 10, fontSize: 13 }}>Registra un ingreso a la izquierda para visualizar el ticket expedido.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── SUB-PESTAÑA 3: VALIDACIÓN Y DESPACHO DE SALIDA (FLUJO O-06) ── */}
      {deskTab === "salida" && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
          <section className="table-card" style={{ padding: 22 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 18 }}>[O-06] Control y Despacho de Salida Vehicular</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "#6b7280" }}>
              Verifica el pago y los 15 minutos de gracia de los vehículos que se aproximan a la talanquera de salida.
            </p>

            <form onSubmit={handleProcessExit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                  Placa o Código de Ticket QR *
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Ej: ABC 123 o TCK-849206"
                    value={exitPlate}
                    onChange={(e) => setExitPlate(e.target.value.toUpperCase())}
                    required
                    style={{ flex: 1, height: 44, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 14px", fontSize: 16, fontWeight: 700 }}
                  />
                  <select
                    value={exitGate}
                    onChange={(e) => setExitGate(e.target.value)}
                    style={{ width: 140, height: 44, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 13 }}
                  >
                    <option>Salida Norte</option>
                    <option>Salida Sur</option>
                  </select>
                </div>
              </div>

              {/* Botones de prueba rápida con vehículos actuales */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#6b7280", width: "100%" }}>Atajos de prueba en patio:</span>
                {state.parkedVehicles.slice(0, 4).map((veh) => (
                  <button
                    key={veh.id}
                    type="button"
                    onClick={() => setExitPlate(veh.plate)}
                    style={{
                      background: "#f3f4f6",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {veh.plate} ({veh.status === "paid" ? "Pagado" : "Pendiente"})
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="primary full"
                style={{ height: 48, fontSize: 15, fontWeight: 700, background: "#0d766e" }}
              >
                <Icon name="check" size={20} /> Validar y Despachar Salida
              </button>
            </form>
          </section>

          {/* Resultado de la validación */}
          <section className="table-card" style={{ padding: 22 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Resultado de Validación en Talanquera</h3>

            {exitResult ? (
              <div
                style={{
                  padding: 18,
                  borderRadius: 10,
                  border: exitResult.success ? "1px solid #a7f3d0" : "1px solid #fca5a5",
                  background: exitResult.success ? "#f0fdf4" : "#fef2f2",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    padding: 10,
                    borderRadius: "50%",
                    background: exitResult.success ? "#dcfce7" : "#fee2e2",
                    color: exitResult.success ? "#166534" : "#991b1b",
                    marginBottom: 8,
                  }}
                >
                  <Icon name={exitResult.success ? "check" : "close"} size={26} />
                </div>
                <h4 style={{ margin: "0 0 4px", color: exitResult.success ? "#166534" : "#991b1b" }}>
                  {exitResult.success ? "Salida Concedida" : "Salida Bloqueada"}
                </h4>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: exitResult.success ? "#15803d" : "#b91c1c" }}>
                  {exitResult.message}
                </p>

                {exitResult.reason === "unpaid" && (
                  <button
                    className="primary compact"
                    onClick={() => {
                      setSearchPlate(exitPlate);
                      setDeskTab("cobro");
                    }}
                  >
                    Cobrar ahora en Ventanilla
                  </button>
                )}

                {exitResult.reason === "grace_expired" && (
                  <button
                    className="primary danger compact"
                    onClick={() => {
                      setSearchPlate(exitPlate);
                      setDeskTab("cobro");
                    }}
                  >
                    Cobrar excedente de tiempo
                  </button>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 10px", color: "#9ca3af" }}>
                <Icon name="gate" size={40} />
                <p style={{ marginTop: 10, fontSize: 13 }}>Ingresa una placa para verificar su estado de salida.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
