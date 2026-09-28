/**
 * PARKIA - Motor de Estado Cliente Reactivo (ADR-002)
 * Proporciona persistencia en localStorage, sincronización bidireccional entre
 * el portal de Usuarios y Operarios, y simulación de tiempo acelerada (5s = 1 min).
 */

import { useSyncExternalStore } from "react";

// Tipos de datos del dominio Parkia
export type SpotState = "free" | "occupied" | "reserved" | "maintenance";
export type SpotType = "car" | "motorcycle" | "pmr" | "ev";

export interface ParkingSpot {
  id: string;
  floor: "Piso 1" | "Piso 2" | "Piso 3";
  zone: "Zona A" | "Zona B";
  state: SpotState;
  type: SpotType;
  distanceElevator: number; // metros
  hasCharger: boolean;
}

export interface ActiveSession {
  plate: string;
  vehicle: string;
  vehicleType: "car" | "motorcycle" | "ev";
  entryTime: string;
  entryTimestamp: number;
  accessGate: string;
  elapsedMinutes: number;
  totalCost: number;
  status: "active" | "completed";
}

export interface RegisteredVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  type: "Automóvil" | "Motocicleta" | "Eléctrico";
  isPrimary: boolean;
  rfidLinked: boolean;
  lastEntry: string;
}

export interface ParkingHistoryItem {
  id: string;
  date: string;
  plate: string;
  duration: string;
  durationMinutes: number;
  status: "active" | "paid" | "pending";
  total: number;
  method?: string;
  qrCode?: string;
}

export interface GateAccess {
  id: string;
  name: string;
  connection: "online" | "offline";
  state: "Cerrada" | "Abierta (Manual)" | "Abriendo..." | "Bloqueada";
  eventsToday: number;
  sensor: "Operativo" | "Sin señal";
  manualOpenExpiresAt?: number | null;
}

export interface GateException {
  id: string;
  time: string;
  type: string;
  accessGate: string;
  operator: string;
  status: "Abierto" | "Resuelto";
}

export interface TariffPlan {
  carRate: number;      // $ / min
  carCap: number;       // Tope diario
  carGrace: number;     // Minutos de gracia
  motoRate: number;
  motoCap: number;
  motoGrace: number;
  bikeRate: number;
  bikeCap: number;
  bikeGrace: number;
  evRate: number;
  evCap: number;
  evGrace: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface SystemAlert {
  id: string;
  tone: "critical" | "warning" | "info";
  title: string;
  meta: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  documentId?: string;
  role: "driver" | "admin";
  shift?: string;
  avatarText: string;
}

export interface ParkiaState {
  currentUser: UserProfile | null;
  spots: ParkingSpot[];
  activeSession: ActiveSession | null;
  vehicles: RegisteredVehicle[];
  history: ParkingHistoryItem[];
  gates: GateAccess[];
  exceptions: GateException[];
  tariffs: TariffPlan;
  alerts: SystemAlert[];
  occupancyByHour: number[];
  notificationsEnabled: boolean;
  todayRevenue: number;
  todaySessionsCount: number;
}

const STORAGE_KEY = "parkia_sim_state_v1";

// Generador de bahías iniciales
function generateInitialSpots(): ParkingSpot[] {
  const floors: ("Piso 1" | "Piso 2" | "Piso 3")[] = ["Piso 1", "Piso 2", "Piso 3"];
  const list: ParkingSpot[] = [];

  floors.forEach((fl) => {
    // 16 bahías por piso: A-01..A-08, B-01..B-08
    for (let i = 1; i <= 8; i++) {
      const idA = `A-0${i}`;
      let stateA: SpotState = "free";
      let typeA: SpotType = "car";
      if (fl === "Piso 2") {
        if (i === 3 || i === 6) stateA = "occupied";
        if (i === 4) stateA = "reserved";
        if (i === 1) typeA = "pmr";
        if (i === 2) typeA = "ev";
      } else if (fl === "Piso 1") {
        if (i <= 6) stateA = "occupied";
      } else {
        if (i % 2 === 0) stateA = "occupied";
      }
      list.push({
        id: idA,
        floor: fl,
        zone: "Zona A",
        state: stateA,
        type: typeA,
        distanceElevator: 20 + i * 5,
        hasCharger: typeA === "ev",
      });

      const idB = `B-0${i}`;
      let stateB: SpotState = "free";
      let typeB: SpotType = "car";
      if (fl === "Piso 2") {
        if (i === 1 || i === 4 || i === 8) stateB = "occupied";
        if (i === 5) stateB = "reserved";
        if (i === 7) typeB = "pmr";
      } else if (fl === "Piso 1") {
        if (i <= 5) stateB = "occupied";
      } else {
        if (i % 3 === 0) stateB = "occupied";
      }
      list.push({
        id: idB,
        floor: fl,
        zone: "Zona B",
        state: stateB,
        type: typeB,
        distanceElevator: 35 + i * 5,
        hasCharger: i === 6,
      });
    }
  });

  return list;
}

// Semilla por defecto
const defaultState: ParkiaState = {
  currentUser: null,
  spots: generateInitialSpots(),
  activeSession: {
    plate: "JHT · 482",
    vehicle: "Chevrolet Tracker · Gris grafito",
    vehicleType: "car",
    entryTime: "08:42 a. m.",
    entryTimestamp: Date.now() - 138 * 60 * 1000, // Hace 138 minutos
    accessGate: "Acceso Norte",
    elapsedMinutes: 138,
    totalCost: 8970, // 138 min * $65
    status: "active",
  },
  vehicles: [
    {
      id: "v1",
      plate: "JHT · 482",
      brand: "Chevrolet",
      model: "Tracker",
      year: "2023",
      color: "Gris grafito",
      type: "Automóvil",
      isPrimary: true,
      rfidLinked: true,
      lastEntry: "Hoy, 08:42 a. m.",
    },
    {
      id: "v2",
      plate: "KLM · 903",
      brand: "Mazda",
      model: "CX-30",
      year: "2021",
      color: "Blanco perlado",
      type: "Automóvil",
      isPrimary: false,
      rfidLinked: true,
      lastEntry: "3 jun, 14:15 p. m.",
    },
  ],
  history: [
    {
      id: "SES-93842",
      date: "Hoy, 12 jun",
      plate: "JHT · 482",
      duration: "En curso",
      durationMinutes: 138,
      status: "active",
      total: 8970,
      method: "En curso",
    },
    {
      id: "SES-93841",
      date: "8 jun, 2025",
      plate: "JHT · 482",
      duration: "2 h 42 min",
      durationMinutes: 162,
      status: "paid",
      total: 11400,
      method: "Visa •2481",
      qrCode: "QR-PARKIA-93841-EXIT",
    },
    {
      id: "SES-93840",
      date: "3 jun, 2025",
      plate: "KLM · 903",
      duration: "1 h 18 min",
      durationMinutes: 78,
      status: "paid",
      total: 6200,
      method: "Nequi QR",
      qrCode: "QR-PARKIA-93840-EXIT",
    },
    {
      id: "SES-93839",
      date: "29 may, 2025",
      plate: "JHT · 482",
      duration: "4 h 06 min",
      durationMinutes: 246,
      status: "pending",
      total: 16800,
      method: "Pendiente de cobro",
    },
  ],
  gates: [
    {
      id: "g1",
      name: "Entrada Norte",
      connection: "online",
      state: "Cerrada",
      eventsToday: 1284,
      sensor: "Operativo",
    },
    {
      id: "g2",
      name: "Entrada Sur",
      connection: "online",
      state: "Cerrada",
      eventsToday: 842,
      sensor: "Operativo",
    },
    {
      id: "g3",
      name: "Salida Norte",
      connection: "online",
      state: "Cerrada",
      eventsToday: 1103,
      sensor: "Operativo",
    },
    {
      id: "g4",
      name: "Salida Sur",
      connection: "offline",
      state: "Bloqueada",
      eventsToday: 320,
      sensor: "Sin señal",
    },
  ],
  exceptions: [
    {
      id: "#2841",
      time: "14:32",
      type: "Falla de lectura",
      accessGate: "Salida Sur",
      operator: "Laura Gómez",
      status: "Abierto",
    },
    {
      id: "#2840",
      time: "13:18",
      type: "Apertura manual",
      accessGate: "Entrada Norte",
      operator: "Juan Torres",
      status: "Resuelto",
    },
    {
      id: "#2839",
      time: "11:46",
      type: "Ticket extraviado",
      accessGate: "Salida Norte",
      operator: "Laura Gómez",
      status: "Resuelto",
    },
  ],
  tariffs: {
    carRate: 65,
    carCap: 42000,
    carGrace: 10,
    motoRate: 42,
    motoCap: 25000,
    motoGrace: 10,
    bikeRate: 0,
    bikeCap: 0,
    bikeGrace: 15,
    evRate: 58,
    evCap: 38000,
    evGrace: 10,
    lastUpdated: "10 jun 2025 · 09:18",
    updatedBy: "Laura Gómez",
  },
  alerts: [
    {
      id: "a1",
      tone: "critical",
      title: "Talanquera B sin respuesta",
      meta: "Salida Sur · hace 4 min",
      timestamp: "14:28",
    },
    {
      id: "a2",
      tone: "warning",
      title: "Capacidad crítica en Piso 1",
      meta: "92% de ocupación · hace 8 min",
      timestamp: "14:24",
    },
    {
      id: "a3",
      tone: "info",
      title: "Pago manual pendiente",
      meta: "Caso #INC-2841 · hace 12 min",
      timestamp: "14:20",
    },
  ],
  occupancyByHour: [22, 35, 58, 72, 83, 77, 68, 73],
  notificationsEnabled: true,
  todayRevenue: 18400000,
  todaySessionsCount: 1284,
};

// Cargar estado inicial desde localStorage si existe
function loadState(): ParkiaState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch (err) {
    console.warn("Error leyendo localStorage de Parkia:", err);
    return defaultState;
  }
}

// Almacenar estado
let currentState: ParkiaState = loadState();
const listeners = new Set<() => void>();

function emitChange() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch (err) {
      console.warn("Error guardando en localStorage:", err);
    }
  }
  listeners.forEach((listener) => listener());
}

// Motor de Ticker Acelerado (Cada 5 segundos incrementa 1 minuto en la sesión activa)
let tickerInterval: any = null;
function startSimulationTicker() {
  if (tickerInterval || typeof window === "undefined") return;
  tickerInterval = setInterval(() => {
    if (!currentState.activeSession || currentState.activeSession.status !== "active") return;
    const newMinutes = currentState.activeSession.elapsedMinutes + 1;
    const rate = currentState.tariffs.carRate;
    const newCost = Math.min(newMinutes * rate, currentState.tariffs.carCap);

    currentState = {
      ...currentState,
      activeSession: {
        ...currentState.activeSession,
        elapsedMinutes: newMinutes,
        totalCost: newCost,
      },
    };
    emitChange();
  }, 5000); // 5s = 1 min
}
startSimulationTicker();

// Objeto de Mutaciones / Acciones
export const parkiaActions = {
  // Reset demo
  resetDemo() {
    currentState = JSON.parse(JSON.stringify(defaultState));
    emitChange();
  },

  // Flujo A0: Iniciar sesión Demo de 1 clic
  loginDemo(role: "driver" | "admin") {
    if (role === "driver") {
      currentState = {
        ...currentState,
        currentUser: {
          id: "u1",
          name: "Carlos Martínez",
          email: "carlos.martinez@email.com",
          phone: "+57 310 849 2048",
          documentId: "CC 1.023.492.892",
          role: "driver",
          avatarText: "CM",
        },
      };
    } else {
      currentState = {
        ...currentState,
        currentUser: {
          id: "op1",
          name: "Laura Gómez",
          email: "laura.gomez@parkia.co",
          phone: "+57 301 228 9410",
          role: "admin",
          shift: "Turno AM · 06:00 - 14:00",
          avatarText: "LG",
        },
      };
    }
    emitChange();
  },

  // Flujo A0: Iniciar sesión con formulario
  login(credentials: {
    emailOrDoc: string;
    role: "driver" | "admin";
    shift?: string;
    name?: string;
  }) {
    const isDriver = credentials.role === "driver";
    const name = credentials.name || (isDriver ? "Carlos Martínez" : "Laura Gómez");
    const avatar = name
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");

    currentState = {
      ...currentState,
      currentUser: {
        id: "user-" + Date.now(),
        name,
        email: credentials.emailOrDoc.includes("@")
          ? credentials.emailOrDoc
          : `${credentials.emailOrDoc.toLowerCase()}@parkia.co`,
        role: credentials.role,
        shift: credentials.shift || (isDriver ? undefined : "Turno AM · 06:00 - 14:00"),
        avatarText: avatar || (isDriver ? "DR" : "OP"),
      },
    };
    emitChange();
  },

  // Flujo A0: Registro de nuevo conductor
  registerDriver(data: {
    name: string;
    email: string;
    phone: string;
    documentId: string;
    plate: string;
    vehicleType: "Automóvil" | "Motocicleta" | "Eléctrico";
    brand: string;
    model: string;
  }) {
    const avatar = data.name
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");

    const newVehicle: RegisteredVehicle = {
      id: "v-" + Date.now(),
      plate: data.plate.toUpperCase().trim(),
      brand: data.brand || "Renault",
      model: data.model || "Duster",
      year: "2024",
      color: "Plata",
      type: data.vehicleType,
      isPrimary: true,
      rfidLinked: true,
      lastEntry: "Registrado recientemente",
    };

    currentState = {
      ...currentState,
      currentUser: {
        id: "u-" + Date.now(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        documentId: data.documentId,
        role: "driver",
        avatarText: avatar || "US",
      },
      vehicles: [newVehicle, ...currentState.vehicles],
    };
    emitChange();
  },

  // Flujo A0: Cerrar sesión
  logout() {
    currentState = {
      ...currentState,
      currentUser: null,
    };
    emitChange();
  },

  // Flujo U1: Reservar bahía
  reserveSpot(spotId: string, floor: "Piso 1" | "Piso 2" | "Piso 3") {
    const updatedSpots = currentState.spots.map((s) => {
      if (s.id === spotId && s.floor === floor) {
        return { ...s, state: "reserved" as SpotState };
      }
      return s;
    });

    currentState = {
      ...currentState,
      spots: updatedSpots,
    };
    emitChange();
  },

  // Flujo U1: Liberar bahía
  releaseSpot(spotId: string, floor: "Piso 1" | "Piso 2" | "Piso 3") {
    const updatedSpots = currentState.spots.map((s) => {
      if (s.id === spotId && s.floor === floor) {
        return { ...s, state: "free" as SpotState };
      }
      return s;
    });

    currentState = {
      ...currentState,
      spots: updatedSpots,
    };
    emitChange();
  },

  // Flujo U3: Agregar vehículo
  addVehicle(vehicle: {
    plate: string;
    brand: string;
    model: string;
    year?: string;
    color?: string;
    type: "Automóvil" | "Motocicleta" | "Eléctrico";
  }) {
    const newVeh: RegisteredVehicle = {
      id: "v-" + Date.now(),
      plate: vehicle.plate.toUpperCase().trim(),
      brand: vehicle.brand.trim() || "Genérico",
      model: vehicle.model.trim() || "Estándar",
      year: vehicle.year || "2024",
      color: vehicle.color || "Plata",
      type: vehicle.type,
      isPrimary: currentState.vehicles.length === 0,
      rfidLinked: true,
      lastEntry: "Sin registros previos",
    };

    currentState = {
      ...currentState,
      vehicles: [...currentState.vehicles, newVeh],
    };
    emitChange();
  },

  // Flujo U3: Establecer como vehículo principal
  setPrimaryVehicle(id: string) {
    currentState = {
      ...currentState,
      vehicles: currentState.vehicles.map((v) => ({
        ...v,
        isPrimary: v.id === id,
      })),
    };
    emitChange();
  },

  // Flujo U3: Eliminar vehículo
  deleteVehicle(id: string) {
    currentState = {
      ...currentState,
      vehicles: currentState.vehicles.filter((v) => v.id !== id),
    };
    emitChange();
  },

  // Flujo U3: Alternar notificaciones
  toggleNotifications() {
    currentState = {
      ...currentState,
      notificationsEnabled: !currentState.notificationsEnabled,
    };
    emitChange();
  },

  // Flujo U3: Actualizar perfil del conductor
  updateProfile(updates: {
    name?: string;
    email?: string;
    phone?: string;
    documentId?: string;
  }) {
    if (!currentState.currentUser) return;

    const name = updates.name?.trim() || currentState.currentUser.name;
    const avatarText = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || currentState.currentUser.avatarText;

    currentState = {
      ...currentState,
      currentUser: {
        ...currentState.currentUser,
        name,
        email: updates.email?.trim() || currentState.currentUser.email,
        phone: updates.phone !== undefined ? updates.phone.trim() : currentState.currentUser.phone,
        documentId:
          updates.documentId !== undefined
            ? updates.documentId.trim()
            : currentState.currentUser.documentId,
        avatarText,
      },
    };
    emitChange();
  },

  // Flujo U4: Pagar sesión pendiente o activa
  paySession(sessionId: string, paymentMethod: string): { success: boolean; qrCode: string } {
    const qr = `QR-PARKIA-${sessionId}-${Date.now().toString(36).toUpperCase()}`;
    let paidAmount = 0;

    const updatedHistory = currentState.history.map((h) => {
      if (h.id === sessionId) {
        paidAmount = h.total;
        return {
          ...h,
          status: "paid" as const,
          method: paymentMethod,
          qrCode: qr,
        };
      }
      return h;
    });

    currentState = {
      ...currentState,
      history: updatedHistory,
      todayRevenue: currentState.todayRevenue + paidAmount,
    };
    emitChange();
    return { success: true, qrCode: qr };
  },

  // Flujo O2: Abrir talanquera manualmente
  openGateManually(gateName: string, reason: string, operatorName = "Laura Gómez") {
    const gateIndex = currentState.gates.findIndex((g) => g.name === gateName);
    if (gateIndex === -1) return;

    const updatedGates = [...currentState.gates];
    updatedGates[gateIndex] = {
      ...updatedGates[gateIndex],
      state: "Abierta (Manual)",
      eventsToday: updatedGates[gateIndex].eventsToday + 1,
    };

    const newException: GateException = {
      id: `#${Math.floor(2842 + Math.random() * 500)}`,
      time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      type: reason,
      accessGate: gateName,
      operator: operatorName,
      status: "Resuelto",
    };

    currentState = {
      ...currentState,
      gates: updatedGates,
      exceptions: [newException, ...currentState.exceptions],
    };
    emitChange();

    // A los 6 segundos la talanquera se cierra automáticamente
    setTimeout(() => {
      const restoreGates = [...currentState.gates];
      const gIdx = restoreGates.findIndex((g) => g.name === gateName);
      if (gIdx !== -1 && restoreGates[gIdx].state === "Abierta (Manual)") {
        restoreGates[gIdx] = {
          ...restoreGates[gIdx],
          state: "Cerrada",
        };
        currentState = { ...currentState, gates: restoreGates };
        emitChange();
      }
    }, 6000);
  },

  // Flujo O4: Actualizar tarifas
  updateTariffs(newTariffs: Partial<TariffPlan>, operator = "Laura Gómez") {
    const updated: TariffPlan = {
      ...currentState.tariffs,
      ...newTariffs,
      lastUpdated: new Date().toLocaleDateString("es-CO", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) + " · " + new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      updatedBy: operator,
    };

    // Recalcular costo de sesión activa con nueva tarifa
    let updatedActiveSession = currentState.activeSession;
    if (updatedActiveSession && updatedActiveSession.status === "active") {
      const newCost = Math.min(
        updatedActiveSession.elapsedMinutes * updated.carRate,
        updated.carCap
      );
      updatedActiveSession = {
        ...updatedActiveSession,
        totalCost: newCost,
      };
    }

    currentState = {
      ...currentState,
      tariffs: updated,
      activeSession: updatedActiveSession,
    };
    emitChange();
  },

  // Flujo O3: Exportar reporte a CSV
  exportReportsCSV() {
    const headers = ["ID Sesion", "Fecha y Hora", "Placa", "Duracion", "Metodo de Pago", "Valor (COP)", "Estado"];
    const rows = currentState.history.map((h) => [
      h.id,
      h.date,
      h.plate,
      h.duration,
      h.method || "N/A",
      h.total.toString(),
      h.status === "paid" ? "Aprobado" : h.status === "pending" ? "Pendiente" : "En curso",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_recaudo_parkia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

// Hook Reactivo para componentes
export function useParkiaStore(): [ParkiaState, typeof parkiaActions] {
  const state = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => currentState,
    () => defaultState
  );

  return [state, parkiaActions];
}
