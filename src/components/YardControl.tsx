import React, { useState } from "react";
import { useParkiaStore, ParkingSpot, SpotState } from "../store/parkiaStore";
import { Icon, Badge } from "./Icon";

export function YardControl({ onGoToCashier }: { onGoToCashier?: (plate: string) => void }) {
  const [state, actions] = useParkiaStore();
  const [selectedFloor, setSelectedFloor] = useState<"Piso 1" | "Piso 2" | "Piso 3">("Piso 1");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const floorSpots = state.spots.filter((s) => s.floor === selectedFloor);
  const occupiedCount = floorSpots.filter((s) => s.state === "occupied").length;
  const reservedCount = floorSpots.filter((s) => s.state === "reserved").length;
  const maintCount = floorSpots.filter((s) => s.state === "maintenance").length;
  const freeCount = floorSpots.filter((s) => s.state === "free").length;
  const totalCount = floorSpots.length;
  const occupancyPct = Math.round(((occupiedCount + reservedCount) / (totalCount || 1)) * 100);

  const filteredSpots = floorSpots.filter((s) => {
    if (filterType === "free") return s.state === "free";
    if (filterType === "occupied") return s.state === "occupied";
    if (filterType === "maintenance") return s.state === "maintenance";
    if (filterType === "reserved") return s.state === "reserved";
    if (filterType === "car") return s.type === "car";
    if (filterType === "motorcycle") return s.type === "motorcycle";
    if (filterType === "pmr") return s.type === "pmr";
    if (filterType === "ev") return s.type === "ev";
    return true;
  });

  // Buscar si hay un vehículo asociado a la bahía
  const assignedVehicle = selectedSpot
    ? state.parkedVehicles.find(
        (v) => v.spotCode === selectedSpot.id && v.floor === selectedSpot.floor && v.status !== "completed"
      )
    : null;

  function handleToggleMaintenance() {
    if (!selectedSpot) return;
    actions.toggleSpotMaintenance(selectedSpot.id, selectedSpot.floor);
    const isNowMaint = selectedSpot.state !== "maintenance";
    setToastMsg(
      `Bahía ${selectedSpot.floor} · ${selectedSpot.id} ${
        isNowMaint ? "bloqueada por mantenimiento" : "desbloqueada y disponible"
      }.`
    );
    setSelectedSpot(null);
    setTimeout(() => setToastMsg(null), 3500);
  }

  function handleReleaseReservation() {
    if (!selectedSpot) return;
    actions.releaseExpiredReservation(selectedSpot.id, selectedSpot.floor);
    setToastMsg(`Reserva de bahía ${selectedSpot.floor} · ${selectedSpot.id} liberada exitosamente.`);
    setSelectedSpot(null);
    setTimeout(() => setToastMsg(null), 3500);
  }

  return (
    <main className="page admin-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">SUPERVISIÓN DE BAHÍAS Y PATIO</p>
          <h1>[O-09] Mapa Táctico de Celdas y Mantenimiento</h1>
        </div>
        <div className="head-actions">
          <Badge tone="green">{freeCount} Libres en {selectedFloor}</Badge>
          <div className="avatar">LG</div>
        </div>
      </div>

      {toastMsg && (
        <div className="toast" style={{ top: 90, bottom: "auto", background: "#0d766e" }}>
          <span>
            <Icon name="check" size={16} />
          </span>
          <div>
            <strong>Operación de Patio</strong>
            <small>{toastMsg}</small>
          </div>
          <button onClick={() => setToastMsg(null)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Selector de Piso y Resumen */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "14px 18px", borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["Piso 1", "Piso 2", "Piso 3"] as const).map((fl) => (
            <button
              key={fl}
              type="button"
              className={`floor-btn-pill ${selectedFloor === fl ? "active" : ""}`}
              onClick={() => setSelectedFloor(fl)}
            >
              {fl}
            </button>
          ))}
        </div>

        {/* Mini Métricas de Piso */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 13, fontWeight: 500 }}>
          <span>Ocupación: <strong>{occupancyPct}%</strong></span>
          <span style={{ color: "#16a34a" }}>Libres: <strong>{freeCount}</strong></span>
          <span style={{ color: "#dc2626" }}>Ocupados: <strong>{occupiedCount}</strong></span>
          <span style={{ color: "#d97706" }}>Reservados: <strong>{reservedCount}</strong></span>
          <span style={{ color: "#4b5563" }}>Mantenimiento: <strong>{maintCount}</strong></span>
        </div>
      </div>

      {/* Filtros por Chip */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "Todas las bahías" },
          { id: "free", label: "Libres (Verde)" },
          { id: "occupied", label: "Ocupadas (Rojo)" },
          { id: "reserved", label: "Reservadas (Ámbar)" },
          { id: "maintenance", label: "En Mantenimiento (Gris)" },
          { id: "pmr", label: "Bahías PMR Accesibles" },
          { id: "ev", label: "Bahías Eléctricas (EV)" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className={`yard-filter-chip ${filterType === f.id ? "active" : ""}`}
            onClick={() => setFilterType(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grilla de Bahías para Monitor de Escritorio */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 12,
        }}
      >
        {filteredSpots.map((spot) => {
          const veh = state.parkedVehicles.find(
            (v) => v.spotCode === spot.id && v.floor === spot.floor && v.status !== "completed"
          );

          let borderColor = "#22c55e";
          let bgColor = "#f0fdf4";
          let labelText = "Libre";

          if (spot.state === "occupied") {
            borderColor = "#ef4444";
            bgColor = "#fef2f2";
            labelText = "Ocupado";
          } else if (spot.state === "reserved") {
            borderColor = "#f59e0b";
            bgColor = "#fffbeb";
            labelText = "Reservado";
          } else if (spot.state === "maintenance") {
            borderColor = "#6b7280";
            bgColor = "#f3f4f6";
            labelText = "Bloqueado";
          }

          return (
            <button
              key={spot.id}
              type="button"
              className="yard-spot-cell"
              data-spot-id={spot.id}
              aria-label={`Bahía ${selectedFloor} ${spot.id}, tipo ${spot.type}, estado ${labelText}${veh ? `, vehículo placa ${veh.plate}` : ''}`}
              onClick={() => setSelectedSpot(spot)}
              style={{
                background: bgColor,
                border: `2px solid ${borderColor}`,
                borderRadius: 12,
                padding: "12px 10px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 110,
                width: "100%",
                fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{spot.id}</span>
                {spot.type === "pmr" && <Badge tone="info">PMR</Badge>}
                {spot.type === "ev" && <Badge tone="green">EV</Badge>}
              </div>

              <div style={{ margin: "6px 0", color: borderColor }}>
                <Icon name={spot.state === "occupied" ? "car" : spot.state === "maintenance" ? "alert" : "check"} size={26} />
              </div>

              <div style={{ textAlign: "center", width: "100%" }}>
                {veh ? (
                  <strong style={{ fontSize: 11, color: "#111827", display: "block" }}>{veh.plate}</strong>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: borderColor }}>{labelText}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal de Control de Bahía */}
      {selectedSpot && (
        <div className="modal-backdrop" onClick={() => setSelectedSpot(null)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spot-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 700 }}>GESTIÓN DE CELDA</span>
                <h3 id="spot-modal-title" style={{ margin: 0, fontSize: 20 }}>Bahía {selectedSpot.floor} · {selectedSpot.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSpot(null)}
                aria-label={`Cerrar detalles de la bahía ${selectedSpot.id}`}
                style={{ background: "none", border: 0, cursor: "pointer", color: "#6b7280" }}
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ background: "#f9fafb", padding: 14, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#6b7280" }}>Estado actual:</span>
                <strong style={{ textTransform: "capitalize" }}>{selectedSpot.state}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#6b7280" }}>Tipo de celda:</span>
                <span>{selectedSpot.type === "pmr" ? "PMR Accesible" : selectedSpot.type === "ev" ? "Eléctrico (EV)" : "Automóvil Estándar"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#6b7280" }}>Distancia a ascensor:</span>
                <span>{selectedSpot.distanceElevator} metros</span>
              </div>
              {assignedVehicle && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #d1d5db" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#6b7280" }}>Vehículo:</span>
                    <strong>{assignedVehicle.plate} ({assignedVehicle.brand})</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Hora de Ingreso:</span>
                    <span>{assignedVehicle.entryTime} ({assignedVehicle.accessGate})</span>
                  </div>
                </div>
              )}
            </div>

            {/* Acciones de Operador */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedSpot.state !== "occupied" && (
                <button
                  type="button"
                  className={selectedSpot.state === "maintenance" ? "primary full" : "primary danger full"}
                  onClick={handleToggleMaintenance}
                  aria-label={selectedSpot.state === "maintenance" ? `Desbloquear bahía ${selectedSpot.id} y poner disponible` : `Bloquear bahía ${selectedSpot.id} por mantenimiento`}
                  style={{ height: 44, fontWeight: 700 }}
                >
                  <Icon name="alert" size={18} />
                  {selectedSpot.state === "maintenance"
                    ? "Desbloquear Bahía (Poner Disponible)"
                    : "Bloquear Bahía por Mantenimiento / Derrame"}
                </button>
              )}

              {selectedSpot.state === "reserved" && (
                <button
                  type="button"
                  className="secondary full"
                  onClick={handleReleaseReservation}
                  aria-label={`Liberar reserva vencida de bahía ${selectedSpot.id}`}
                  style={{ height: 44, fontWeight: 700 }}
                >
                  <Icon name="refresh" size={18} /> Liberar Reserva Vencida (15+ min)
                </button>
              )}

              {assignedVehicle && onGoToCashier && (
                <button
                  className="primary full"
                  onClick={() => {
                    onGoToCashier(assignedVehicle.plate);
                    setSelectedSpot(null);
                  }}
                  style={{ height: 44, fontWeight: 700, background: "#0d766e" }}
                >
                  <Icon name="card" size={18} /> Cobrar en Caja POS ({assignedVehicle.plate})
                </button>
              )}

              <button className="secondary full" onClick={() => setSelectedSpot(null)}>
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
