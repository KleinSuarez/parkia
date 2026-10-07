import React, { useState, useEffect, useRef } from "react";
import { useParkiaStore, ParkingSpot, ParkingHistoryItem } from "../store/parkiaStore";
import { Icon, Badge } from "./Icon";
import { PaymentModal } from "./PaymentModal";
import { AccessibilityWidget } from "./AccessibilityWidget";
import { downloadTicket } from "../utils/ticketDownload";

// ── Smooth Counter for currency ──
function SmoothCounter({ value, formatValue }: { value: number; formatValue: (v: number) => string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // If it's a huge jump (e.g., initial load), just snap
    if (Math.abs(value - displayValue) > value * 0.5) {
      setDisplayValue(value);
      return;
    }
    
    const start = displayValue;
    const end = value;
    const duration = 1000; // animate over 1s
    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + (end - start) * ease);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      }
    }

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value]);

  return <>{formatValue(displayValue)}</>;
}

export function MobileDriverApp({
  onSwitchToAdmin,
}: {
  onSwitchToAdmin: () => void;
}) {
  const [state, actions] = useParkiaStore();
  const [tab, setTab] = useState<"inicio" | "mapa" | "vehiculos" | "pagos" | "perfil">("inicio");
  const [fullscreen, setFullscreen] = useState(false);

  // Bottom Sheets states
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [payingSession, setPayingSession] = useState<ParkingHistoryItem | null>(null);
  const [addVehicleSheet, setAddVehicleSheet] = useState(false);
  const [editProfileSheet, setEditProfileSheet] = useState(false);
  const [vehicleSelectorSheet, setVehicleSelectorSheet] = useState(false);
  const [a11ySheetOpen, setA11ySheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for add vehicle
  const [newPlate, setNewPlate] = useState("");
  const [newType, setNewType] = useState<"Automóvil" | "Motocicleta" | "Eléctrico">("Automóvil");
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");

  // Profile edit form
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileDocument, setProfileDocument] = useState("");
  const [profilePhone, setProfilePhone] = useState("");

  // Map floor selection
  const [mapFloor, setMapFloor] = useState<"Piso 1" | "Piso 2" | "Piso 3">("Piso 2");
  const [mapFilter, setMapFilter] = useState<"all" | "pmr" | "ev">("all");

  const currentUser = state.currentUser;
  const primaryVehicle = state.vehicles.find((v) => v.isPrimary) || state.vehicles[0];
  const activeSession = state.activeSession;
  const currentRate = state.tariffs.carRate;

  // Formatters
  const currencyFmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function handleReserveSpot() {
    if (!selectedSpot) return;
    actions.reserveSpot(selectedSpot.id, mapFloor);
    showToast(`¡Bahía ${selectedSpot.id} reservada! Tienes 15 minutos para ingresar.`);
    setSelectedSpot(null);
  }

  function handleReleaseSpot() {
    if (!selectedSpot) return;
    actions.releaseSpot(selectedSpot.id, mapFloor);
    showToast(`Reserva de bahía ${selectedSpot.id} cancelada.`);
    setSelectedSpot(null);
  }

  function handleCreateVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlate.trim()) return;
    actions.addVehicle({
      plate: newPlate,
      type: newType,
      brand: newBrand || "Renault",
      model: newModel || "Duster",
    });
    showToast(`Vehículo ${newPlate.toUpperCase()} añadido.`);
    setNewPlate("");
    setNewBrand("");
    setNewModel("");
    setAddVehicleSheet(false);
  }

  function openEditProfile() {
    setProfileName(currentUser?.name || "");
    setProfileEmail(currentUser?.email || "");
    setProfileDocument(currentUser?.documentId || "");
    setProfilePhone(currentUser?.phone || "");
    setEditProfileSheet(true);
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) return;

    actions.updateProfile({
      name: profileName,
      email: profileEmail,
      documentId: profileDocument,
      phone: profilePhone,
    });
    showToast("Perfil actualizado correctamente.");
    setEditProfileSheet(false);
  }

  // ── Session timer math (updates on store tick, which represents 1 minute) ──
  const elapsedMin = activeSession?.elapsedMinutes || 138;
  const targetSessionCost = activeSession?.totalCost || 8970;
  
  const hours = Math.floor(elapsedMin / 60);
  const minutes = elapsedMin % 60;
  const timeFormatted = `${String(hours).padStart(2, "0")} h ${String(minutes).padStart(2, "0")} min`;

  const lastPaidSession = state.history.find(
    (h) => h.plate === (activeSession?.plate || primaryVehicle?.plate) && h.status === "paid"
  );

  // Map spots
  const floorSpots = state.spots.filter((s) => s.floor === mapFloor);
  const visibleSpots = floorSpots.filter((s) => {
    if (mapFilter === "pmr") return s.type === "pmr";
    if (mapFilter === "ev") return s.hasCharger;
    return true;
  });

  return (
    <div className={`mobile-device-viewport ${fullscreen ? "fullscreen" : ""}`}>
      {/* Barra exterior para evaluadores */}
      <div className="mobile-evaluator-bar">
        <strong>
          <Icon name="car" size={16} /> Parkia Driver · Experiencia Móvil Nativa
        </strong>
        <div className="evaluator-actions">
          <button
            type="button"
            className="evaluator-btn"
            onClick={() => setFullscreen(!fullscreen)}
            title="Alternar entre marco de teléfono y pantalla completa"
          >
            {fullscreen ? "📱 Marco Teléfono" : "🖥️ Pantalla Completa"}
          </button>
          <button
            type="button"
            className="evaluator-btn"
            onClick={onSwitchToAdmin}
            title="Cambiar a la consola del operador"
          >
            <Icon name="shield" size={14} /> Consola Operador
          </button>
        </div>
      </div>

      {/* Dispositivo Teléfono Inteligente */}
      <div className="phone-device">
        {/* Barra de Estado Nativa (Status Bar) */}
        <div className="phone-status-bar">
          <span>09:41</span>
          <div className="phone-island">
            <span className="island-sensor" />
          </div>
          <div className="phone-status-icons">
            <span>5G</span>
            <Icon name="shield" size={12} />
            <span>98%</span>
          </div>
        </div>

        {/* Pantalla del Teléfono */}
        <div className="phone-screen">
          {/* Header Móvil con Selector Rápido de Vehículo */}
          <header className="mobile-header">
            <button
              type="button"
              className="mobile-header-user"
              onClick={() => setTab("perfil")}
              title="Ver perfil y configuración"
              aria-label="Abrir perfil y configuración"
              aria-current={tab === "perfil" ? "page" : undefined}
            >
              <span className="avatar small">{currentUser?.avatarText || "CM"}</span>
              <div>
                <small>Hola, {currentUser?.name.split(" ")[0] || "Carlos"}</small>
                <strong>Parking Central</strong>
              </div>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {primaryVehicle && (
                <button
                  type="button"
                  className="vehicle-selector-pill"
                  onClick={() => setVehicleSelectorSheet(true)}
                  title="Cambiar vehículo activo"
                >
                  <Icon name="car" size={14} />
                  <span>{primaryVehicle.plate}</span>
                  <Icon name="chevron" size={12} />
                </button>
              )}
              <button
                type="button"
                className="mobile-a11y-pill"
                onClick={() => setA11ySheetOpen(true)}
                title="Herramientas de Accesibilidad Universal (Alt + A)"
                aria-label="Abrir herramientas de accesibilidad universal"
              >
                <span aria-hidden="true">♿</span>
              </button>
            </div>
          </header>

          {/* Toast Notificación Móvil */}
          {toastMessage && (
            <div
              className="toast"
              style={{
                position: "absolute",
                top: 70,
                left: 16,
                right: 16,
                width: "auto",
                zIndex: 90,
                background: "#0d766e",
              }}
            >
              <span>
                <Icon name="check" size={16} />
              </span>
              <div>
                <strong>Parkia Móvil</strong>
                <small>{toastMessage}</small>
              </div>
              <button onClick={() => setToastMessage(null)}>
                <Icon name="close" size={14} />
              </button>
            </div>
          )}

          {/* ════ TAB 1: INICIO (HOME GLANCEABLE) ════ */}
          {tab === "inicio" && (
            <div className="mobile-page-content">
              {/* Tarjeta de Sesión Activa o Liquidada */}
              {activeSession?.status === "completed" ? (
                <section className="mobile-session-card" style={{ border: "1px solid #10b981", background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)" }}>
                  <div className="mobile-session-top">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="live-dot" style={{ background: "#10b981" }} />
                      <Badge tone="green">Estancia Liquidada</Badge>
                    </div>
                    <span className="mobile-plate-badge">{activeSession?.plate || "JHT · 482"}</span>
                  </div>

                  <div className="mobile-session-metrics">
                    <div className="mobile-session-metric">
                      <span>Pase de Salida</span>
                      <strong style={{ color: "#065f46" }}>15 min restantes</strong>
                      <small style={{ fontSize: 9, color: "#047857" }}>
                        Talanqueras habilitadas
                      </small>
                    </div>
                    <div className="mobile-session-metric cost">
                      <span>Total pagado</span>
                      <strong>{currencyFmt.format(activeSession.totalCost)}</strong>
                      <small style={{ fontSize: 9, color: "#047857" }}>
                        {timeFormatted}
                      </small>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button
                      type="button"
                      className="secondary sheet-cta-btn"
                      style={{ flex: 1, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      onClick={() => {
                        const tData = lastPaidSession || {
                          id: "SES-SALIDA",
                          plate: activeSession.plate,
                          entryTime: activeSession.entryTime,
                          duration: timeFormatted,
                          total: activeSession.totalCost,
                          method: "Tarjeta / App Móvil",
                          qrCode: `QR-PARKIA-EXIT-${activeSession.plate.replace(/[^A-Za-z0-9]/g, "")}`,
                        };
                        downloadTicket({
                          id: tData.id,
                          plate: tData.plate,
                          entryTime: tData.date || activeSession.entryTime,
                          exitTime: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
                          duration: tData.duration,
                          total: tData.total,
                          method: tData.method || "App Móvil",
                          qrCode: tData.qrCode,
                        });
                        showToast("Descargando tique digital...");
                      }}
                    >
                      <Icon name="download" size={16} /> Descargar Tique
                    </button>
                    <button
                      type="button"
                      className="primary sheet-cta-btn"
                      style={{ flex: 1, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      onClick={() => {
                        if (lastPaidSession) {
                          setPayingSession(lastPaidSession);
                        } else {
                          setPayingSession({
                            id: "SES-SALIDA",
                            date: "Hoy, " + activeSession.entryTime,
                            plate: activeSession.plate,
                            duration: timeFormatted,
                            durationMinutes: activeSession.elapsedMinutes,
                            status: "paid",
                            total: activeSession.totalCost,
                            qrCode: `QR-PARKIA-EXIT-${activeSession.plate.replace(/[^A-Za-z0-9]/g, "")}`,
                          });
                        }
                      }}
                    >
                      <Icon name="card" size={16} /> Ver QR Salida
                    </button>
                  </div>
                </section>
              ) : (
                <section className="mobile-session-card">
                  <div className="mobile-session-top">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="live-dot" />
                      <Badge tone="green">Estancia Activa</Badge>
                    </div>
                    <span className="mobile-plate-badge">{activeSession?.plate || "JHT · 482"}</span>
                  </div>

                  <div className="mobile-session-metrics">
                    <div className="mobile-session-metric">
                      <span>Tiempo transcurrido</span>
                      <strong>{timeFormatted}</strong>
                      <small style={{ fontSize: 9, color: "#879996" }}>
                        Entrada: {activeSession?.entryTime || "08:42 a. m."}
                      </small>
                    </div>
                    <div className="mobile-session-metric cost">
                      <span>Costo acumulado</span>
                      <strong>
                        <SmoothCounter value={targetSessionCost} formatValue={(v) => currencyFmt.format(v)} />
                      </strong>
                      <small style={{ fontSize: 9, color: "#0d766e" }}>
                        Tarifa: ${currentRate} / min
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary sheet-cta-btn"
                    onClick={() => {
                      setPayingSession({
                        id: "SES-ACTIVA",
                        date: "Hoy, " + (activeSession?.entryTime || "08:42 a. m."),
                        plate: activeSession?.plate || "JHT · 482",
                        duration: timeFormatted,
                        durationMinutes: elapsedMin,
                        status: "pending",
                        total: targetSessionCost,
                      });
                    }}
                  >
                    <Icon name="card" size={18} /> Pagar y Finalizar Estancia
                  </button>
                </section>
              )}

              {/* Atajos táctiles de un solo toque */}
              <div className="mobile-quick-actions">
                <div className="mobile-action-card" onClick={() => setTab("mapa")}>
                  <span className="quick-icon teal">
                    <Icon name="map" size={20} />
                  </span>
                  <div>
                    <strong>Mapa de bahías</strong>
                    <small>Ver disponibilidad en tiempo real</small>
                  </div>
                </div>

                <div className="mobile-action-card" onClick={() => setTab("vehiculos")}>
                  <span className="quick-icon blue">
                    <Icon name="car" size={20} />
                  </span>
                  <div>
                    <strong>Mis vehículos</strong>
                    <small>{state.vehicles.length} registrados</small>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Recomendación de Piso */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  padding: 16,
                  border: "1px solid #e1e8e6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <small style={{ fontSize: 10, color: "#7a8a87", fontWeight: 700 }}>
                    ZONA RECOMENDADA HOY
                  </small>
                  <h4 style={{ margin: "4px 0 2px", fontSize: 15, color: "#142523" }}>
                    Piso 2 · Zona B
                  </h4>
                  <p style={{ margin: 0, fontSize: 11, color: "#0d766e", fontWeight: 650 }}>
                    ⚡ 42 puestos con cargador EV libres
                  </p>
                </div>
                <button className="primary compact" onClick={() => setTab("mapa")}>
                  Ir al mapa <Icon name="arrow" size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ════ TAB 2: MAPA 2D & RESERVA ════ */}
          {tab === "mapa" && (
            <div className="mobile-page-content">
              {/* Selector de Piso deslizable */}
              <div className="segmented floors" style={{ width: "100%" }}>
                {(["Piso 1", "Piso 2", "Piso 3"] as const).map((f) => {
                  const free = state.spots.filter((s) => s.floor === f && s.state === "free").length;
                  return (
                    <button
                      key={f}
                      className={mapFloor === f ? "active" : ""}
                      onClick={() => setMapFloor(f)}
                      style={{ flex: 1, padding: "8px 4px" }}
                    >
                      {f}
                      <small style={{ display: "block", fontSize: 9 }}>{free} libres</small>
                    </button>
                  );
                })}
              </div>

              {/* Filtro chips */}
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                <button
                  type="button"
                  className={`badge ${mapFilter === "all" ? "active" : "neutral"}`}
                  onClick={() => setMapFilter("all")}
                  style={{ cursor: "pointer", padding: "6px 12px" }}
                >
                  Todos ({floorSpots.length})
                </button>
                <button
                  type="button"
                  className={`badge ${mapFilter === "pmr" ? "active" : "neutral"}`}
                  onClick={() => setMapFilter("pmr")}
                  style={{ cursor: "pointer", padding: "6px 12px" }}
                >
                  ♿ PMR Accesible
                </button>
                <button
                  type="button"
                  className={`badge ${mapFilter === "ev" ? "active" : "neutral"}`}
                  onClick={() => setMapFilter("ev")}
                  style={{ cursor: "pointer", padding: "6px 12px" }}
                >
                  ⚡ Cargador EV
                </button>
              </div>

              {/* Grilla 2D táctil */}
              <div
                style={{
                  background: "#e8edeb",
                  borderRadius: 16,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                  <strong>{mapFloor.toUpperCase()} · ZONA A & B</strong>
                  <span style={{ color: "#748683" }}>Toca una bahía para reservar</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 8,
                  }}
                >
                  {visibleSpots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSpot(s)}
                      className={`spot ${s.state}`}
                      style={{
                        height: 78,
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>{s.id}</strong>
                      <span style={{ fontSize: 9, marginTop: 2 }}>
                        {s.state === "free" ? "Libre" : s.state === "occupied" ? "Ocupado" : "Reserva"}
                      </span>
                      {s.hasCharger && <span style={{ fontSize: 8 }}>⚡</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ TAB 3: VEHÍCULOS & PERFIL ════ */}
          {tab === "vehiculos" && (
            <div className="mobile-page-content">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0, fontSize: 17 }}>Mis Vehículos ({state.vehicles.length})</h3>
                <button className="primary compact" onClick={() => setAddVehicleSheet(true)}>
                  <Icon name="plus" size={16} /> Añadir
                </button>
              </div>

              {/* Lista táctil de vehículos */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {state.vehicles.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      background: "#ffffff",
                      borderRadius: 14,
                      padding: 14,
                      border: `1px solid ${v.isPrimary ? "#acd8d2" : "#e1e7e5"}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div className={`vehicle-art ${v.isPrimary ? "" : "light"}`} style={{ width: 50, height: 50 }}>
                      <Icon name="car" size={26} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Badge tone={v.isPrimary ? "green" : "neutral"}>
                          {v.isPrimary ? "Principal" : "Secundario"}
                        </Badge>
                        <small style={{ color: "#748683" }}>{v.type}</small>
                      </div>
                      <h4 style={{ margin: "4px 0 1px", fontSize: 16 }}>{v.plate}</h4>
                      <p style={{ margin: 0, fontSize: 11, color: "#7a8a87" }}>
                        {v.brand} {v.model}
                      </p>
                    </div>

                    {!v.isPrimary && (
                      <button
                        className="secondary compact"
                        onClick={() => actions.setPrimaryVehicle(v.id)}
                      >
                        Activar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ TAB: PERFIL Y CONFIGURACIÓN ════ */}
          {tab === "perfil" && (
            <div className="mobile-page-content">
              <h3 style={{ margin: 0, fontSize: 17 }}>Perfil y configuración</h3>

              <section className="mobile-profile-settings">
                <div className="mobile-profile-summary">
                  <span className="avatar">{currentUser?.avatarText || "CM"}</span>
                  <div>
                    <strong>{currentUser?.name || "Carlos Martínez"}</strong>
                    <small>{currentUser?.email || "carlos.martinez@email.com"}</small>
                  </div>
                  <button
                    type="button"
                    className="secondary compact"
                    onClick={openEditProfile}
                    aria-label="Editar perfil"
                  >
                    <Icon name="edit" size={14} /> Editar
                  </button>
                </div>

                <div className="profile-row">
                  <Icon name="card" size={18} />
                  <div>
                    <span>Documento de Identidad</span>
                    <strong>{currentUser?.documentId || "CC 1.023.492.892"}</strong>
                  </div>
                </div>
                <div className="profile-row">
                  <Icon name="user" size={18} />
                  <div>
                    <span>Correo electrónico</span>
                    <strong>{currentUser?.email || "carlos.martinez@email.com"}</strong>
                  </div>
                </div>
                <div className="profile-row">
                  <Icon name="bell" size={18} />
                  <div>
                    <span>Teléfono celular</span>
                    <strong>{currentUser?.phone || "+57 310 849 2048"}</strong>
                  </div>
                </div>

                <div className="preference">
                  <div>
                    <strong>Notificaciones de salida</strong>
                    <small>Alertas de tiempo transcurrido y tarifa</small>
                  </div>
                  <span
                    className={`toggle ${state.notificationsEnabled ? "on" : ""}`}
                    onClick={() => actions.toggleNotifications()}
                    role="switch"
                    aria-checked={state.notificationsEnabled}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        actions.toggleNotifications();
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <i />
                  </span>
                </div>

                <div
                  className="preference"
                  style={{ cursor: "pointer" }}
                  onClick={() => setA11ySheetOpen(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setA11ySheetOpen(true);
                    }
                  }}
                  aria-label="Abrir panel de Accesibilidad Universal y Asistencia Visual"
                >
                  <div>
                    <strong>♿ Accesibilidad y Asistencia</strong>
                    <small>Zoom, alto contraste, daltonismos y voz TTS</small>
                  </div>
                  <Icon name="chevron" size={16} />
                </div>

                <button
                  className="secondary full"
                  onClick={() => actions.logout()}
                >
                  <Icon name="logout" size={16} /> Cerrar Sesión
                </button>
              </section>
            </div>
          )}

          {/* ════ TAB 4: PAGOS & HISTORIAL ════ */}
          {tab === "pagos" && (
            <div className="mobile-page-content">
              <div
                style={{
                  background: "#e8f4f1",
                  borderRadius: 14,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <small style={{ color: "#0d766e", fontWeight: 700 }}>PAGOS DIGITALES</small>
                  <h4 style={{ margin: "2px 0", fontSize: 15 }}>Salida Express con QR</h4>
                  <p style={{ margin: 0, fontSize: 11, color: "#556e69" }}>
                    Liquida y abre la talanquera sin hacer filas
                  </p>
                </div>
                <Icon name="card" size={28} />
              </div>

              {/* Estancia en Curso para Pagar */}
              {activeSession && activeSession.status === "active" && (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 14,
                    padding: 16,
                    border: "2px solid #0d766e",
                    boxShadow: "0 4px 14px rgba(13, 118, 110, 0.12)",
                    marginTop: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="live-dot" />
                      <strong style={{ fontSize: 14, color: "#0d766e" }}>Estancia en Curso</strong>
                    </div>
                    <span className="plate-small">{activeSession.plate}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0 14px", alignItems: "baseline" }}>
                    <div>
                      <small style={{ color: "#667774", display: "block" }}>Tiempo acumulado</small>
                      <strong style={{ fontSize: 15, color: "#142523" }}>{timeFormatted}</strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <small style={{ color: "#667774", display: "block" }}>Total a liquidar</small>
                      <strong style={{ fontSize: 18, color: "#0d766e" }}>{currencyFmt.format(targetSessionCost)}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary full"
                    style={{ height: 44, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    onClick={() => {
                      setPayingSession({
                        id: "SES-ACTIVA",
                        date: "Hoy, " + activeSession.entryTime,
                        plate: activeSession.plate,
                        duration: timeFormatted,
                        durationMinutes: activeSession.elapsedMinutes,
                        status: "pending",
                        total: targetSessionCost,
                      });
                    }}
                  >
                    <Icon name="card" size={16} /> Pagar y Finalizar Estancia
                  </button>
                </div>
              )}

              <h4 style={{ margin: "14px 0 0", fontSize: 15 }}>Sesiones Recientes</h4>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {state.history.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      background: "#ffffff",
                      borderRadius: 14,
                      padding: 14,
                      border: "1px solid #e1e7e5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span className="plate-small">{h.plate}</span>
                        <Badge tone={h.status === "paid" ? "paid" : h.status === "active" ? "active" : "pending"}>
                          {h.status === "paid" ? "Pagado" : h.status === "active" ? "En curso" : "Pendiente"}
                        </Badge>
                      </div>
                      <small style={{ display: "block", color: "#7a8a87", marginTop: 4 }}>
                        {h.date} · {h.duration}
                      </small>
                      <strong style={{ fontSize: 14, color: "#142523", marginTop: 2, display: "block" }}>
                        {currencyFmt.format(h.total)}
                      </strong>
                    </div>

                    {h.status === "pending" ? (
                      <button className="primary compact" onClick={() => setPayingSession(h)}>
                        Pagar ahora
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {h.qrCode && (
                          <button
                            type="button"
                            className="secondary compact"
                            title="Descargar tique"
                            style={{ padding: "6px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                            onClick={() => {
                              downloadTicket({
                                id: h.id,
                                plate: h.plate,
                                entryTime: h.date,
                                exitTime: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
                                duration: h.duration,
                                total: h.total,
                                method: h.method,
                                qrCode: h.qrCode,
                              });
                              showToast(`Descargando tique ${h.plate}...`);
                            }}
                            aria-label={`Descargar tique digital de ${h.plate}`}
                          >
                            <Icon name="download" size={14} />
                          </button>
                        )}
                        <button className="secondary compact" onClick={() => setPayingSession(h)}>
                          Ver QR
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ════ BOTTOM NAVIGATION BAR FIJA (THUMB-ZONE) ════ */}
        <nav className="mobile-bottom-nav" aria-label="Navegación móvil del conductor">
          <button
            type="button"
            className={`mobile-nav-btn ${tab === "inicio" ? "active" : ""}`}
            onClick={() => setTab("inicio")}
          >
            <Icon name="home" size={20} />
            <span>Inicio</span>
            {tab === "inicio" && <span className="mobile-nav-dot" />}
          </button>
          <button
            type="button"
            className={`mobile-nav-btn ${tab === "mapa" ? "active" : ""}`}
            onClick={() => setTab("mapa")}
          >
            <Icon name="map" size={20} />
            <span>Mapa</span>
            {tab === "mapa" && <span className="mobile-nav-dot" />}
          </button>
          <button
            type="button"
            className={`mobile-nav-btn ${tab === "vehiculos" ? "active" : ""}`}
            onClick={() => setTab("vehiculos")}
          >
            <Icon name="car" size={20} />
            <span>Vehículos</span>
            {tab === "vehiculos" && <span className="mobile-nav-dot" />}
          </button>
          <button
            type="button"
            className={`mobile-nav-btn ${tab === "pagos" ? "active" : ""}`}
            onClick={() => setTab("pagos")}
          >
            <Icon name="card" size={20} />
            <span>Pagos</span>
            {tab === "pagos" && <span className="mobile-nav-dot" />}
          </button>
          <button
            type="button"
            className={`mobile-nav-btn ${tab === "perfil" ? "active" : ""}`}
            onClick={() => setTab("perfil")}
          >
            <Icon name="user" size={20} />
            <span>Perfil</span>
            {tab === "perfil" && <span className="mobile-nav-dot" />}
          </button>
        </nav>

        {/* Home Indicator Nativo */}
        <div className="phone-home-bar">
          <div className="home-pill" />
        </div>

        {/* ════ BOTTOM SHEET: DETALLE Y RESERVA DE BAHÍA ════ */}
        {selectedSpot && (
          <div className="bottom-sheet-backdrop" onClick={() => setSelectedSpot(null)}>
            <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle-bar" />
              <div className="sheet-header">
                <h3>Bahía {selectedSpot.id} ({selectedSpot.floor})</h3>
                <button className="icon-btn" onClick={() => setSelectedSpot(null)}>
                  <Icon name="close" size={16} />
                </button>
              </div>

              <div className="mobile-session-metrics">
                <div className="mobile-session-metric">
                  <span>Estado actual</span>
                  <strong style={{ color: selectedSpot.state === "free" ? "#0d766e" : "#b83e37" }}>
                    {selectedSpot.state === "free" ? "Libre para reservar" : selectedSpot.state === "reserved" ? "Reservado" : "Ocupado"}
                  </strong>
                </div>
                <div className="mobile-session-metric">
                  <span>Tipo & Distancia</span>
                  <strong>{selectedSpot.type === "pmr" ? "PMR Accesible" : selectedSpot.type === "ev" ? "Cargador EV" : "Automóvil"}</strong>
                  <small style={{ fontSize: 9 }}>A {selectedSpot.distanceElevator}m del ascensor</small>
                </div>
              </div>

              {selectedSpot.state === "free" ? (
                <button type="button" className="primary sheet-cta-btn" onClick={handleReserveSpot}>
                  <Icon name="check" size={18} /> Reservar bahía ahora (15 min)
                </button>
              ) : selectedSpot.state === "reserved" ? (
                <button type="button" className="primary sheet-cta-btn danger" onClick={handleReleaseSpot}>
                  <Icon name="close" size={18} /> Cancelar reserva
                </button>
              ) : (
                <button type="button" className="secondary sheet-cta-btn" onClick={() => setSelectedSpot(null)}>
                  Bahía no disponible · Elegir otra
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════ BOTTOM SHEET: SELECTOR RÁPIDO DE VEHÍCULO ════ */}
        {vehicleSelectorSheet && (
          <div className="bottom-sheet-backdrop" onClick={() => setVehicleSelectorSheet(false)}>
            <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle-bar" />
              <div className="sheet-header">
                <h3>Seleccionar Vehículo Activo</h3>
                <button className="icon-btn" onClick={() => setVehicleSelectorSheet(false)}>
                  <Icon name="close" size={16} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {state.vehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    style={{
                      background: v.isPrimary ? "#e8f4f1" : "#f7faf9",
                      border: `1px solid ${v.isPrimary ? "#0d766e" : "#d8e3e0"}`,
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      actions.setPrimaryVehicle(v.id);
                      setVehicleSelectorSheet(false);
                      showToast(`Vehículo activo: ${v.plate}`);
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 15, display: "block" }}>{v.plate}</strong>
                      <small style={{ color: "#718380" }}>{v.brand} {v.model} ({v.type})</small>
                    </div>
                    {v.isPrimary && <Icon name="check" size={18} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ BOTTOM SHEET: AGREGAR VEHÍCULO ════ */}
        {addVehicleSheet && (
          <div className="bottom-sheet-backdrop" onClick={() => setAddVehicleSheet(false)}>
            <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle-bar" />
              <div className="sheet-header">
                <h3>Registrar Vehículo</h3>
                <button className="icon-btn" onClick={() => setAddVehicleSheet(false)}>
                  <Icon name="close" size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateVehicle} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#556764", display: "flex", flexDirection: "column", gap: 4 }}>
                  Placa vehicular *
                  <input
                    placeholder="Ej. ABC 123 o ABC 12D"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    style={{ height: 46, borderRadius: 10, border: "1px solid #d3dedb", padding: "0 12px", fontSize: 15, fontWeight: 750 }}
                    required
                  />
                </label>

                <div className="form-grid">
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#556764", display: "flex", flexDirection: "column", gap: 4 }}>
                    Tipo
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      style={{ height: 46, borderRadius: 10, border: "1px solid #d3dedb", padding: "0 10px" }}
                    >
                      <option>Automóvil</option>
                      <option>Motocicleta</option>
                      <option>Eléctrico</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#556764", display: "flex", flexDirection: "column", gap: 4 }}>
                    Marca
                    <input
                      placeholder="Ej. Renault"
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      style={{ height: 46, borderRadius: 10, border: "1px solid #d3dedb", padding: "0 10px" }}
                    />
                  </label>
                </div>

                <label style={{ fontSize: 11, fontWeight: 700, color: "#556764", display: "flex", flexDirection: "column", gap: 4 }}>
                  Línea / Modelo
                  <input
                    placeholder="Ej. Duster / Pulsar"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    style={{ height: 46, borderRadius: 10, border: "1px solid #d3dedb", padding: "0 10px" }}
                  />
                </label>

                <button type="submit" className="primary sheet-cta-btn" style={{ marginTop: 8 }}>
                  <Icon name="check" size={18} /> Guardar vehículo
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ════ BOTTOM SHEET: EDITAR PERFIL ════ */}
        {editProfileSheet && (
          <div className="bottom-sheet-backdrop" onClick={() => setEditProfileSheet(false)}>
            <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-handle-bar" />
              <div className="sheet-header">
                <h3>Editar perfil</h3>
                <button className="icon-btn" onClick={() => setEditProfileSheet(false)}>
                  <Icon name="close" size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#556764", display: "flex", flexDirection: "column", gap: 4 }}>
                  Nombre completo *
                  <input
                    placeholder="Ej. Carlos Martínez"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    style={{ height: 46, borderRadius: 10, border: "1px solid #d3dedb", padding: "0 12px", fontSize: 15 }}
                    required
                  />
                </label>

                <label style={{ fontSize: 11, fontWeight: 700, color: "#556764", display: "flex", flexDirection: "column", gap: 4 }}>
                  Correo electrónico *
                  <input
                    type="email"
                    placeholder="Ej. carlos.martinez@email.com"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    style={{ height: 46, borderRadius: 10, border: "1px solid #d3dedb", padding: "0 12px", fontSize: 15 }}
                    required
                  />
                </label>

                <label style={{ fontSize: 11, fontWeight: 700, color: "#556764", display: "flex", flexDirection: "column", gap: 4 }}>
                  Documento de identidad
                  <input
                    placeholder="Ej. CC 1.023.492.892"
                    value={profileDocument}
                    onChange={(e) => setProfileDocument(e.target.value)}
                    style={{ height: 46, borderRadius: 10, border: "1px solid #d3dedb", padding: "0 12px", fontSize: 15 }}
                  />
                </label>

                <label style={{ fontSize: 11, fontWeight: 700, color: "#556764", display: "flex", flexDirection: "column", gap: 4 }}>
                  Teléfono celular
                  <input
                    type="tel"
                    placeholder="Ej. +57 310 849 2048"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    style={{ height: 46, borderRadius: 10, border: "1px solid #d3dedb", padding: "0 12px", fontSize: 15 }}
                  />
                </label>

                <button type="submit" className="primary sheet-cta-btn" style={{ marginTop: 8 }}>
                  <Icon name="check" size={18} /> Guardar cambios
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ════ MODAL / SHEET DE PAGO CON TICKET QR ════ */}
        {payingSession && (
          <PaymentModal session={payingSession} onClose={() => setPayingSession(null)} />
        )}

        {/* ════ WIDGET / SHEET DE ACCESIBILIDAD UNIVERSAL INTEGRADO EN EL MÓVIL ════ */}
        <AccessibilityWidget
          variant="mobile"
          isOpen={a11ySheetOpen}
          onClose={() => setA11ySheetOpen(false)}
          onOpen={() => setA11ySheetOpen(true)}
        />
      </div>
    </div>
  );
}
