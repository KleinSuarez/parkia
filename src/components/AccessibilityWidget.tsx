import React, { useState, useEffect, useRef } from "react";
import { Icon } from "./Icon";

export type DaltonismMode =
  | "none"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "monochrome"
  | "high-contrast-yellow"
  | "inverted";

export interface A11ySettings {
  fontScale: number; // 90 to 150 (%)
  filterMode: DaltonismMode;
  dyslexicFont: boolean;
  speechEnabled: boolean;
  speechRate: number; // 0.8 to 1.3
  bigCursor: boolean;
  reducedMotion: boolean;
}

const STORAGE_KEY = "parkia_a11y_settings";
const EVENT_KEY = "parkia_a11y_sync";

export const DEFAULT_SETTINGS: A11ySettings = {
  fontScale: 100,
  filterMode: "none",
  dyslexicFont: false,
  speechEnabled: false,
  speechRate: 1.0,
  bigCursor: false,
  reducedMotion: false,
};

/**
 * Hook reactivo para sincronizar las preferencias de accesibilidad universal
 * en tiempo real entre la vista del Conductor Móvil, la Consola del Operario y Auth.
 */
export function useA11yState() {
  const [settings, setSettingsState] = useState<A11ySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [activeSpeechText, setActiveSpeechText] = useState<string>("");

  const setSettings = (updater: A11ySettings | ((prev: A11ySettings) => A11ySettings)) => {
    setSettingsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: next }));
      } catch {
        // fallback
      }
      return next;
    });
  };

  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<A11ySettings>;
      if (custom.detail) {
        setSettingsState(custom.detail);
      }
    };
    window.addEventListener(EVENT_KEY, handleSync);
    return () => window.removeEventListener(EVENT_KEY, handleSync);
  }, []);

  // Aplicar variables y clases CSS en document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--a11y-font-scale", `${settings.fontScale / 100}`);

    const filterClasses = [
      "filter-protanopia",
      "filter-deuteranopia",
      "filter-tritanopia",
      "filter-monochrome",
      "high-contrast-mode",
      "inverted-contrast-mode",
    ];
    root.classList.remove(...filterClasses);
    if (settings.filterMode === "high-contrast-yellow") {
      root.classList.add("high-contrast-mode");
    } else if (settings.filterMode === "inverted") {
      root.classList.add("inverted-contrast-mode");
    } else if (settings.filterMode !== "none") {
      root.classList.add(`filter-${settings.filterMode}`);
    }

    root.classList.toggle("a11y-dyslexic", settings.dyslexicFont);
    root.classList.toggle("a11y-big-cursor", settings.bigCursor);
    root.classList.toggle("a11y-reduced-motion", settings.reducedMotion);
  }, [settings]);

  // Asistente Lector de Pantalla Universal (Web Speech API)
  useEffect(() => {
    if (!settings.speechEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      window.speechSynthesis?.cancel();
      return;
    }

    const speak = (text: string) => {
      if (!text || text.trim() === "") return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = "es-CO";
      utterance.rate = settings.speechRate;

      // Buscar voz en español si el navegador las tiene cargadas
      const voices = window.speechSynthesis.getVoices?.() || [];
      const spanishVoice = voices.find((v) => v.lang.startsWith("es"));
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      utterance.onstart = () => setActiveSpeechText(text.trim());
      utterance.onend = () => setActiveSpeechText("");
      window.speechSynthesis.speak(utterance);
    };

    // Extractor universal inteligente de texto legible
    const extractReadableText = (target: HTMLElement): string => {
      if (!target) return "";

      // 1. Si el elemento o algún ancestro interactivo tiene aria-label explícito
      const labeled = target.closest<HTMLElement>("[aria-label]");
      if (labeled && labeled.getAttribute("aria-label")?.trim()) {
        return labeled.getAttribute("aria-label")!.trim();
      }

      // 2. Si es un botón, enlace o control interactivo
      const interactive = target.closest<HTMLElement>("button, a, [role='button'], [role='tab'], [role='link']");
      if (interactive) {
        const isLink = interactive.tagName === "A" || interactive.getAttribute("role") === "link";
        const text = interactive.innerText?.trim() || interactive.getAttribute("title") || "";
        return `${isLink ? "Enlace" : "Botón"}: ${text || "sin etiqueta"}`;
      }

      // 3. Si es un campo de formulario (input, select, textarea)
      const input = target.closest<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea");
      if (input) {
        let labelName = "";
        if (input.id) {
          const lTag = document.querySelector(`label[for="${input.id}"]`);
          if (lTag) labelName = (lTag as HTMLElement).innerText?.trim() || "";
        }
        if (!labelName) {
          labelName = input.closest("label")?.innerText?.trim() || "";
        }
        const placeholder = input.getAttribute("placeholder") || "";
        const name = labelName || placeholder || input.name || "de texto";
        const val = input.value?.trim() || "vacío";
        return `Campo ${name}. Valor actual: ${val}`;
      }

      // 4. Si es un encabezado h1-h6
      const heading = target.closest<HTMLElement>("h1, h2, h3, h4, h5, h6");
      if (heading) {
        return `Título: ${heading.innerText?.trim()}`;
      }

      // 5. Si es una tarjeta, estadística, insignia o badge
      const badge = target.closest<HTMLElement>(".badge, .pill, [role='status'], .status-pill, .stat, .metric");
      if (badge) {
        return `Estado: ${badge.innerText?.trim()}`;
      }

      // 6. Si es una imagen o icono con alt o título
      if (target.tagName === "IMG" || target.tagName === "svg" || target.closest("svg")) {
        const img = (target.tagName === "IMG" ? target : target.closest("svg")) as HTMLElement;
        const alt = img?.getAttribute("alt") || img?.getAttribute("title") || "";
        if (alt) return `Icono: ${alt}`;
      }

      // 7. Texto directo de elementos semánticos (p, span, strong, li, td, th, div)
      const directText = target.innerText?.trim() || target.textContent?.trim() || "";
      if (directText) {
        if (directText.length <= 250) {
          return directText;
        } else {
          // Extraer la primera frase de bloques extensos
          const firstSentence = directText.split(/[.\n]/)[0]?.trim();
          if (firstSentence && firstSentence.length > 5) return firstSentence;
        }
      }

      return "";
    };

    let hoverTimer: any = null;

    const handleSpeechEvent = (e: Event, isDirectClick = false) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignorar interacción dentro del panel de configuración de accesibilidad para no saturar
      if (
        target.closest(".a11y-mobile-sheet") ||
        target.closest(".a11y-operator-modal") ||
        target.closest(".a11y-panel-modal")
      ) {
        return;
      }

      const text = extractReadableText(target);
      if (!text) return;

      if (isDirectClick) {
        speak(text);
      } else {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          speak(text);
        }, 120);
      }
    };

    const onFocusIn = (e: FocusEvent) => handleSpeechEvent(e, false);
    const onClick = (e: MouseEvent) => handleSpeechEvent(e, true);
    const onMouseOver = (e: MouseEvent) => handleSpeechEvent(e, false);

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("mouseover", onMouseOver);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("mouseover", onMouseOver);
      clearTimeout(hoverTimer);
      window.speechSynthesis?.cancel();
    };
  }, [settings.speechEnabled, settings.speechRate]);

  const readCurrentPage = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Tu navegador no soporta síntesis de voz Web Speech API.");
      return;
    }
    window.speechSynthesis.cancel();
    const mainHeading = document.querySelector("h1, h2, h3")?.textContent?.trim() || "Panel de Parkia";
    const activeRouteText =
      document.querySelector(".mobile-nav-btn.active span, .nav-btn.active, .site-select span")?.textContent?.trim() ||
      "Módulo activo";
    const summary = `Estás en la pantalla ${mainHeading}. Sección activa: ${activeRouteText}. Presiona Tabulador para recorrer los controles interactivos o presiona Alt más A para abrir y cerrar las opciones de accesibilidad.`;
    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.lang = "es-ES";
    utterance.rate = settings.speechRate;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setActiveSpeechText("");
    }
  };

  const resetAllSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    stopSpeaking();
  };

  return {
    settings,
    setSettings,
    activeSpeechText,
    readCurrentPage,
    stopSpeaking,
    resetAllSettings,
  };
}

/**
 * Componente interno con los módulos de configuración accesibles
 */
function A11yControls({
  settings,
  setSettings,
  readCurrentPage,
  stopSpeaking,
  resetAllSettings,
}: {
  settings: A11ySettings;
  setSettings: (updater: A11ySettings | ((prev: A11ySettings) => A11ySettings)) => void;
  readCurrentPage: () => void;
  stopSpeaking: () => void;
  resetAllSettings: () => void;
}) {
  return (
    <>
      {/* Módulo 1: Tamaño de Texto / Zoom */}
      <section className="a11y-section" aria-labelledby="a11y-sec-zoom">
        <h4 id="a11y-sec-zoom" className="a11y-section-title">
          🔍 Tamaño de Texto y Zoom ({settings.fontScale}%)
        </h4>
        <div className="a11y-zoom-controls">
          <button
            type="button"
            className="a11y-btn-action"
            onClick={() => setSettings((s) => ({ ...s, fontScale: Math.max(90, s.fontScale - 10) }))}
            aria-label="Reducir tamaño del texto al 90 por ciento"
            disabled={settings.fontScale <= 90}
          >
            <span aria-hidden="true">A-</span> Reducir
          </button>
          <button
            type="button"
            className="a11y-btn-action"
            onClick={() => setSettings((s) => ({ ...s, fontScale: 100 }))}
            aria-label="Restablecer tamaño de texto al 100 por ciento normal"
          >
            100% Normal
          </button>
          <button
            type="button"
            className="a11y-btn-action"
            onClick={() => setSettings((s) => ({ ...s, fontScale: Math.min(150, s.fontScale + 10) }))}
            aria-label="Aumentar tamaño del texto hasta 150 por ciento"
            disabled={settings.fontScale >= 150}
          >
            <span aria-hidden="true">A+</span> Aumentar
          </button>
        </div>
      </section>

      {/* Módulo 2: Daltonismo y Modos de Color */}
      <section className="a11y-section" aria-labelledby="a11y-sec-color">
        <h4 id="a11y-sec-color" className="a11y-section-title">
          🎨 Modos de Daltonismo y Contraste
        </h4>
        <div className="a11y-grid-options" role="radiogroup" aria-labelledby="a11y-sec-color">
          {[
            { id: "none", label: "Estándar", desc: "Color natural" },
            { id: "protanopia", label: "Protanopía", desc: "Déficit rojo" },
            { id: "deuteranopia", label: "Deuteranopía", desc: "Déficit verde" },
            { id: "tritanopia", label: "Tritanopía", desc: "Déficit azul" },
            { id: "monochrome", label: "Monocromo", desc: "Escala de grises" },
            { id: "high-contrast-yellow", label: "Alto Contraste", desc: "Negro y Amarillo AAA" },
            { id: "inverted", label: "Invertido", desc: "Contraste inverso" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={settings.filterMode === item.id}
              className={`a11y-chip-btn ${settings.filterMode === item.id ? "active" : ""}`}
              onClick={() => setSettings((s) => ({ ...s, filterMode: item.id as DaltonismMode }))}
              aria-label={`Filtro de visualización: ${item.label}. ${item.desc}`}
            >
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Módulo 3: Lector de Pantalla Asistido / Síntesis de Voz */}
      <section className="a11y-section" aria-labelledby="a11y-sec-speech">
        <div className="a11y-section-header-row">
          <h4 id="a11y-sec-speech" className="a11y-section-title" style={{ margin: 0 }}>
            🔊 Lector de Voz Asistido (TTS)
          </h4>
          <label className="a11y-toggle-switch">
            <input
              type="checkbox"
              checked={settings.speechEnabled}
              onChange={(e) => {
                const nextVal = e.target.checked;
                setSettings((s) => ({ ...s, speechEnabled: nextVal }));
                if (nextVal && typeof window !== "undefined" && "speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                  const u = new SpeechSynthesisUtterance(
                    "Lector de voz activado. Ahora puedes hacer clic o tocar cualquier botón, tarjeta o texto para escucharlo."
                  );
                  u.lang = "es-CO";
                  u.rate = settings.speechRate || 1.0;
                  window.speechSynthesis.speak(u);
                }
              }}
              aria-label="Activar síntesis de voz en español para todos los elementos"
            />
            <span className="slider round" aria-hidden="true" />
          </label>
        </div>

        <p className="a11y-desc-note">
          Lee en voz alta cualquier botón, tarjeta, estadística o texto al hacer clic, enfocar o pasar el cursor sobre él.
        </p>

        <div className="a11y-speech-actions">
          <button
            type="button"
            className="a11y-btn-speech-read"
            onClick={readCurrentPage}
            aria-label="Leer en voz alta resumen y acciones de la pantalla actual"
          >
            🗣️ Leer Pantalla
          </button>
          <button
            type="button"
            className="a11y-btn-speech-stop"
            onClick={stopSpeaking}
            aria-label="Detener reproducción de voz inmediatamente"
          >
            ⏹️ Detener
          </button>
        </div>
      </section>

      {/* Módulo 4: Tipografía Dislexia y Asistencias Visuales */}
      <section className="a11y-section" aria-labelledby="a11y-sec-helpers">
        <h4 id="a11y-sec-helpers" className="a11y-section-title">
          📖 Legibilidad y Ergonomía Visual
        </h4>
        <div className="a11y-toggles-list">
          <label className="a11y-checkbox-row">
            <input
              type="checkbox"
              checked={settings.dyslexicFont}
              onChange={(e) => setSettings((s) => ({ ...s, dyslexicFont: e.target.checked }))}
            />
            <div>
              <strong>Tipografía para Dislexia</strong>
              <p>Mayor espaciado y caracteres diferenciados para evitar confusiones.</p>
            </div>
          </label>

          <label className="a11y-checkbox-row">
            <input
              type="checkbox"
              checked={settings.bigCursor}
              onChange={(e) => setSettings((s) => ({ ...s, bigCursor: e.target.checked }))}
            />
            <div>
              <strong>Cursor Grande de Alto Contraste</strong>
              <p>Puntero ampliado para facilitar su seguimiento en pantalla.</p>
            </div>
          </label>

          <label className="a11y-checkbox-row">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => setSettings((s) => ({ ...s, reducedMotion: e.target.checked }))}
            />
            <div>
              <strong>Reducción de Movimiento</strong>
              <p>Desactiva animaciones para evitar fatiga visual o mareos vestibulares.</p>
            </div>
          </label>
        </div>
      </section>

      {/* Pie del Panel: Restablecer y Atajos */}
      <div className="a11y-panel-footer">
        <button
          type="button"
          className="a11y-btn-reset"
          onClick={resetAllSettings}
          aria-label="Restablecer todas las opciones de accesibilidad a los valores estándar de fábrica"
        >
          ↺ Restablecer valores estándar
        </button>
        <span className="a11y-shortcut-hint" aria-hidden="true">
          Tip: <kbd>Alt</kbd> + <kbd>A</kbd>
        </span>
      </div>
    </>
  );
}

export interface AccessibilityWidgetProps {
  /**
   * "mobile": Integrado dentro de la vista de teléfono (.phone-device).
   *           Renderiza el botón flotante dentro de la pantalla y el Bottom Sheet.
   * "operator": Integrado en la consola de mando de escritorio (.app-shell.admin).
   *             Renderiza el modal accesible de escritorio.
   * "headless": Solo monta los filtros SVG y listeners globales.
   */
  variant?: "mobile" | "operator" | "headless";
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  /**
   * Si es true, oculta el botón disparador flotante interno (útil cuando ya hay
   * un botón en el header o barra lateral).
   */
  hideTrigger?: boolean;
}

export const AccessibilityWidget: React.FC<AccessibilityWidgetProps> = ({
  variant = "operator",
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onOpen: controlledOnOpen,
  hideTrigger = false,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const close = () => {
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setInternalIsOpen(false);
    }
  };

  const open = () => {
    if (isControlled) {
      controlledOnOpen?.();
    } else {
      setInternalIsOpen(true);
    }
  };

  const toggle = () => {
    if (isOpen) close();
    else open();
  };

  const {
    settings,
    setSettings,
    activeSpeechText,
    readCurrentPage,
    stopSpeaking,
    resetAllSettings,
  } = useA11yState();

  // Atajo de teclado global: Alt + A y Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key.toLowerCase() === "a" || e.code === "KeyA")) {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* ── Filtros SVG Nativos para Daltonismo (GPU puro, sin consumo de red) ── */}
      <svg
        id="a11y-svg-filters"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        aria-hidden="true"
      >
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.567, 0.433, 0,     0, 0
                      0.558, 0.442, 0,     0, 0
                      0,     0.242, 0.758, 0, 0
                      0,     0,     0,     1, 0"
            />
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.625, 0.375, 0,   0, 0
                      0.7,   0.3,   0,   0, 0
                      0,     0.3,   0.7, 0, 0
                      0,     0,     0,   1, 0"
            />
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.95, 0.05,  0,     0, 0
                      0,    0.433, 0.567, 0, 0
                      0,    0.475, 0.525, 0, 0
                      0,    0,     0,     1, 0"
            />
          </filter>
          <filter id="monochrome-filter">
            <feColorMatrix
              type="matrix"
              values="0.299, 0.587, 0.114, 0, 0
                      0.299, 0.587, 0.114, 0, 0
                      0.299, 0.587, 0.114, 0, 0
                      0,     0,     0,     1, 0"
            />
          </filter>
        </defs>
      </svg>

      {/* ── Región Viva para anuncios del Asistente de Voz (TTS) ── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="a11y-live-announcer"
      >
        {activeSpeechText}
      </div>

      {/* ════ VARIANTE 1: EXPERIENCIA MÓVIL CONDUCTOR (DENTRO DE .phone-device) ════ */}
      {variant === "mobile" && (
        <>
          {/* Botón flotante accesible integrado dentro de la pantalla del teléfono (se oculta al abrir la hoja) */}
          {!hideTrigger && !isOpen && (
            <button
              type="button"
              className="phone-a11y-fab"
              onClick={toggle}
              title="Herramientas de Accesibilidad Universal (Atajo: Alt + A)"
              aria-label="Abrir panel de accesibilidad universal"
              aria-haspopup="dialog"
              aria-expanded={isOpen}
            >
              <span aria-hidden="true" style={{ fontSize: 18 }}>♿</span>
            </button>
          )}

          {/* Bottom Sheet nativo deslizante dentro del marco del teléfono */}
          {isOpen && (
            <div
              className="bottom-sheet-backdrop"
              onClick={close}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-a11y-sheet-title"
            >
              <div
                className="bottom-sheet a11y-mobile-sheet"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sheet-handle-bar" />
                <div className="sheet-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }} aria-hidden="true">♿</span>
                    <div>
                      <h3 id="mobile-a11y-sheet-title" style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                        Accesibilidad Universal
                      </h3>
                      <small style={{ color: "#556764", fontSize: 11 }}>
                        Zoom, daltonismos y voz asistida
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={close}
                    aria-label="Cerrar panel de accesibilidad"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>

                <div className="a11y-sheet-scrollable-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <A11yControls
                    settings={settings}
                    setSettings={setSettings}
                    readCurrentPage={readCurrentPage}
                    stopSpeaking={stopSpeaking}
                    resetAllSettings={resetAllSettings}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════ VARIANTE 2: CONSOLA DE OPERARIO / ESCRITORIO (MODAL DIALOG) ════ */}
      {variant === "operator" && isOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={close}
          role="dialog"
          aria-modal="true"
          aria-labelledby="op-a11y-modal-title"
        >
          <div
            className="modal a11y-operator-modal"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ maxWidth: 620, width: "92vw", maxHeight: "88vh", overflowY: "auto" }}
          >
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }} aria-hidden="true">♿</span>
                <div>
                  <h2 id="op-a11y-modal-title" style={{ margin: 0, fontSize: 18 }}>
                    Accesibilidad Universal (WCAG 2.1 AA)
                  </h2>
                  <small style={{ color: "#64748b", fontSize: 12 }}>
                    Ajustes de visualización, daltonismos y asistencia auditiva
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={close}
                aria-label="Cerrar modal de accesibilidad (Escape)"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="a11y-modal-body" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
              <A11yControls
                settings={settings}
                setSettings={setSettings}
                readCurrentPage={readCurrentPage}
                stopSpeaking={stopSpeaking}
                resetAllSettings={resetAllSettings}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
