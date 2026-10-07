import React, { useState, useEffect, useRef } from 'react';

export type DaltonismMode = 
  | 'none' 
  | 'protanopia' 
  | 'deuteranopia' 
  | 'tritanopia' 
  | 'monochrome' 
  | 'high-contrast-yellow' 
  | 'inverted';

interface A11ySettings {
  fontScale: number; // 90 to 150 (%)
  filterMode: DaltonismMode;
  dyslexicFont: boolean;
  speechEnabled: boolean;
  speechRate: number; // 0.8 to 1.3
  bigCursor: boolean;
  reducedMotion: boolean;
}

const STORAGE_KEY = 'parkia_a11y_settings';

const DEFAULT_SETTINGS: A11ySettings = {
  fontScale: 100,
  filterMode: 'none',
  dyslexicFont: false,
  speechEnabled: false,
  speechRate: 1.0,
  bigCursor: false,
  reducedMotion: false,
};

export const AccessibilityWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [activeSpeechText, setActiveSpeechText] = useState<string>('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Guardar en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // fallback
    }
  }, [settings]);

  // Aplicar clases y variables en document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    
    // Zoom / Tamaño de fuente
    root.style.setProperty('--a11y-font-scale', `${settings.fontScale / 100}`);

    // Modos de color y daltonismo
    const filterClasses = [
      'filter-protanopia',
      'filter-deuteranopia',
      'filter-tritanopia',
      'filter-monochrome',
      'high-contrast-mode',
      'inverted-contrast-mode',
    ];
    root.classList.remove(...filterClasses);
    if (settings.filterMode === 'high-contrast-yellow') {
      root.classList.add('high-contrast-mode');
    } else if (settings.filterMode === 'inverted') {
      root.classList.add('inverted-contrast-mode');
    } else if (settings.filterMode !== 'none') {
      root.classList.add(`filter-${settings.filterMode}`);
    }

    // Tipografía dislexia
    root.classList.toggle('a11y-dyslexic', settings.dyslexicFont);

    // Cursor grande
    root.classList.toggle('a11y-big-cursor', settings.bigCursor);

    // Reducción de movimiento
    root.classList.toggle('a11y-reduced-motion', settings.reducedMotion);
  }, [settings]);

  // Atajo de teclado global: Alt + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key.toLowerCase() === 'a' || e.code === 'KeyA')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Asistente Lector de Pantalla (Web Speech API)
  useEffect(() => {
    if (!settings.speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      window.speechSynthesis?.cancel();
      return;
    }

    const speak = (text: string) => {
      if (!text || text.trim() === '') return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = 'es-ES';
      utterance.rate = settings.speechRate;
      utterance.onstart = () => setActiveSpeechText(text.trim());
      utterance.onend = () => setActiveSpeechText('');
      window.speechSynthesis.speak(utterance);
    };

    const handleFocusOrHover = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignorar controles dentro del propio widget para no saturar al usuario
      if (panelRef.current && panelRef.current.contains(target)) return;

      let speech = '';
      const ariaLabel = target.getAttribute('aria-label');
      const title = target.getAttribute('title');
      const alt = target.getAttribute('alt');
      const role = target.getAttribute('role') || target.tagName.toLowerCase();

      if (ariaLabel) {
        speech = ariaLabel;
      } else if (alt) {
        speech = `Imagen: ${alt}`;
      } else if (title) {
        speech = title;
      } else if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        const text = target.innerText?.trim();
        speech = `${role === 'a' ? 'Enlace' : 'Botón'}: ${text || 'sin etiqueta'}`;
      } else if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        const placeholder = target.getAttribute('placeholder') || '';
        const value = (target as HTMLInputElement).value || '';
        speech = `Campo de entrada ${placeholder}. Valor actual: ${value || 'vacío'}`;
      }

      if (speech && speech !== activeSpeechText) {
        speak(speech);
      }
    };

    document.addEventListener('focusin', handleFocusOrHover);
    return () => {
      document.removeEventListener('focusin', handleFocusOrHover);
      window.speechSynthesis?.cancel();
    };
  }, [settings.speechEnabled, settings.speechRate, activeSpeechText]);

  // Síntesis de voz: Leer resumen de la página actual
  const handleReadCurrentPage = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Tu navegador no soporta síntesis de voz Web Speech API.');
      return;
    }

    window.speechSynthesis.cancel();
    const mainHeading = document.querySelector('h1, h2')?.textContent?.trim() || 'Panel de Parkia';
    const activeRouteText = document.querySelector('.nav-btn.active, .site-select span')?.textContent?.trim() || 'Módulo activo';
    const summary = `Estás en la pantalla ${mainHeading}. Sede o sección activa: ${activeRouteText}. Presiona Tabulador para recorrer los elementos interactivos o presiona Alt más A para abrir o cerrar las herramientas de accesibilidad.`;

    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.lang = 'es-ES';
    utterance.rate = settings.speechRate;
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setActiveSpeechText('');
    }
  };

  const resetAllSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <>
      {/* ── Filtros SVG Nativos para Daltonismo (No consumen red, procesamiento nativo GPU) ── */}
      <svg id="a11y-svg-filters" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          {/* Protanopía (Déficit de Rojo) */}
          <filter id="protanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.567, 0.433, 0,     0, 0
                      0.558, 0.442, 0,     0, 0
                      0,     0.242, 0.758, 0, 0
                      0,     0,     0,     1, 0"
            />
          </filter>
          {/* Deuteranopía (Déficit de Verde) */}
          <filter id="deuteranopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.625, 0.375, 0,   0, 0
                      0.7,   0.3,   0,   0, 0
                      0,     0.3,   0.7, 0, 0
                      0,     0,     0,   1, 0"
            />
          </filter>
          {/* Tritanopía (Déficit de Azul) */}
          <filter id="tritanopia-filter">
            <feColorMatrix
              type="matrix"
              values="0.95, 0.05,  0,     0, 0
                      0,    0.433, 0.567, 0, 0
                      0,    0.475, 0.525, 0, 0
                      0,    0,     0,     1, 0"
            />
          </filter>
          {/* Monocromático / Escala de Grises */}
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

      {/* ── Región Viva para anuncios del Asistente de Voz ── */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        id="a11y-live-announcer"
      >
        {activeSpeechText}
      </div>

      {/* ── Botón Disparador Flotante de Accesibilidad Universal ── */}
      <button
        ref={triggerRef}
        type="button"
        id="a11y-floating-trigger"
        className="a11y-floating-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="accessibility-panel"
        aria-label="Abrir panel de herramientas de accesibilidad universal (Atajo: Alt + A)"
        title="Herramientas de Accesibilidad (Alt + A)"
      >
        <span className="a11y-trigger-icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {/* Símbolo universal de accesibilidad (W3C A11y / Persona con brazos abiertos) */}
            <circle cx="12" cy="4.5" r="2.2" />
            <path d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1v9a1.5 1.5 0 0 1-3 0v-5h-4v5a1.5 1.5 0 0 1-3 0v-9H6a2 2 0 0 1-2-2V9z" />
          </svg>
        </span>
        <span className="a11y-trigger-badge" aria-hidden="true">Alt+A</span>
      </button>

      {/* ── Panel Flotante Desplegable de Accesibilidad ── */}
      {isOpen && (
        <div
          ref={panelRef}
          id="accessibility-panel"
          className="a11y-panel-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="a11y-panel-title"
        >
          {/* Cabecera del Panel */}
          <div className="a11y-panel-header">
            <div className="a11y-header-title">
              <span className="a11y-header-icon" aria-hidden="true">♿</span>
              <div>
                <h2 id="a11y-panel-title">Accesibilidad Universal</h2>
                <p>Ajustes de visualización, color y asistencia auditiva</p>
              </div>
            </div>
            <button
              type="button"
              className="a11y-close-btn"
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Cerrar panel de accesibilidad (Tecla Escape)"
              title="Cerrar (Escape)"
            >
              ✕
            </button>
          </div>

          <div className="a11y-panel-body">
            {/* Módulo 1: Tamaño de Texto / Zoom */}
            <section className="a11y-section" aria-labelledby="a11y-sec-zoom">
              <h3 id="a11y-sec-zoom" className="a11y-section-title">
                🔍 Tamaño de Texto y Zoom ({settings.fontScale}%)
              </h3>
              <div className="a11y-zoom-controls">
                <button
                  type="button"
                  className="a11y-btn-action"
                  onClick={() => setSettings((s) => ({ ...s, fontScale: Math.max(90, s.fontScale - 10) }))}
                  aria-label="Reducir tamaño del texto 10 por ciento"
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
                  aria-label="Aumentar tamaño del texto 10 por ciento"
                  disabled={settings.fontScale >= 150}
                >
                  <span aria-hidden="true">A+</span> Aumentar
                </button>
              </div>
            </section>

            {/* Módulo 2: Daltonismo y Modos de Color */}
            <section className="a11y-section" aria-labelledby="a11y-sec-color">
              <h3 id="a11y-sec-color" className="a11y-section-title">
                🎨 Modos de Daltonismo y Contraste
              </h3>
              <div className="a11y-grid-options" role="radiogroup" aria-labelledby="a11y-sec-color">
                {[
                  { id: 'none', label: 'Estándar', desc: 'Color natural' },
                  { id: 'protanopia', label: 'Protanopía', desc: 'Déficit rojo' },
                  { id: 'deuteranopia', label: 'Deuteranopía', desc: 'Déficit verde' },
                  { id: 'tritanopia', label: 'Tritanopía', desc: 'Déficit azul' },
                  { id: 'monochrome', label: 'Monocromo', desc: 'Escala de grises' },
                  { id: 'high-contrast-yellow', label: 'Alto Contraste', desc: 'Negro y Amarillo AAA' },
                  { id: 'inverted', label: 'Invertido', desc: 'Contraste oscuro inverso' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={settings.filterMode === item.id}
                    className={`a11y-chip-btn ${settings.filterMode === item.id ? 'active' : ''}`}
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
                <h3 id="a11y-sec-speech" className="a11y-section-title">
                  🔊 Lector de Voz Asistido (TTS)
                </h3>
                <label className="a11y-toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.speechEnabled}
                    onChange={(e) => setSettings((s) => ({ ...s, speechEnabled: e.target.checked }))}
                    aria-label="Activar o desactivar síntesis de voz en español para elementos enfocados"
                  />
                  <span className="slider round" aria-hidden="true"></span>
                </label>
              </div>

              <p className="a11y-desc-note">
                Al activarse, la síntesis de voz leerá automáticamente los botones, campos y acciones conforme navegues con el teclado o el ratón.
              </p>

              <div className="a11y-speech-actions">
                <button
                  type="button"
                  className="a11y-btn-speech-read"
                  onClick={handleReadCurrentPage}
                  aria-label="Leer en voz alta resumen y acciones de la pantalla actual"
                >
                  🗣️ Leer Pantalla Actual
                </button>
                <button
                  type="button"
                  className="a11y-btn-speech-stop"
                  onClick={handleStopSpeaking}
                  aria-label="Detener reproducción de voz inmediatamente"
                >
                  ⏹️ Detener Voz
                </button>
              </div>
            </section>

            {/* Módulo 4: Tipografía Dislexia y Asistencias Visuales */}
            <section className="a11y-section" aria-labelledby="a11y-sec-helpers">
              <h3 id="a11y-sec-helpers" className="a11y-section-title">
                📖 Legibilidad y Ergonomía Visual
              </h3>
              <div className="a11y-toggles-list">
                <label className="a11y-checkbox-row">
                  <input
                    type="checkbox"
                    checked={settings.dyslexicFont}
                    onChange={(e) => setSettings((s) => ({ ...s, dyslexicFont: e.target.checked }))}
                  />
                  <div>
                    <strong>Fuente y espaciado para Dislexia</strong>
                    <p>Aumenta interletrado y altura de línea para evitar saltos involuntarios de texto.</p>
                  </div>
                </label>

                <label className="a11y-checkbox-row">
                  <input
                    type="checkbox"
                    checked={settings.bigCursor}
                    onChange={(e) => setSettings((s) => ({ ...s, bigCursor: e.target.checked }))}
                  />
                  <div>
                    <strong>Cursor Gigante de Alto Contraste</strong>
                    <p>Aumenta el tamaño del puntero del ratón facilitando su localización.</p>
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
                    <p>Detiene animaciones continuas previniendo fatiga visual o mareos vestibulares.</p>
                  </div>
                </label>
              </div>
            </section>
          </div>

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
              Tip: Presiona <kbd>Alt</kbd> + <kbd>A</kbd> en cualquier momento
            </span>
          </div>
        </div>
      )}
    </>
  );
};
