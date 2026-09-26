import { useState, useEffect, useRef } from "react";

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
          const formattedFinal = format === "currency" ? fmt.format(value) : `${prefix}${fmt.format(value)}${suffix}`;
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

  const formatted = format === "currency" ? fmt.format(displayed) : `${prefix}${fmt.format(displayed)}${suffix}`;

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

    function ease(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

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
      else { setValue(to); prev.current = to; }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

type IconName =
  | "home" | "map" | "car" | "clock" | "grid" | "gate" | "report"
  | "settings" | "bell" | "search" | "arrow" | "check" | "close"
  | "calendar" | "card" | "user" | "alert" | "download" | "plus"
  | "chevron" | "logout" | "filter" | "more" | "shield" | "edit";

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  map: <><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></>,
  car: <><path d="m5 11 1.5-4.5h11L19 11"/><path d="M3 11h18v7H3zM6 18v2M18 18v2M7 14h.01M17 14h.01"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  gate: <><path d="M4 21V8M20 21V8M2 8h20M7 8V4h10v4M6 13h12M6 17h12"/></>,
  report: <><path d="M5 3h14v18H5zM8 16v-3M12 16V8M16 16v-5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.07.07-2.76 2.76-.07-.07a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65V21H10v-.1A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-2 .36l-.07.07-2.76-2.76.07-.07a1.8 1.8 0 0 0 .36-2A1.8 1.8 0 0 0 3 13.9H3V10h.1A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-2l-.07-.07 2.76-2.76.07.07A1.8 1.8 0 0 0 9 4.6 1.8 1.8 0 0 0 10.1 3H14a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.36l.07-.07 2.76 2.76-.07.07a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.6 1.1V14a1.8 1.8 0 0 0-1.6 1Z"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  alert: <><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  logout: <><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/></>,
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></>,
  edit: <><path d="m14 5 5 5M4 20l4-1 11-11-3-3L5 16l-1 4Z"/></>,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const Badge = ({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) => <span className={`badge ${tone}`}>{children}</span>;

function Header({ title, eyebrow }: { title: string; eyebrow: string }) {
  return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="head-actions"><button className="icon-btn" aria-label="Notificaciones"><Icon name="bell"/><span className="notification-dot"/></button><div className="avatar">CM</div></div></div>;
}

function ActiveSession({ go }: { go: (page: string) => void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 8000);
    return () => clearInterval(id);
  }, []);

  const targetCost = 8500 + tick * 100;
  const baseMinutes = 138 + tick;
  const targetMinutes = baseMinutes;

  const animCost = useAnimatedValue(targetCost);
  const animMinutes = useAnimatedValue(targetMinutes);

  const displayCost = `$ ${costFmt.format(Math.round(animCost))}`;
  const h = Math.floor(Math.round(animMinutes) / 60);
  const m = Math.round(animMinutes) % 60;
  const displayTime = `${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} min`;

  const announcedCost = `$ ${costFmt.format(targetCost)}`;
  const announcedTime = `${String(Math.floor(targetMinutes / 60)).padStart(2, "0")} h ${String(targetMinutes % 60).padStart(2, "0")} min`;

  return (
    <section className="active-session">
      <div className="plate-block">
        <div className="plate-icon plate-icon--animated">
          <Icon name="car" size={28}/>
          <span className="session-pulse" aria-hidden="true"/>
        </div>
        <div>
          <Badge tone="green">Sesión activa</Badge>
          <h3>JHT · 482</h3>
          <p>Chevrolet Tracker · Gris</p>
        </div>
      </div>
      <div className="session-stat">
        <span>Entrada</span>
        <strong>08:42 a. m.</strong>
        <small>Acceso Norte</small>
      </div>
      <div className="session-stat">
        <span>Tiempo transcurrido</span>
        <strong className="tabnum" aria-hidden="true">{displayTime}</strong>
        <span className="sr-only" aria-live="polite" aria-atomic="true">{announcedTime}</span>
        <small>Tarifa por minuto</small>
      </div>
      <div className="session-stat total">
        <span>Total estimado</span>
        <strong className="tabnum" style={{ color: "#0d766e" }} aria-hidden="true">{displayCost}</strong>
        <span className="sr-only" aria-live="polite" aria-atomic="true">{announcedCost}</span>
        <small>Actualizado ahora</small>
      </div>
      <button className="secondary" onClick={() => go("estacionamiento")}>Ver detalle</button>
    </section>
  );
}

function Home({ go }: { go: (page: string) => void }) {
  return <main className="page">
    <Header eyebrow="Jueves, 12 de junio" title="Buenos días, Carlos"/>
    <section className="hero">
      <div className="hero-copy"><Badge tone="light"><span className="live-dot"/> <AnimatedValue value={184} suffix=" cupos disponibles ahora"/></Badge><h2>Estaciona sin vueltas.<br/>Tu lugar está listo.</h2><p>Consulta disponibilidad en tiempo real y llega directo al espacio ideal para tu vehículo.</p>
        <div className="search-box"><Icon name="search"/><div><span>¿Dónde quieres estacionar?</span><strong>Parking Central · Calle 93</strong></div><button onClick={() => go("mapa")} className="primary">Ver disponibilidad <Icon name="arrow" size={18}/></button></div>
      </div>
      <div className="hero-visual"><div className="orbit o1"/><div className="orbit o2"/><div className="parking-mark">P<span>ARK</span></div><div className="availability-card"><span>Zona recomendada</span><strong>Piso 2 · Zona B</strong><small>42 espacios libres</small></div></div>
    </section>
    <div className="section-title"><div><p className="eyebrow">EN CURSO</p><h3>Tu estacionamiento activo</h3></div><button className="text-btn" onClick={() => go("historial")}>Ver historial <Icon name="arrow" size={16}/></button></div>
    <ActiveSession go={go}/>
    <section className="quick-grid">
      <button onClick={() => go("mapa")} style={{ '--i': 0 } as React.CSSProperties}><span className="quick-icon teal"><Icon name="map"/></span><div><strong>Explorar mapa</strong><small>Disponibilidad por piso y zona</small></div><Icon name="chevron"/></button>
      <button onClick={() => go("vehiculos")} style={{ '--i': 1 } as React.CSSProperties}><span className="quick-icon blue"><Icon name="car"/></span><div><strong>Mis vehículos</strong><small>2 vehículos registrados</small></div><Icon name="chevron"/></button>
      <button onClick={() => go("historial")} style={{ '--i': 2 } as React.CSSProperties}><span className="quick-icon amber"><Icon name="card"/></span><div><strong>Pagos</strong><small>Sin saldos pendientes</small></div><Icon name="chevron"/></button>
    </section>
  </main>;
}

const spotData = [
  { id: "A-01", state: "free" }, { id: "A-02", state: "free" }, { id: "A-03", state: "occupied" }, { id: "A-04", state: "reserved" },
  { id: "A-05", state: "free" }, { id: "A-06", state: "occupied" }, { id: "A-07", state: "free" }, { id: "A-08", state: "free" },
  { id: "B-01", state: "occupied" }, { id: "B-02", state: "free" }, { id: "B-03", state: "free" }, { id: "B-04", state: "occupied" },
  { id: "B-05", state: "reserved" }, { id: "B-06", state: "free" }, { id: "B-07", state: "free" }, { id: "B-08", state: "occupied" },
];

function AvailabilityMap() {
  const [floor, setFloor] = useState("Piso 2");
  const [selected, setSelected] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("center center");

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest(".spot")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setZoomOrigin(`${x}% ${y}%`);
    setZoomed(!zoomed);
  }

  function handleSpotClick(sId: string, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mapRect = e.currentTarget.closest(".parking-map")?.getBoundingClientRect();
    if (mapRect) {
      const x = Math.round(((rect.left + rect.width / 2 - mapRect.left) / mapRect.width) * 100);
      const y = Math.round(((rect.top + rect.height / 2 - mapRect.top) / mapRect.height) * 100);
      setZoomOrigin(`${x}% ${y}%`);
    }
    setSelected(sId);
  }

  return <main className="page"><Header eyebrow="PARKING CENTRAL · CALLE 93" title="Disponibilidad en tiempo real"/>
    <div className="map-toolbar"><div className="segmented">{["Piso 1", "Piso 2", "Piso 3"].map((f) => <button className={floor === f ? "active" : ""} onClick={() => setFloor(f)} key={f}>{f}<small>{f === "Piso 2" ? "42 libres" : f === "Piso 1" ? "18 libres" : "61 libres"}</small></button>)}</div><div className="legend"><button className="zoom-btn" onClick={() => setZoomed(!zoomed)}><Icon name="search" size={13}/> {zoomed ? "Alejar mapa" : "Zoom de mapa"}</button><span><i className="state-dot free"><Icon name="check" size={11}/></i>Libre</span><span><i className="state-dot occupied"><Icon name="close" size={11}/></i>Ocupado</span><span><i className="state-dot reserved"><Icon name="clock" size={11}/></i>Reservado</span></div></div>
    <section className="map-layout"><div className={`parking-map${zoomed ? " zoomed" : ""}`} style={{ transformOrigin: zoomOrigin }} onClick={handleMapClick}><div className="map-label"><span>ZONA A</span><small>Acceso Norte</small></div><div className="lane"><span>Sentido de circulación</span><Icon name="arrow" size={16}/></div><div className="spots">{spotData.map((s, i) => <button key={s.id} onClick={(e) => s.state === "free" && handleSpotClick(s.id, e)} className={`spot ${s.state}${selected === s.id ? " selected" : ""}`} style={{ '--i': i } as React.CSSProperties}><span className="spot-status">{s.state === "free" ? <Icon name="check" size={12}/> : s.state === "occupied" ? <Icon name="close" size={12}/> : <Icon name="clock" size={12}/>} {s.state === "free" ? "Libre" : s.state === "occupied" ? "Ocupado" : "Reservado"}</span><strong>{s.id}</strong>{s.state === "occupied" && <Icon name="car" size={26}/>}<small>{i < 8 ? "Zona A" : "Zona B"}</small></button>)}</div><div className="lane reverse"><Icon name="arrow" size={16}/><span>Salida hacia Calle 93</span></div><div className="map-exits"><span><Icon name="gate" size={16}/> Entrada Norte</span><span><Icon name="user" size={16}/> Ascensores</span><span><Icon name="gate" size={16}/> Salida</span></div></div>
      <aside className="map-aside"><Badge tone="green">Alta disponibilidad</Badge><h3>{floor}</h3><p>Actualizado hace 12 segundos</p><OccupancyRing pct={64} /><dl><div><dt><i className="state-dot free"/>Libres</dt><dd>42</dd></div><div><dt><i className="state-dot occupied"/>Ocupados</dt><dd>71</dd></div><div><dt><i className="state-dot reserved"/>Reservados</dt><dd>7</dd></div></dl><div className="accessible-note"><Icon name="shield"/><div><strong>6 espacios accesibles</strong><small>3 disponibles cerca al ascensor</small></div></div></aside>
    </section>
    {selected && <Modal title={`Espacio ${selected}`} onClose={() => setSelected(null)}><div className="modal-spot"><span><Icon name="check" size={28}/></span><h3>Espacio disponible</h3><p>Ubicado en {floor}, Zona {selected[0]}. A 35 metros del ascensor principal.</p></div><div className="modal-actions"><button className="secondary" onClick={() => setSelected(null)}>Cancelar</button><button className="primary" onClick={() => setSelected(null)}>Trazar ruta <Icon name="arrow" size={17}/></button></div></Modal>}
  </main>;
}

function Vehicles() {
  const [add, setAdd] = useState(false);
  const [expanded, setExpanded] = useState(true);
  return <main className="page"><Header eyebrow="CUENTA PERSONAL" title="Vehículos y perfil"/><div className="two-column"><section><div className="section-title"><div><p className="eyebrow">MIS VEHÍCULOS</p><h3>Vehículos registrados</h3></div><button className="primary compact" onClick={() => setAdd(true)}><Icon name="plus" size={17}/> Agregar vehículo</button></div>
    <div className="vehicle-card primary-vehicle" onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer" }}>
      <div className="vehicle-art"><Icon name="car" size={38}/></div>
      <div><Badge tone="green">Principal</Badge><h3>JHT · 482</h3><p>Chevrolet Tracker · 2023 · Gris grafito</p></div>
      <button className="icon-btn" aria-label="Ver detalles" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}><Icon name={expanded ? "chevron" : "more"}/></button>
      <div className={`mask-accordion${expanded ? " open" : ""}`} style={{ gridColumn: "1/-1" }}>
        <div className="mask-content" {...(!expanded ? { inert: "" } : {})}>
          <div className="vehicle-meta">
            <span style={{ '--i': 0 } as React.CSSProperties}>Tipo<strong>Automóvil</strong></span>
            <span style={{ '--i': 1 } as React.CSSProperties}>Último ingreso<strong>Hoy, 08:42</strong></span>
            <span style={{ '--i': 2 } as React.CSSProperties}>Tag RFID<strong>Vinculado</strong></span>
          </div>
        </div>
      </div>
    </div>
    <div className="vehicle-card"><div className="vehicle-art light"><Icon name="car" size={38}/></div><div><Badge>Secundario</Badge><h3>KLM · 903</h3><p>Mazda CX-30 · 2021 · Blanco</p></div><button className="icon-btn"><Icon name="more"/></button></div>
  </section><aside className="profile-card"><div className="profile-top"><div className="avatar large">CM</div><div><h3>Carlos Martínez</h3><p>Miembro desde enero de 2023</p></div><button className="icon-btn"><Icon name="edit"/></button></div><div className="profile-row"><Icon name="card"/><div><span>Documento</span><strong>CC 1.023.•••.892</strong></div></div><div className="profile-row"><Icon name="user"/><div><span>Correo electrónico</span><strong>carlos.martinez@email.com</strong></div></div><div className="profile-row"><Icon name="bell"/><div><span>Teléfono</span><strong>+57 310 ••• •• 48</strong></div></div><div className="preference"><div><strong>Notificaciones de salida</strong><small>Recibe alertas sobre tu sesión activa</small></div><span className="toggle on"><i/></span></div><button className="secondary full">Editar información personal</button></aside></div>
    {add && <Modal title="Agregar vehículo" onClose={() => setAdd(false)}><div className="form-grid"><label>Placa<input placeholder="ABC 123"/></label><label>Tipo<select><option>Automóvil</option><option>Motocicleta</option></select></label><label>Marca<input placeholder="Ej. Renault"/></label><label>Modelo<input placeholder="Ej. Duster"/></label></div><div className="modal-actions"><button className="secondary" onClick={() => setAdd(false)}>Cancelar</button><button className="primary" onClick={() => setAdd(false)}>Guardar vehículo</button></div></Modal>}
  </main>;
}

function PaymentModal({ onClose }: { onClose: () => void }) {
  const [closing, setClosing] = useState(false);

  function dismiss() {
    setClosing(true);
  }

  function handleAnimationEnd(e: React.AnimationEvent) {
    if (closing && e.animationName === "pay-backdrop-out") onClose();
  }

  return (
    <div
      className={`modal-backdrop pay-backdrop${closing ? " pay-closing" : ""}`}
      onMouseDown={dismiss}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="modal pay-modal" role="dialog" aria-modal="true" aria-label="Confirmar pago" onMouseDown={e => e.stopPropagation()}>
        <div className="pay-parallax-wrap">
          <div className="pay-layer pay-layer-bg" aria-hidden="true" />
          <div className="pay-layer pay-layer-mid" aria-hidden="true" />
          <div className="pay-layer pay-layer-front" aria-hidden="true" />
        </div>
        <div className="pay-content">
          <div className="modal-head"><h2>Confirmar pago</h2><button className="icon-btn" onClick={dismiss} aria-label="Cerrar"><Icon name="close"/></button></div>
          <div className="payment-summary"><div><span>Total a pagar</span><strong>$ 16.800</strong></div><p>Sesión del 29 de mayo · JHT 482</p></div>
          <label className="payment-method"><input type="radio" defaultChecked/><span className="card-symbol"><Icon name="card"/></span><span><strong>Visa terminada en 2481</strong><small>Tarjeta predeterminada</small></span><Badge>Principal</Badge></label>
          <div className="modal-actions"><button className="secondary" onClick={dismiss}>Cancelar</button><button className="primary" onClick={dismiss}>Pagar $ 16.800</button></div>
        </div>
      </div>
    </div>
  );
}

function History() {
  const [pay, setPay] = useState(false);
  const rows = [["Hoy, 12 jun", "JHT · 482", "08:42", "En curso", "$ 8.600", "active"], ["8 jun, 2025", "JHT · 482", "2 h 42 min", "Pagado", "$ 11.400", "paid"], ["3 jun, 2025", "KLM · 903", "1 h 18 min", "Pagado", "$ 6.200", "paid"], ["29 may, 2025", "JHT · 482", "4 h 06 min", "Pendiente", "$ 16.800", "pending"]];

  function handlePayClick(e: React.MouseEvent<HTMLButtonElement>, plate: string) {
    const origin = e.currentTarget.getBoundingClientRect();
    const targetEl = document.querySelector(".topbar .user-menu .avatar") || document.querySelector(".topbar");
    if (targetEl) {
      const target = targetEl.getBoundingClientRect();
      const clone = document.createElement("div");
      clone.className = "liquid-clone";
      clone.textContent = plate;
      clone.style.left = `${origin.left}px`;
      clone.style.top = `${origin.top}px`;
      clone.style.width = `${origin.width}px`;
      clone.style.height = `${origin.height}px`;
      document.body.appendChild(clone);

      const deltaX = target.left + target.width / 2 - (origin.left + origin.width / 2);
      const deltaY = target.top + target.height / 2 - (origin.top + origin.height / 2);
      const arcMidX = deltaX * 0.5 - 25;
      const arcMidY = deltaY * 0.5 - 75;

      const anim = clone.animate([
        { transform: "translate(0, 0) scale(1.12, 0.88)", opacity: 1 },
        { transform: `translate(${arcMidX}px, ${arcMidY}px) scale(1, 1)`, opacity: 0.9, offset: 0.5 },
        { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.92, 1.08)`, opacity: 0.15 }
      ], {
        duration: 420,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        fill: "forwards"
      });

      anim.onfinish = () => {
        clone.remove();
        targetEl.classList.add("pulse-target");
        setTimeout(() => targetEl.classList.remove("pulse-target"), 250);
        setPay(true);
      };
    } else {
      setPay(true);
    }
  }

  return <main className="page"><Header eyebrow="ACTIVIDAD" title="Sesiones y pagos"/><div className="stats-row"><Metric label="Gasto este mes" value="$ 43.000" detail="4 sesiones" icon="card"/><Metric label="Tiempo estacionado" value="10 h 24 min" detail="Este mes" icon="clock"/><Metric label="Ahorro por convenio" value="$ 8.200" detail="Beneficio activo" icon="shield"/></div>
    <section className="table-card"><div className="table-head"><div><h3>Historial de estacionamientos</h3><p>Consulta tus ingresos, salidas y comprobantes.</p></div><div className="table-actions"><button className="secondary"><Icon name="calendar" size={17}/> Últimos 30 días</button><button className="secondary"><Icon name="download" size={17}/> Exportar</button></div></div><div className="data-table"><div className="tr th"><span>Fecha</span><span>Vehículo</span><span>Duración</span><span>Estado</span><span>Total</span><span/></div>{rows.map((r, i) => <div className="tr" key={r[0]} style={{ '--i': i } as React.CSSProperties}><span><strong>{r[0]}</strong><small>Parking Central</small></span><span className="plate-small">{r[1]}</span><span>{r[2]}</span><span><Badge tone={r[5]}>{r[3]}</Badge></span><span><strong>{r[4]}</strong></span><span>{r[5] === "pending" ? <button className="primary compact" onClick={(e) => handlePayClick(e, r[1])}>Pagar</button> : <button className="icon-btn"><Icon name="chevron"/></button>}</span></div>)}</div></section>
    {pay && <PaymentModal onClose={() => setPay(false)} />}
  </main>;
}

const APD_HISTORY = [
  { plate: "JHT · 492", entry: "Hoy · 08:42 a. m.", duration: "2 h 18 min", cost: "$ 8.600", tone: "active", label: "Activa" },
  { plate: "KLP · 091", entry: "Ayer · 14:10 p. m.", duration: "1 h 44 min", cost: "$ 7.200", tone: "paid", label: "Pagada" },
  { plate: "JHT · 492", entry: "10 jun · 09:30 a. m.", duration: "2 h 45 min", cost: "$ 10.725", tone: "paid", label: "Pagada" },
  { plate: "KLP · 091", entry: "09 jun · 16:00 p. m.", duration: "1 h 12 min", cost: "$ 4.680", tone: "paid", label: "Pagada" },
] as const;

const APD_DETAILS = [
  ["Placa", "JHT · 492"], ["Vehículo", "Chevrolet Tracker · Gris"],
  ["Tipo", "Automóvil"], ["Acceso", "Entrada Norte"],
  ["Tarifa", "$ 65 / min"], ["Tope diario", "$ 42.000"],
] as const;

function ActiveParkingDashboard({ go }: { go: (page: string) => void }) {
  const [variant, setVariant] = useState<"A" | "B">("A");
  const [showModal, setShowModal] = useState(false);
  const [listReady, setListReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setListReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const vals = {
    A: { time: "02 h 17 min", cost: "$ 8.500" },
    B: { time: "02 h 18 min", cost: "$ 8.600" },
  } as const;
  const v = vals[variant];

  return (
    <main className="page">
      <Header eyebrow="SESIÓN EN CURSO" title="Estacionamiento activo"/>

      {/* Variant selector — simulates Smart Animate A→B */}
      <div className="apd-variants">
        {(["A", "B"] as const).map((s) => (
          <button
            key={s}
            className={`apd-variant-btn${variant === s ? " apd-variant-btn--on" : ""}`}
            onClick={() => setVariant(s)}
          >
            Estado {s}
          </button>
        ))}
        <span className="apd-variant-hint">Cambia entre estados para ver la transición animada</span>
      </div>

      {/* ── 1. Value Change Card ── */}
      <section className={`apd-card${variant === "B" ? " apd-card--b" : ""}`}>
        <div className="apd-vehicle">
          <div className={`apd-icon-wrap${variant === "B" ? " apd-icon-wrap--ring" : ""}`}>
            <div className="plate-icon">
              <Icon name="car" size={28}/>
            </div>
          </div>
          <div>
            <Badge tone="green">Sesión activa</Badge>
            <h3 className="apd-plate">JHT · 492</h3>
            <p>Chevrolet Tracker · Gris</p>
          </div>
        </div>

        <div className="session-stat">
          <span>Entrada</span>
          <strong>08:42 a. m.</strong>
          <small>Acceso Norte</small>
        </div>

        <div className="session-stat">
          <span>Tiempo transcurrido</span>
          <strong key={`t-${variant}`} className="tabnum apd-val">{v.time}</strong>
          <small>Tarifa por minuto</small>
        </div>

        <div className="session-stat total">
          <span>Total estimado</span>
          <strong key={`c-${variant}`} className="tabnum apd-val">{v.cost}</strong>
          <small>Actualizado ahora</small>
        </div>

        <button className="secondary" onClick={() => setShowModal(true)}>Ver detalle</button>
      </section>

      {/* ── 2. Staggered History List ── */}
      <div className="section-title" style={{ marginTop: 36 }}>
        <div><p className="eyebrow">HISTORIAL</p><h3>Historial reciente</h3></div>
        <button className="text-btn" onClick={() => go("historial")}>Ver todo <Icon name="arrow" size={16}/></button>
      </div>

      <div
        className="apd-history"
        aria-live="polite"
        aria-atomic="true"
        aria-label={listReady ? APD_HISTORY.map(r => `${r.plate} ${r.duration} ${r.cost}`).join(". ") : undefined}
      >
        {APD_HISTORY.map((row, i) => (
          <div
            key={i}
            className="apd-history-row"
            style={{
              opacity: listReady ? 1 : 0,
              transform: listReady ? "translateY(0)" : "translateY(16px)",
              transition: `opacity 400ms ease-out ${i * 100}ms, transform 400ms ease-out ${i * 100}ms`,
            }}
          >
            <div className="apd-hr-vehicle">
              <span className="quick-icon teal" style={{ width: 36, height: 36, flexShrink: 0 }}>
                <Icon name="car" size={16}/>
              </span>
              <div>
                <strong className="plate-small">{row.plate}</strong>
                <small>{row.entry}</small>
              </div>
            </div>
            <div className="apd-hr-stat"><span>Duración</span><strong className="tabnum">{row.duration}</strong></div>
            <div className="apd-hr-stat"><span>Total</span><strong className="tabnum">{row.cost}</strong></div>
            <Badge tone={row.tone}>{row.label}</Badge>
          </div>
        ))}
      </div>

      {/* ── 3. Detail Modal with dimming backdrop ── */}
      {showModal && (
        <div className="apd-backdrop" onMouseDown={() => setShowModal(false)}>
          <div
            className="modal apd-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Detalle de sesión activa"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2>Detalle de sesión</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)} aria-label="Cerrar">
                <Icon name="close"/>
              </button>
            </div>
            <div className="payment-summary">
              <div>
                <span>Total estimado</span>
                <strong className="tabnum">{v.cost}</strong>
              </div>
              <p>JHT · 492 · Entrada 08:42 a. m. · {v.time}</p>
            </div>
            <div className="form-grid" style={{ marginTop: 18 }}>
              {APD_DETAILS.map(([label, val]) => (
                <div key={label} className="apd-detail">
                  <span>{label}</span>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowModal(false)}>Cerrar</button>
              <button className="primary" onClick={() => { setShowModal(false); go("historial"); }}>
                Ir al historial <Icon name="arrow" size={17}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const HOURLY_DATA = [22, 35, 58, 72, 83, 77, 68, 73] as const;
const HOUR_LABELS = ["6a", "8a", "10a", "12p", "2p", "4p", "6p", "Ahora"] as const;

function OccupancyChart() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const liveLabel = HOURLY_DATA.map((h, i) => `${HOUR_LABELS[i]}: ${h}%`).join(", ");

  return (
    <section className="chart-card">
      <div className="section-title">
        <div><h3>Ocupación por hora</h3><p>Comparativo de hoy y promedio semanal</p></div>
        <Badge tone="green">En vivo</Badge>
      </div>
      <div className="chart">
        <div className="y-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
        <div
          className="bars"
          aria-live="polite"
          aria-atomic="true"
          aria-label={ready ? `Ocupación por hora: ${liveLabel}` : undefined}
        >
          {HOURLY_DATA.map((h, i) => (
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

const zonePctFmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

function ZoneBar({ label, target, cls, delay }: { label: string; target: number; cls: string; delay: number }) {
  const [val, setVal] = useState(0);
  const [done, setDone] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tid = setTimeout(() => {
      const duration = 900;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = t * (2 - t); // ease-out quadratic
        setVal(target * eased);
        if (t < 1) { rafRef.current = requestAnimationFrame(tick); }
        else { setVal(target); setDone(true); }
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(tid); cancelAnimationFrame(rafRef.current); };
  }, [target, delay]);

  return (
    <div className="zone-row">
      <span>{label}</span>
      <div>
        <i style={{ width: `${val}%` }} className={cls}/>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {done ? `${label}: ${target}%` : ""}
        </span>
      </div>
      <strong className="tabnum" aria-hidden="true">{zonePctFmt.format(Math.round(val))}%</strong>
    </div>
  );
}

function Metric({ label, value, detail, icon, index = 0 }: { label: string; value: string; detail: string; icon: IconName; index?: number }) {
  return <div className="metric" style={{ '--i': index } as React.CSSProperties}><span className="metric-icon"><Icon name={icon}/></span><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function AdminDashboard({ go }: { go: (page: string) => void }) {
  return <main className="page admin-page"><Header eyebrow="OPERACIÓN EN TIEMPO REAL" title="Resumen operativo"/><div className="admin-status"><div><span className="live-dot"/>Sistema operando normalmente</div><span>Última actualización: hace 8 segundos</span></div>
    <div className="stats-row four"><Metric label="Ocupación actual" value="73%" detail="438 de 600 espacios" icon="car" index={0}/><Metric label="Ingresos hoy" value="1.284" detail="+12% vs. jueves anterior" icon="gate" index={1}/><Metric label="Recaudo del día" value="$ 18,4 M" detail="87% de la meta diaria" icon="card" index={2}/><Metric label="Alertas activas" value="3" detail="1 requiere atención" icon="alert" index={3}/></div>
    <div className="dashboard-grid">
      <OccupancyChart/>
      <section className="alerts-card"><div className="section-title"><div><h3>Alertas activas</h3><p>Eventos que requieren seguimiento</p></div><button className="text-btn">Ver todas</button></div><Alert tone="critical" title="Talanquera B sin respuesta" meta="Salida Sur · hace 4 min"/><Alert tone="warning" title="Capacidad crítica en Piso 1" meta="92% de ocupación · hace 8 min"/><Alert tone="info" title="Pago manual pendiente" meta="Caso #INC-2841 · hace 12 min"/></section>
    </div>
    <div className="dashboard-grid lower">
      <section className="zone-card">
        <div className="section-title"><div><h3>Ocupación por zona</h3><p>Capacidad actual de cada piso</p></div></div>
        {([["Piso 1",92,"critical"],["Piso 2",64,"normal"],["Piso 3",58,"normal"],["Visitantes",76,"warning"]] as [string,number,string][]).map((z,i)=><ZoneBar key={z[0]} label={z[0]} target={z[1]} cls={z[2]} delay={i*100}/>)}
      </section>
      <section className="quick-admin"><h3>Acciones rápidas</h3><div><button onClick={()=>go("talanqueras")}><Icon name="gate"/><span><strong>Control de accesos</strong><small>Gestionar talanqueras</small></span><Icon name="chevron"/></button><button onClick={()=>go("reportes")}><Icon name="report"/><span><strong>Generar reporte</strong><small>Exportar cierre de turno</small></span><Icon name="chevron"/></button></div></section>
    </div>
  </main>;
}

function Alert({ tone, title, meta }: { tone:string; title:string; meta:string }) { return <div className={`alert-row ${tone}`}><span><Icon name={tone === "critical" ? "close" : tone === "warning" ? "alert" : "bell"} size={17}/></span><div><strong>{title}</strong><small>{meta}</small></div><Icon name="chevron" size={17}/></div> }

function Gates() {
  const [confirm, setConfirm] = useState<string|null>(null);
  const gates = [["Entrada Norte","En línea","1.284 eventos hoy","online"],["Entrada Sur","En línea","842 eventos hoy","online"],["Salida Norte","En línea","1.103 eventos hoy","online"],["Salida Sur","Sin respuesta","Último evento hace 14 min","offline"]];
  return <main className="page admin-page"><Header eyebrow="CONTROL DE ACCESOS" title="Talanqueras y excepciones"/><div className="section-title"><div><h3>Estado de accesos</h3><p>Supervisión y control manual de los puntos de entrada y salida.</p></div><button className="secondary"><Icon name="clock" size={17}/> Ver bitácora</button></div><div className="gate-grid">{gates.map((g, i)=><div className={`gate-card ${g[3]}`} key={g[0]} style={{ '--i': i } as React.CSSProperties}><div className="gate-top"><span className="gate-icon"><Icon name="gate" size={26}/></span><Badge tone={g[3]==="online"?"green":"critical"}>{g[1]}</Badge></div><h3>{g[0]}</h3><p>{g[2]}</p><div className="gate-details"><span>Sensor<i>{g[3]==="online"?"Operativo":"Sin señal"}</i></span><span>Estado<i>{g[3]==="online"?"Cerrada":"Desconocido"}</i></span></div><button className={g[3]==="online"?"secondary full":"primary full danger"} onClick={()=>setConfirm(g[0])}>{g[3]==="online"?"Abrir manualmente":"Gestionar incidencia"}</button></div>)}</div>
    <section className="table-card"><div className="table-head"><div><h3>Excepciones recientes</h3><p>Incidencias y aperturas manuales del turno actual.</p></div><button className="primary compact"><Icon name="plus" size={17}/> Registrar excepción</button></div><div className="data-table exceptions"><div className="tr th"><span>ID</span><span>Hora</span><span>Tipo</span><span>Acceso</span><span>Operador</span><span>Estado</span></div>{[["#2841","14:32","Falla de lectura","Salida Sur","Laura Gómez","Abierto"],["#2840","13:18","Apertura manual","Entrada Norte","Juan Torres","Resuelto"],["#2839","11:46","Ticket extraviado","Salida Norte","Laura Gómez","Resuelto"]].map(r=><div className="tr" key={r[0]}>{r.map((x,i)=><span key={i}>{i===5?<Badge tone={x==="Abierto"?"pending":"paid"}>{x}</Badge>:x}</span>)}</div>)}</div></section>
    {confirm&&<Modal title="Confirmar acción manual" onClose={()=>setConfirm(null)}><div className="critical-message"><span><Icon name="alert"/></span><div><strong>Abrir {confirm}</strong><p>Esta acción quedará registrada en la bitácora con tu usuario y hora actual.</p></div></div><label>Motivo de apertura<select><option>Autorizar salida por contingencia</option><option>Falla de lectura</option><option>Soporte técnico</option></select></label><div className="modal-actions"><button className="secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="primary danger" onClick={()=>setConfirm(null)}>Confirmar apertura</button></div></Modal>}
  </main>;
}

function Reports() {
  return <main className="page admin-page"><Header eyebrow="ANÁLISIS Y CONTROL" title="Reportes y auditoría"/><section className="filter-bar"><label>Rango de fechas<span><Icon name="calendar" size={17}/> 01 jun 2025 — 12 jun 2025</span></label><label>Sede<span>Parking Central <Icon name="chevron" size={15}/></span></label><label>Tipo de vehículo<span>Todos <Icon name="chevron" size={15}/></span></label><button className="primary"><Icon name="filter" size={17}/> Aplicar filtros</button></section>
    <div className="stats-row"><Metric label="Recaudo total" value="$ 184,6 M" detail="+8,4% periodo anterior" icon="card"/><Metric label="Sesiones completadas" value="12.842" detail="+11,2% periodo anterior" icon="car"/><Metric label="Ticket promedio" value="$ 14.376" detail="-2,1% periodo anterior" icon="report"/></div>
    <section className="table-card"><div className="table-head"><div><h3>Movimientos de recaudo</h3><p>12.842 registros encontrados</p></div><div className="table-actions"><button className="secondary"><Icon name="download" size={17}/> Exportar CSV</button><button className="secondary"><Icon name="download" size={17}/> PDF</button></div></div><div className="data-table reports"><div className="tr th"><span>ID sesión</span><span>Fecha y hora</span><span>Placa</span><span>Duración</span><span>Método</span><span>Valor</span><span>Estado</span></div>{[["#S-93841","12 jun · 14:38","JHT-482","2 h 18 min","Visa •2481","$ 8.600","Aprobado"],["#S-93840","12 jun · 14:32","KLP-091","1 h 44 min","Efectivo","$ 7.200","Aprobado"],["#S-93839","12 jun · 14:29","TRD-723","3 h 06 min","PSE","$ 12.400","Aprobado"],["#S-93838","12 jun · 14:21","MNB-408","0 h 52 min","Visa •9130","$ 4.800","Reversado"]].map(r=><div className="tr" key={r[0]}>{r.map((x,i)=><span key={i} className={i===2?"plate-small":""}>{i===6?<Badge tone={x==="Aprobado"?"paid":"critical"}>{x}</Badge>:x}</span>)}</div>)}</div><div className="pagination"><span>Mostrando 1–4 de 12.842</span><div><button disabled>Anterior</button><button className="active">1</button><button>2</button><button>3</button><button>Siguiente</button></div></div></section>
  </main>;
}

function Settings() {
  const [saved, setSaved] = useState(false);
  return <main className="page admin-page"><Header eyebrow="ADMINISTRACIÓN" title="Configuración"/><div className="settings-tabs"><button className="active">Tarifas</button><button>Tipos de vehículo</button><button>Zonas y capacidad</button><button>Usuarios y permisos</button></div><div className="settings-layout"><section className="settings-card"><div><h3>Esquema tarifario</h3><p>Configura los valores aplicados por tipo de vehículo.</p></div><div className="tariff-head"><span>Tipo de vehículo</span><span>Tarifa por minuto</span><span>Tope diario</span><span>Tolerancia</span></div>{[["Automóvil","$ 65","$ 42.000","10 min"],["Motocicleta","$ 42","$ 25.000","10 min"],["Bicicleta","$ 0","$ 0","15 min"],["Vehículo eléctrico","$ 58","$ 38.000","10 min"]].map(r=><div className="tariff-row" key={r[0]}><span><span className="tariff-icon"><Icon name="car" size={18}/></span><strong>{r[0]}</strong></span>{r.slice(1).map(x=><input key={x} defaultValue={x}/>)}</div>)}<div className="settings-footer"><span><Icon name="alert" size={17}/> Los cambios se aplicarán a nuevas sesiones.</span><button className="primary" onClick={()=>setSaved(true)}>Guardar cambios</button></div></section><aside className="audit-note"><Icon name="shield" size={24}/><h3>Control de cambios</h3><p>Toda modificación queda registrada en el historial de auditoría.</p><div><span>Último cambio</span><strong>Laura Gómez</strong><small>10 jun 2025 · 09:18</small></div><button className="secondary full">Ver historial</button></aside></div>
    {saved&&<div className="toast"><span><Icon name="check" size={16}/></span><div><strong>Cambios guardados</strong><small>Las nuevas tarifas ya están activas.</small></div><button onClick={()=>setSaved(false)}><Icon name="close" size={16}/></button></div>}
  </main>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [closing, setClosing] = useState(false);

  function dismiss() {
    setClosing(true);
  }

  function handleAnimationEnd(e: React.AnimationEvent) {
    if (closing && (e.animationName === "dim-out" || e.animationName === "pay-backdrop-out")) {
      onClose();
    }
  }

  return (
    <div
      className={`modal-backdrop${closing ? " closing" : ""}`}
      onMouseDown={dismiss}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={dismiss} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const driverNav = [{id:"inicio",label:"Inicio",icon:"home"},{id:"mapa",label:"Disponibilidad",icon:"map"},{id:"vehiculos",label:"Vehículos y perfil",icon:"car"},{id:"historial",label:"Sesiones y pagos",icon:"clock"}] as const;
const adminNav = [{id:"dashboard",label:"Dashboard",icon:"grid"},{id:"talanqueras",label:"Talanqueras",icon:"gate"},{id:"reportes",label:"Reportes",icon:"report"},{id:"configuracion",label:"Configuración",icon:"settings"}] as const;

export default function App() {
  const [role, setRole] = useState<"driver" | "admin">("driver");
  const [page, setPage] = useState("inicio");

  const navigateTo = (nextPage: string) => {
    if (nextPage === page) return;
    const pagesOrder = ["inicio", "estacionamiento", "mapa", "vehiculos", "historial", "dashboard", "talanqueras", "reportes", "configuracion"];
    const prevIndex = pagesOrder.indexOf(page);
    const nextIndex = pagesOrder.indexOf(nextPage);
    const direction = nextIndex >= prevIndex ? "forward" : "backward";

    if ("startViewTransition" in document) {
      document.documentElement.setAttribute("data-nav-dir", direction);
      (document as any).startViewTransition(() => {
        setPage(nextPage);
      }).finished.finally(() => {
        document.documentElement.removeAttribute("data-nav-dir");
      });
    } else {
      setPage(nextPage);
    }
  };

  const switchRole = (r: "driver" | "admin") => {
    const nextPage = r === "driver" ? "inicio" : "dashboard";
    if ("startViewTransition" in document) {
      (document as any).startViewTransition(() => {
        setRole(r);
        setPage(nextPage);
      });
    } else {
      setRole(r);
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
            <button className="user-menu">
              <span className="avatar small">CM</span>
              <span>
                <strong>Carlos Martínez</strong>
                <small>Conductor</small>
              </span>
              <Icon name="chevron" size={15} />
            </button>
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
                {n.id === "talanqueras" && <Badge tone="critical">1</Badge>}
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
              <span className="avatar small">LG</span>
              <span>
                <strong>Laura Gómez</strong>
                <small>Operadora · Turno AM</small>
              </span>
              <Icon name="more" />
            </div>
          </div>
        </aside>
      )}
      <div className="content">{content[page]}</div>
    </div>
  );
}
