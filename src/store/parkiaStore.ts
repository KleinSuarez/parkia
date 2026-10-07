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

export interface ShiftSession {
  isOpen: boolean;
  shiftName: string;
  operatorName: string;
  operatorCode: string;
  stationName: string;
  baseCash: number;
  openedAt: string;
  peripherals: {
    lprNorth: "online" | "warning" | "offline";
    lprSouth: "online" | "warning" | "offline";
    barrierNorth: "online" | "warning" | "offline";
    barrierSouth: "online" | "warning" | "offline";
    printer: "online" | "warning" | "offline";
    cashDrawer: "online" | "warning" | "offline";
  };
  lastZCut?: {
    closedAt: string;
    operator: string;
    countedCash: number;
    systemCash: number;
    cashDiff: number;
    countedVouchers: number;
    systemVouchers: number;
    digitalTotal: number;
    grandTotal: number;
    notes: string;
  };
}

export interface ParkedVehicleSession {
  id: string;
  plate: string;
  vehicleType: "car" | "motorcycle" | "pmr" | "ev";
  brand: string;
  color: string;
  entryTime: string;
  entryTimestamp: number;
  accessGate: string;
  spotCode: string;
  floor: "Piso 1" | "Piso 2" | "Piso 3";
  status: "active" | "paid" | "completed";
  paidAt?: string;
  paidAmount?: number;
  paymentMethod?: string;
  gracePeriodExpiresAt?: number;
  ticketCode: string;
}

export interface LprCapture {
  id: string;
  plate: string;
  time: string;
  date: string;
  gate: string;
  confidence: number;
  vehicleType: "car" | "motorcycle" | "pmr" | "ev";
}

export interface LiveEvent {
  id: string;
  time: string;
  type: "entry" | "exit" | "payment" | "override" | "maintenance" | "shift";
  description: string;
  badgeTone: "green" | "critical" | "warning" | "paid" | "pending";
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
  shift: ShiftSession;
  parkedVehicles: ParkedVehicleSession[];
  lprCaptures: LprCapture[];
  liveEvents: LiveEvent[];
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
  shift: {
    isOpen: true,
    shiftName: "Turno AM · 06:00 - 14:00",
    operatorName: "Laura Gómez",
    operatorCode: "OP-8492",
    stationName: "Garita Principal Norte",
    baseCash: 200000,
    openedAt: "Hoy, 06:00 a. m.",
    peripherals: {
      lprNorth: "online",
      lprSouth: "online",
      barrierNorth: "online",
      barrierSouth: "offline",
      printer: "online",
      cashDrawer: "online",
    },
  },
  parkedVehicles: [
    {
      id: "SES-94001",
      plate: "JHT · 482",
      vehicleType: "car",
      brand: "Chevrolet Tracker",
      color: "Gris grafito",
      entryTime: "08:42 a. m.",
      entryTimestamp: Date.now() - 138 * 60 * 1000,
      accessGate: "Entrada Norte",
      spotCode: "A-03",
      floor: "Piso 2",
      status: "active",
      ticketCode: "TCK-849201",
    },
    {
      id: "SES-94002",
      plate: "KLO · 912",
      vehicleType: "car",
      brand: "Mazda 3",
      color: "Rojo diamante",
      entryTime: "09:15 a. m.",
      entryTimestamp: Date.now() - 105 * 60 * 1000,
      accessGate: "Entrada Norte",
      spotCode: "A-01",
      floor: "Piso 1",
      status: "active",
      ticketCode: "TCK-849202",
    },
    {
      id: "SES-94003",
      plate: "WXZ · 402",
      vehicleType: "motorcycle",
      brand: "Yamaha MT-03",
      color: "Azul mate",
      entryTime: "10:30 a. m.",
      entryTimestamp: Date.now() - 30 * 60 * 1000,
      accessGate: "Entrada Norte",
      spotCode: "B-03",
      floor: "Piso 1",
      status: "active",
      ticketCode: "TCK-849203",
    },
    {
      id: "SES-94004",
      plate: "EVX · 889",
      vehicleType: "ev",
      brand: "BYD Seal",
      color: "Azul eléctrico",
      entryTime: "07:50 a. m.",
      entryTimestamp: Date.now() - 190 * 60 * 1000,
      accessGate: "Entrada Sur",
      spotCode: "A-02",
      floor: "Piso 2",
      status: "active",
      ticketCode: "TCK-849204",
    },
    {
      id: "SES-94005",
      plate: "PMR · 104",
      vehicleType: "pmr",
      brand: "Toyota Corolla",
      color: "Blanco perlado",
      entryTime: "11:10 a. m.",
      entryTimestamp: Date.now() - 15 * 60 * 1000,
      accessGate: "Entrada Sur",
      spotCode: "A-01",
      floor: "Piso 2",
      status: "active",
      ticketCode: "TCK-849205",
    },
    {
      id: "SES-94006",
      plate: "ABC · 123",
      vehicleType: "car",
      brand: "Renault Duster",
      color: "Plata",
      entryTime: "09:40 a. m.",
      entryTimestamp: Date.now() - 80 * 60 * 1000,
      accessGate: "Entrada Norte",
      spotCode: "A-02",
      floor: "Piso 1",
      status: "paid",
      paidAt: "11:50 a. m.",
      paidAmount: 14000,
      paymentMethod: "Efectivo garita",
      gracePeriodExpiresAt: Date.now() + 10 * 60 * 1000,
      ticketCode: "TCK-849206",
    },
  ],
  lprCaptures: [
    {
      id: "lpr-1",
      plate: "ABC · 123",
      time: "09:40 a. m.",
      date: "Hoy, 12 jun",
      gate: "Entrada Norte",
      confidence: 98,
      vehicleType: "car",
    },
    {
      id: "lpr-2",
      plate: "JHT · 482",
      time: "08:42 a. m.",
      date: "Hoy, 12 jun",
      gate: "Entrada Norte",
      confidence: 99,
      vehicleType: "car",
    },
    {
      id: "lpr-3",
      plate: "EVX · 889",
      time: "07:50 a. m.",
      date: "Hoy, 12 jun",
      gate: "Entrada Sur",
      confidence: 97,
      vehicleType: "ev",
    },
    {
      id: "lpr-4",
      plate: "KLO · 912",
      time: "09:15 a. m.",
      date: "Hoy, 12 jun",
      gate: "Entrada Norte",
      confidence: 96,
      vehicleType: "car",
    },
    {
      id: "lpr-5",
      plate: "WXZ · 402",
      time: "10:30 a. m.",
      date: "Hoy, 12 jun",
      gate: "Entrada Norte",
      confidence: 94,
      vehicleType: "motorcycle",
    },
    {
      id: "lpr-6",
      plate: "PMR · 104",
      time: "11:10 a. m.",
      date: "Hoy, 12 jun",
      gate: "Entrada Sur",
      confidence: 98,
      vehicleType: "pmr",
    },
  ],
  liveEvents: [
    {
      id: "ev1",
      time: "11:50 a. m.",
      type: "payment",
      description: "Cobro en ventanilla: $14.000 (Placa ABC · 123) · Efectivo",
      badgeTone: "paid",
    },
    {
      id: "ev2",
      time: "11:10 a. m.",
      type: "entry",
      description: "Ingreso autorizado: PMR · 104 por Entrada Sur (Piso 2, A-01)",
      badgeTone: "green",
    },
    {
      id: "ev3",
      time: "10:30 a. m.",
      type: "entry",
      description: "Ingreso Moto: WXZ · 402 por Entrada Norte",
      badgeTone: "green",
    },
    {
      id: "ev4",
      time: "09:42 a. m.",
      type: "override",
      description: "Apertura manual en Salida Norte (Incidencia #2839 - Ticket extraviado)",
      badgeTone: "warning",
    },
  ],
};

// Cargar estado inicial desde localStorage si existe con sanitización
function loadState(): ParkiaState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      shift: { ...defaultState.shift, ...(parsed.shift || {}) },
      parkedVehicles:
        parsed.parkedVehicles && parsed.parkedVehicles.length > 0
          ? parsed.parkedVehicles
          : defaultState.parkedVehicles,
      lprCaptures:
        parsed.lprCaptures && parsed.lprCaptures.length > 0
          ? parsed.lprCaptures
          : defaultState.lprCaptures,
      liveEvents:
        parsed.liveEvents && parsed.liveEvents.length > 0
          ? parsed.liveEvents
          : defaultState.liveEvents,
    };
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

  // Flujo U4: Finalizar estancia activa y pagar
  payActiveSession(paymentMethod: string): { success: boolean; qrCode: string; historyItem?: ParkingHistoryItem } {
    if (!currentState.activeSession) {
      return { success: false, qrCode: "" };
    }

    const sess = currentState.activeSession;
    const sessionCost = sess.totalCost || 9750;
    const cleanPlate = sess.plate.replace(/[^A-Za-z0-9]/g, "");
    const qr = `QR-PARKIA-EXIT-${cleanPlate}-${Date.now().toString(36).toUpperCase()}`;
    const id = `SES-${Math.floor(93850 + Math.random() * 500)}`;

    const newHistoryItem: ParkingHistoryItem = {
      id,
      date: "Hoy, " + new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      plate: sess.plate,
      duration: `${Math.floor(sess.elapsedMinutes / 60)} h ${sess.elapsedMinutes % 60} min`,
      durationMinutes: sess.elapsedMinutes,
      status: "paid",
      total: sessionCost,
      method: paymentMethod,
      qrCode: qr,
    };

    currentState = {
      ...currentState,
      activeSession: {
        ...sess,
        status: "completed",
        totalCost: sessionCost,
      },
      history: [newHistoryItem, ...currentState.history],
      todayRevenue: currentState.todayRevenue + sessionCost,
    };
    emitChange();
    return { success: true, qrCode: qr, historyItem: newHistoryItem };
  },

  // Flujo U4: Pagar sesión pendiente o activa
  paySession(sessionId: string, paymentMethod: string): { success: boolean; qrCode: string; historyItem?: ParkingHistoryItem } {
    if (sessionId === "SES-ACTIVA" || (currentState.activeSession && sessionId === currentState.activeSession.plate)) {
      return this.payActiveSession(paymentMethod);
    }

    const qr = `QR-PARKIA-${sessionId}-${Date.now().toString(36).toUpperCase()}`;
    let paidAmount = 0;
    let foundItem: ParkingHistoryItem | undefined;

    const updatedHistory = currentState.history.map((h) => {
      if (h.id === sessionId) {
        paidAmount = h.total;
        foundItem = {
          ...h,
          status: "paid" as const,
          method: paymentMethod,
          qrCode: qr,
        };
        return foundItem;
      }
      return h;
    });

    currentState = {
      ...currentState,
      history: updatedHistory,
      todayRevenue: currentState.todayRevenue + paidAmount,
    };
    emitChange();
    return { success: true, qrCode: qr, historyItem: foundItem };
  },

  // Flujo O2: Abrir talanquera manualmente
  openGateManually(gateName: string, reason: string, operatorName = "Laura Gómez") {
    const gateIndex = currentState.gates.findIndex((g) => g.name === gateName);
    if (gateIndex === -1) return;

    const expiresAt = Date.now() + 6000;
    const updatedGates = [...currentState.gates];
    updatedGates[gateIndex] = {
      ...updatedGates[gateIndex],
      state: "Abierta (Manual)",
      eventsToday: updatedGates[gateIndex].eventsToday + 1,
      manualOpenExpiresAt: expiresAt,
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
          manualOpenExpiresAt: null,
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

  // Flujo O1: Apertura de Turno y Declaración de Base de Caja
  openShift(data: {
    shiftName: string;
    stationName: string;
    baseCash: number;
    operatorName?: string;
  }) {
    const timeStr = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    const op = data.operatorName || currentState.currentUser?.name || "Laura Gómez";
    currentState = {
      ...currentState,
      shift: {
        ...currentState.shift,
        isOpen: true,
        shiftName: data.shiftName,
        stationName: data.stationName,
        baseCash: data.baseCash,
        operatorName: op,
        openedAt: `Hoy, ${timeStr}`,
      },
      liveEvents: [
        {
          id: `ev-${Date.now()}`,
          time: timeStr,
          type: "shift",
          description: `Apertura de turno: ${data.shiftName} en ${data.stationName} (Base: $${new Intl.NumberFormat("es-CO").format(data.baseCash)})`,
          badgeTone: "green",
        },
        ...currentState.liveEvents,
      ],
    };
    emitChange();
  },

  // Flujo O2: Cierre de Turno y Arqueo de Caja (Corte Z)
  closeShift(data: { countedCash: number; countedVouchers: number; notes: string }) {
    const timeStr = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    const op = currentState.shift.operatorName || "Laura Gómez";

    const cashTotal =
      currentState.history
        .filter(
          (h) =>
            h.status === "paid" &&
            (h.method?.toLowerCase().includes("efectivo") || h.method === "Garita")
        )
        .reduce((s, h) => s + h.total, 0) + currentState.shift.baseCash;

    const voucherTotal = currentState.history
      .filter(
        (h) =>
          h.status === "paid" &&
          (h.method?.toLowerCase().includes("visa") ||
            h.method?.toLowerCase().includes("mastercard") ||
            h.method?.toLowerCase().includes("datáfono"))
      )
      .reduce((s, h) => s + h.total, 0);

    const digitalTotal = currentState.history
      .filter(
        (h) =>
          h.status === "paid" &&
          (h.method?.toLowerCase().includes("nequi") || h.method?.toLowerCase().includes("qr"))
      )
      .reduce((s, h) => s + h.total, 0);

    const cashDiff = data.countedCash - cashTotal;

    const zCut = {
      closedAt: `Hoy, ${timeStr}`,
      operator: op,
      countedCash: data.countedCash,
      systemCash: cashTotal,
      cashDiff,
      countedVouchers: data.countedVouchers,
      systemVouchers: voucherTotal,
      digitalTotal,
      grandTotal: cashTotal + voucherTotal + digitalTotal,
      notes: data.notes || "Sin observaciones registradas",
    };

    currentState = {
      ...currentState,
      shift: {
        ...currentState.shift,
        isOpen: false,
        lastZCut: zCut,
      },
      liveEvents: [
        {
          id: `ev-${Date.now()}`,
          time: timeStr,
          type: "shift",
          description: `Corte Z ejecutado: Turno cerrado por ${op}. Descuadre caja: $${new Intl.NumberFormat("es-CO").format(cashDiff)}`,
          badgeTone: Math.abs(cashDiff) > 5000 ? "critical" : "paid",
        },
        ...currentState.liveEvents,
      ],
    };
    emitChange();
    return zCut;
  },

  // Flujo O4: Ingreso vehicular manual asistido y emisión de ticket
  processManualEntry(data: {
    plate: string;
    vehicleType: "car" | "motorcycle" | "pmr" | "ev";
    gateName: string;
    brand?: string;
    color?: string;
    spotId?: string;
  }) {
    const cleanPlate = data.plate.toUpperCase().trim();
    const timeStr = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

    // Asignar bahía libre disponible acorde al tipo
    const targetSpot =
      currentState.spots.find(
        (s) =>
          s.state === "free" &&
          (data.vehicleType === "pmr"
            ? s.type === "pmr"
            : data.vehicleType === "ev"
            ? s.type === "ev"
            : s.type === "car")
      ) ||
      currentState.spots.find((s) => s.state === "free") || {
        id: "A-01",
        floor: "Piso 1" as const,
        zone: "Zona A" as const,
        state: "free" as const,
        type: data.vehicleType,
        distanceElevator: 25,
        hasCharger: false,
      };

    const updatedSpots = currentState.spots.map((s) =>
      s.id === targetSpot.id && s.floor === targetSpot.floor
        ? { ...s, state: "occupied" as const }
        : s
    );

    const ticketCode = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;
    const newSession: ParkedVehicleSession = {
      id: `SES-${Math.floor(94000 + Math.random() * 1000)}`,
      plate: cleanPlate,
      vehicleType: data.vehicleType,
      brand: data.brand || "Vehículo verificado",
      color: data.color || "Plata",
      entryTime: timeStr,
      entryTimestamp: Date.now(),
      accessGate: data.gateName,
      spotCode: targetSpot.id,
      floor: targetSpot.floor,
      status: "active",
      ticketCode,
    };

    const newLpr: LprCapture = {
      id: `lpr-${Date.now()}`,
      plate: cleanPlate,
      time: timeStr,
      date: "Hoy, " + new Date().toLocaleDateString("es-CO", { day: "numeric", month: "short" }),
      gate: data.gateName,
      confidence: 97,
      vehicleType: data.vehicleType,
    };

    // Levantar talanquera por 6 segundos
    const gateIndex = currentState.gates.findIndex((g) => g.name === data.gateName);
    const updatedGates = [...currentState.gates];
    if (gateIndex !== -1) {
      updatedGates[gateIndex] = {
        ...updatedGates[gateIndex],
        state: "Abierta (Manual)",
        eventsToday: updatedGates[gateIndex].eventsToday + 1,
      };
    }

    currentState = {
      ...currentState,
      spots: updatedSpots,
      gates: updatedGates,
      parkedVehicles: [newSession, ...currentState.parkedVehicles],
      lprCaptures: [newLpr, ...currentState.lprCaptures],
      todaySessionsCount: currentState.todaySessionsCount + 1,
      liveEvents: [
        {
          id: `ev-${Date.now()}`,
          time: timeStr,
          type: "entry",
          description: `Ingreso asistido: ${cleanPlate} (${data.vehicleType}) por ${data.gateName} → Bahía ${targetSpot.floor} ${targetSpot.id}`,
          badgeTone: "green",
        },
        ...currentState.liveEvents,
      ],
    };
    emitChange();

    setTimeout(() => {
      const restoreGates = [...currentState.gates];
      const gIdx = restoreGates.findIndex((g) => g.name === data.gateName);
      if (gIdx !== -1 && restoreGates[gIdx].state === "Abierta (Manual)") {
        restoreGates[gIdx] = { ...restoreGates[gIdx], state: "Cerrada" };
        currentState = { ...currentState, gates: restoreGates };
        emitChange();
      }
    }, 6000);

    return newSession;
  },

  // Flujo O5: Liquidación manual en ventanilla y cobro POS
  processPosPayment(data: {
    plate: string;
    paymentMethod: string;
    discountName?: string;
    discountPercent?: number;
    receivedCash?: number;
  }) {
    const cleanPlate = data.plate.toUpperCase().trim();
    const timeStr = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

    const sessionIndex = currentState.parkedVehicles.findIndex(
      (v) =>
        v.plate.toUpperCase().replace(/\s/g, "") === cleanPlate.replace(/\s/g, "") &&
        v.status === "active"
    );

    if (sessionIndex === -1) {
      return { success: false, message: "No se encontró vehículo activo con esa placa." };
    }

    const session = currentState.parkedVehicles[sessionIndex];
    const elapsedMinutes = Math.max(
      1,
      Math.round((Date.now() - session.entryTimestamp) / (60 * 1000))
    );

    let rate = currentState.tariffs.carRate;
    let cap = currentState.tariffs.carCap;
    if (session.vehicleType === "motorcycle") {
      rate = currentState.tariffs.motoRate;
      cap = currentState.tariffs.motoCap;
    } else if (session.vehicleType === "ev") {
      rate = currentState.tariffs.evRate;
      cap = currentState.tariffs.evCap;
    }

    const subtotal = Math.min(elapsedMinutes * rate, cap);
    const discount = data.discountPercent
      ? Math.round(subtotal * (data.discountPercent / 100))
      : 0;
    const finalTotal = Math.max(0, subtotal - discount);
    const change =
      data.receivedCash && data.receivedCash > finalTotal ? data.receivedCash - finalTotal : 0;

    const qrCode = `QR-PARKIA-${session.id}-EXIT`;

    const updatedParked = [...currentState.parkedVehicles];
    updatedParked[sessionIndex] = {
      ...session,
      status: "paid",
      paidAt: timeStr,
      paidAmount: finalTotal,
      paymentMethod: data.paymentMethod,
      gracePeriodExpiresAt: Date.now() + 15 * 60 * 1000,
    };

    const newHistoryItem: ParkingHistoryItem = {
      id: session.id,
      date: "Hoy, " + new Date().toLocaleDateString("es-CO", { day: "numeric", month: "short" }),
      plate: session.plate,
      duration: `${Math.floor(elapsedMinutes / 60)} h ${elapsedMinutes % 60} min`,
      durationMinutes: elapsedMinutes,
      status: "paid",
      total: finalTotal,
      method: `${data.paymentMethod} (Ventanilla)`,
      qrCode,
    };

    currentState = {
      ...currentState,
      parkedVehicles: updatedParked,
      history: [newHistoryItem, ...currentState.history],
      todayRevenue: currentState.todayRevenue + finalTotal,
      liveEvents: [
        {
          id: `ev-${Date.now()}`,
          time: timeStr,
          type: "payment",
          description: `Cobro en ventanilla: $${new Intl.NumberFormat("es-CO").format(finalTotal)} (${session.plate}) · ${data.paymentMethod}${data.discountName ? ` [Desc: ${data.discountName}]` : ""}`,
          badgeTone: "paid",
        },
        ...currentState.liveEvents,
      ],
    };
    emitChange();

    return {
      success: true,
      finalTotal,
      subtotal,
      discount,
      change,
      ticketCode: session.ticketCode,
      qrCode,
      elapsedMinutes,
      graceMinutes: 15,
    };
  },

  // Flujo O6: Control y despacho de salida vehicular
  processExitValidation(data: { plate: string; gateName: string }) {
    const cleanPlate = data.plate.toUpperCase().trim();
    const timeStr = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

    const sessionIndex = currentState.parkedVehicles.findIndex(
      (v) =>
        v.plate.toUpperCase().replace(/\s/g, "") === cleanPlate.replace(/\s/g, "") &&
        v.status !== "completed"
    );

    if (sessionIndex === -1) {
      return {
        success: false,
        reason: "not_found",
        message: "Placa no encontrada en los registros de patio.",
      };
    }

    const session = currentState.parkedVehicles[sessionIndex];

    if (session.status === "active") {
      return {
        success: false,
        reason: "unpaid",
        message: `El vehículo ${session.plate} tiene cobro pendiente. Liquidar en ventanilla o por QR.`,
      };
    }

    // Si está pagada, verificar tiempo de gracia (15 min)
    const now = Date.now();
    const expiresAt = session.gracePeriodExpiresAt || now + 15 * 60 * 1000;
    if (now > expiresAt) {
      const extraMinutes = Math.round((now - expiresAt) / (60 * 1000));
      const extraFee = extraMinutes * currentState.tariffs.carRate;
      return {
        success: false,
        reason: "grace_expired",
        extraMinutes,
        extraFee,
        message: `Tiempo de gracia de 15 min superado (+${extraMinutes} min). Saldo adicional a pagar: $${new Intl.NumberFormat("es-CO").format(extraFee)}.`,
      };
    }

    // Salida autorizada
    const updatedParked = [...currentState.parkedVehicles];
    updatedParked[sessionIndex] = {
      ...session,
      status: "completed",
    };

    // Liberar bahía en spots
    const updatedSpots = currentState.spots.map((s) =>
      s.id === session.spotCode && s.floor === session.floor
        ? { ...s, state: "free" as const }
        : s
    );

    // Abrir talanquera de salida por 6s
    const gateIndex = currentState.gates.findIndex((g) => g.name === data.gateName);
    const updatedGates = [...currentState.gates];
    if (gateIndex !== -1) {
      updatedGates[gateIndex] = {
        ...updatedGates[gateIndex],
        state: "Abierta (Manual)",
        eventsToday: updatedGates[gateIndex].eventsToday + 1,
      };
    }

    currentState = {
      ...currentState,
      parkedVehicles: updatedParked,
      spots: updatedSpots,
      gates: updatedGates,
      liveEvents: [
        {
          id: `ev-${Date.now()}`,
          time: timeStr,
          type: "exit",
          description: `Salida validada y despachada: ${session.plate} por ${data.gateName} · Bahía ${session.spotCode} liberada`,
          badgeTone: "green",
        },
        ...currentState.liveEvents,
      ],
    };
    emitChange();

    setTimeout(() => {
      const restoreGates = [...currentState.gates];
      const gIdx = restoreGates.findIndex((g) => g.name === data.gateName);
      if (gIdx !== -1 && restoreGates[gIdx].state === "Abierta (Manual)") {
        restoreGates[gIdx] = { ...restoreGates[gIdx], state: "Cerrada" };
        currentState = { ...currentState, gates: restoreGates };
        emitChange();
      }
    }, 6000);

    return {
      success: true,
      message: `¡Salida autorizada para ${session.plate}! Talanquera ${data.gateName} abierta.`,
    };
  },

  // Flujo O8: Gestión de Ticket Perdido y Resolución de Discrepancias
  resolveLostTicket(data: {
    plate: string;
    replacementFee: number;
    paymentMethod: string;
    operatorName?: string;
  }) {
    const cleanPlate = data.plate.toUpperCase().trim();
    const timeStr = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    const op = data.operatorName || currentState.currentUser?.name || "Laura Gómez";

    const sessionIndex = currentState.parkedVehicles.findIndex(
      (v) => v.plate.toUpperCase().replace(/\s/g, "") === cleanPlate.replace(/\s/g, "")
    );

    let spotCode = "A-02";
    let floor: "Piso 1" | "Piso 2" | "Piso 3" = "Piso 1";
    let stayCost = 15000;

    if (sessionIndex !== -1) {
      const s = currentState.parkedVehicles[sessionIndex];
      spotCode = s.spotCode;
      floor = s.floor;
      const mins = Math.max(30, Math.round((Date.now() - s.entryTimestamp) / (60 * 1000)));
      stayCost = mins * currentState.tariffs.carRate;
    }

    const grandTotal = stayCost + data.replacementFee;

    // Registrar excepción auditada
    const newException: GateException = {
      id: `#${Math.floor(2845 + Math.random() * 500)}`,
      time: timeStr,
      type: `Ticket extraviado resuelto (${cleanPlate})`,
      accessGate: "Salida Norte",
      operator: op,
      status: "Resuelto",
    };

    // Liberar puesto
    const updatedSpots = currentState.spots.map((s) =>
      s.id === spotCode && s.floor === floor ? { ...s, state: "free" as const } : s
    );

    const updatedParked = currentState.parkedVehicles.map((v) =>
      v.plate.toUpperCase().replace(/\s/g, "") === cleanPlate.replace(/\s/g, "")
        ? { ...v, status: "completed" as const }
        : v
    );

    const newHistory: ParkingHistoryItem = {
      id: `SES-LOST-${Date.now().toString(36).toUpperCase()}`,
      date: "Hoy, " + new Date().toLocaleDateString("es-CO", { day: "numeric", month: "short" }),
      plate: cleanPlate,
      duration: "Calculada LPR + Sanción",
      durationMinutes: 180,
      status: "paid",
      total: grandTotal,
      method: `${data.paymentMethod} (Ventanilla Contingencia)`,
    };

    // Abrir Salida Norte
    const updatedGates = currentState.gates.map((g) =>
      g.name === "Salida Norte"
        ? { ...g, state: "Abierta (Manual)" as const, eventsToday: g.eventsToday + 1 }
        : g
    );

    currentState = {
      ...currentState,
      spots: updatedSpots,
      gates: updatedGates,
      parkedVehicles: updatedParked,
      history: [newHistory, ...currentState.history],
      exceptions: [newException, ...currentState.exceptions],
      todayRevenue: currentState.todayRevenue + grandTotal,
      liveEvents: [
        {
          id: `ev-${Date.now()}`,
          time: timeStr,
          type: "override",
          description: `Ticket extraviado resuelto: ${cleanPlate}. Cobro: $${new Intl.NumberFormat("es-CO").format(grandTotal)} · Pase de salida otorgado`,
          badgeTone: "warning",
        },
        ...currentState.liveEvents,
      ],
    };
    emitChange();

    setTimeout(() => {
      const restoreGates = currentState.gates.map((g) =>
        g.name === "Salida Norte" && g.state === "Abierta (Manual)"
          ? { ...g, state: "Cerrada" as const }
          : g
      );
      currentState = { ...currentState, gates: restoreGates };
      emitChange();
    }, 6000);

    return { success: true, grandTotal, stayCost, replacementFee: data.replacementFee };
  },

  // Flujo O9: Bloqueo de bahía por mantenimiento o derrame
  toggleSpotMaintenance(spotId: string, floor: "Piso 1" | "Piso 2" | "Piso 3") {
    const timeStr = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    let newState: SpotState = "maintenance";

    const updatedSpots = currentState.spots.map((s) => {
      if (s.id === spotId && s.floor === floor) {
        newState = s.state === "maintenance" ? "free" : "maintenance";
        return { ...s, state: newState };
      }
      return s;
    });

    currentState = {
      ...currentState,
      spots: updatedSpots,
      liveEvents: [
        {
          id: `ev-${Date.now()}`,
          time: timeStr,
          type: "maintenance",
          description: `Bahía ${floor} · ${spotId} ${newState === "maintenance" ? "bloqueada por mantenimiento/derrame" : "desbloqueada y disponible"}`,
          badgeTone: newState === "maintenance" ? "warning" : "green",
        },
        ...currentState.liveEvents,
      ],
    };
    emitChange();
  },

  // Flujo O9: Liberar reserva vencida
  releaseExpiredReservation(spotId: string, floor: "Piso 1" | "Piso 2" | "Piso 3") {
    const timeStr = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

    const updatedSpots = currentState.spots.map((s) => {
      if (s.id === spotId && s.floor === floor && s.state === "reserved") {
        return { ...s, state: "free" as const };
      }
      return s;
    });

    currentState = {
      ...currentState,
      spots: updatedSpots,
      liveEvents: [
        {
          id: `ev-${Date.now()}`,
          time: timeStr,
          type: "maintenance",
          description: `Reserva no reclamada de Bahía ${floor} · ${spotId} liberada por tiempo límite`,
          badgeTone: "green",
        },
        ...currentState.liveEvents,
      ],
    };
    emitChange();
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
