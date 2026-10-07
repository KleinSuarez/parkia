import React, { useState } from "react";
import { Icon, Badge } from "./Icon";
import { parkiaActions, ParkingHistoryItem } from "../store/parkiaStore";

export function PaymentModal({
  session,
  onClose,
}: {
  session: ParkingHistoryItem;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const [method, setMethod] = useState<"visa" | "nequi" | "pse" | "cash">("visa");
  const [processing, setProcessing] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(session.qrCode || null);

  function dismiss() {
    setClosing(true);
  }

  function handleAnimationEnd(e: React.AnimationEvent) {
    if (closing && (e.animationName === "pay-backdrop-out" || e.animationName === "dim-out")) {
      onClose();
    }
  }

  function handleProcessPayment() {
    setProcessing(true);
    setTimeout(() => {
      const methodName =
        method === "visa"
          ? "Visa terminada en 2481"
          : method === "nequi"
          ? "Nequi QR"
          : method === "pse"
          ? "PSE Bancolombia"
          : "Efectivo en cajero";

      const res = parkiaActions.paySession(session.id, methodName);
      setProcessing(false);
      setQrCode(res.qrCode);
    }, 1200);
  }

  const fmt = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  return (
    <div
      className={`modal-backdrop pay-backdrop${closing ? " pay-closing" : ""}`}
      onMouseDown={dismiss}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className="modal pay-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="pay-parallax-wrap">
          <div className="pay-layer pay-layer-bg" aria-hidden="true" />
          <div className="pay-layer pay-layer-mid" aria-hidden="true" />
          <div className="pay-layer pay-layer-front" aria-hidden="true" />
        </div>

        <div className="pay-content">
          <div className="modal-head">
            <h2 id="pay-modal-title">{qrCode ? "Comprobante y Ticket de Salida" : "Confirmar liquidación"}</h2>
            <button type="button" className="icon-btn" onClick={dismiss} aria-label="Cerrar ventana de pago y liquidación">
              <Icon name="close" />
            </button>
          </div>

          {!qrCode ? (
            <>
              <div className="payment-summary">
                <div>
                  <span>Total a liquidar</span>
                  <strong>{fmt.format(session.total)}</strong>
                </div>
                <p>
                  Sesión {session.id} · Vehículo {session.plate} · {session.duration}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "14px 0" }}>
                <label className="payment-method">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={method === "visa"}
                    onChange={() => setMethod("visa")}
                  />
                  <span className="card-symbol">
                    <Icon name="card" />
                  </span>
                  <span>
                    <strong>Visa terminada en 2481</strong>
                    <small>Tarjeta predeterminada · Débito automático</small>
                  </span>
                  <Badge tone="green">Principal</Badge>
                </label>

                <label className="payment-method">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={method === "nequi"}
                    onChange={() => setMethod("nequi")}
                  />
                  <span className="card-symbol">
                    <Icon name="user" />
                  </span>
                  <span>
                    <strong>Nequi / Daviplata QR</strong>
                    <small>Pago instantáneo sin contacto</small>
                  </span>
                </label>

                <label className="payment-method">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={method === "pse"}
                    onChange={() => setMethod("pse")}
                  />
                  <span className="card-symbol">
                    <Icon name="shield" />
                  </span>
                  <span>
                    <strong>PSE (Cuentas de Ahorro / Corriente)</strong>
                    <small>Débito bancario en línea</small>
                  </span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={dismiss}
                  disabled={processing}
                  aria-label="Cancelar operación de pago y volver a la pantalla anterior"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleProcessPayment}
                  disabled={processing}
                  aria-label={`Procesar pago de ${fmt.format(session.total)} mediante método seleccionado`}
                >
                  {processing ? (
                    <>
                      <Icon name="clock" size={16} /> Procesando pago seguro...
                    </>
                  ) : (
                    <>
                      Pagar {fmt.format(session.total)} <Icon name="arrow" size={16} />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Ticket con QR de Salida */
            <div className="qr-ticket">
              <Badge tone="green">¡Pago Exitoso!</Badge>
              <h3 style={{ margin: "10px 0 4px", fontSize: 18 }}>Tique Digital de Salida</h3>
              <p style={{ margin: 0, fontSize: 11, color: "#667774" }}>
                Presenta este código en el lector de la talanquera de salida
              </p>

              <div className="qr-box">
                {/* SVG QR Code ilustrativo de alta fidelidad */}
                <svg viewBox="0 0 100 100" fill="#0d766e">
                  {/* Posicionadores de esquinas */}
                  <rect x="5" y="5" width="26" height="26" rx="4" fill="#0d766e" />
                  <rect x="9" y="9" width="18" height="18" rx="2" fill="#ffffff" />
                  <rect x="13" y="13" width="10" height="10" fill="#0d766e" />

                  <rect x="69" y="5" width="26" height="26" rx="4" fill="#0d766e" />
                  <rect x="73" y="9" width="18" height="18" rx="2" fill="#ffffff" />
                  <rect x="77" y="13" width="10" height="10" fill="#0d766e" />

                  <rect x="5" y="69" width="26" height="26" rx="4" fill="#0d766e" />
                  <rect x="9" y="73" width="18" height="18" rx="2" fill="#ffffff" />
                  <rect x="13" y="77" width="10" height="10" fill="#0d766e" />

                  {/* Patrón de datos simulado */}
                  <rect x="36" y="8" width="6" height="6" />
                  <rect x="46" y="8" width="8" height="6" />
                  <rect x="58" y="12" width="6" height="8" />
                  <rect x="36" y="20" width="8" height="6" />
                  <rect x="48" y="24" width="6" height="8" />
                  <rect x="8" y="38" width="6" height="6" />
                  <rect x="20" y="44" width="8" height="6" />
                  <rect x="36" y="36" width="28" height="28" rx="3" fill="#143e3b" />
                  <rect x="42" y="42" width="16" height="16" fill="#ffffff" />
                  <rect x="46" y="46" width="8" height="8" fill="#0d766e" />
                  <rect x="72" y="38" width="8" height="6" />
                  <rect x="84" y="44" width="6" height="8" />
                  <rect x="38" y="72" width="6" height="6" />
                  <rect x="48" y="76" width="10" height="6" />
                  <rect x="68" y="68" width="8" height="8" />
                  <rect x="80" y="76" width="12" height="6" />
                  <rect x="74" y="86" width="8" height="6" />
                </svg>
              </div>

              <div className="qr-meta">
                <span>Código de autorización:</span>
                <strong>{qrCode}</strong>
                <small style={{ display: "block", color: "#8a9a97", marginTop: 4 }}>
                  Válido durante los próximos 15 minutos en cualquier talanquera de salida.
                </small>
              </div>

              <div className="modal-actions" style={{ justifyContent: "center", marginTop: 20 }}>
                <button
                  type="button"
                  className="primary"
                  onClick={dismiss}
                  aria-label="Cerrar tique digital y regresar al panel de parqueadero"
                >
                  Entendido, finalizar <Icon name="check" size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
