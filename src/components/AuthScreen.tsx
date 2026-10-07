import React, { useState } from "react";
import { Icon } from "./Icon";
import { parkiaActions } from "../store/parkiaStore";
import { AccessibilityWidget } from "./AccessibilityWidget";

export function AuthScreen() {
  const [role, setRole] = useState<"driver" | "admin">("driver");
  const [subTab, setSubTab] = useState<"login" | "register">("login");
  const [a11yOpen, setA11yOpen] = useState(false);

  // Driver Login
  const [driverEmail, setDriverEmail] = useState("");
  const [driverPassword, setDriverPassword] = useState("");

  // Driver Register
  const [regName, setRegName] = useState("");
  const [regDoc, setRegDoc] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPlate, setRegPlate] = useState("");
  const [regType, setRegType] = useState<"Automóvil" | "Motocicleta" | "Eléctrico">("Automóvil");
  const [regBrand, setRegBrand] = useState("");
  const [regModel, setRegModel] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Operator Login
  const [adminCode, setAdminCode] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [adminShift, setAdminShift] = useState("Turno AM · 06:00 - 14:00");

  const [error, setError] = useState<string | null>(null);

  function handleDriverLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!driverEmail.trim()) {
      setError("Por favor ingresa tu correo electrónico o cédula.");
      return;
    }
    setError(null);
    parkiaActions.login({
      emailOrDoc: driverEmail.trim(),
      role: "driver",
      name: "Carlos Martínez",
    });
  }

  function handleDriverRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPlate.trim()) {
      setError("Por favor completa los campos obligatorios (Nombre, Correo, Placa).");
      return;
    }
    // Formato placa básica colombiana (letras + números)
    const cleanPlate = regPlate.trim().toUpperCase();
    setError(null);
    parkiaActions.registerDriver({
      name: regName.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim() || "+57 300 000 0000",
      documentId: regDoc.trim() || "CC 1.000.000.000",
      plate: cleanPlate,
      vehicleType: regType,
      brand: regBrand.trim() || "Renault",
      model: regModel.trim() || "Duster",
    });
  }

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminCode.trim()) {
      setError("Por favor ingresa tu correo institucional o código de operador.");
      return;
    }
    setError(null);
    parkiaActions.login({
      emailOrDoc: adminCode.trim(),
      role: "admin",
      shift: adminShift,
      name: "Laura Gómez",
    });
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Encabezado de Marca */}
        <div className="auth-brand" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span>P</span>
            <div>
              <strong>Parkia</strong>
              <small>Sistema Digital de Parqueaderos Inteligentes</small>
            </div>
          </div>
          <button
            type="button"
            className="auth-a11y-pill"
            onClick={() => setA11yOpen(true)}
            title="Herramientas de Accesibilidad Universal (Alt + A)"
            aria-label="Abrir herramientas de accesibilidad universal"
          >
            <span aria-hidden="true" style={{ fontSize: 16 }}>♿</span>
          </button>
        </div>

        {/* Selector de Rol Unificado */}
        <div className="auth-role-tabs">
          <button
            type="button"
            className={`auth-role-btn ${role === "driver" ? "active" : ""}`}
            onClick={() => {
              setRole("driver");
              setError(null);
            }}
          >
            <Icon name="car" size={16} /> Portal Conductor
          </button>
          <button
            type="button"
            className={`auth-role-btn ${role === "admin" ? "active" : ""}`}
            onClick={() => {
              setRole("admin");
              setError(null);
            }}
          >
            <Icon name="shield" size={16} /> Operación & Admin
          </button>
        </div>

        {error && (
          <div className="critical-message" style={{ marginBottom: 16 }}>
            <span><Icon name="alert" size={18} /></span>
            <div>
              <strong>Atención</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* ── APARTADO 1: CONDUCTORES ── */}
        {role === "driver" && (
          <>
            <div className="auth-sub-nav">
              <button
                type="button"
                className={subTab === "login" ? "active" : ""}
                onClick={() => {
                  setSubTab("login");
                  setError(null);
                }}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                className={subTab === "register" ? "active" : ""}
                onClick={() => {
                  setSubTab("register");
                  setError(null);
                }}
              >
                Crear Cuenta (Registro)
              </button>
            </div>

            {subTab === "login" ? (
              <form className="auth-form" onSubmit={handleDriverLogin}>
                <label>
                  Correo electrónico o Cédula
                  <input
                    type="text"
                    placeholder="carlos.martinez@email.com o CC 1023..."
                    value={driverEmail}
                    onChange={(e) => setDriverEmail(e.target.value)}
                  />
                </label>
                <label>
                  Contraseña
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={driverPassword}
                    onChange={(e) => setDriverPassword(e.target.value)}
                  />
                </label>
                <button type="submit" className="primary full" style={{ marginTop: 8 }}>
                  Ingresar a Parkia <Icon name="arrow" size={16} />
                </button>

                <div className="demo-quick-access">
                  <p>Acceso Rápido Evaluador / Profesor</p>
                  <button
                    type="button"
                    className="demo-btn"
                    onClick={() => parkiaActions.loginDemo("driver")}
                  >
                    <Icon name="car" size={16} />
                    Entrar como Carlos Martínez (Conductor Demo)
                  </button>
                </div>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleDriverRegister}>
                <div className="form-grid">
                  <label>
                    Nombre completo *
                    <input
                      placeholder="Ej. Ana María Pérez"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Cédula de Ciudadanía (CC)
                    <input
                      placeholder="1.098.482.112"
                      value={regDoc}
                      onChange={(e) => setRegDoc(e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    Teléfono celular
                    <input
                      placeholder="+57 312 456 7890"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                    />
                  </label>
                  <label>
                    Correo electrónico *
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    Placa de tu vehículo *
                    <input
                      placeholder="ABC 123"
                      style={{ textTransform: "uppercase" }}
                      value={regPlate}
                      onChange={(e) => setRegPlate(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Tipo de vehículo
                    <select
                      value={regType}
                      onChange={(e) => setRegType(e.target.value as any)}
                    >
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
                      value={regBrand}
                      onChange={(e) => setRegBrand(e.target.value)}
                    />
                  </label>
                  <label>
                    Línea / Modelo
                    <input
                      placeholder="Ej. Tracker, CX-30"
                      value={regModel}
                      onChange={(e) => setRegModel(e.target.value)}
                    />
                  </label>
                </div>

                <label>
                  Contraseña de acceso *
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                </label>

                <button type="submit" className="primary full" style={{ marginTop: 8 }}>
                  Crear mi cuenta y comenzar <Icon name="arrow" size={16} />
                </button>
              </form>
            )}
          </>
        )}

        {/* ── APARTADO 2: OPERARIOS Y ADMINISTRACIÓN ── */}
        {role === "admin" && (
          <form className="auth-form" onSubmit={handleAdminLogin}>
            <label>
              Correo institucional o Código de Operador
              <input
                type="text"
                placeholder="laura.gomez@parkia.co o OP-8492"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
              />
            </label>

            <div className="form-grid">
              <label>
                PIN de seguridad (4 dígitos)
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                />
              </label>
              <label>
                Turno asignado
                <select
                  value={adminShift}
                  onChange={(e) => setAdminShift(e.target.value)}
                >
                  <option>Turno AM · 06:00 - 14:00</option>
                  <option>Turno PM · 14:00 - 22:00</option>
                  <option>Turno Nocturno · 22:00 - 06:00</option>
                </select>
              </label>
            </div>

            <label>
              Sede operativa asignada
              <select disabled style={{ opacity: 0.8, cursor: "not-allowed" }}>
                <option>Parking Central · Calle 93 (Bogotá)</option>
              </select>
            </label>

            <button type="submit" className="primary full" style={{ marginTop: 8 }}>
              Ingresar a Consola de Control <Icon name="shield" size={16} />
            </button>

            <div className="demo-quick-access">
              <p>Acceso Rápido Evaluador / Profesor</p>
              <button
                type="button"
                className="demo-btn"
                onClick={() => parkiaActions.loginDemo("admin")}
              >
                <Icon name="shield" size={16} />
                Entrar como Laura Gómez (Operadora Demo)
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Modal de Accesibilidad Universal */}
      <AccessibilityWidget
        variant="operator"
        isOpen={a11yOpen}
        onClose={() => setA11yOpen(false)}
        onOpen={() => setA11yOpen(true)}
      />
    </div>
  );
}
