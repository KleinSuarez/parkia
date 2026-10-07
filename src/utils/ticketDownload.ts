/**
 * Utilidad de Generación y Descarga de Tiques Digitales para Parkia
 * Genera comprobantes y pases de salida en formato imprimible y descargable (HTML / PDF)
 */

export interface TicketData {
  id: string;
  plate: string;
  entryTime: string;
  exitTime?: string;
  duration: string;
  total: number;
  method?: string;
  spot?: string;
  branch?: string;
  qrCode?: string;
}

export function generateTicketHtml(data: TicketData): string {
  const currency = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const exitHour =
    data.exitTime ||
    now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  const qr = data.qrCode || `QR-PARKIA-EXIT-${data.plate.replace(/[^A-Z0-9]/g, "")}-${Date.now().toString(36).toUpperCase()}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket de Salida · Parkia (${data.plate})</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .ticket-card {
      background: #ffffff;
      width: 100%;
      max-width: 380px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .ticket-head {
      background: #0f766e;
      color: #ffffff;
      padding: 24px 20px;
      text-align: center;
    }
    .brand-badge {
      width: 44px;
      height: 44px;
      background: #ffffff;
      color: #0f766e;
      border-radius: 10px;
      display: inline-grid;
      place-items: center;
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .ticket-head h1 {
      margin: 0;
      font-size: 20px;
      letter-spacing: -0.5px;
    }
    .ticket-head p {
      margin: 4px 0 0;
      font-size: 12px;
      opacity: 0.9;
    }
    .ticket-body {
      padding: 20px;
    }
    .ticket-status {
      text-align: center;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 6px 12px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .data-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13.5px;
    }
    .data-row span:first-child {
      color: #64748b;
    }
    .data-row span:last-child {
      font-weight: 600;
      color: #0f172a;
    }
    .plate-highlight {
      font-size: 18px !important;
      font-weight: 800 !important;
      color: #0f766e !important;
      letter-spacing: 1px;
    }
    .divider {
      border-top: 1px dashed #cbd5e1;
      margin: 16px 0;
    }
    .total-box {
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
      font-weight: 800;
      color: #0f766e;
      border: 1px solid #e2e8f0;
      margin: 14px 0;
    }
    .qr-container {
      text-align: center;
      margin: 16px 0 8px;
    }
    .qr-visual {
      display: inline-block;
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .qr-code-text {
      display: block;
      margin-top: 6px;
      font-family: monospace;
      font-size: 11px;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .ticket-footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 14px 20px;
      text-align: center;
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.4;
    }
    .print-btn {
      display: block;
      width: 100%;
      background: #0f766e;
      color: #ffffff;
      border: none;
      padding: 12px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      margin-top: 12px;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .ticket-card { box-shadow: none; border: none; max-width: 100%; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="ticket-card">
    <div class="ticket-head">
      <div class="brand-badge">P</div>
      <h1>PARKIA SMART PARKING</h1>
      <p>${data.branch || "Sede Central · Calle 93 Bogotá"}</p>
    </div>

    <div class="ticket-body">
      <div class="ticket-status">✓ COMPROBANTE DE SALIDA VÁLIDO</div>

      <div class="data-row">
        <span>Placa Vehículo:</span>
        <span class="plate-highlight">${data.plate}</span>
      </div>

      <div class="data-row">
        <span>Número de Tique:</span>
        <span>#${data.id}</span>
      </div>

      <div class="data-row">
        <span>Fecha de Liquidación:</span>
        <span>${dateFormatted}</span>
      </div>

      <div class="data-row">
        <span>Hora Ingreso:</span>
        <span>${data.entryTime}</span>
      </div>

      <div class="data-row">
        <span>Hora Salida:</span>
        <span>${exitHour}</span>
      </div>

      <div class="data-row">
        <span>Tiempo Estancia:</span>
        <span>${data.duration}</span>
      </div>

      ${data.spot ? `
      <div class="data-row">
        <span>Bahía Asignada:</span>
        <span>${data.spot}</span>
      </div>` : ""}

      <div class="data-row">
        <span>Medio de Pago:</span>
        <span>${data.method || "Pago Digital en Línea"}</span>
      </div>

      <div class="total-box">
        <span>Total Pagado:</span>
        <span>${currency.format(data.total)}</span>
      </div>

      <div class="qr-container">
        <div class="qr-visual">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="#0f766e">
            <rect x="5" y="5" width="26" height="26" rx="4" fill="#0f766e" />
            <rect x="9" y="9" width="18" height="18" rx="2" fill="#ffffff" />
            <rect x="13" y="13" width="10" height="10" fill="#0f766e" />

            <rect x="69" y="5" width="26" height="26" rx="4" fill="#0f766e" />
            <rect x="73" y="9" width="18" height="18" rx="2" fill="#ffffff" />
            <rect x="77" y="13" width="10" height="10" fill="#0f766e" />

            <rect x="5" y="69" width="26" height="26" rx="4" fill="#0f766e" />
            <rect x="9" y="73" width="18" height="18" rx="2" fill="#ffffff" />
            <rect x="13" y="77" width="10" height="10" fill="#0f766e" />

            <rect x="36" y="8" width="6" height="6" />
            <rect x="46" y="8" width="8" height="6" />
            <rect x="58" y="12" width="6" height="8" />
            <rect x="36" y="20" width="8" height="6" />
            <rect x="48" y="24" width="6" height="8" />
            <rect x="8" y="38" width="6" height="6" />
            <rect x="20" y="44" width="8" height="6" />
            <rect x="36" y="36" width="28" height="28" rx="3" fill="#0f766e" />
            <rect x="42" y="42" width="16" height="16" fill="#ffffff" />
            <rect x="46" y="46" width="8" height="8" fill="#0f766e" />
            <rect x="72" y="38" width="8" height="6" />
            <rect x="84" y="44" width="6" height="8" />
            <rect x="38" y="72" width="6" height="6" />
            <rect x="48" y="76" width="10" height="6" />
            <rect x="68" y="68" width="8" height="8" />
            <rect x="80" y="76" width="12" height="6" />
            <rect x="74" y="86" width="8" height="6" />
          </svg>
          <span class="qr-code-text">${qr}</span>
        </div>
      </div>

      <button class="print-btn" onclick="window.print()">🖨️ Imprimir o Guardar como PDF</button>
    </div>

    <div class="ticket-footer">
      Presenta este código en el lector de la talanquera de salida.<br>
      <strong>Válido por los próximos 15 minutos</strong> tras la liquidación.<br>
      NIT 901.482.109-2 · IVA Régimen Común · Factura Electrónica
    </div>
  </div>
</body>
</html>`;
}

/**
 * Descarga el archivo del tique directamente en el navegador del usuario
 */
export function downloadTicket(data: TicketData): void {
  const htmlContent = generateTicketHtml(data);
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const cleanPlate = data.plate.replace(/[^A-Za-z0-9]/g, "");
  const fileName = `Ticket-Parkia-${cleanPlate}-${data.id}.html`;

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Abre el tique en una ventana emergente y lanza el diálogo de impresión para Guardar como PDF
 */
export function printTicket(data: TicketData): void {
  const htmlContent = generateTicketHtml(data);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
