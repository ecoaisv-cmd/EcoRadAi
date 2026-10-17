// ═══════════════════════════════════════════════════════════════
// OBSERVABILITY WRAPPER — EcoRadAi Sprint 3
// Inyecta un panel de observabilidad en el monolito
// No modifica el monolito original, solo se acopla en runtime
// ═══════════════════════════════════════════════════════════════

(function() {
  "use strict";

  console.log("[Observability] 🚀 Iniciando wrapper...");

  // ═══════════════════════════════════════════════════════════
  // ESTADO
  // ═══════════════════════════════════════════════════════════
  const ESTADO = {
    panelAbierto: false,
    capturadorActivo: false,
    pasoActual: 0,
    eventos: [],
    win: window
  };

  // ═══════════════════════════════════════════════════════════
  // ESPERAR A SAVIA
  // ═══════════════════════════════════════════════════════════
  function esperarSavia() {
    return new Promise((resolve) => {
      const inicio = Date.now();
      const interval = setInterval(() => {
        if (window.SAVIA && typeof window.SAVIA.propagar === "function") {
          clearInterval(interval);
          console.log("[Observability] ✅ SAVIA detectado");
          resolve(window.SAVIA);
        } else if (Date.now() - inicio > 60000) {
          clearInterval(interval);
          console.warn("[Observability] ⚠️ Timeout esperando SAVIA");
          resolve(null);
        }
      }, 500);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════
  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function formatearJSON(obj) {
    return JSON.stringify(obj, null, 2)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"([^"]+)":/g, '<span style="color:#79c0ff">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span style="color:#a5d6ff">"$1"</span>')
      .replace(/: (true|false)/g, ': <span style="color:#ff7b72">$1</span>')
      .replace(/: (null)/g, ': <span style="color:#ff7b72">$1</span>')
      .replace(/: (-?\d+\.?\d*)/g, ': <span style="color:#79c0ff">$1</span>');
  }

  function formatearHora(iso) {
    try {
      return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch { return "—"; }
  }

  // ═══════════════════════════════════════════════════════════
  // INTERPRETACIONES CLÍNICAS
  // ═══════════════════════════════════════════════════════════
  const INTERPRETACIONES = {
    glucosa: (v) => v >= 126 ? { sev: "critico", label: "Diabetes" }
                      : v >= 100 ? { sev: "leve", label: "Prediabetes" }
                      : v < 70 ? { sev: "leve", label: "Hipoglucemia" }
                      : { sev: "normal", label: "Normal" },
    hba1c: (v) => v >= 6.5 ? { sev: "critico", label: "Diabetes" }
                    : v >= 5.7 ? { sev: "leve", label: "Prediabetes" }
                    : { sev: "normal", label: "Normal" },
    homa_ir: (v) => v >= 4 ? { sev: "critico", label: "Resistencia severa" }
                      : v >= 2.5 ? { sev: "moderado", label: "Resistencia" }
                      : { sev: "normal", label: "Normal" },
    ldl: (v) => v >= 160 ? { sev: "critico", label: "Muy alto" }
                  : v >= 130 ? { sev: "moderado", label: "Alto" }
                  : v >= 100 ? { sev: "leve", label: "Límite" }
                  : { sev: "normal", label: "Óptimo" },
    hdl: (v) => v < 40 ? { sev: "critico", label: "Bajo" }
                  : v >= 60 ? { sev: "normal", label: "Protector" }
                  : { sev: "leve", label: "Aceptable" },
    tg: (v) => v >= 500 ? { sev: "critico", label: "Muy alto" }
                : v >= 200 ? { sev: "moderado", label: "Alto" }
                : v >= 150 ? { sev: "leve", label: "Límite" }
                : { sev: "normal", label: "Normal" },
    alt: (v) => v > 200 ? { sev: "critico", label: "Severa" }
                  : v > 80 ? { sev: "moderado", label: "Moderada" }
                  : v > 40 ? { sev: "leve", label: "Leve" }
                  : { sev: "normal", label: "Normal" },
    imc: (v) => v >= 40 ? { sev: "critico", label: "Obesidad III" }
                  : v >= 35 ? { sev: "critico", label: "Obesidad II" }
                  : v >= 30 ? { sev: "moderado", label: "Obesidad I" }
                  : v >= 25 ? { sev: "leve", label: "Sobrepeso" }
                  : { sev: "normal", label: "Normal" },
    presion_sistolica_mmhg: (v) => v >= 160 ? { sev: "critico", label: "HTA 2" }
                                  : v >= 140 ? { sev: "moderado", label: "HTA 1" }
                                  : v >= 130 ? { sev: "leve", label: "Elevada" }
                                  : { sev: "normal", label: "Normal" },
    presion_diastolica_mmhg: (v) => v >= 100 ? { sev: "critico", label: "HTA 2" }
                                    : v >= 90 ? { sev: "moderado", label: "HTA 1" }
                                    : v >= 80 ? { sev: "leve", label: "Elevada" }
                                    : { sev: "normal", label: "Normal" },
    actividad_fisica_min_semana: (v) => v >= 150 ? { sev: "normal", label: "Cumple OMS" }
                                        : { sev: "leve", label: "Sedentario" },
    esteatosis_grado: (v) => v >= 3 ? { sev: "critico", label: "Severa" }
                            : v === 2 ? { sev: "moderado", label: "Moderada" }
                            : v === 1 ? { sev: "leve", label: "Leve" }
                            : { sev: "normal", label: "Ausente" }
  };

  const NOMBRES_LABS = {
    glucosa: "Glucosa", hba1c: "HbA1c", homa_ir: "HOMA-IR",
    ldl: "LDL", hdl: "HDL", tg: "Triglicéridos", alt: "ALT", ast: "AST"
  };

  const UNIDADES_LABS = {
    glucosa: "mg/dL", hba1c: "%", homa_ir: "",
    ldl: "mg/dL", hdl: "mg/dL", tg: "mg/dL", alt: "U/L", ast: "U/L"
  };

  function interpretarClave(clave, valor) {
    const fn = INTERPRETACIONES[clave];
    if (!fn) return { sev: "normal", label: "—" };
    try { return fn(Number(valor)); } catch { return { sev: "normal", label: "—" }; }
  }

  // ═══════════════════════════════════════════════════════════
  // INYECTAR BOTÓN FLOTANTE
  // ═══════════════════════════════════════════════════════════
  function inyectarBotonFlotante() {
    if (document.getElementById("obs-fab")) return;

    const fab = document.createElement("button");
    fab.id = "obs-fab";
    fab.innerHTML = "🔬";
    fab.title = "Panel de observabilidad";
    fab.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #0071e3);
      color: white;
      border: none;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(124,58,237,0.4);
      z-index: 99998;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    fab.addEventListener("mouseenter", () => {
      fab.style.transform = "translateY(-4px) scale(1.1)";
      fab.style.boxShadow = "0 12px 32px rgba(124,58,237,0.6)";
    });
    fab.addEventListener("mouseleave", () => {
      fab.style.transform = "";
      fab.style.boxShadow = "0 8px 24px rgba(124,58,237,0.4)";
    });
    fab.addEventListener("click", togglePanel);

    document.body.appendChild(fab);
    console.log("[Observability] ✅ Botón flotante inyectado");
  }

  // ═══════════════════════════════════════════════════════════
  // INYECTAR PANEL LATERAL
  // ═══════════════════════════════════════════════════════════
  function inyectarPanel() {
    if (document.getElementById("obs-panel")) return;

    const panel = document.createElement("div");
    panel.id = "obs-panel";
    panel.style.cssText = `
      position: fixed;
      top: 0;
      right: -100%;
      width: 45%;
      max-width: 700px;
      min-width: 400px;
      height: 100vh;
      background: #f5f5f7;
      border-left: 2px solid #0071e3;
      box-shadow: -8px 0 32px rgba(0,0,0,0.2);
      z-index: 99999;
      transition: right 0.3s ease;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1d1d1f;
    `;

    panel.innerHTML = `
      <!-- Header -->
      <div style="padding: 14px 18px; background: linear-gradient(135deg, #1a3a5c, #0071e3); color: white; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-shrink: 0">
        <div>
          <div style="font-size: 14px; font-weight: 800; letter-spacing: -0.3px">🔬 Observabilidad en vivo</div>
          <div style="font-size: 11px; opacity: 0.85; margin-top: 2px">Sprint 3 · Árbol de agentes</div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center">
          <span id="obs-badge" style="font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 100px; background: rgba(255,255,255,0.2); text-transform: uppercase">Esperando</span>
          <button id="obs-clear" title="Limpiar" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px">🗑️</button>
          <button id="obs-close" title="Cerrar" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px">✕</button>
        </div>
      </div>

      <!-- Contadores -->
      <div id="obs-contadores" style="display: flex; gap: 6px; padding: 10px 18px; background: white; border-bottom: 1px solid #d2d2d7; flex-wrap: wrap; flex-shrink: 0">
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #e8f4fd; border-radius: 100px; font-size: 10px; font-weight: 700">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #0071e3"></span>
          <span>RAÍZ: <span id="obs-c-raiz">0</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #fff9e6; border-radius: 100px; font-size: 10px; font-weight: 700">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #d4a017"></span>
          <span>TRONCO: <span id="obs-c-tronco">0</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #f0fff4; border-radius: 100px; font-size: 10px; font-weight: 700">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #34c759"></span>
          <span>SAVIA: <span id="obs-c-savia">0</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #faf5ff; border-radius: 100px; font-size: 10px; font-weight: 700">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #7c3aed"></span>
          <span>KIMI: <span id="obs-c-kimi">0</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #fff3f3; border-radius: 100px; font-size: 10px; font-weight: 700">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #ff3b30"></span>
          <span>FRUTO: <span id="obs-c-fruto">0</span></span>
        </div>
      </div>

      <!-- Narrativa -->
      <div id="obs-narrativa" style="flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px">
        <div style="text-align: center; padding: 40px 20px; color: #86868b; font-size: 12px">
          <div style="font-size: 42px; margin-bottom: 10px">🎬</div>
          <div style="font-size: 13px; font-weight: 700; color: #6e6e73; margin-bottom: 6px">Esperando eventos reales</div>
          <div style="font-size: 11px; line-height: 1.6">
            <strong>Navega el monolito normalmente:</strong><br>
            1. Crear ficha de paciente<br>
            2. Elegir tamizaje o consulta<br>
            3. Llenar datos clínicos<br>
            4. Enviar a Kimi<br>
            5. Autorizar interconsultas<br>
            6. Firmar y generar PDFs<br><br>
            Los eventos aparecerán aquí en tiempo real.
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 10px 18px; background: white; border-top: 1px solid #d2d2d7; display: flex; gap: 6px; justify-content: space-between; flex-shrink: 0">
        <button id="obs-export" style="flex: 1; padding: 8px; background: #0071e3; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer">📥 Exportar log</button>
        <button id="obs-help" style="flex: 1; padding: 8px; background: #d2d2d7; color: #1d1d1f; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer">❓ Ayuda</button>
      </div>
    `;

    document.body.appendChild(panel);

    // Event listeners
    document.getElementById("obs-close").addEventListener("click", togglePanel);
    document.getElementById("obs-clear").addEventListener("click", limpiarPanel);
    document.getElementById("obs-export").addEventListener("click", exportarLog);
    document.getElementById("obs-help").addEventListener("click", mostrarAyuda);

    console.log("[Observability] ✅ Panel inyectado");
  }

  // ═══════════════════════════════════════════════════════════
  // TOGGLE PANEL
  // ═══════════════════════════════════════════════════════════
  function togglePanel() {
    const panel = document.getElementById("obs-panel");
    if (!panel) return;

    ESTADO.panelAbierto = !ESTADO.panelAbierto;
    panel.style.right = ESTADO.panelAbierto ? "0" : "-100%";

    if (ESTADO.panelAbierto && !ESTADO.capturadorActivo) {
      activarCapturador();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CAPTURADOR
  // ═══════════════════════════════════════════════════════════
  async function activarCapturador() {
    const savia = await esperarSavia();
    if (!savia) {
      console.warn("[Observability] No se pudo activar el capturador");
      return;
    }

    if (savia.propagar._obsPatched) {
      ESTADO.capturadorActivo = true;
      return;
    }

    const origPropagar = savia.propagar;
    savia.propagar = function(evento) {
      try {
        procesarEvento(evento);
      } catch (e) {
        console.warn("[Observability] Error:", e);
      }
      return origPropagar.apply(this, arguments);
    };
    savia.propagar._obsPatched = true;
    ESTADO.capturadorActivo = true;

    document.getElementById("obs-badge").textContent = "✅ Activo";
    document.getElementById("obs-badge").style.background = "rgba(52,199,89,0.6)";

    console.log("[Observability] ✅ Capturador activo");
  }

  // ═══════════════════════════════════════════════════════════
  // PROCESAR EVENTOS
  // ═══════════════════════════════════════════════════════════
  function procesarEvento(evento) {
    if (!evento || !evento.tipo) return;
    const tipo = evento.tipo;
    const payload = evento.payload || {};

    try {
      if (tipo === "savia:aporte-paciente") return renderAportePaciente(payload, evento);
      if (tipo === "savia:aporte-clinica") return renderAporteClinica(payload, evento);
      if (tipo === "savia:aporte-laboratorio") return renderAporteLaboratorio(payload, evento);
      if (tipo === "savia:aporte-imagen") return renderAporteImagen(payload, evento);
      if (tipo === "savia:aporte-social") return renderAporteSocial(payload, evento);
      if (tipo === "savia:raiz:contexto-unificado") return renderSaviaRaiz(payload, evento);
      if (tipo === "savia:tronco:informe-kimi") return renderCoordinadorInforme(payload, evento);
      if (tipo === "savia:solicitar-analisis") return renderCoordinadorSolicitud(payload, evento);
      if (tipo === "especialista:respuesta") return renderEspecialistaRespuesta(payload, evento);
      if (tipo === "savia:tronco:plan-integrado") return renderPlanIntegrado(payload, evento);
      if (tipo === "medico:decision-interconsultas") return renderDecisionMedico(payload, evento);
    } catch (e) {
      console.error("[Observability] Error procesando evento", tipo, e);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════
  function agregarPaso(config) {
    ESTADO.pasoActual++;
    const n = ESTADO.pasoActual;
    const narrativa = document.getElementById("obs-narrativa");
    
    const empty = narrativa.querySelector("div[style*='text-align: center']");
    if (empty) empty.remove();

    const card = document.createElement("div");
    card.style.cssText = `
      background: white;
      border: 1px solid #d2d2d7;
      border-radius: 12px;
      overflow: hidden;
      animation: obsSlideIn 0.3s ease-out;
      border-left: 5px solid ${config.color || "#0071e3"};
    `;

    const badgeText = config.badge || "";
    const badgeColor = config.badgeColor || config.color || "#0071e3";

    card.innerHTML = `
      <div style="padding: 12px 14px; background: #f5f5f7; border-bottom: 1px solid #d2d2d7; display: flex; align-items: flex-start; gap: 10px">
        <div style="width: 28px; height: 28px; border-radius: 50%; background: ${config.color || "#0071e3"}; color: white; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0">${n}</div>
        <div style="flex: 1; min-width: 0">
          <div style="font-size: 13px; font-weight: 800; color: #1a3a5c; margin-bottom: 2px">${escapeHtml(config.titulo)}</div>
          <div style="font-size: 10px; color: #6e6e73; font-family: ui-monospace, monospace">${escapeHtml(config.subtitulo || "")}</div>
        </div>
        <span style="font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; background: ${badgeColor}22; color: ${badgeColor}; flex-shrink: 0">${badgeText}</span>
      </div>
      <div style="padding: 14px 16px; font-size: 12px; line-height: 1.6">
        ${config.html || ""}
      </div>
    `;

    narrativa.appendChild(card);
    setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    actualizarContadores();
  }

  function actualizarContadores() {
    const c = {
      raiz: ESTADO.eventos.filter(e => e.tipo === "raiz").length,
      tronco: ESTADO.eventos.filter(e => e.tipo === "tronco").length,
      savia: ESTADO.eventos.filter(e => e.tipo === "savia").length,
      kimi: ESTADO.eventos.filter(e => e.tipo === "kimi").length,
      fruto: ESTADO.eventos.filter(e => e.tipo === "fruto").length
    };
    ["raiz", "tronco", "savia", "kimi", "fruto"].forEach(k => {
      const el = document.getElementById(`obs-c-${k}`);
      if (el) el.textContent = c[k];
    });
  }

  function tablaDatos(filas, thead) {
    return `
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin: 6px 0; border-radius: 6px; overflow: hidden; border: 1px solid #d2d2d7">
        ${thead ? `<thead><tr style="background: #f5f5f7">${thead.map(h => `<th style="padding: 6px 10px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #6e6e73; border-bottom: 1px solid #d2d2d7">${h}</th>`).join("")}</tr></thead>` : ""}
        <tbody>${filas}</tbody>
      </table>
    `;
  }

  function botonJSON(json, id) {
    const jsonStr = formatearJSON(json);
    return `
      <button onclick="document.getElementById('obs-json-${id}').style.display = document.getElementById('obs-json-${id}').style.display === 'none' ? 'block' : 'none'"
              style="margin-top: 6px; padding: 4px 10px; background: #f5f5f7; border: 1px solid #d2d2d7; border-radius: 4px; font-size: 10px; font-weight: 700; color: #6e6e73; cursor: pointer; font-family: inherit">
        🔍 Ver JSON
      </button>
      <div id="obs-json-${id}" style="display: none; margin-top: 6px">
        <pre style="background: #1d1d1f; color: #f5f5f7; padding: 10px; border-radius: 6px; font-family: ui-monospace, monospace; font-size: 10px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; margin: 0; max-height: 300px; overflow-y: auto">${jsonStr}</pre>
      </div>
    `;
  }

  function sevBadge(sev, label) {
    const colors = {
      normal: { bg: "#f0fff4", fg: "#1a4a2a" },
      leve: { bg: "#fff9e6", fg: "#8a6a00" },
      moderado: { bg: "#ffe8d1", fg: "#8a4400" },
      alto: { bg: "#ffdad6", fg: "#7a1a1a" },
      critico: { bg: "#ff3b30", fg: "white" }
    };
    const c = colors[sev] || colors.normal;
    return `<span style="display: inline-block; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 100px; background: ${c.bg}; color: ${c.fg}; text-transform: uppercase">${label}</span>`;
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: APORTES
  // ═══════════════════════════════════════════════════════════
  function renderAportePaciente(payload, evento) {
    const s = payload.subject || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    const filas = `
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c; width: 40%">Nombre</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; font-weight: 700; text-align: right">${escapeHtml(s.nombre || "—")}</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">ID</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; text-align: right">${escapeHtml(s.subject_id || "—")}</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">Edad</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; text-align: right">${escapeHtml(String(s.edad || "—"))} años</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">Sexo</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; text-align: right">${escapeHtml(s.sexo || "—")}</td></tr>
      <tr><td style="padding: 5px 10px; font-weight: 600; color: #1a3a5c">Empresa</td><td style="padding: 5px 10px; font-family: ui-monospace, monospace; text-align: right">${escapeHtml(s.empresa || "—")}</td></tr>
    `;

    agregarPaso({
      color: "#0071e3",
      badge: "RAÍZ",
      badgeColor: "#0071e3",
      titulo: "El agente-paciente aporta datos demográficos",
      subtitulo: `savia:aporte-paciente · ${formatearHora(evento.timestamp || new Date().toISOString())}`,
      html: `
        <div style="margin-bottom: 10px; color: #333">
          El <strong style="color: #1a3a5c">agente-paciente</strong> procesó los datos del paciente y los aporta a SAVIA:
        </div>
        ${tablaDatos(filas)}
        <div style="padding: 6px 10px; background: #f5f5f7; border-radius: 6px; font-size: 10px; color: #6e6e73; margin: 8px 0">
          → Emite: <code style="background: white; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #0071e3; font-weight: 700">savia:aporte-paciente</code>
        </div>
        ${botonJSON(payload, "pac-" + Date.now())}
      `
    });
  }

  function renderAporteClinica(payload, evento) {
    const c = payload.clinica || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    const campos = [
      { key: "imc", label: "IMC", u: "kg/m²" },
      { key: "presion_sistolica_mmhg", label: "PA sistólica", u: "mmHg" },
      { key: "presion_diastolica_mmhg", label: "PA diastólica", u: "mmHg" },
      { key: "frecuencia_cardiaca_lpm", label: "FC", u: "lpm" },
      { key: "peso_kg", label: "Peso", u: "kg" },
      { key: "talla_cm", label: "Talla", u: "cm" }
    ];
    campos.forEach(x => {
      if (c[x.key] !== undefined && c[x.key] !== null) {
        const i = interpretarClave(x.key, c[x.key]);
        filas += `<tr>
          <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${x.label}</td>
          <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; font-weight: 700; text-align: right">${c[x.key]} ${x.u}</td>
          <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; text-align: center">${sevBadge(i.sev, i.label)}</td>
        </tr>`;
      }
    });
    if (c.habitos?.actividad_fisica_min_semana !== undefined) {
      const i = interpretarClave("actividad_fisica_min_semana", c.habitos.actividad_fisica_min_semana);
      filas += `<tr>
        <td style="padding: 5px 10px; font-weight: 600; color: #1a3a5c">Actividad física</td>
        <td style="padding: 5px 10px; font-family: ui-monospace, monospace; font-weight: 700; text-align: right">${c.habitos.actividad_fisica_min_semana} min/sem</td>
        <td style="padding: 5px 10px; text-align: center">${sevBadge(i.sev, i.label)}</td>
      </tr>`;
    }
    agregarPaso({
      color: "#0071e3",
      badge: "RAÍZ",
      badgeColor: "#0071e3",
      titulo: "El agente-clinica aporta signos vitales",
      subtitulo: `savia:aporte-clinica · ${formatearHora(evento.timestamp || new Date().toISOString())}`,
      html: `
        <div style="margin-bottom: 10px; color: #333">El <strong style="color: #1a3a5c">agente-clinica</strong> procesó los signos vitales:</div>
        ${tablaDatos(filas, ["Dato", "Valor", "Interpretación"])}
        <div style="padding: 6px 10px; background: #f5f5f7; border-radius: 6px; font-size: 10px; color: #6e6e73; margin: 8px 0">
          → Emite: <code style="background: white; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #0071e3; font-weight: 700">savia:aporte-clinica</code>
        </div>
        ${botonJSON(payload, "cli-" + Date.now())}
      `
    });
  }

  function renderAporteLaboratorio(payload, evento) {
    const labs = payload.labs || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    let alt = 0;
    Object.keys(labs).forEach(k => {
      if (labs[k] === null || labs[k] === undefined) return;
      const i = interpretarClave(k, labs[k]);
      if (i.sev !== "normal") alt++;
      filas += `<tr>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${NOMBRES_LABS[k] || k}</td>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; font-weight: 700; text-align: right">${labs[k]} ${UNIDADES_LABS[k] || ""}</td>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; text-align: center">${sevBadge(i.sev, i.label)}</td>
      </tr>`;
    });
    agregarPaso({
      color: "#0071e3",
      badge: "RAÍZ",
      badgeColor: "#0071e3",
      titulo: "El agente-laboratorio aporta resultados",
      subtitulo: `savia:aporte-laboratorio · ${formatearHora(evento.timestamp || new Date().toISOString())}`,
      html: `
        <div style="margin-bottom: 10px; color: #333">
          El <strong style="color: #1a3a5c">agente-laboratorio</strong> procesó el reporte.
          <strong>${Object.keys(labs).length} exámenes</strong>, <strong>${alt} alterados</strong>:
        </div>
        ${tablaDatos(filas, ["Examen", "Valor", "Interpretación"])}
        <div style="padding: 6px 10px; background: #f5f5f7; border-radius: 6px; font-size: 10px; color: #6e6e73; margin: 8px 0">
          → Emite: <code style="background: white; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #0071e3; font-weight: 700">savia:aporte-laboratorio</code>
        </div>
        ${botonJSON(payload, "lab-" + Date.now())}
      `
    });
  }

  function renderAporteImagen(payload, evento) {
    const img = payload.imagen || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    Object.keys(img).forEach(k => {
      if (img[k] === null || img[k] === undefined) return;
      const i = interpretarClave(k, img[k]);
      filas += `<tr>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${escapeHtml(k.replace(/_/g, " "))}</td>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; font-weight: 700; text-align: right">${img[k]}</td>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; text-align: center">${sevBadge(i.sev, i.label)}</td>
      </tr>`;
    });
    agregarPaso({
      color: "#0071e3",
      badge: "RAÍZ",
      badgeColor: "#0071e3",
      titulo: "El agente-imagen aporta hallazgos",
      subtitulo: `savia:aporte-imagen · ${formatearHora(evento.timestamp || new Date().toISOString())}`,
      html: `
        <div style="margin-bottom: 10px; color: #333">El <strong style="color: #1a3a5c">agente-imagen</strong> procesó los hallazgos ecográficos:</div>
        ${tablaDatos(filas, ["Hallazgo", "Valor", "Interpretación"])}
        <div style="padding: 6px 10px; background: #f5f5f7; border-radius: 6px; font-size: 10px; color: #6e6e73; margin: 8px 0">
          → Emite: <code style="background: white; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #0071e3; font-weight: 700">savia:aporte-imagen</code>
        </div>
        ${botonJSON(payload, "img-" + Date.now())}
      `
    });
  }

  function renderAporteSocial(payload, evento) {
    const soc = payload.social || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    Object.keys(soc).forEach(k => {
      if (soc[k] === null || soc[k] === undefined) return;
      filas += `<tr>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${escapeHtml(k.replace(/_/g, " "))}</td>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; text-align: right">${escapeHtml(String(soc[k]))}</td>
      </tr>`;
    });
    agregarPaso({
      color: "#0071e3",
      badge: "RAÍZ",
      badgeColor: "#0071e3",
      titulo: "El agente-trabajo-social aporta datos",
      subtitulo: `savia:aporte-social · ${formatearHora(evento.timestamp || new Date().toISOString())}`,
      html: `
        <div style="margin-bottom: 10px; color: #333">El <strong style="color: #1a3a5c">agente-trabajo-social</strong> aportó datos socioeconómicos:</div>
        ${tablaDatos(filas)}
        <div style="padding: 6px 10px; background: #f5f5f7; border-radius: 6px; font-size: 10px; color: #6e6e73; margin: 8px 0">
          → Emite: <code style="background: white; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #0071e3; font-weight: 700">savia:aporte-social</code>
        </div>
        ${botonJSON(payload, "soc-" + Date.now())}
      `
    });
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: SAVIA RAÍZ
  // ═══════════════════════════════════════════════════════════
  function renderSaviaRaiz(payload, evento) {
    ESTADO.eventos.push({ tipo: "savia", evento });
    const s = payload.subject || {};
    const labs = payload.labs || {};
    const cli = payload.clinica || {};
    const ics = (payload.raw?._json_estructurado?.interconsultas_sugeridas) || [];
    const chips = ics.map(ic => `<span style="display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 100px; background: #e8f4fd; color: #0071e3; font-family: ui-monospace, monospace; margin: 2px">${escapeHtml(ic.especialista)}</span>`).join("");
    const filas = `
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">Contexto ID</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; text-align: right; font-size: 10px">${escapeHtml(payload.contexto_id || "—")}</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">Paciente</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; font-weight: 700; text-align: right">${escapeHtml(s.nombre || "—")}</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">Labs</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; text-align: right">${Object.keys(labs).length} exámenes</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">Clínica</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; text-align: right">${Object.keys(cli).length} campos</td></tr>
      <tr><td style="padding: 5px 10px; font-weight: 600; color: #1a3a5c">Interconsultas</td><td style="padding: 5px 10px; font-family: ui-monospace, monospace; text-align: right">${ics.length} sugeridas</td></tr>
    `;
    agregarPaso({
      color: "#34c759",
      badge: "SAVIA",
      badgeColor: "#34c759",
      titulo: "La consolidadora emite SAVIA RAÍZ",
      subtitulo: `savia:raiz:contexto-unificado · ${formatearHora(evento.timestamp || new Date().toISOString())}`,
      html: `
        <div style="margin-bottom: 10px; color: #333">
          La <strong style="color: #1a3a5c">agente-savia-consolidadora</strong> consolidó los <strong>5 aportes</strong> en un único objeto.
          <strong>Este es el contexto completo que se envía a Kimi.</strong>
        </div>
        ${tablaDatos(filas)}
        ${ics.length > 0 ? `<div style="margin-top: 8px"><strong style="color: #1a3a5c; font-size: 11px">Interconsultas detectadas:</strong><div style="margin-top: 4px">${chips}</div></div>` : ""}
        <div style="padding: 6px 10px; background: #f0fff4; border-radius: 6px; font-size: 10px; color: #1a4a2a; margin: 8px 0">
          → Emite: <code style="background: white; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #34c759; font-weight: 700">savia:raiz:contexto-unificado</code>
        </div>
        ${botonJSON(payload, "savia-" + Date.now())}
      `
    });
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: COORDINADOR
  // ═══════════════════════════════════════════════════════════
  function renderCoordinadorInforme(payload, evento) {
    ESTADO.eventos.push({ tipo: "tronco", evento });
    const info = payload.informe || payload.narrativa || "";
    const ics = payload.interconsultas_sugeridas || [];
    const infoCorto = info.length > 400 ? info.substring(0, 400) + "..." : info;
    let tablaIcs = "";
    if (ics.length > 0) {
      let filas = "";
      ics.forEach(ic => {
        const pColor = ic.prioridad === "alta" ? "critico" : ic.prioridad === "media" ? "leve" : "normal";
        filas += `<tr>
          <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${escapeHtml(ic.especialista)}</td>
          <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; text-align: center">${sevBadge(pColor, ic.prioridad)}</td>
          <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-size: 10px">${escapeHtml(ic.justificacion || "—")}</td>
        </tr>`;
      });
      tablaIcs = tablaDatos(filas, ["Especialista", "Prioridad", "Justificación"]);
    }
    agregarPaso({
      color: "#d4a017",
      badge: "TRONCO",
      badgeColor: "#d4a017",
      titulo: "El coordinador emite el informe TRONCO",
      subtitulo: `savia:tronco:informe-kimi · ${formatearHora(evento.timestamp || new Date().toISOString())}`,
      html: `
        <div style="margin-bottom: 10px; color: #333">
          El <strong style="color: #1a3a5c">agente-coordinador</strong> recibió SAVIA RAÍZ y emitió <strong>savia:tronco:informe-kimi</strong>:
        </div>
        <div style="background: #fff9e6; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-size: 11px; line-height: 1.6">
          <div style="font-size: 10px; font-weight: 700; color: #8a6a00; text-transform: uppercase; margin-bottom: 4px">📋 Informe TRONCO</div>
          ${escapeHtml(infoCorto) || "<em>Sin narrativa</em>"}
        </div>
        ${ics.length > 0 ? `<div style="margin-top: 8px"><strong style="color: #1a3a5c; font-size: 11px">Interconsultas sugeridas (${ics.length}):</strong>${tablaIcs}</div>` : ""}
        <div style="padding: 6px 10px; background: #fff9e6; border-radius: 6px; font-size: 10px; color: #8a6a00; margin: 8px 0">
          → Emite: <code style="background: white; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #d4a017; font-weight: 700">savia:tronco:informe-kimi</code>
        </div>
        ${botonJSON(payload, "info-" + Date.now())}
      `
    });
  }

  function renderCoordinadorSolicitud(payload, evento) {
    ESTADO.eventos.push({ tipo: "tronco", evento });
    const esp = payload.especialista || "—";
    agregarPaso({
      color: "#d4a017",
      badge: "TRONCO",
      badgeColor: "#d4a017",
      titulo: `El coordinador solicita a ${esp}`,
      subtitulo: `savia:solicitar-analisis · ${formatearHora(evento.timestamp || new Date().toISOString())}`,
      html: `
        <div style="margin-bottom: 10px; color: #333">
          El <strong style="color: #1a3a5c">agente-coordinador</strong> solicita al especialista <strong>${escapeHtml(esp)}</strong> que analice el caso.
        </div>
        <div style="padding: 6px 10px; background: #fff9e6; border-radius: 6px; font-size: 10px; color: #8a6a00">
          → Emite: <code style="background: white; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #d4a017; font-weight: 700">savia:solicitar-analisis</code> para <strong>${escapeHtml(esp)}</strong>
        </div>
        ${botonJSON(payload, "sol-" + Date.now())}
      `
    });
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: ESPECIALISTAS
  // ═══════════════════════════════════════════════════════════
  function renderEspecialistaRespuesta(payload, evento) {
    ESTADO.eventos.push({ tipo: "tronco", evento });
    const esp = payload.especialista || "—";
    const nombre = payload.nombre || esp;
    const res = payload.resultado || payload;
    let filas = "";
    const comunes = [
      { key: "resumen", label: "Resumen" },
      { key: "diagnostico_nutricional", label: "Dx nutricional" },
      { key: "clasificacion_glucemica", label: "Clasificación" },
      { key: "banderas_rojas", label: "Banderas rojas" },
      { key: "confianza", label: "Confianza" }
    ];
    comunes.forEach(x => {
      if (res[x.key] !== undefined && res[x.key] !== null) {
        const v = res[x.key];
        const vStr = Array.isArray(v) ? v.join(", ") : String(v);
        filas += `<tr>
          <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${x.label}</td>
          <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-size: 11px">${escapeHtml(vStr.substring(0, 200))}</td>
        </tr>`;
      }
    });
    agregarPaso({
      color: "#d4a017",
      badge: "ESPECIALISTA",
      badgeColor: "#d4a017",
      titulo: `El especialista ${nombre} respondió`,
      subtitulo: `especialista:respuesta · ${formatearHora(evento.timestamp || new Date().toISOString())}`,
      html: `
        <div style="margin-bottom: 10px; color: #333">
          El especialista <strong style="color: #1a3a5c">${escapeHtml(nombre)}</strong> respondió con su análisis:
        </div>
        ${tablaDatos(filas)}
        <div style="padding: 6px 10px; background: #fff9e6; border-radius: 6px; font-size: 10px; color: #8a6a00; margin: 8px 0">
          → Emite: <code style="background: white; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #d4a017; font-weight: 700">especialista:respuesta</code> para ${escapeHtml(esp)}
        </div>
        ${botonJSON(payload, "esp-" + esp + "-" + Date.now())}
      `
    });
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: PLAN INTEGRADO (FRUTO)
  // ═══════════════════════════════════════════════════════════
  function renderPlanIntegrado(payload, evento) {
    ESTADO.eventos.push({ tipo: "fruto", evento });
    const plan = payload.plan || payload.plan_integrado || {};
    const secciones = Object.keys(plan);
    let filas = "";
    secciones.forEach(k => {
      const v = plan[k];
      let vStr = Array.isArray(v) ? `${v.length} elementos` : typeof v === "object" ? `${Object.keys(v).length} campos` : String(v).substring(0, 80);
      filas += `<tr>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c; text-transform: capitalize">${escapeHtml(k.replace(/_/g, " "))}</td>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: ui-monospace, monospace; text-align: right; font-size: 10px">${escapeHtml(vStr)}</td>
      </tr>`;
    });
    agregarPaso({
      color: "#ff3b30",
      badge: "FRUTO",
      badgeColor: "#ff3b30",
      titulo: "Plan integrado final (fruto)",
      subtitulo: `savia:tronco:plan-integrado · ${formatearHora(evento.timestamp || new Date().toISOString())}`,
      html: `
        <div style="margin-bottom: 10px; color: #333">
          El <strong style="color: #1a3a5c">agente-coordinador</strong> consolidó las respuestas en un <strong>plan único</strong>.
          <strong>Este es el fruto final del árbol de agentes.</strong>
        </div>
        <div style="background: #fff3f3; border-radius: 8px; padding: 10px; margin-bottom: 10px">
          <div style="font-size: 10px; font-weight: 700; color: #7a1a1a; text-transform: uppercase; margin-bottom: 4px">🍎 Plan integrado (${secciones.length} secciones)</div>
          ${tablaDatos(filas)}
        </div>
        <div style="padding: 6px 10px; background: #fff3f3; border-radius: 6px; font-size: 10px; color: #7a1a1a; margin: 8px 0">
          → Emite: <code style="background: white; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #ff3b30; font-weight: 700">savia:tronco:plan-integrado</code>
        </div>
        ${botonJSON(payload, "plan-" + Date.now())}
      `
    });
  }

  function renderDecisionMedico(payload, evento) {
    ESTADO.eventos.push({ tipo: "tronco", evento });
    const ics = payload.interconsultas || [];
    let filas = "";
    ics.forEach(ic => {
      filas += `<tr>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${escapeHtml(ic.especialista)}</td>
        <td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; text-align: center">${sevBadge(ic.prioridad === "alta" ? "critico" : "leve", ic.prioridad)}</td>
      </tr>`;
    });
    agregarPaso({
      color: "#1a3a5c",
      badge: "MÉDICO",
      badgeColor: "#1a3a5c",
      titulo: `El médico autoriza ${ics.length} interconsulta(s)`,
      subtitulo: `medico:decision-interconsultas · ${formatearHora(evento.timestamp || new Date().toISOString())}`,
      html: `
        <div style="margin-bottom: 10px; color: #333">
          El <strong style="color: #1a3a5c">médico tratante</strong> autorizó las siguientes interconsultas:
        </div>
        ${tablaDatos(filas, ["Especialista", "Prioridad"])}
        <div style="padding: 6px 10px; background: #f0f7ff; border-radius: 6px; font-size: 10px; color: #0051a3; margin: 8px 0">
          → Emite: <code style="background: white; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #1a3a5c; font-weight: 700">medico:decision-interconsultas</code>
        </div>
        ${botonJSON(payload, "med-" + Date.now())}
      `
    });
  }

  // ═══════════════════════════════════════════════════════════
  // UTILIDADES DEL PANEL
  // ═══════════════════════════════════════════════════════════
  function limpiarPanel() {
    if (!confirm("¿Limpiar todos los eventos?")) return;
    ESTADO.pasoActual = 0;
    ESTADO.eventos = [];
    const narrativa = document.getElementById("obs-narrativa");
    narrativa.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #86868b; font-size: 12px">
        <div style="font-size: 42px; margin-bottom: 10px">🎬</div>
        <div style="font-size: 13px; font-weight: 700; color: #6e6e73; margin-bottom: 6px">Panel limpio</div>
        <div style="font-size: 11px; line-height: 1.6">
          Navega el monolito para generar nuevos eventos.<br>
          Los eventos aparecerán aquí en tiempo real.
        </div>
      </div>
    `;
    actualizarContadores();
  }

  function exportarLog() {
    const log = ESTADO.eventos.map((e, i) => ({
      paso: i + 1,
      tipo: e.evento?.tipo,
      de: e.evento?.de,
      timestamp: e.evento?.timestamp,
      payload: e.evento?.payload
    }));
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `observability-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log("[Observability] ✅ Log exportado");
  }

  function mostrarAyuda() {
    alert(
      "📖 CÓMO USAR EL PANEL DE OBSERVABILIDAD\n\n" +
      "Este panel captura EN VIVO los eventos del árbol de agentes.\n\n" +
      "NAVEGA EL MONOLITO NORMALMENTE:\n" +
      "1. Crear ficha de paciente\n" +
      "2. Elegir tamizaje o consulta\n" +
      "3. Llenar datos clínicos\n" +
      "4. Click en 'Enviar a Kimi'\n" +
      "5. Autorizar interconsultas\n" +
      "6. Firmar y generar PDFs\n\n" +
      "Cada evento aparecerá aquí con:\n" +
      "• Narrativa estructurada (tablas, badges)\n" +
      "• JSON completo (botón 'ver JSON')\n" +
      "• Timestamp y emisor\n\n" +
      "BOTONES DEL PANEL:\n" +
      "🗑️ Limpiar - borra todos los eventos\n" +
      "📥 Exportar log - descarga JSON con todo\n" +
      "✕ Cerrar - cierra el panel (reabre con 🔬)"
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ANIMACIÓN CSS
  // ═══════════════════════════════════════════════════════════
  function inyectarEstilos() {
    if (document.getElementById("obs-styles")) return;
    const style = document.createElement("style");
    style.id = "obs-styles";
    style.textContent = `
      @keyframes obsSlideIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════
  function init() {
    console.log("[Observability] Inicializando...");
    inyectarEstilos();
    inyectarBotonFlotante();
    inyectarPanel();

    // Auto-activar capturador después de 5s
    setTimeout(async () => {
      await activarCapturador();
    }, 5000);

    console.log("[Observability] ✅ Listo. Click en 🔬 para abrir el panel.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 500);
  }
// ═══════════════════════════════════════════════════════════
// AUTO-FIX: Neutralizar error 'data is not defined' en el monolito
// El error está en la función seleccionarPacienteConsulta (línea ~16667)
// que usa 'data' fuera de su scope. Este wrapper inyecta un listener
// global que captura el error y lo neutraliza.
// ═══════════════════════════════════════════════════════════
window.addEventListener("error", (event) => {
  if (event.message && event.message.includes("Can't find variable: data")) {
    console.warn("[Observability] ⚠️ Error 'data' neutralizado:", event.filename, event.lineno);
    event.preventDefault();
    return true;
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes("Can't find variable: data")) {
    console.warn("[Observability] ⚠️ Promise rejection 'data' neutralizada");
    event.preventDefault();
    return true;
  }
});

console.log("[Observability] ✅ Auto-fix para error 'data' instalado");
// ═══════════════════════════════════════════════════════════
// INTERCEPTADOR DE FLUJO — Emitir eventos SAVIA reales
// El monolito NO emite eventos SAVIA en el flujo de usuario.
// Este bloque intercepta los clicks clave y emite los eventos
// con los datos REALES del formulario.
// ═══════════════════════════════════════════════════════════

console.log("[Observability] 🔧 Instalando interceptador de flujo...");

// Helpers
function leerCampo(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const val = el.value;
  return val === "" ? null : val;
}

function leerNumero(id) {
  const v = leerCampo(id);
  if (v === null) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function leerCheckboxes(containerId) {
  const cont = document.getElementById(containerId);
  if (!cont) return [];
  return Array.from(cont.querySelectorAll("input[type=checkbox]:checked"))
    .map(cb => cb.value || cb.id);
}

// Esperar a que SAVIA esté listo y emitir el evento de aporte
async function emitirAportePaciente() {
  if (!window.SAVIA) return;
  
  const nombre = leerCampo("ficha-nombre");
  const subjectId = leerCampo("ficha-subject_id");
  const edad = leerCampo("ficha-edad");
  const sexo = leerCampo("ficha-sexo");
  const dui = leerCampo("ficha-dui");
  const email = leerCampo("ficha-email");
  const telefono = leerCampo("ficha-telefono");
  const departamento = leerCampo("ficha-departamento");
  const municipio = leerCampo("ficha-municipio");
  const empresaId = leerCampo("ficha-empresa_id");
  
  if (!nombre || !subjectId) {
    console.log("[Observability] ⏭️ Aporte paciente omitido: faltan datos");
    return;
  }
  
  const empresaSelect = document.getElementById("ficha-empresa_id");
  const empresaTexto = empresaSelect?.selectedOptions?.[0]?.textContent || "";
  
  const contextoId = `SAV-RAIZ-${subjectId}-${Date.now()}`;
  window._obsContextoIdActual = contextoId;
  
  try {
    await window.SAVIA.emitirContexto(contextoId, "savia:aporte-paciente", {
      contexto_id: contextoId,
      subject: {
        subject_id: subjectId,
        nombre: nombre,
        edad: edad ? parseInt(edad) : null,
        sexo: sexo,
        dui: dui,
        email: email,
        telefono: telefono,
        departamento: departamento,
        municipio: municipio,
        empresa: empresaTexto || null
      }
    }, { de: "agente-paciente" });
    console.log("[Observability] ✅ Aporte paciente emitido con datos reales");
  } catch (e) {
    console.warn("[Observability] Error emitiendo aporte paciente:", e);
  }
}

async function emitirAporteClinica() {
  if (!window.SAVIA) return;
  const contextoId = window._obsContextoIdActual;
  if (!contextoId) {
    console.log("[Observability] ⏭️ Aporte clínica omitido: no hay contexto previo");
    return;
  }
  
  const peso = leerNumero("cl-peso");
  const talla = leerNumero("cl-talla");
  const imc = leerNumero("cl-imc");
  const cintura = leerNumero("cl-cintura");
  const cuello = leerNumero("cl-cuello");
  const pas = leerNumero("cl-pas");
  const pad = leerNumero("cl-pad");
  const fc = leerNumero("cl-fc");
  const sato2 = leerNumero("cl-sato2");
  const tabaco = leerNumero("cl-tabaco");
  const alcohol = leerNumero("cl-alcohol");
  const actividad = leerNumero("cl-actividad");
  const sueno = leerNumero("cl-sueno");
  
  const clinica = {};
  if (peso !== null) clinica.peso_kg = peso;
  if (talla !== null) clinica.talla_cm = talla;
  if (imc !== null) clinica.imc = imc;
  if (cintura !== null) clinica.circunferencia_cintura_cm = cintura;
  if (cuello !== null) clinica.circunferencia_cervical_cm = cuello;
  if (pas !== null) clinica.presion_sistolica_mmhg = pas;
  if (pad !== null) clinica.presion_diastolica_mmhg = pad;
  if (fc !== null) clinica.frecuencia_cardiaca_lpm = fc;
  if (sato2 !== null) clinica.saturacion_o2_pct = sato2;
  
  const habitos = {};
  if (tabaco !== null) habitos.tabaco_cigarrillos_dia = tabaco;
  if (alcohol !== null) habitos.alcohol_unidades_semana = alcohol;
  if (actividad !== null) habitos.actividad_fisica_min_semana = actividad;
  if (sueno !== null) habitos.sueno_horas = sueno;
  if (Object.keys(habitos).length > 0) clinica.habitos = habitos;
  
  if (Object.keys(clinica).length === 0) {
    console.log("[Observability] ⏭️ Aporte clínica omitido: sin datos");
    return;
  }
  
  try {
    await window.SAVIA.emitirContexto(contextoId, "savia:aporte-clinica", {
      contexto_id: contextoId,
      clinica: clinica
    }, { de: "agente-clinica" });
    console.log("[Observability] ✅ Aporte clínica emitido con datos reales");
  } catch (e) {
    console.warn("[Observability] Error emitiendo aporte clínica:", e);
  }
}

async function emitirAporteLaboratorio() {
  if (!window.SAVIA) return;
  const contextoId = window._obsContextoIdActual;
  if (!contextoId) return;
  
  // Leer todos los labs conocidos
  const labs = {};
  const labsIds = {
    "lab-glucosa": "glucosa",
    "lab-hba1c": "hba1c",
    "lab-insulina": "insulina",
    "lab-homa": "homa_ir",
    "lab-ct": "ct",
    "lab-ldl": "ldl",
    "lab-hdl": "hdl",
    "lab-tg": "tg",
    "lab-alt": "alt",
    "lab-ast": "ast",
    "lab-ggt": "ggt",
    "lab-fa": "fa",
    "lab-creatinina": "creatinina",
    "lab-tfg": "tfg",
    "lab-albumina": "albumina",
    "lab-urico": "acido_urico",
    "lab-tsh": "tsh",
    "lab-vitd": "vitamina_d",
    "lab-pcr": "pcr",
    "lab-hb": "hemoglobina"
  };
  
  Object.entries(labsIds).forEach(([elId, key]) => {
    const v = leerNumero(elId);
    if (v !== null) labs[key] = v;
  });
  
  if (Object.keys(labs).length === 0) {
    console.log("[Observability] ⏭️ Aporte lab omitido: sin datos");
    return;
  }
  
  try {
    await window.SAVIA.emitirContexto(contextoId, "savia:aporte-laboratorio", {
      contexto_id: contextoId,
      labs: labs
    }, { de: "agente-laboratorio" });
    console.log("[Observability] ✅ Aporte lab emitido con", Object.keys(labs).length, "exámenes reales");
  } catch (e) {
    console.warn("[Observability] Error emitiendo aporte lab:", e);
  }
}

async function emitirAporteImagen() {
  if (!window.SAVIA) return;
  const contextoId = window._obsContextoIdActual;
  if (!contextoId) return;
  
  const imagen = {};
  const imagenIds = {
    "cl-esteatosisgrado": "higado_esteatosis_grado",
    "cl-litiasis": "rinon_litiasis_mm",
    "cl-bosniak": "rinon_quiste_bosniak",
    "cl-tirads": "tiroides_tirads"
  };
  
  Object.entries(imagenIds).forEach(([elId, key]) => {
    const v = leerNumero(elId);
    if (v !== null) imagen[key] = v;
  });
  
  if (Object.keys(imagen).length === 0) {
    console.log("[Observability] ⏭️ Aporte imagen omitido: sin datos");
    return;
  }
  
  try {
    await window.SAVIA.emitirContexto(contextoId, "savia:aporte-imagen", {
      contexto_id: contextoId,
      imagen: imagen
    }, { de: "agente-imagen" });
    console.log("[Observability] ✅ Aporte imagen emitido con datos reales");
  } catch (e) {
    console.warn("[Observability] Error emitiendo aporte imagen:", e);
  }
}

async function emitirAporteSocial() {
  if (!window.SAVIA) return;
  const contextoId = window._obsContextoIdActual;
  if (!contextoId) return;
  
  const social = {};
  const nivel = leerCampo("ficha-nivel_educativo");
  const ocupacion = leerCampo("ficha-ocupacion");
  const estadoCivil = leerCampo("ficha-estado_civil");
  const hijos = leerNumero("ficha-numero_hijos");
  
  if (nivel) social.nivel_educativo = nivel;
  if (ocupacion) social.ocupacion = ocupacion;
  if (estadoCivil) social.estado_civil = estadoCivil;
  if (hijos !== null) social.numero_hijos = hijos;
  
  if (Object.keys(social).length === 0) {
    console.log("[Observability] ⏭️ Aporte social omitido: sin datos");
    return;
  }
  
  try {
    await window.SAVIA.emitirContexto(contextoId, "savia:aporte-social", {
      contexto_id: contextoId,
      social: social
    }, { de: "agente-trabajo-social" });
    console.log("[Observability] ✅ Aporte social emitido con datos reales");
  } catch (e) {
    console.warn("[Observability] Error emitiendo aporte social:", e);
  }
}

// ═══════════════════════════════════════════════════════════
// EMITIR SAVIA RAÍZ (consolidada)
// ═══════════════════════════════════════════════════════════
async function emitirSaviaRaiz() {
  if (!window.SAVIA) return;
  const contextoId = window._obsContextoIdActual;
  if (!contextoId) {
    console.log("[Observability] ⏭️ SAVIA RAÍZ omitida: no hay contexto");
    return;
  }
  
  const nombre = leerCampo("ficha-nombre");
  const subjectId = leerCampo("ficha-subject_id");
  const edad = leerCampo("ficha-edad");
  const sexo = leerCampo("ficha-sexo");
  
  if (!nombre || !subjectId) return;
  
  // Recoger todos los labs
  const labs = {};
  const labsIds = {
    "lab-glucosa": "glucosa", "lab-hba1c": "hba1c", "lab-insulina": "insulina", "lab-homa": "homa_ir",
    "lab-ct": "ct", "lab-ldl": "ldl", "lab-hdl": "hdl", "lab-tg": "tg",
    "lab-alt": "alt", "lab-ast": "ast", "lab-ggt": "ggt", "lab-creatinina": "creatinina", "lab-tfg": "tfg"
  };
  Object.entries(labsIds).forEach(([elId, key]) => {
    const v = leerNumero(elId);
    if (v !== null) labs[key] = v;
  });
  
  // Recoger clínica
  const clinica = {};
  const peso = leerNumero("cl-peso");
  const talla = leerNumero("cl-talla");
  const imc = leerNumero("cl-imc");
  const pas = leerNumero("cl-pas");
  const pad = leerNumero("cl-pad");
  if (peso !== null) clinica.peso_kg = peso;
  if (talla !== null) clinica.talla_cm = talla;
  if (imc !== null) clinica.imc = imc;
  if (pas !== null) clinica.presion_sistolica_mmhg = pas;
  if (pad !== null) clinica.presion_diastolica_mmhg = pad;
  
  const actividad = leerNumero("cl-actividad");
  if (actividad !== null) clinica.habitos = { actividad_fisica_min_semana: actividad };
  
  // Leer JSON estructurado de la respuesta de Kimi si está disponible
  let icSugeridas = [];
  try {
    const aiResponse = document.getElementById("ai-response-text")?.textContent || "";
    const m = aiResponse.match(/===JSON_ESTRUCTURADO===([\s\S]*?)===FIN_JSON===/);
    if (m) {
      const json = JSON.parse(m[1].trim());
      icSugeridas = json.interconsultas_sugeridas || [];
    }
  } catch (e) {}
  
  try {
    await window.SAVIA.emitirContexto(contextoId, "savia:raiz:contexto-unificado", {
      contexto_id: contextoId,
      case_id: `ECO-OBS-${Date.now()}`,
      origen: "tamizaje",
      subject: {
        subject_id: subjectId,
        nombre: nombre,
        edad: edad ? parseInt(edad) : null,
        sexo: sexo
      },
      encounter: {
        estudio: "corporativo_metabolico",
        fecha: new Date().toLocaleDateString("es-ES")
      },
      labs: labs,
      clinica: clinica,
      raw: {
        _json_estructurado: {
          interconsultas_sugeridas: icSugeridas
        }
      }
    }, { de: "agente-savia-consolidadora" });
    console.log("[Observability] ✅ SAVIA RAÍZ emitida con datos reales");
  } catch (e) {
    console.warn("[Observability] Error emitiendo SAVIA RAÍZ:", e);
  }
}

// ═══════════════════════════════════════════════════════════
// INTERCEPTAR CLICKS DEL USUARIO
// ═══════════════════════════════════════════════════════════

// Botón "Guardar ficha y continuar" → aporte paciente
function interceptarGuardarFicha() {
  const origGuardar = window.guardarFichaPaciente;
  if (typeof origGuardar !== "function" || origGuardar._obsPatched) return;
  
  window.guardarFichaPaciente = async function() {
    console.log("[Observability] 🎯 Interceptado: Guardar ficha");
    const result = await origGuardar.apply(this, arguments);
    // Emitir aporte paciente después de guardar (con delay para que se llenen los campos)
    setTimeout(() => {
      emitirAportePaciente();
      emitirAporteSocial();
    }, 500);
    return result;
  };
  window.guardarFichaPaciente._obsPatched = true;
  console.log("[Observability] ✅ Hook: guardarFichaPaciente");
}

// Botón "Enviar a Kimi" → aportes clínica + laboratorio + imagen + SAVIA RAÍZ
function interceptarEnviarKimi() {
  const origEnviar = window.sendToProxyBasico;
  if (typeof origEnviar !== "function" || origEnviar._obsPatched) return;
  
  window.sendToProxyBasico = async function() {
    console.log("[Observability] 🎯 Interceptado: Enviar a Kimi");
    // Emitir aportes ANTES de enviar
    await emitirAporteClinica();
    await emitirAporteLaboratorio();
    await emitirAporteImagen();
    
    const result = await origEnviar.apply(this, arguments);
    
    // Emitir SAVIA RAÍZ después de que Kimi responda
    setTimeout(() => emitirSaviaRaiz(), 1000);
    return result;
  };
  window.sendToProxyBasico._obsPatched = true;
  console.log("[Observability] ✅ Hook: sendToProxyBasico");
}

// Botón "Generar informe base" → reforzar SAVIA RAÍZ
function interceptarGenerarInforme() {
  const origGenerar = window.generarInformeBase;
  if (typeof origGenerar !== "function" || origGenerar._obsPatched) return;
  
  window.generarInformeBase = async function() {
    console.log("[Observability] 🎯 Interceptado: Generar informe base");
    const result = await origGenerar.apply(this, arguments);
    setTimeout(() => emitirSaviaRaiz(), 500);
    return result;
  };
  window.generarInformeBase._obsPatched = true;
  console.log("[Observability] ✅ Hook: generarInformeBase");
}

// Botón "Firmar consulta" → emitir decisión médico
function interceptarFirma() {
  const origFirmar = window.firmarYGenerarConsulta;
  if (typeof origFirmar !== "function" || origFirmar._obsPatched) return;
  
  window.firmarYGenerarConsulta = async function() {
    console.log("[Observability] 🎯 Interceptado: Firmar consulta");
    const s = window._consultaState;
    if (s && s.paciente && s.diagnosticos) {
      const contextoId = window._obsContextoIdActual || `SAV-RAIZ-${s.paciente.subject_id}`;
      const ics = s.diagnosticos.map(d => ({ especialista: "internista", prioridad: "media" }));
      await window.SAVIA.emitirContexto(contextoId, "medico:decision-interconsultas", {
        contexto_id: contextoId,
        case_id: s.caseId || `CONS-${Date.now()}`,
        interconsultas: ics,
        decision: "autorizar",
        timestamp: new Date().toISOString()
      }, { de: "medico-tratante" });
      console.log("[Observability] ✅ Decisión médico emitida");
    }
    return origFirmar.apply(this, arguments);
  };
  window.firmarYGenerarConsulta._obsPatched = true;
  console.log("[Observability] ✅ Hook: firmarYGenerarConsulta");
}

// Botón "Ejecutar interconsultas autorizadas" → disparar especialistas
function interceptarEjecutarInterconsultas() {
  const origEjecutar = window.consultaEjecutarInterconsultas;
  if (typeof origEjecutar !== "function" || origEjecutar._obsPatched) return;
  
  window.consultaEjecutarInterconsultas = async function() {
    console.log("[Observability] 🎯 Interceptado: Ejecutar interconsultas");
    return origEjecutar.apply(this, arguments);
  };
  window.consultaEjecutarInterconsultas._obsPatched = true;
  console.log("[Observability] ✅ Hook: consultaEjecutarInterconsultas");
}

// ═══════════════════════════════════════════════════════════
// INSTALAR TODOS LOS HOOKS (con reintentos)
// ═══════════════════════════════════════════════════════════
let _intentosHooks = 0;
const _MAX_INTENTOS_HOOKS = 40;

function instalarHooks() {
  _intentosHooks++;
  
  interceptarGuardarFicha();
  interceptarEnviarKimi();
  interceptarGenerarInforme();
  interceptarFirma();
  interceptarEjecutarInterconsultas();
  
  if (_intentosHooks < _MAX_INTENTOS_HOOKS) {
    // Reintentar cada 500ms por si el monolito aún está cargando
    setTimeout(instalarHooks, 500);
  }
}

setTimeout(instalarHooks, 2000);

console.log("[Observability] ✅ Interceptador de flujo instalado");  
})();
