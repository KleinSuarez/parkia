import React, { useState, useEffect, useRef } from "react";
import { useParkiaStore, ParkingSpot, ParkingHistoryItem } from "./store/parkiaStore";
import { Icon, Badge, IconName } from "./components/Icon";
import { AuthScreen } from "./components/AuthScreen";
import { PaymentModal } from "./components/PaymentModal";

// ── COMPONENTES REUTILIZABLES DE ANIMACIÓN Y ACCESIBILIDAD ──
function AnimatedValue({
  value,
  duration = 500,
  format = "number",
  prefix = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  format?: "number" | "currency";
  prefix?: string;
  suffix?: string;
}) {
  const [displayed, setDisplayed] = useState(0);
  const finalRef = useRef(false);
  const ariaRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    finalRef.current = false;
    const start = performance.now();
    const fmt = new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
      style: format === "currency" ? "currency" : "decimal",
      currency: "COP",
    });

    function ease(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function tick(now: number) {
      const elapsed = Math.min((now - start) / duration, 1);
      const v = Math.round(ease(elapsed) * value);
      setDisplayed(v);

      if (elapsed < 1) {
        requestAnimationFrame(tick);
      } else if (!finalRef.current) {
        finalRef.current = true;
        setDisplayed(value);
        if (ariaRef.current) {
          const formattedFinal =
            format === "currency" ? fmt.format(value) : `${prefix}${fmt.format(value)}${suffix}`;
          ariaRef.current.textContent = formattedFinal;
        }
      }
    }
    requestAnimationFrame(tick);
  }, [value, duration, format, prefix, suffix]);

  const fmt = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
    style: format === "currency" ? "currency" : "decimal",
    currency: "COP",
  });

  const formatted =
    format === "currency" ? fmt.format(displayed) : `${prefix}${fmt.format(displayed)}${suffix}`;

  return (
    <>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatted}</span>
      <span ref={ariaRef} aria-live="polite" className="sr-only" />
    </>
  );
}

function OccupancyRing({ pct }: { pct: number }) {
  const [displayed, setDisplayed] = useState(0);
  const [arcPct, setArcPct] = useState(0);
  const finalRef = useRef(false);
  const ariaRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    finalRef.current = false;
    const duration = 500;
    const start = performance.now();
    const fmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

    function ease(t: number) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const v = Math.round(ease(t) * pct);
      setDisplayed(v);
      setArcPct(ease(t) * pct);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else if (!finalRef.current) {
        finalRef.current = true;
        setDisplayed(pct);
        setArcPct(pct);
        if (ariaRef.current) ariaRef.current.textContent = fmt.format(pct) + "% ocupado";
      }
    }
    requestAnimationFrame(tick);
  }, [pct]);

  const fmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

  return (
    <div
      className="occupancy-ring"
      style={{ background: `conic-gradient(#0d766e 0 ${arcPct}%, #e5ecea ${arcPct}%)` }}
    >
      <div>
        <strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmt.format(displayed)}%</strong>
        <span>ocupado</span>
      </div>
      <span ref={ariaRef} aria-live="polite" className="sr-only" />
    </div>
  );
}

const costFmt = new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 });

function useAnimatedValue(target: number, duration = 500) {
  const [value, setValue] = useState(target);
  const prev = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prev.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setValue(from + (to - from) * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        setValue(to);
        prev.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

function Header({
  title,
  eyebrow,
  avatarText = "CM",
}: {
  title: string;
  eyebrow: string;
  avatarText?: string;
}) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="head-actions">
        <button className="icon-btn" aria-label="Notificaciones">
          <Icon name="bell" />
          <span className="notification-dot" />
        </button>
        <div className="avatar">{avatarText}</div>
      </div>
    </div>
  );
}

// ── VISTAS DEL PORTAL CONDUCTOR (USUARIOS) ──

function ActiveSessionCard({ go }: { go: (page: string) => void }) {
  const [state] = useParkiaStore();
  const session = state.activeSession;

  if (!session) return null;

  const animCost = useAnimatedValue(session.totalCost);
  const animMinutes = useAnimatedValue(session.elapsedMinutes);

  const displayCost = `$ ${costFmt.format(Math.round(animCost))}`;
  const h = Math.floor(Math.round(animMinutes) / 60);
  const m = Math.round(animMinutes) % 60;
  const displayTime = `${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} min`;

  return (
    <section className="active-session">
      <div className="plate-block">
        <div className="plate-icon plate-icon--animated">
          <Icon name="car" size={28} />
          <span className="session-pulse" aria-hidden="true" />
        </div>
        <div>
          <Badge tone="green">Sesión activa</Badge>
          <h3>{session.plate}</h3>
          <p>{session.vehicle}</p>
        </div>
      </div>
      <div className="session-stat">
        <span>Entrada</span>
        <strong>{session.entryTime}</strong>
        <small>{session.accessGate}</small>
      </div>
      <div className="session-stat">
        <span>Tiempo transcurrido</span>
        <strong className="tabnum">{displayTime}</strong>
        <small>Tarifa: ${state.tariffs.carRate} / min</small>
      </div>
      <div className="session-stat total">
        <span>Total estimado</span>
        <strong className="tabnum" style={{ color: "#0d766e" }}>
          {displayCost}
        </strong>
        <small>Ticker acelerado (5s = 1m)</small>
      </div>
      <button className="secondary" onClick={() => go("estacionamiento")}>
        Ver detalle
      </button>
    </section>
  );
}

function Home({ go }: { go: (page: string) => void }) {
  const [state] = useParkiaStore();
  const firstName = state.currentUser?.name.split(" ")[0] || "Carlos";
  const freeSpots = state.spots.filter((s) => s.state === "free").length;

  return (
    <main className="page">
      <Header
        eyebrow="Jueves, 12 de junio"
        title={`Buenos días, ${firstName}`}
        avatarText={state.currentUser?.avatarText}
      />
      <section className="hero">
        <div className="hero-copy">
          <Badge tone="light">
            <span className="live-dot" />{" "}
            <AnimatedValue value={freeSpots} suffix=" cupos disponibles ahora" />
          </Badge>
          <h2>
            Estaciona sin vueltas.
            <br />
            Tu lugar está listo.
          </h2>
          <p>
            Consulta disponibilidad en tiempo real, reserva tu bahía y llega directo a tu espacio.
          </p>
          <div className="search-box">
            <Icon name="search" />
            <div>
              <span>¿Dónde quieres estacionar?</span>
              <strong>Parking Central · Calle 93</strong>
            </div>
            <button onClick={() => go("mapa")} className="primary">
              Ver disponibilidad <Icon name="arrow" size={18} />
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="orbit o1" />
          <div className="orbit o2" />
          <div className="parking-mark">
            P<span>ARK</span>
          </div>
          <div className="availability-card">
            <span>Zona recomendada</span>
            <strong>Piso 2 · Zona B</strong>
            <small>Puestos libres con cargador EV</small>
          </div>
        </div>
      </section>

      <div className="section-title">
        <div>
          <p className="eyebrow">EN CURSO</p>
          <h3>Tu estacionamiento activo</h3>
        </div>
        <button className="text-btn" onClick={() => go("historial")}>
          Ver historial <Icon name="arrow" size={16} />
        </button>
      </div>

      <ActiveSessionCard go={go} />

      <section className="quick-grid">
        <button onClick={() => go("mapa")} style={{ "--i": 0 } as React.CSSProperties}>
          <span className="quick-icon teal">
            <Icon name="map" />
          </span>
          <div>
            <strong>Explorar mapa</strong>
            <small>Disponibilidad por piso y reserva</small>
          </div>
          <Icon name="chevron" />
        </button>
        <button onClick={() => go("vehiculos")} style={{ "--i": 1 } as React.CSSProperties}>
          <span className="quick-icon blue">
            <Icon name="car" />
          </span>
          <div>
            <strong>Mis vehículos</strong>
            <small>{state.vehicles.length} vehículos registrados</small>
          </div>
          <Icon name="chevron" />
        </button>
        <button onClick={() => go("historial")} style={{ "--i": 2 } as React.CSSProperties}>
          <span className="quick-icon amber">
            <Icon name="card" />
          </span>
          <div>
            <strong>Sesiones y pagos</strong>
            <small>Historial y comprobante QR</small>
          </div>
          <Icon name="chevron" />
        </button>
      </section>
    </main>
  );
}

// ── FLUJO U1: MAPA DE BAHÍAS Y RESERVA INTERACTIVA ──
function AvailabilityMap() {
  const [state, actions] = useParkiaStore();
  const [floor, setFloor] = useState<"Piso 1" | "Piso 2" | "Piso 3">("Piso 2");
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("center center");
  const [filterType, setFilterType] = useState<"all" | "pmr" | "ev">("all");
  const [reservationNotice, setReservationNotice] = useState<string | null>(null);

  const floorSpots = state.spots.filter((s) => s.floor === floor);
  const freeCount = floorSpots.filter((s) => s.state === "free").length;
  const occupiedCount = floorSpots.filter((s) => s.state === "occupied").length;
  const reservedCount = floorSpots.filter((s) => s.state === "reserved").length;
  const occupancyPct = Math.round(((occupiedCount + reservedCount) / floorSpots.length) * 100) || 0;

  const visibleSpots = floorSpots.filter((s) => {
    if (filterType === "pmr") return s.type === "pmr";
    if (filterType === "ev") return s.hasCharger;
    return true;
  });

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest(".spot")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setZoomOrigin(`${x}% ${y}%`);
    setZoomed(!zoomed);
  }

  function handleSpotClick(spot: ParkingSpot, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mapRect = e.currentTarget.closest(".parking-map")?.getBoundingClientRect();
    if (mapRect) {
      const x = Math.round(((rect.left + rect.width / 2 - mapRect.left) / mapRect.width) * 100);
      const y = Math.round(((rect.top + rect.height / 2 - mapRect.top) / mapRect.height) * 100);
      setZoomOrigin(`${x}% ${y}%`);
    }
    setSelectedSpot(spot);
  }

  function handleConfirmReservation() {
    if (!selectedSpot) return;
    actions.reserveSpot(selectedSpot.id, floor);
    setReservationNotice(`¡Bahía ${selectedSpot.id} reservada! Tienes 15 minutos para ingresar.`);
    setSelectedSpot(null);
    setTimeout(() => setReservationNotice(null), 4000);
  }

  function handleReleaseReservation() {
    if (!selectedSpot) return;
    actions.releaseSpot(selectedSpot.id, floor);
    setReservationNotice(`Reserva de bahía ${selectedSpot.id} cancelada.`);
    setSelectedSpot(null);
    setTimeout(() => setReservationNotice(null), 4000);
  }

  return (
    <main className="page">
      <Header
        eyebrow="PARKING CENTRAL · CALLE 93"
        title="Disponibilidad y reserva en tiempo real"
        avatarText={state.currentUser?.avatarText}
      />

      {reservationNotice && (
        <div className="toast" style={{ top: 90, bottom: "auto", background: "#0d766e" }}>
          <span>
            <Icon name="check" size={16} />
          </span>
          <div>
            <strong>Confirmación de Reserva</strong>
            <small>{reservationNotice}</small>
          </div>
          <button onClick={() => setReservationNotice(null)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      <div className="map-toolbar">
        <div className="segmented">
          {(["Piso 1", "Piso 2", "Piso 3"] as const).map((f) => {
            const count = state.spots.filter((s) => s.floor === f && s.state === "free").length;
            return (
              <button
                className={floor === f ? "active" : ""}
                onClick={() => setFloor(f)}
                key={f}
              >
                {f}
                <small>{count} libres</small>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="segmented" style={{ background: "#edf2f0" }}>
            <button
              className={filterType === "all" ? "active" : ""}
              onClick={() => setFilterType("all")}
            >
              Todos
            </button>
            <button
              className={filterType === "pmr" ? "active" : ""}
              onClick={() => setFilterType("pmr")}
            >
              PMR (Accesible)
            </button>
            <button
              className={filterType === "ev" ? "active" : ""}
              onClick={() => setFilterType("ev")}
            >
              Cargador EV
            </button>
          </div>

          <button className="zoom-btn" onClick={() => setZoomed(!zoomed)}>
            <Icon name="search" size={13} /> {zoomed ? "Alejar mapa" : "Zoom de mapa"}
          </button>
        </div>

        <div className="legend">
          <span>
            <i className="state-dot free">
              <Icon name="check" size={11} />
            </i>
            Libre
          </span>
          <span>
            <i className="state-dot occupied">
              <Icon name="close" size={11} />
            </i>
            Ocupado
          </span>
          <span>
            <i className="state-dot reserved">
              <Icon name="clock" size={11} />
            </i>
            Reservado
          </span>
        </div>
      </div>

      <section className="map-layout">
        <div
          className={`parking-map${zoomed ? " zoomed" : ""}`}
          style={{ transformOrigin: zoomOrigin }}
          onClick={handleMapClick}
        >
          <div className="map-label">
            <span>ZONA A & ZONA B · {floor.toUpperCase()}</span>
            <small>Acceso Norte · Altura máx 2.10 m</small>
          </div>
          <div className="lane">
            <span>Sentido de circulación vehicular</span>
            <Icon name="arrow" size={16} />
          </div>

          <div className="spots">
            {visibleSpots.map((s, i) => (
              <button
                key={s.id}
                onClick={(e) => handleSpotClick(s, e)}
                className={`spot ${s.state}${selectedSpot?.id === s.id ? " selected" : ""}`}
                style={{ "--i": i } as React.CSSProperties}
                title={`Bahía ${s.id} (${s.state})`}
              >
                <span className="spot-status">
                  {s.state === "free" ? (
                    <Icon name="check" size={12} />
                  ) : s.state === "occupied" ? (
                    <Icon name="close" size={12} />
                  ) : (
                    <Icon name="clock" size={12} />
                  )}
                  {s.state === "free"
                    ? "Libre"
                    : s.state === "occupied"
                    ? "Ocupado"
                    : "Reservado"}
                </span>
                <strong>{s.id}</strong>
                {s.state === "occupied" && <Icon name="car" size={24} />}
                {s.type === "pmr" && <Badge tone="light">PMR</Badge>}
                {s.hasCharger && <Badge tone="green">⚡ EV</Badge>}
                <small>{s.zone}</small>
              </button>
            ))}
          </div>

          <div className="lane reverse">
            <Icon name="arrow" size={16} />
            <span>Salida expedita hacia Calle 93</span>
          </div>

          <div className="map-exits">
            <span>
              <Icon name="gate" size={16} /> Entrada Norte
            </span>
            <span>
              <Icon name="user" size={16} /> Batería de Ascensores
            </span>
            <span>
              <Icon name="gate" size={16} /> Salida Sur
            </span>
          </div>
        </div>

        <aside className="map-aside">
          <Badge tone="green">Monitoreo en vivo</Badge>
          <h3>{floor}</h3>
          <p>Sincronizado con sensores ultrasónicos</p>
          <OccupancyRing pct={occupancyPct} />
          <dl>
            <div>
              <dt>
                <i className="state-dot free" />
                Libres
              </dt>
              <dd>{freeCount}</dd>
            </div>
            <div>
              <dt>
                <i className="state-dot occupied" />
                Ocupados
              </dt>
              <dd>{occupiedCount}</dd>
            </div>
            <div>
              <dt>
                <i className="state-dot reserved" />
                Reservados
              </dt>
              <dd>{reservedCount}</dd>
            </div>
          </dl>
          <div className="accessible-note">
            <Icon name="shield" />
            <div>
              <strong>Espacios con cargador eléctrico</strong>
              <small>Disponibles en Bahías A-02 y B-06</small>
            </div>
          </div>
        </aside>
      </section>

      {/* MODAL DETALLE DE BAHÍA Y RESERVA */}
      {selectedSpot && (
        <Modal title={`Detalle Bahía ${selectedSpot.id}`} onClose={() => setSelectedSpot(null)}>
          <div className="modal-spot">
            <span>
              <Icon
                name={
                  selectedSpot.state === "free"
                    ? "check"
                    : selectedSpot.state === "occupied"
                    ? "close"
                    : "clock"
                }
                size={28}
              />
            </span>
            <h3>
              {selectedSpot.state === "free"
                ? "Bahía disponible para reserva"
                : selectedSpot.state === "occupied"
                ? "Bahía ocupada actualmente"
                : "Bahía reservada"}
            </h3>
            <p>
              Ubicada en {selectedSpot.floor}, {selectedSpot.zone}. A {selectedSpot.distanceElevator}{" "}
              metros del ascensor principal.
              {selectedSpot.hasCharger ? " Incluye estación de carga rápida EV." : ""}
            </p>
          </div>

          <div className="form-grid" style={{ margin: "16px 0" }}>
            <div className="apd-detail">
              <span>ESTADO</span>
              <strong>
                {selectedSpot.state === "free"
                  ? "Libre"
                  : selectedSpot.state === "occupied"
                  ? "Ocupado"
                  : "Reservado"}
              </strong>
            </div>
            <div className="apd-detail">
              <span>TIPO DE BAHÍA</span>
              <strong>
                {selectedSpot.type === "pmr"
                  ? "Accesible PMR"
                  : selectedSpot.type === "ev"
                  ? "Eléctrico EV"
                  : "Automóvil"}
              </strong>
            </div>
            <div className="apd-detail">
              <span>TARIFA VIGENTE</span>
              <strong>${state.tariffs.carRate} / min</strong>
            </div>
            <div className="apd-detail">
              <span>TOPE MÁXIMO DÍA</span>
              <strong>${costFmt.format(state.tariffs.carCap)}</strong>
            </div>
          </div>

          <div className="modal-actions">
            <button className="secondary" onClick={() => setSelectedSpot(null)}>
              Cerrar
            </button>
            {selectedSpot.state === "free" && (
              <button className="primary" onClick={handleConfirmReservation}>
                Reservar bahía (15 min) <Icon name="check" size={17} />
              </button>
            )}
            {selectedSpot.state === "reserved" && (
              <button className="primary danger" onClick={handleReleaseReservation}>
                Cancelar reserva <Icon name="close" size={17} />
              </button>
            )}
          </div>
        </Modal>
      )}
    </main>
  );
}

// ── FLUJO U3: GESTIÓN DE VEHÍCULOS Y PERFIL ──
function Vehicles() {
  const [state, actions] = useParkiaStore();
  const [addModal, setAddModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(state.vehicles[0]?.id || null);

  // Form state
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<"Automóvil" | "Motocicleta" | "Eléctrico">("Automóvil");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [year, setYear] = useState("2024");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function handleSaveVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!plate.trim()) return;

    actions.addVehicle({
      plate,
      type,
      brand: brand.trim() || "Renault",
      model: model.trim() || "Duster",
      color: color.trim() || "Gris",
      year: year.trim() || "2024",
    });

    setToastMessage(`Vehículo ${plate.toUpperCase()} registrado con éxito.`);
    setAddModal(false);
    setPlate("");
    setBrand("");
    setModel("");
    setTimeout(() => setToastMessage(null), 3500);
  }

  const currentUser = state.currentUser;

  return (
    <main className="page">
      <Header
        eyebrow="CUENTA PERSONAL"
        title="Vehículos y perfil de conductor"
        avatarText={currentUser?.avatarText}
      />

      {toastMessage && (
        <div className="toast" style={{ top: 90, bottom: "auto", background: "#0d766e" }}>
          <span>
            <Icon name="check" size={16} />
          </span>
          <div>
            <strong>Gestión de Vehículos</strong>
            <small>{toastMessage}</small>
          </div>
          <button onClick={() => setToastMessage(null)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      <div className="two-column">
        <section>
          <div className="section-title">
            <div>
              <p className="eyebrow">MIS VEHÍCULOS</p>
              <h3>Vehículos registrados ({state.vehicles.length})</h3>
            </div>
            <button className="primary compact" onClick={() => setAddModal(true)}>
              <Icon name="plus" size={17} /> Agregar vehículo
            </button>
          </div>

          {state.vehicles.map((v) => {
            const isExpanded = expandedId === v.id;
            return (
              <div
                key={v.id}
                className={`vehicle-card ${v.isPrimary ? "primary-vehicle" : ""}`}
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
                style={{ cursor: "pointer" }}
              >
                <div className={`vehicle-art ${v.isPrimary ? "" : "light"}`}>
                  <Icon name="car" size={38} />
                </div>
                <div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Badge tone={v.isPrimary ? "green" : "neutral"}>
                      {v.isPrimary ? "Principal" : "Secundario"}
                    </Badge>
                    <small style={{ color: "#7a8a87" }}>{v.type}</small>
                  </div>
                  <h3>{v.plate}</h3>
                  <p>
                    {v.brand} {v.model} · {v.year} · {v.color}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {!v.isPrimary && (
                    <button
                      className="secondary compact"
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.setPrimaryVehicle(v.id);
                      }}
                      title="Establecer como vehículo principal"
                    >
                      Hacer principal
                    </button>
                  )}
                  {state.vehicles.length > 1 && (
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.deleteVehicle(v.id);
                      }}
                      title="Eliminar vehículo"
                      aria-label="Eliminar vehículo"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>

                <div
                  className={`mask-accordion${isExpanded ? " open" : ""}`}
                  style={{ gridColumn: "1/-1" }}
                >
                  <div className="mask-content" {...(!isExpanded ? { inert: "" } : {})}>
                    <div className="vehicle-meta">
                      <span style={{ "--i": 0 } as React.CSSProperties}>
                        Tipo
                        <strong>{v.type}</strong>
                      </span>
                      <span style={{ "--i": 1 } as React.CSSProperties}>
                        Último ingreso
                        <strong>{v.lastEntry}</strong>
                      </span>
                      <span style={{ "--i": 2 } as React.CSSProperties}>
                        Tag RFID
                        <strong>{v.rfidLinked ? "Vinculado activo" : "Sin vincular"}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <aside className="profile-card">
          <div className="profile-top">
            <div className="avatar large">{currentUser?.avatarText || "CM"}</div>
            <div>
              <h3>{currentUser?.name || "Carlos Martínez"}</h3>
              <p>Conductor registrado · Sede Bogotá</p>
            </div>
            <button className="icon-btn" title="Editar perfil" aria-label="Editar perfil">
              <Icon name="edit" />
            </button>
          </div>

          <div className="profile-row">
            <Icon name="card" />
            <div>
              <span>Documento de Identidad</span>
              <strong>{currentUser?.documentId || "CC 1.023.492.892"}</strong>
            </div>
          </div>
          <div className="profile-row">
            <Icon name="user" />
            <div>
              <span>Correo electrónico</span>
              <strong>{currentUser?.email || "carlos.martinez@email.com"}</strong>
            </div>
          </div>
          <div className="profile-row">
            <Icon name="bell" />
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
              style={{ cursor: "pointer" }}
            >
              <i />
            </span>
          </div>

          <button className="secondary full" onClick={() => actions.logout()}>
            <Icon name="logout" size={16} /> Cerrar sesión
          </button>
        </aside>
      </div>

      {addModal && (
        <Modal title="Agregar nuevo vehículo" onClose={() => setAddModal(false)}>
          <form onSubmit={handleSaveVehicle}>
            <div className="form-grid">
              <label>
                Placa del vehículo *
                <input
                  placeholder="Ej. ABC 123"
                  style={{ textTransform: "uppercase" }}
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  required
                />
              </label>
              <label>
                Tipo de vehículo
                <select value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option>Automóvil</option>
                  <option>Motocicleta</option>
                  <option>Eléctrico</option>
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label>
                Marca
                <input
                  placeholder="Ej. Chevrolet, Mazda"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </label>
              <label>
                Línea / Modelo
                <input
                  placeholder="Ej. Tracker, CX-30"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Color
                <input
                  placeholder="Ej. Gris grafito"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </label>
              <label>
                Año / Modelo
                <input
                  placeholder="2024"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setAddModal(false)}
              >
                Cancelar
              </button>
              <button type="submit" className="primary">
                Guardar vehículo <Icon name="check" size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}

// ── FLUJO U4: HISTORIAL Y LIQUIDACIÓN CON PAGO DIGITAL ──
function History() {
  const [state] = useParkiaStore();
  const [payingSession, setPayingSession] = useState<ParkingHistoryItem | null>(null);

  const totalSpent = state.history
    .filter((h) => h.status === "paid")
    .reduce((acc, curr) => acc + curr.total, 0);

  function handlePayClick(
    e: React.MouseEvent<HTMLButtonElement>,
    sessionItem: ParkingHistoryItem
  ) {
    const origin = e.currentTarget.getBoundingClientRect();
    const targetEl =
      document.querySelector(".topbar .user-menu .avatar") ||
      document.querySelector(".topbar");

    if (targetEl) {
      const target = targetEl.getBoundingClientRect();
      const clone = document.createElement("div");
      clone.className = "liquid-clone";
      clone.textContent = sessionItem.plate;
      clone.style.left = `${origin.left}px`;
      clone.style.top = `${origin.top}px`;
      clone.style.width = `${origin.width}px`;
      clone.style.height = `${origin.height}px`;
      document.body.appendChild(clone);

      const deltaX = target.left + target.width / 2 - (origin.left + origin.width / 2);
      const deltaY = target.top + target.height / 2 - (origin.top + origin.height / 2);
      const arcMidX = deltaX * 0.5 - 25;
      const arcMidY = deltaY * 0.5 - 75;

      const anim = clone.animate(
        [
          { transform: "translate(0, 0) scale(1.12, 0.88)", opacity: 1 },
          {
            transform: `translate(${arcMidX}px, ${arcMidY}px) scale(1, 1)`,
            opacity: 0.9,
            offset: 0.5,
          },
          {
            transform: `translate(${deltaX}px, ${deltaY}px) scale(0.92, 1.08)`,
            opacity: 0.15,
          },
        ],
        {
          duration: 420,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          fill: "forwards",
        }
      );

      anim.onfinish = () => {
        clone.remove();
        targetEl.classList.add("pulse-target");
        setTimeout(() => targetEl.classList.remove("pulse-target"), 250);
        setPayingSession(sessionItem);
      };
    } else {
      setPayingSession(sessionItem);
    }
  }

  const fmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  return (
    <main className="page">
      <Header
        eyebrow="ACTIVIDAD"
        title="Sesiones, pagos y comprobantes"
        avatarText={state.currentUser?.avatarText}
      />
      <div className="stats-row">
        <Metric
          label="Gasto este mes"
          value={fmt.format(totalSpent)}
          detail={`${state.history.filter((h) => h.status === "paid").length} sesiones pagadas`}
          icon="card"
        />
        <Metric
          label="Tiempo estacionado"
          value="10 h 24 min"
          detail="Este mes en Parking Central"
          icon="clock"
        />
        <Metric
          label="Ahorro por convenio"
          value="$ 8.200"
          detail="Beneficio conductor frecuente"
          icon="shield"
        />
      </div>

      <section className="table-card">
        <div className="table-head">
          <div>
            <h3>Historial de estacionamientos</h3>
            <p>Consulta tus ingresos, salidas y comprobantes QR de talanquera.</p>
          </div>
          <div className="table-actions">
            <button className="secondary">
              <Icon name="calendar" size={17} /> Últimos 30 días
            </button>
            <button className="secondary" onClick={() => window.print()}>
              <Icon name="download" size={17} /> Imprimir recibos
            </button>
          </div>
        </div>

        <div className="data-table">
          <div className="tr th">
            <span>Fecha</span>
            <span>Vehículo</span>
            <span>Duración</span>
            <span>Estado</span>
            <span>Total</span>
            <span />
          </div>

          {state.history.map((r, i) => (
            <div className="tr" key={r.id} style={{ "--i": i } as React.CSSProperties}>
              <span>
                <strong>{r.date}</strong>
                <small>Parking Central · {r.id}</small>
              </span>
              <span className="plate-small">{r.plate}</span>
              <span>{r.duration}</span>
              <span>
                <Badge
                  tone={
                    r.status === "paid" ? "paid" : r.status === "active" ? "active" : "pending"
                  }
                >
                  {r.status === "paid"
                    ? "Pagado"
                    : r.status === "active"
                    ? "En curso"
                    : "Pendiente"}
                </Badge>
              </span>
              <span>
                <strong>{fmt.format(r.total)}</strong>
              </span>
              <span>
                {r.status === "pending" ? (
                  <button
                    className="primary compact"
                    onClick={(e) => handlePayClick(e, r)}
                  >
                    Pagar
                  </button>
                ) : r.qrCode ? (
                  <button
                    className="secondary compact"
                    onClick={() => setPayingSession(r)}
                    title="Ver ticket QR"
                  >
                    Ver QR
                  </button>
                ) : (
                  <button className="icon-btn" aria-label="Ver detalles">
                    <Icon name="chevron" />
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {payingSession && (
        <PaymentModal session={payingSession} onClose={() => setPayingSession(null)} />
      )}
    </main>
  );
}

// ── VISTA DETALLADA DEL PARKING DASHBOARD (ANIMACIÓN A/B FIGMA) ──
function ActiveParkingDashboard({ go }: { go: (page: string) => void }) {
  const [state] = useParkiaStore();
  const [variant, setVariant] = useState<"A" | "B">("A");
  const [showModal, setShowModal] = useState(false);

  const session = state.activeSession;
  const currentRate = state.tariffs.carRate;

  const vals = {
    A: { time: "02 h 17 min", cost: `$ ${costFmt.format(137 * currentRate)}` },
    B: { time: "02 h 18 min", cost: `$ ${costFmt.format(138 * currentRate)}` },
  } as const;
  const v = vals[variant];

  return (
    <main className="page">
      <Header
        eyebrow="SESIÓN EN CURSO"
        title="Detalle técnico de estacionamiento"
        avatarText={state.currentUser?.avatarText}
      />

      <div className="apd-variants">
        {(["A", "B"] as const).map((s) => (
          <button
            key={s}
            className={`apd-variant-btn${variant === s ? " apd-variant-btn--on" : ""}`}
            onClick={() => setVariant(s)}
          >
            Simular Estado {s}
          </button>
        ))}
        <span className="apd-variant-hint">
          Demostración interactiva de Smart Animate (cambio interpolado de costo y tiempo)
        </span>
      </div>

      <section className={`apd-card${variant === "B" ? " apd-card--b" : ""}`}>
        <div className="apd-vehicle">
          <div className="plate-icon apd-icon-wrap">
            <Icon name="car" size={28} />
          </div>
          <div>
            <Badge tone="green">Activa en tiempo real</Badge>
            <h3 className="apd-plate">{session?.plate || "JHT · 482"}</h3>
            <p>{session?.vehicle || "Chevrolet Tracker"}</p>
          </div>
        </div>

        <div className="session-stat">
          <span>Acceso y hora</span>
          <strong>{session?.entryTime || "08:42 a. m."}</strong>
          <small>{session?.accessGate || "Acceso Norte"}</small>
        </div>

        <div className="session-stat">
          <span>Tiempo transcurrido</span>
          <strong className="apd-val tabnum">{v.time}</strong>
          <small>Tarifa: ${currentRate} / min</small>
        </div>

        <div className="session-stat total">
          <span>Total acumulado</span>
          <strong className="apd-val tabnum">{v.cost}</strong>
          <small>Actualizado en vivo</small>
        </div>

        <button className="secondary" onClick={() => setShowModal(true)}>
          Ver desglose
        </button>
      </section>

      <div className="section-title" style={{ marginTop: 28 }}>
        <div>
          <p className="eyebrow">HISTORIAL DE ESTANCIAS</p>
          <h3>Sesiones recientes en la sede</h3>
        </div>
      </div>

      <div className="apd-history">
        {state.history.slice(0, 3).map((item, i) => (
          <div
            className="apd-history-row"
            key={item.id}
            style={{ "--i": i } as React.CSSProperties}
          >
            <div className="apd-hr-vehicle">
              <Icon name="car" size={22} />
              <div>
                <strong>{item.plate}</strong>
                <small>{item.date} · Parking Central</small>
              </div>
            </div>
            <div className="apd-hr-stat">
              <span>Duración</span>
              <strong>{item.duration}</strong>
            </div>
            <div className="apd-hr-stat">
              <span>Total liquidado</span>
              <strong>${costFmt.format(item.total)}</strong>
            </div>
            <Badge tone={item.status === "paid" ? "paid" : "pending"}>
              {item.status === "paid" ? "Pagado" : "Pendiente"}
            </Badge>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title="Desglose técnico de estancia" onClose={() => setShowModal(false)}>
          <div className="payment-summary">
            <div>
              <span>Cobro actual estimado</span>
              <strong className="tabnum">{v.cost}</strong>
            </div>
            <p>
              {session?.plate} · Entrada {session?.entryTime} · {v.time}
            </p>
          </div>

          <div className="form-grid" style={{ marginTop: 18 }}>
            <div className="apd-detail">
              <span>PLACA</span>
              <strong>{session?.plate}</strong>
            </div>
            <div className="apd-detail">
              <span>VEHÍCULO</span>
              <strong>{session?.vehicle}</strong>
            </div>
            <div className="apd-detail">
              <span>TARIFA APLICADA</span>
              <strong>${currentRate} / min</strong>
            </div>
            <div className="apd-detail">
              <span>TOPE MÁXIMO DIARIO</span>
              <strong>${costFmt.format(state.tariffs.carCap)}</strong>
            </div>
            <div className="apd-detail">
              <span>MINUTOS DE GRACIA</span>
              <strong>{state.tariffs.carGrace} minutos</strong>
            </div>
            <div className="apd-detail">
              <span>ACCESO DE INGRESO</span>
              <strong>{session?.accessGate}</strong>
            </div>
          </div>

          <div className="modal-actions">
            <button className="secondary" onClick={() => setShowModal(false)}>
              Cerrar
            </button>
            <button
              className="primary"
              onClick={() => {
                setShowModal(false);
                go("historial");
              }}
            >
              Ir a pagos <Icon name="arrow" size={17} />
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

// ── VISTAS DEL PORTAL OPERARIOS Y ADMINISTRACIÓN ──

function OccupancyChart() {
  const [state] = useParkiaStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const HOUR_LABELS = ["6a", "8a", "10a", "12p", "2p", "4p", "6p", "Ahora"];
  const hourlyData = state.occupancyByHour;

  return (
    <section className="chart-card">
      <div className="section-title">
        <div>
          <h3>Ocupación por hora</h3>
          <p>Comparativo horario y afluencia de hoy</p>
        </div>
        <Badge tone="green">En vivo</Badge>
      </div>
      <div className="chart">
        <div className="y-labels">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>
        <div className="bars">
          {hourlyData.map((h, i) => (
            <div className="bar-group" key={i}>
              <i
                className={i === 7 ? "now" : ""}
                style={{
                  height: ready ? `${h}%` : "0%",
                  transition: `height 800ms cubic-bezier(0.0,0.0,0.2,1) ${i * 80}ms`,
                }}
              />
              <span>{HOUR_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ZoneBar({
  label,
  target,
  cls,
  delay,
}: {
  label: string;
  target: number;
  cls: string;
  delay: number;
}) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const tid = setTimeout(() => {
      const duration = 900;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = t * (2 - t);
        setVal(target * eased);
        if (t < 1) requestAnimationFrame(tick);
        else setVal(target);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(tid);
  }, [target, delay]);

  return (
    <div className="zone-row">
      <span>{label}</span>
      <div>
        <i style={{ width: `${val}%` }} className={cls} />
      </div>
      <strong className="tabnum">{Math.round(val)}%</strong>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
  index = 0,
}: {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
  index?: number;
}) {
  return (
    <div className="metric" style={{ "--i": index } as React.CSSProperties}>
      <span className="metric-icon">
        <Icon name={icon} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function AdminDashboard({ go }: { go: (page: string) => void }) {
  const [state] = useParkiaStore();

  const totalSpots = state.spots.length;
  const occupiedSpots = state.spots.filter(
    (s) => s.state === "occupied" || s.state === "reserved"
  ).length;
  const occupancyPct = Math.round((occupiedSpots / totalSpots) * 100);

  // Ocupación por piso
  const p1Spots = state.spots.filter((s) => s.floor === "Piso 1");
  const p1Pct = Math.round(
    (p1Spots.filter((s) => s.state !== "free").length / p1Spots.length) * 100
  );

  const p2Spots = state.spots.filter((s) => s.floor === "Piso 2");
  const p2Pct = Math.round(
    (p2Spots.filter((s) => s.state !== "free").length / p2Spots.length) * 100
  );

  const p3Spots = state.spots.filter((s) => s.floor === "Piso 3");
  const p3Pct = Math.round(
    (p3Spots.filter((s) => s.state !== "free").length / p3Spots.length) * 100
  );

  const revenueFmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  return (
    <main className="page admin-page">
      <Header
        eyebrow="OPERACIÓN EN TIEMPO REAL"
        title="Resumen operativo de la sede"
        avatarText={state.currentUser?.avatarText || "LG"}
      />
      <div className="admin-status">
        <div>
          <span className="live-dot" />
          Sistema central operando normalmente · Telemetría activa
        </div>
        <span>{state.currentUser?.shift || "Turno AM · Laura Gómez"}</span>
      </div>

      <div className="stats-row four">
        <Metric
          label="Ocupación actual"
          value={`${occupancyPct}%`}
          detail={`${occupiedSpots} de ${totalSpots} espacios`}
          icon="car"
          index={0}
        />
        <Metric
          label="Ingresos hoy"
          value={String(state.todaySessionsCount)}
          detail="+12% vs. semana anterior"
          icon="gate"
          index={1}
        />
        <Metric
          label="Recaudo del día"
          value={revenueFmt.format(state.todayRevenue)}
          detail="Actualizado con pagos en línea"
          icon="card"
          index={2}
        />
        <Metric
          label="Alertas activas"
          value={String(state.alerts.length)}
          detail="1 requiere atención urgente"
          icon="alert"
          index={3}
        />
      </div>

      <div className="dashboard-grid">
        <OccupancyChart />
        <section className="alerts-card">
          <div className="section-title">
            <div>
              <h3>Alertas activas</h3>
              <p>Incidencias operativas para seguimiento</p>
            </div>
            <button className="text-btn" onClick={() => go("talanqueras")}>
              Ver todas
            </button>
          </div>
          {state.alerts.map((al) => (
            <div className={`alert-row ${al.tone}`} key={al.id}>
              <span>
                <Icon
                  name={al.tone === "critical" ? "close" : al.tone === "warning" ? "alert" : "bell"}
                  size={17}
                />
              </span>
              <div>
                <strong>{al.title}</strong>
                <small>{al.meta}</small>
              </div>
              <Icon name="chevron" size={17} />
            </div>
          ))}
        </section>
      </div>

      <div className="dashboard-grid lower">
        <section className="zone-card">
          <div className="section-title">
            <div>
              <h3>Ocupación por piso</h3>
              <p>Capacidad dinámica calculada desde el mapa</p>
            </div>
          </div>
          <ZoneBar
            label="Piso 1"
            target={p1Pct}
            cls={p1Pct > 80 ? "critical" : p1Pct > 60 ? "warning" : "normal"}
            delay={0}
          />
          <ZoneBar
            label="Piso 2"
            target={p2Pct}
            cls={p2Pct > 80 ? "critical" : p2Pct > 60 ? "warning" : "normal"}
            delay={100}
          />
          <ZoneBar
            label="Piso 3"
            target={p3Pct}
            cls={p3Pct > 80 ? "critical" : p3Pct > 60 ? "warning" : "normal"}
            delay={200}
          />
          <ZoneBar label="Zona Visitantes" target={76} cls="warning" delay={300} />
        </section>

        <section className="quick-admin">
          <h3>Acciones rápidas de control</h3>
          <div>
            <button onClick={() => go("talanqueras")}>
              <Icon name="gate" />
              <span>
                <strong>Control de accesos</strong>
                <small>Abrir talanqueras y auditoría</small>
              </span>
              <Icon name="chevron" />
            </button>
            <button onClick={() => go("reportes")}>
              <Icon name="report" />
              <span>
                <strong>Generar reporte</strong>
                <small>Exportar archivo CSV</small>
              </span>
              <Icon name="chevron" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

// ── FLUJO O2: CONTROL DE TALANQUERAS Y EXCEPCIONES ──
function Gates() {
  const [state, actions] = useParkiaStore();
  const [confirmGate, setConfirmGate] = useState<string | null>(null);
  const [reason, setReason] = useState("Autorizar salida por contingencia");
  const [toast, setToast] = useState<string | null>(null);

  function handleConfirmOpen() {
    if (!confirmGate) return;
    actions.openGateManually(confirmGate, reason, state.currentUser?.name || "Laura Gómez");
    setToast(`Talanquera ${confirmGate} abierta manualmente durante 6 segundos.`);
    setConfirmGate(null);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <main className="page admin-page">
      <Header
        eyebrow="CONTROL DE ACCESOS"
        title="Talanqueras y registro de excepciones"
        avatarText={state.currentUser?.avatarText || "LG"}
      />

      {toast && (
        <div className="toast" style={{ top: 90, bottom: "auto", background: "#0d766e" }}>
          <span>
            <Icon name="gate" size={16} />
          </span>
          <div>
            <strong>Apertura Manual Ejecutada</strong>
            <small>{toast}</small>
          </div>
          <button onClick={() => setToast(null)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      <div className="section-title">
        <div>
          <h3>Estado de accesos vehiculares</h3>
          <p>Supervisión telemétrica y apertura manual auditada.</p>
        </div>
      </div>

      <div className="gate-grid">
        {state.gates.map((g, i) => {
          const isOpenManual = g.state === "Abierta (Manual)";
          return (
            <div
              className={`gate-card ${g.connection === "offline" ? "offline" : ""} ${
                isOpenManual ? "open-manual" : ""
              }`}
              key={g.id}
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="gate-top">
                <span className="gate-icon">
                  <Icon name="gate" size={26} />
                </span>
                <Badge tone={isOpenManual ? "green" : g.connection === "online" ? "green" : "critical"}>
                  {isOpenManual ? "Abierta (Manual)" : g.connection === "online" ? "En línea" : "Sin respuesta"}
                </Badge>
              </div>

              <h3>{g.name}</h3>
              <p>{g.eventsToday} lecturas registradas hoy</p>

              <div className="gate-details">
                <span>
                  Sensor
                  <i>{g.sensor}</i>
                </span>
                <span>
                  Estado
                  <i style={{ color: isOpenManual ? "#0d766e" : undefined, fontWeight: 700 }}>
                    {g.state}
                  </i>
                </span>
              </div>

              <button
                className={
                  isOpenManual
                    ? "primary full"
                    : g.connection === "online"
                    ? "secondary full"
                    : "primary full danger"
                }
                onClick={() => setConfirmGate(g.name)}
                disabled={isOpenManual}
              >
                {isOpenManual
                  ? "Cerrando en 6s..."
                  : g.connection === "online"
                  ? "Abrir manualmente"
                  : "Gestionar incidencia"}
              </button>
            </div>
          );
        })}
      </div>

      <section className="table-card">
        <div className="table-head">
          <div>
            <h3>Bitácora de excepciones operativas</h3>
            <p>Registro auditado de incidencias y aperturas manuales con operador responsable.</p>
          </div>
          <button
            className="primary compact"
            onClick={() => setConfirmGate("Entrada Norte")}
          >
            <Icon name="plus" size={17} /> Registrar apertura
          </button>
        </div>

        <div className="data-table exceptions">
          <div className="tr th">
            <span>ID</span>
            <span>Hora</span>
            <span>Motivo / Tipo</span>
            <span>Acceso</span>
            <span>Operador</span>
            <span>Estado</span>
          </div>

          {state.exceptions.map((r) => (
            <div className="tr" key={r.id}>
              <span>
                <strong>{r.id}</strong>
              </span>
              <span>{r.time}</span>
              <span>{r.type}</span>
              <span>{r.accessGate}</span>
              <span>{r.operator}</span>
              <span>
                <Badge tone={r.status === "Resuelto" ? "paid" : "pending"}>{r.status}</Badge>
              </span>
            </div>
          ))}
        </div>
      </section>

      {confirmGate && (
        <Modal title="Confirmar apertura manual auditada" onClose={() => setConfirmGate(null)}>
          <div className="critical-message">
            <span>
              <Icon name="alert" size={24} />
            </span>
            <div>
              <strong>Apertura de {confirmGate}</strong>
              <p>
                Esta acción levantará la barrera vehicular y quedará grabada en el log de auditoría
                con tu usuario ({state.currentUser?.name}) y fecha actual.
              </p>
            </div>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, margin: "14px 0" }}>
            Motivo de la apertura obligatoria *
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option>Autorizar salida por contingencia</option>
              <option>Falla de lectura de placa LPR</option>
              <option>Ticket extraviado por el conductor</option>
              <option>Paso autorizado de ambulancia / policía</option>
              <option>Mantenimiento técnico de barrera</option>
            </select>
          </label>

          <div className="modal-actions">
            <button className="secondary" onClick={() => setConfirmGate(null)}>
              Cancelar
            </button>
            <button className="primary danger" onClick={handleConfirmOpen}>
              Confirmar apertura <Icon name="check" size={16} />
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

// ── FLUJO O3: REPORTES Y EXPORTACIÓN A CSV ──
function Reports() {
  const [state, actions] = useParkiaStore();
  const [vehFilter, setVehFilter] = useState("Todos");
  const [toast, setToast] = useState<string | null>(null);

  function handleExportCSV() {
    actions.exportReportsCSV();
    setToast("Archivo CSV descargado con éxito directamente al navegador.");
    setTimeout(() => setToast(null), 3500);
  }

  const filteredHistory = state.history.filter((h) => {
    if (vehFilter === "Automóviles") return !h.plate.includes("M");
    if (vehFilter === "Motos") return h.plate.includes("M");
    return true;
  });

  const totalRecaudo = state.history
    .filter((h) => h.status === "paid")
    .reduce((acc, h) => acc + h.total, 0);

  const fmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  return (
    <main className="page admin-page">
      <Header
        eyebrow="ANÁLISIS Y CONTROL"
        title="Reportes, recaudación y auditoría"
        avatarText={state.currentUser?.avatarText || "LG"}
      />

      {toast && (
        <div className="toast" style={{ top: 90, bottom: "auto", background: "#0d766e" }}>
          <span>
            <Icon name="check" size={16} />
          </span>
          <div>
            <strong>Exportación Exitosa</strong>
            <small>{toast}</small>
          </div>
          <button onClick={() => setToast(null)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      <section className="filter-bar">
        <label>
          Rango de fechas
          <span>
            <Icon name="calendar" size={17} /> 01 jun 2025 — 12 jun 2025
          </span>
        </label>
        <label>
          Sede operativa
          <span>
            Parking Central · Calle 93 <Icon name="chevron" size={15} />
          </span>
        </label>
        <label>
          Tipo de vehículo
          <select
            value={vehFilter}
            onChange={(e) => setVehFilter(e.target.value)}
            style={{ height: 38, border: "1px solid #dbe2e0", borderRadius: 8, padding: "0 10px" }}
          >
            <option>Todos</option>
            <option>Automóviles</option>
            <option>Motos</option>
          </select>
        </label>
        <button className="primary" onClick={() => setToast("Filtros aplicados a la tabla.")}>
          <Icon name="filter" size={17} /> Filtrar
        </button>
      </section>

      <div className="stats-row">
        <Metric
          label="Recaudo registrado"
          value={fmt.format(totalRecaudo)}
          detail="+8,4% periodo anterior"
          icon="card"
        />
        <Metric
          label="Sesiones analizadas"
          value={String(filteredHistory.length)}
          detail="+11,2% tasa de rotación"
          icon="car"
        />
        <Metric
          label="Ticket promedio"
          value={fmt.format(Math.round(totalRecaudo / (filteredHistory.length || 1)))}
          detail="Promedio estancia 2.1 hrs"
          icon="report"
        />
      </div>

      <section className="table-card">
        <div className="table-head">
          <div>
            <h3>Movimientos de recaudo y sesiones</h3>
            <p>{filteredHistory.length} registros encontrados en el periodo</p>
          </div>
          <div className="table-actions">
            <button className="secondary" onClick={handleExportCSV}>
              <Icon name="download" size={17} /> Exportar CSV
            </button>
            <button className="secondary" onClick={() => window.print()}>
              <Icon name="download" size={17} /> Imprimir PDF
            </button>
          </div>
        </div>

        <div className="data-table reports">
          <div className="tr th">
            <span>ID sesión</span>
            <span>Fecha y hora</span>
            <span>Placa</span>
            <span>Duración</span>
            <span>Método</span>
            <span>Valor</span>
            <span>Estado</span>
          </div>

          {filteredHistory.map((r) => (
            <div className="tr" key={r.id}>
              <span>
                <strong>{r.id}</strong>
              </span>
              <span>{r.date}</span>
              <span className="plate-small">{r.plate}</span>
              <span>{r.duration}</span>
              <span>{r.method || "N/A"}</span>
              <span>
                <strong>{fmt.format(r.total)}</strong>
              </span>
              <span>
                <Badge tone={r.status === "paid" ? "paid" : "pending"}>
                  {r.status === "paid" ? "Aprobado" : "Pendiente"}
                </Badge>
              </span>
            </div>
          ))}
        </div>

        <div className="pagination">
          <span>Mostrando 1–{filteredHistory.length} de {filteredHistory.length}</span>
          <div>
            <button disabled>Anterior</button>
            <button className="active">1</button>
            <button disabled>Siguiente</button>
          </div>
        </div>
      </section>
    </main>
  );
}

// ── FLUJO O4: CONFIGURACIÓN REACTIVA DE TARIFAS ──
function Settings() {
  const [state, actions] = useParkiaStore();
  const [saved, setSaved] = useState(false);

  // Form states
  const [carRate, setCarRate] = useState(state.tariffs.carRate);
  const [carCap, setCarCap] = useState(state.tariffs.carCap);
  const [carGrace, setCarGrace] = useState(state.tariffs.carGrace);

  const [motoRate, setMotoRate] = useState(state.tariffs.motoRate);
  const [motoCap, setMotoCap] = useState(state.tariffs.motoCap);
  const [motoGrace, setMotoGrace] = useState(state.tariffs.motoGrace);

  const [evRate, setEvRate] = useState(state.tariffs.evRate);
  const [evCap, setEvCap] = useState(state.tariffs.evCap);
  const [evGrace, setEvGrace] = useState(state.tariffs.evGrace);

  function handleSaveTariffs() {
    actions.updateTariffs(
      {
        carRate: Number(carRate),
        carCap: Number(carCap),
        carGrace: Number(carGrace),
        motoRate: Number(motoRate),
        motoCap: Number(motoCap),
        motoGrace: Number(motoGrace),
        evRate: Number(evRate),
        evCap: Number(evCap),
        evGrace: Number(evGrace),
      },
      state.currentUser?.name || "Laura Gómez"
    );

    setSaved(true);
    setTimeout(() => setSaved(false), 4500);
  }

  return (
    <main className="page admin-page">
      <Header
        eyebrow="ADMINISTRACIÓN"
        title="Configuración tarifaria y operativa"
        avatarText={state.currentUser?.avatarText || "LG"}
      />

      <div className="settings-tabs">
        <button className="active">Tarifas</button>
        <button>Tipos de vehículo</button>
        <button>Zonas y capacidad</button>
        <button>Usuarios y permisos</button>
      </div>

      <div className="settings-layout">
        <section className="settings-card">
          <div>
            <h3>Esquema tarifario por minuto y topes</h3>
            <p>
              Los cambios guardados actualizan reactivamente el cálculo de la sesión activa del
              conductor.
            </p>
          </div>

          <div className="tariff-head">
            <span>Tipo de vehículo</span>
            <span>Tarifa / min</span>
            <span>Tope diario</span>
            <span>Tolerancia gracia</span>
          </div>

          {/* Automóvil */}
          <div className="tariff-row">
            <span>
              <span className="tariff-icon">
                <Icon name="car" size={18} />
              </span>
              <strong>Automóvil</strong>
            </span>
            <input
              type="number"
              value={carRate}
              onChange={(e) => setCarRate(Number(e.target.value))}
            />
            <input
              type="number"
              value={carCap}
              onChange={(e) => setCarCap(Number(e.target.value))}
            />
            <input
              type="number"
              value={carGrace}
              onChange={(e) => setCarGrace(Number(e.target.value))}
            />
          </div>

          {/* Motocicleta */}
          <div className="tariff-row">
            <span>
              <span className="tariff-icon">
                <Icon name="car" size={18} />
              </span>
              <strong>Motocicleta</strong>
            </span>
            <input
              type="number"
              value={motoRate}
              onChange={(e) => setMotoRate(Number(e.target.value))}
            />
            <input
              type="number"
              value={motoCap}
              onChange={(e) => setMotoCap(Number(e.target.value))}
            />
            <input
              type="number"
              value={motoGrace}
              onChange={(e) => setMotoGrace(Number(e.target.value))}
            />
          </div>

          {/* Vehículo eléctrico */}
          <div className="tariff-row">
            <span>
              <span className="tariff-icon">
                <Icon name="car" size={18} />
              </span>
              <strong>Vehículo eléctrico (EV)</strong>
            </span>
            <input
              type="number"
              value={evRate}
              onChange={(e) => setEvRate(Number(e.target.value))}
            />
            <input
              type="number"
              value={evCap}
              onChange={(e) => setEvCap(Number(e.target.value))}
            />
            <input
              type="number"
              value={evGrace}
              onChange={(e) => setEvGrace(Number(e.target.value))}
            />
          </div>

          <div className="settings-footer">
            <span>
              <Icon name="alert" size={17} /> Los cambios se guardan en el store reactivo de
              demostración.
            </span>
            <button className="primary" onClick={handleSaveTariffs}>
              Guardar cambios <Icon name="check" size={16} />
            </button>
          </div>
        </section>

        <aside className="audit-note">
          <Icon name="shield" size={24} />
          <h3>Control de cambios auditado</h3>
          <p>
            Toda modificación de tarifas se vincula a tu usuario para auditoría financiera.
          </p>
          <div>
            <span>Última modificación guardada</span>
            <strong>{state.tariffs.updatedBy}</strong>
            <small>{state.tariffs.lastUpdated}</small>
          </div>
          <button className="secondary full" onClick={() => window.print()}>
            Exportar historial
          </button>
        </aside>
      </div>

      {saved && (
        <div className="toast">
          <span>
            <Icon name="check" size={16} />
          </span>
          <div>
            <strong>¡Tarifas actualizadas!</strong>
            <small>
              Las nuevas tarifas ya aplican al cobro de las sesiones en tiempo real.
            </small>
          </div>
          <button onClick={() => setSaved(false)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </main>
  );
}

// ── COMPONENTE BASE MODAL ──
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [closing, setClosing] = useState(false);

  function dismiss() {
    setClosing(true);
  }

  function handleAnimationEnd(e: React.AnimationEvent) {
    if (
      closing &&
      (e.animationName === "dim-out" || e.animationName === "pay-backdrop-out")
    ) {
      onClose();
    }
  }

  return (
    <div
      className={`modal-backdrop${closing ? " closing" : ""}`}
      onMouseDown={dismiss}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={dismiss} aria-label="Cerrar modal">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── RUTEO Y SHELL PRINCIPAL CON GESTIÓN DE ROLES ──
const driverNav = [
  { id: "inicio", label: "Inicio", icon: "home" as const },
  { id: "mapa", label: "Disponibilidad", icon: "map" as const },
  { id: "vehiculos", label: "Vehículos y perfil", icon: "car" as const },
  { id: "historial", label: "Sesiones y pagos", icon: "clock" as const },
];

const adminNav = [
  { id: "dashboard", label: "Dashboard", icon: "grid" as const },
  { id: "talanqueras", label: "Talanqueras", icon: "gate" as const },
  { id: "reportes", label: "Reportes", icon: "report" as const },
  { id: "configuracion", label: "Configuración", icon: "settings" as const },
];

export default function App() {
  const [state, actions] = useParkiaStore();
  const [page, setPage] = useState<string>("inicio");

  // Si no hay usuario autenticado, renderizar la pantalla de Login y Registro (Flujo A0)
  if (!state.currentUser) {
    return <AuthScreen />;
  }

  const role = state.currentUser.role;

  const navigateTo = (nextPage: string) => {
    if (nextPage === page) return;
    const pagesOrder = [
      "inicio",
      "estacionamiento",
      "mapa",
      "vehiculos",
      "historial",
      "dashboard",
      "talanqueras",
      "reportes",
      "configuracion",
    ];
    const prevIndex = pagesOrder.indexOf(page);
    const nextIndex = pagesOrder.indexOf(nextPage);
    const direction = nextIndex >= prevIndex ? "forward" : "backward";

    if ("startViewTransition" in document) {
      document.documentElement.setAttribute("data-nav-dir", direction);
      (document as any)
        .startViewTransition(() => {
          setPage(nextPage);
        })
        .finished.finally(() => {
          document.documentElement.removeAttribute("data-nav-dir");
        });
    } else {
      setPage(nextPage);
    }
  };

  const switchRole = (newRole: "driver" | "admin") => {
    const nextPage = newRole === "driver" ? "inicio" : "dashboard";
    actions.loginDemo(newRole);
    if ("startViewTransition" in document) {
      (document as any).startViewTransition(() => {
        setPage(nextPage);
      });
    } else {
      setPage(nextPage);
    }
  };

  const content: Record<string, React.ReactNode> = {
    inicio: <Home go={navigateTo} />,
    estacionamiento: <ActiveParkingDashboard go={navigateTo} />,
    mapa: <AvailabilityMap />,
    vehiculos: <Vehicles />,
    historial: <History />,
    dashboard: <AdminDashboard go={navigateTo} />,
    talanqueras: <Gates />,
    reportes: <Reports />,
    configuracion: <Settings />,
  };

  return (
    <div className={`app-shell ${role}`}>
      {role === "driver" ? (
        <header className="topbar">
          <button className="brand" onClick={() => navigateTo("inicio")}>
            <span>P</span>
            <strong>Parkia</strong>
          </button>
          <nav>
            {driverNav.map((n) => (
              <button
                key={n.id}
                className={page === n.id ? "active" : ""}
                onClick={() => navigateTo(n.id)}
              >
                <Icon name={n.icon} />
                {n.label}
              </button>
            ))}
          </nav>
          <div className="role-actions">
            <button className="role-switch" onClick={() => switchRole("admin")}>
              <Icon name="shield" size={16} /> Vista operador
            </button>
            <div className="user-menu">
              <span className="avatar small">{state.currentUser.avatarText}</span>
              <span>
                <strong>{state.currentUser.name}</strong>
                <small>Conductor</small>
              </span>
              <button
                className="icon-btn"
                onClick={() => actions.logout()}
                title="Cerrar sesión"
                style={{ width: 28, height: 28, marginLeft: 4 }}
              >
                <Icon name="logout" size={14} />
              </button>
            </div>
          </div>
        </header>
      ) : (
        <aside className="sidebar">
          <button className="brand dark" onClick={() => navigateTo("dashboard")}>
            <span>P</span>
            <strong>Parkia</strong>
          </button>
          <div className="site-select">
            <span>SEDE ACTUAL</span>
            <button>
              <i>
                <Icon name="grid" size={17} />
              </i>
              <div>
                <strong>Parking Central</strong>
                <small>Calle 93 · Bogotá</small>
              </div>
              <Icon name="chevron" size={15} />
            </button>
          </div>
          <nav>
            {adminNav.map((n) => (
              <button
                key={n.id}
                className={page === n.id ? "active" : ""}
                onClick={() => navigateTo(n.id)}
              >
                <Icon name={n.icon} />
                {n.label}
                {n.id === "talanqueras" && (
                  <Badge tone="critical">
                    {state.gates.filter((g) => g.connection === "offline").length || 1}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button onClick={() => switchRole("driver")}>
              <Icon name="logout" />
              <span>
                <strong>Volver al portal</strong>
                <small>Vista del conductor</small>
              </span>
            </button>
            <div className="operator">
              <span className="avatar small">{state.currentUser.avatarText}</span>
              <span>
                <strong>{state.currentUser.name}</strong>
                <small>{state.currentUser.shift || "Turno AM"}</small>
              </span>
              <button
                className="icon-btn"
                onClick={() => actions.logout()}
                title="Cerrar sesión"
                style={{ width: 26, height: 26, background: "transparent", color: "#a5b9b5", border: 0 }}
              >
                <Icon name="logout" size={15} />
              </button>
            </div>
          </div>
        </aside>
      )}

      <div className="content">{content[page] || content[role === "driver" ? "inicio" : "dashboard"]}</div>

      {/* Botón Flotante de Demostración Reactiva */}
      <aside className="floating-demo-bar" aria-label="Controles de demostración">
        <span className="live-dot" />
        <span>Demo Activa</span>
        <button
          type="button"
          className="floating-reset-btn"
          onClick={() => actions.resetDemo()}
          title="Restablecer datos iniciales de fábrica"
        >
          <Icon name="refresh" size={13} /> Reiniciar datos demo
        </button>
      </aside>
    </div>
  );
}
