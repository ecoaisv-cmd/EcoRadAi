// ═══════════════════════════════════════════════════════════════
// OBSERVABILITY WRAPPER v2.0 — EcoRadAi Sprint 3
// Inyecta un panel visual del flujo sanguíneo (SAVIA)
// ═══════════════════════════════════════════════════════════════

(function() {
  "use strict";

  console.log("[Observability] 🚀 Iniciando wrapper v2.0 (Sangre Fluyendo)...");

  const ESTADO = {
    panelAbierto: false,
    capturadorActivo: false,
    pasoActual: 0,
    eventos: [],
    contextoIdActual: null
  };

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════
  function esperarSavia() {
    return new Promise((resolve) => {
      const inicio = Date.now();
      const interval = setInterval(() => {
        if (window.SAVIA && typeof window.SAVIA.propagar === "function") {
          clearInterval(interval);
          resolve(window.SAVIA);
        } else if (Date.now() - inicio > 60000) {
          clearInterval(interval);
          resolve(null);
        }
      }, 500);
    });
  }

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
  // LECTURA DE CAMPOS
  // ═══════════════════════════════════════════════════════════
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
                  : { sev: "normal", label: "Normal" }
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
  // INYECTAR UI (Botón y Panel)
  // ═══════════════════════════════════════════════════════════
  function inyectarBotonFlotante() {
    if (document.getElementById("obs-fab")) return;
    const fab = document.createElement("button");
    fab.id = "obs-fab";
    fab.innerHTML = "🔬";
    fab.title = "Observabilidad (Flujo Sanguíneo)";
    fab.style.cssText = `
      position: fixed; bottom: 90px; right: 20px; width: 56px; height: 56px;
      border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #0071e3);
      color: white; border: none; font-size: 24px; cursor: pointer;
      box-shadow: 0 8px 24px rgba(124,58,237,0.4); z-index: 99998;
      transition: all 0.3s ease; display: flex; align-items: center; justify-content: center;
    `;
    fab.addEventListener("click", togglePanel);
    document.body.appendChild(fab);
  }

  function inyectarPanel() {
    if (document.getElementById("obs-panel")) return;
    const panel = document.createElement("div");
    panel.id = "obs-panel";
    panel.style.cssText = `
      position: fixed; top: 0; right: -400px; width: 380px; height: 100vh;
      background: #f5f5f7; border-left: 2px solid #0071e3;
      box-shadow: -8px 0 32px rgba(0,0,0,0.2); z-index: 99999;
      transition: right 0.3s ease; display: flex; flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1d1d1f;
    `;

    panel.innerHTML = `
      <div style="padding: 14px 18px; background: linear-gradient(135deg, #1a3a5c, #0071e3); color: white; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-shrink: 0">
        <div>
          <div style="font-size: 14px; font-weight: 800; letter-spacing: -0.3px">🩸 Flujo Sanguíneo (SAVIA)</div>
          <div style="font-size: 11px; opacity: 0.85; margin-top: 2px">Sprint 3 · Árbol de agentes</div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center">
          <span id="obs-badge" style="font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 100px; background: rgba(255,255,255,0.2); text-transform: uppercase">Esperando</span>
          <button id="obs-clear" title="Limpiar" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px">🗑️</button>
          <button id="obs-close" title="Cerrar" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px">✕</button>
        </div>
      </div>

      <div id="obs-contadores" style="display: flex; gap: 6px; padding: 10px 18px; background: white; border-bottom: 1px solid #d2d2d7; flex-wrap: wrap; flex-shrink: 0">
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #e8f4fd; border-radius: 100px; font-size: 10px; font-weight: 700">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #0071e3"></span><span>RAÍZ: <span id="obs-c-raiz">0</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #fff9e6; border-radius: 100px; font-size: 10px; font-weight: 700">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #d4a017"></span><span>TRONCO: <span id="obs-c-tronco">0</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #f0fff4; border-radius: 100px; font-size: 10px; font-weight: 700">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #34c759"></span><span>SAVIA: <span id="obs-c-savia">0</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #faf5ff; border-radius: 100px; font-size: 10px; font-weight: 700">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #7c3aed"></span><span>KIMI: <span id="obs-c-kimi">0</span></span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #fff3f3; border-radius: 100px; font-size: 10px; font-weight: 700">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #ff3b30"></span><span>FRUTO: <span id="obs-c-fruto">0</span></span>
        </div>
      </div>

      <div id="obs-narrativa" style="flex: 1; overflow-y: auto; padding: 14px; background: #f9f9fa; display: flex; flex-direction: column; gap: 16px; position: relative">
        <div style="position: absolute; left: 24px; top: 20px; bottom: 20px; width: 4px; background: linear-gradient(180deg, #0071e3, #34c759, #ff3b30); border-radius: 4px; opacity: 0.15; z-index: 0"></div>
        <div id="obs-sangre-vacia" style="text-align: center; padding: 40px 20px; color: #86868b; font-size: 12px; z-index: 1; background: #f9f9fa">
          <div style="font-size: 42px; margin-bottom: 10px">🩸</div>
          <div style="font-size: 13px; font-weight: 700; color: #6e6e73; margin-bottom: 6px">El torrente sanguíneo está vacío</div>
          <div style="font-size: 11px; line-height: 1.6">Navega el monolito para inyectar SAVIA.<br>Cada agente soltará su aporte y verás los datos fluir.</div>
        </div>
      </div>

      <div style="padding: 10px 18px; background: white; border-top: 1px solid #d2d2d7; display: flex; gap: 6px; justify-content: space-between; flex-shrink: 0">
        <button id="obs-export" style="flex: 1; padding: 8px; background: #0071e3; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer">📥 Exportar log</button>
        <button id="obs-help" style="flex: 1; padding: 8px; background: #d2d2d7; color: #1d1d1f; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer">❓ Ayuda</button>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById("obs-close").addEventListener("click", togglePanel);
    document.getElementById("obs-clear").addEventListener("click", limpiarPanel);
    document.getElementById("obs-export").addEventListener("click", exportarLog);
    document.getElementById("obs-help").addEventListener("click", mostrarAyuda);
  }

  function togglePanel() {
    const panel = document.getElementById("obs-panel");
    const fab = document.getElementById("obs-fab");
    const body = document.body;
    if (!panel || !body) return;

    ESTADO.panelAbierto = !ESTADO.panelAbierto;
    
    if (ESTADO.panelAbierto) {
      panel.style.right = "0";
      body.style.marginRight = "380px";
      body.style.width = "calc(100% - 380px)";
      if (fab) fab.style.right = "400px";
      if (!ESTADO.capturadorActivo) activarCapturador();
    } else {
      panel.style.right = "-400px";
      body.style.marginRight = "0";
      body.style.width = "100%";
      if (fab) fab.style.right = "20px";
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CAPTURADOR SAVIA
  // ═══════════════════════════════════════════════════════════
  async function activarCapturador() {
    const savia = await esperarSavia();
    if (!savia || savia.propagar._obsPatched) {
      if (savia) ESTADO.capturadorActivo = true;
      return;
    }

    const origPropagar = savia.propagar;
    savia.propagar = function(evento) {
      try { procesarEvento(evento); } catch (e) { console.warn(e); }
      return origPropagar.apply(this, arguments);
    };
    savia.propagar._obsPatched = true;
    ESTADO.capturadorActivo = true;

    document.getElementById("obs-badge").textContent = "✅ Activo";
    document.getElementById("obs-badge").style.background = "rgba(52,199,89,0.6)";
  }

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
      if (tipo === "especialista:respuesta") return renderEspecialistaRespuesta(payload, evento);
      if (tipo === "savia:tronco:plan-integrado") return renderPlanIntegrado(payload, evento);
      if (tipo === "medico:decision-interconsultas") return renderDecisionMedico(payload, evento);
    } catch (e) {
      console.error("[Observability] Error procesando", tipo, e);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER UI (Flujo Sanguíneo)
  // ═══════════════════════════════════════════════════════════
  function tablaDatos(filas, thead) {
    return `
      <div style="overflow-x: auto; margin: 8px 0; border-radius: 8px; border: 1px solid #e8e8ed;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; min-width: 250px;">
          ${thead ? `<thead><tr style="background: #f9f9fa">${thead.map(h => `<th style="padding: 8px 12px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #86868b; border-bottom: 1px solid #e8e8ed">${h}</th>`).join("")}</tr></thead>` : ""}
          <tbody style="background: white">${filas}</tbody>
        </table>
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

  function agregarPaso(config) {
    ESTADO.pasoActual++;
    const n = ESTADO.pasoActual;
    const narrativa = document.getElementById("obs-narrativa");
    const empty = document.getElementById("obs-sangre-vacia");
    if (empty) empty.remove();

    const card = document.createElement("div");
    card.style.cssText = `
      position: relative; z-index: 1; background: white; border: 1px solid #e8e8ed;
      border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);
      animation: obsSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      margin-left: 20px; overflow: hidden;
    `;

    const badgeColor = config.badgeColor || config.color || "#0071e3";
    const color = config.color || "#0071e3";

    card.innerHTML = `
      <div style="padding: 12px 16px; background: ${color}11; border-bottom: 1px solid ${color}22; display: flex; align-items: flex-start; gap: 12px; position: relative">
        <div style="position: absolute; left: -31px; top: 14px; width: 16px; height: 16px; border-radius: 50%; background: ${color}; border: 3px solid white; box-shadow: 0 0 0 2px ${color}44; z-index: 2"></div>
        <div style="flex: 1; min-width: 0">
          <div style="font-size: 13px; font-weight: 800; color: #1d1d1f; margin-bottom: 2px">${escapeHtml(config.titulo)}</div>
          <div style="font-size: 10px; color: #86868b; font-family: ui-monospace, monospace">${escapeHtml(config.subtitulo || "")}</div>
        </div>
        <span style="font-size: 9px; font-weight: 800; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; background: ${badgeColor}; color: white; flex-shrink: 0; letter-spacing: 0.5px">${config.badge || ""}</span>
      </div>
      <div style="padding: 16px; font-size: 12px; line-height: 1.6">${config.html || ""}</div>
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

  // ═══════════════════════════════════════════════════════════
  // RENDERS ESPECÍFICOS
  // ═══════════════════════════════════════════════════════════
  function renderAportePaciente(payload, evento) {
    const s = payload.subject || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    const filas = `
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c; width: 40%">Nombre</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; font-weight: 700; text-align: right">${escapeHtml(s.nombre || "—")}</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">ID</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; text-align: right">${escapeHtml(s.subject_id || "—")}</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">Edad</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; text-align: right">${escapeHtml(String(s.edad || "—"))} años</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">Sexo</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; text-align: right">${escapeHtml(s.sexo || "—")}</td></tr>
      <tr><td style="padding: 5px 10px; font-weight: 600; color: #1a3a5c">Empresa</td><td style="padding: 5px 10px; font-family: monospace; text-align: right">${escapeHtml(s.empresa || "—")}</td></tr>
    `;
    agregarPaso({
      color: "#0071e3", badge: "RAÍZ", badgeColor: "#0071e3",
      titulo: "Aporte Paciente (Demografía)",
      subtitulo: `savia:aporte-paciente · ${formatearHora(evento.timestamp)}`,
      html: `${tablaDatos(filas)}<div style="margin-top:8px; font-size:10px; color:#0071e3; font-weight:700;">🩸 Sangre inyectada al torrente</div>`
    });
  }

  function renderAporteClinica(payload, evento) {
    const c = payload.clinica || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    ["imc", "presion_sistolica_mmhg", "presion_diastolica_mmhg", "frecuencia_cardiaca_lpm", "peso_kg", "talla_cm"].forEach(k => {
      if (c[k] !== undefined && c[k] !== null) {
        const i = interpretarClave(k, c[k]);
        filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${k}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; font-weight: 700; text-align: right">${c[k]}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; text-align: center">${sevBadge(i.sev, i.label)}</td></tr>`;
      }
    });
    agregarPaso({
      color: "#0071e3", badge: "RAÍZ", badgeColor: "#0071e3",
      titulo: "Aporte Clínica (Signos Vitales)",
      subtitulo: `savia:aporte-clinica · ${formatearHora(evento.timestamp)}`,
      html: `${tablaDatos(filas, ["Dato", "Valor", "Estado"])}`
    });
  }

  function renderAporteLaboratorio(payload, evento) {
    const labs = payload.labs || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    Object.keys(labs).forEach(k => {
      if (labs[k] === null || labs[k] === undefined) return;
      const i = interpretarClave(k, labs[k]);
      filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${NOMBRES_LABS[k] || k}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; font-weight: 700; text-align: right">${labs[k]} ${UNIDADES_LABS[k]||""}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; text-align: center">${sevBadge(i.sev, i.label)}</td></tr>`;
    });
    agregarPaso({
      color: "#0071e3", badge: "RAÍZ", badgeColor: "#0071e3",
      titulo: "Aporte Laboratorio",
      subtitulo: `savia:aporte-laboratorio · ${formatearHora(evento.timestamp)}`,
      html: `${tablaDatos(filas, ["Examen", "Valor", "Estado"])}`
    });
  }

  function renderAporteImagen(payload, evento) {
    const img = payload.imagen || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    Object.keys(img).forEach(k => {
      if (img[k] === null || img[k] === undefined) return;
      filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${k}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; text-align: right">${img[k]}</td></tr>`;
    });
    if(!filas) return;
    agregarPaso({
      color: "#0071e3", badge: "RAÍZ", badgeColor: "#0071e3",
      titulo: "Aporte Imagen",
      subtitulo: `savia:aporte-imagen · ${formatearHora(evento.timestamp)}`,
      html: `${tablaDatos(filas)}`
    });
  }

  function renderAporteSocial(payload, evento) {
    const soc = payload.social || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    Object.keys(soc).forEach(k => {
      if (soc[k] === null || soc[k] === undefined) return;
      filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${k}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; text-align: right">${soc[k]}</td></tr>`;
    });
    if(!filas) return;
    agregarPaso({
      color: "#0071e3", badge: "RAÍZ", badgeColor: "#0071e3",
      titulo: "Aporte Trabajo Social",
      subtitulo: `savia:aporte-social · ${formatearHora(evento.timestamp)}`,
      html: `${tablaDatos(filas)}`
    });
  }

  function renderSaviaRaiz(payload, evento) {
    ESTADO.eventos.push({ tipo: "savia", evento });
    const s = payload.subject || {};
    const ics = (payload.raw?._json_estructurado?.interconsultas_sugeridas) || [];
    const chips = ics.map(ic => `<span style="display:inline-block; font-size:10px; font-weight:700; padding:3px 8px; border-radius:100px; background:#e8f4fd; color:#0071e3; font-family:monospace; margin:2px">${ic.especialista}</span>`).join("");
    
    agregarPaso({
      color: "#34c759", badge: "SAVIA", badgeColor: "#34c759",
      titulo: "Corazón: SAVIA RAÍZ Consolidada",
      subtitulo: `savia:raiz:contexto-unificado · ${formatearHora(evento.timestamp)}`,
      html: `
        <div style="margin-bottom: 10px; color: #333; font-size: 12px">La consolidadora unió los 5 aportes en un solo contexto para Kimi.</div>
        <div style="background:#f0fff4; border-radius:8px; padding:10px; font-size:11px; border:1px solid #34c75944">
          <strong>Paciente:</strong> ${escapeHtml(s.nombre)}<br>
          <strong>Labs:</strong> ${Object.keys(payload.labs||{}).length} exámenes<br>
          <strong>Clínica:</strong> ${Object.keys(payload.clinica||{}).length} campos<br>
          <strong>Sugerencias IA:</strong> ${ics.length} interconsultas<br>
          ${chips ? `<div style="margin-top:6px">${chips}</div>` : ""}
        </div>
      `
    });
  }

  function renderCoordinadorInforme(payload, evento) {
    ESTADO.eventos.push({ tipo: "tronco", evento });
    const ics = payload.interconsultas_sugeridas || [];
    let filas = "";
    ics.forEach(ic => {
      const pColor = ic.prioridad === "alta" ? "critico" : ic.prioridad === "media" ? "leve" : "normal";
      filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${ic.especialista}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; text-align: center">${sevBadge(pColor, ic.prioridad)}</td></tr>`;
    });
    
    agregarPaso({
      color: "#d4a017", badge: "TRONCO", badgeColor: "#d4a017",
      titulo: "Cerebro: Informe TRONCO",
      subtitulo: `savia:tronco:informe-kimi · ${formatearHora(evento.timestamp)}`,
      html: `
        <div style="margin-bottom: 10px; color: #333; font-size: 12px">El coordinador procesó la SAVIA y extrajo las interconsultas.</div>
        ${ics.length > 0 ? tablaDatos(filas, ["Especialista", "Prioridad"]) : '<div style="color:#ff9500;font-size:11px;">No se detectaron interconsultas en el JSON.</div>'}
      `
    });
  }

  function renderEspecialistaRespuesta(payload, evento) {
    ESTADO.eventos.push({ tipo: "tronco", evento });
    const esp = payload.especialista || "Especialista";
    const res = payload.resultado || payload;
    agregarPaso({
      color: "#d4a017", badge: "TRONCO", badgeColor: "#d4a017",
      titulo: `Órgano: Respuesta de ${esp}`,
      subtitulo: `especialista:respuesta · ${formatearHora(evento.timestamp)}`,
      html: `<div style="font-size:11px; color:#333; max-height:100px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(res.resumen || res.diagnostico || "Especialista procesó el caso.")}</div>`
    });
  }

  function renderPlanIntegrado(payload, evento) {
    ESTADO.eventos.push({ tipo: "fruto", evento });
    agregarPaso({
      color: "#ff3b30", badge: "FRUTO", badgeColor: "#ff3b30",
      titulo: "Tejido: Plan Integrado Final",
      subtitulo: `savia:tronco:plan-integrado · ${formatearHora(evento.timestamp)}`,
      html: `<div style="background:#fff3f3; padding:10px; border-radius:8px; font-size:11px;">El plan final ha sido generado exitosamente.</div>`
    });
  }

  function renderDecisionMedico(payload, evento) {
    ESTADO.eventos.push({ tipo: "tronco", evento });
    const ics = payload.interconsultas || [];
    agregarPaso({
      color: "#1a3a5c", badge: "MÉDICO", badgeColor: "#1a3a5c",
      titulo: `Médico autorizó ${ics.length} interconsultas`,
      subtitulo: `medico:decision-interconsultas · ${formatearHora(evento.timestamp)}`,
      html: `<div style="font-size:11px; color:#333;">El médico dio el visto bueno para que los especialistas analicen el caso.</div>`
    });
  }

  // ═══════════════════════════════════════════════════════════
  // INYECTORES DE SANGRE (Hooks del Monolito)
  // ═══════════════════════════════════════════════════════════
  
  async function emitirAportePaciente() {
    if (!window.SAVIA) return;
    
    const nombre = leerCampo("ficha-nombre");
    let subjectId = leerCampo("ficha-subject_id");
    
    // Fix del ID ????
    if (subjectId && subjectId.includes("????")) {
      await new Promise(r => setTimeout(r, 1000));
      subjectId = leerCampo("ficha-subject_id");
    }

    if (!nombre || !subjectId) return;
    
    const edad = leerCampo("ficha-edad");
    const sexo = leerCampo("ficha-sexo");
    const empresaSelect = document.getElementById("ficha-empresa_id");
    const empresaTexto = empresaSelect?.selectedOptions?.[0]?.textContent || "";
    
    ESTADO.contextoIdActual = `SAV-RAIZ-${subjectId}-${Date.now()}`;
    
    await window.SAVIA.emitirContexto(ESTADO.contextoIdActual, "savia:aporte-paciente", {
      contexto_id: ESTADO.contextoIdActual,
      subject: {
        subject_id: subjectId, nombre: nombre, edad: edad ? parseInt(edad) : null,
        sexo: sexo, departamento: leerCampo("ficha-departamento"), empresa: empresaTexto || null
      }
    }, { de: "agente-paciente" });
    console.log("[Observability] 🩸 Sangre: Aporte Paciente inyectado");
  }

  async function emitirAporteClinica() {
    if (!window.SAVIA || !ESTADO.contextoIdActual) return;
    const clinica = {};
    ["peso_kg|cl-peso", "talla_cm|cl-talla", "imc|cl-imc", "presion_sistolica_mmhg|cl-pas", "presion_diastolica_mmhg|cl-pad"].forEach(par => {
      const [k, id] = par.split("|");
      const v = leerNumero(id);
      if (v !== null) clinica[k] = v;
    });
    const act = leerNumero("cl-actividad");
    if (act !== null) clinica.habitos = { actividad_fisica_min_semana: act };
    
    if (Object.keys(clinica).length === 0) return;
    await window.SAVIA.emitirContexto(ESTADO.contextoIdActual, "savia:aporte-clinica", { contexto_id: ESTADO.contextoIdActual, clinica }, { de: "agente-clinica" });
    console.log("[Observability] 🩸 Sangre: Aporte Clínica inyectado");
  }

  async function emitirAporteLaboratorio() {
    if (!window.SAVIA || !ESTADO.contextoIdActual) return;
    const labs = {};
    const ids = { "lab-glucosa":"glucosa", "lab-hba1c":"hba1c", "lab-insulina":"insulina", "lab-homa":"homa_ir", "lab-ct":"ct", "lab-ldl":"ldl", "lab-hdl":"hdl", "lab-tg":"tg", "lab-alt":"alt", "lab-creatinina":"creatinina", "lab-tfg":"tfg" };
    Object.entries(ids).forEach(([elId, key]) => {
      const v = leerNumero(elId);
      if (v !== null) labs[key] = v;
    });
    if (Object.keys(labs).length === 0) return;
    await window.SAVIA.emitirContexto(ESTADO.contextoIdActual, "savia:aporte-laboratorio", { contexto_id: ESTADO.contextoIdActual, labs }, { de: "agente-laboratorio" });
    console.log("[Observability] 🩸 Sangre: Aporte Labs inyectado");
  }

  async function emitirSaviaRaiz() {
    if (!window.SAVIA || !ESTADO.contextoIdActual) return;
    const nombre = leerCampo("ficha-nombre");
    const subjectId = leerCampo("ficha-subject_id");
    if (!nombre || !subjectId) return;
    
    let icSugeridas = [];
    try {
      const aiResponse = document.getElementById("ai-response-text")?.textContent || "";
      const m = aiResponse.match(/===JSON_ESTRUCTURADO===([\s\S]*?)===FIN_JSON===/);
      if (m) icSugeridas = JSON.parse(m[1].trim()).interconsultas_sugeridas || [];
    } catch (e) {}

    // Fix: Empaquetar el JSON para que el coordinador lo lea
    await window.SAVIA.emitirContexto(ESTADO.contextoIdActual, "savia:raiz:contexto-unificado", {
      contexto_id: ESTADO.contextoIdActual,
      case_id: `ECO-OBS-${Date.now()}`,
      origen: "tamizaje",
      subject: { subject_id: subjectId, nombre: nombre, edad: parseInt(leerCampo("ficha-edad")) || null, sexo: leerCampo("ficha-sexo") },
      labs: (() => { const l={}; ["lab-glucosa|glucosa","lab-hba1c|hba1c","lab-homa|homa_ir","lab-ldl|ldl","lab-hdl|hdl","lab-tg|tg"].forEach(p=>{const [id,k]=p.split("|");const v=leerNumero(id);if(v!==null)l[k]=v;});return l; })(),
      clinica: { imc: leerNumero("cl-imc"), presion_sistolica_mmhg: leerNumero("cl-pas") },
      raw: {
        _json_estructurado: { interconsultas_sugeridas: icSugeridas, diagnostico_diferencial: [], plan: { farmacologico: [], no_farmacologico: [], metas: [] } },
        interconsultas_sugeridas: icSugeridas
      }
    }, { de: "agente-savia-consolidadora" });
    console.log("[Observability] 🩸 Sangre: SAVIA RAÍZ bombeada");
  }

  // ═══════════════════════════════════════════════════════════
  // INSTALAR HOOKS EN EL MONOLITO
  // ═══════════════════════════════════════════════════════════
  function instalarHooks() {
    // 1. Hook para guardar ficha (paciente nuevo)
    if (typeof window.guardarFichaPaciente === "function" && !window.guardarFichaPaciente._obsPatched) {
      const orig = window.guardarFichaPaciente;
      window.guardarFichaPaciente = async function() {
        const r = await orig.apply(this, arguments);
        setTimeout(emitirAportePaciente, 800); // Esperar a que se guarde
        return r;
      };
      window.guardarFichaPaciente._obsPatched = true;
      console.log("[Observability] ✅ Hook: guardarFichaPaciente");
    }

           // 2. Hook para seleccionar paciente existente
    if (typeof window.seleccionarPacienteConsulta === "function" && !window.seleccionarPacienteConsulta._obsPatched) {
      const orig = window.seleccionarPacienteConsulta;
      window.seleccionarPacienteConsulta = async function() {
        // 1. Ejecutamos la función original del monolito (que ahora ya no fallará)
        const r = await orig.apply(this, arguments);
        
        // 2. Leemos inmediatamente el paciente del estado global
        if (window._consultaState && window._consultaState.paciente) {
          const pac = window._consultaState.paciente;
          
          if (window.SAVIA) {
            // Creamos el contexto y emitimos la sangre
            const ctxId = `SAV-RAIZ-${pac.subject_id}-${Date.now()}`;
            window._obsContextoIdActual = ctxId; // Guardar para los demás agentes
            
            window.SAVIA.emitirContexto(ctxId, "savia:aporte-paciente", {
              contexto_id: ctxId,
              subject: {
                subject_id: pac.subject_id,
                nombre: pac.nombre,
                edad: pac.edad,
                sexo: pac.sexo,
                departamento: pac.departamento,
                empresa: pac.empresa || "Sin empresa"
              }
            }, { de: "agente-paciente" }).then(() => {
              console.log("[Observability] 🩸 Sangre: Paciente cargado inyectado");
            }).catch(e => console.warn(e));
          }
        }
        return r;
      };
      window.seleccionarPacienteConsulta._obsPatched = true;
      console.log("[Observability] ✅ Hook: seleccionarPacienteConsulta (Blindado)");
    }

    // 3. Hook para enviar a Kimi (dispara clínica y labs)
    if (typeof window.sendToProxyBasico === "function" && !window.sendToProxyBasico._obsPatched) {
      const orig = window.sendToProxyBasico;
      window.sendToProxyBasico = async function() {
        await emitirAporteClinica();
        await emitirAporteLaboratorio();
        const r = await orig.apply(this, arguments);
        setTimeout(emitirSaviaRaiz, 1000);
        return r;
      };
      window.sendToProxyBasico._obsPatched = true;
      console.log("[Observability] ✅ Hook: sendToProxyBasico");
    }

    // 4. Hook para generar informe base (refuerza SAVIA RAÍZ)
    if (typeof window.generarInformeBase === "function" && !window.generarInformeBase._obsPatched) {
      const orig = window.generarInformeBase;
      window.generarInformeBase = async function() {
        const r = await orig.apply(this, arguments);
        setTimeout(emitirSaviaRaiz, 500);
        return r;
      };
      window.generarInformeBase._obsPatched = true;
      console.log("[Observability] ✅ Hook: generarInformeBase");
    }
  }

  // Reintentar instalar hooks cada 1s por si el monolito tarda en cargar
  let intentos = 0;
  const intervalHooks = setInterval(() => {
    instalarHooks();
    intentos++;
    if (intentos > 60) clearInterval(intervalHooks);
  }, 1000);

  // ═══════════════════════════════════════════════════════════
  // UTILIDADES DE UI (Limpiar, Exportar, Ayuda)
  // ═══════════════════════════════════════════════════════════
  function limpiarPanel() {
    if (!confirm("¿Limpiar el torrente sanguíneo?")) return;
    ESTADO.pasoActual = 0; ESTADO.eventos = [];
    document.getElementById("obs-narrativa").innerHTML = `
      <div style="position: absolute; left: 24px; top: 20px; bottom: 20px; width: 4px; background: linear-gradient(180deg, #0071e3, #34c759, #ff3b30); border-radius: 4px; opacity: 0.15; z-index: 0"></div>
      <div id="obs-sangre-vacia" style="text-align: center; padding: 40px 20px; color: #86868b; font-size: 12px; z-index: 1; background: #f9f9fa">
        <div style="font-size: 42px; margin-bottom: 10px">🩸</div>
        <div style="font-size: 13px; font-weight: 700; color: #6e6e73; margin-bottom: 6px">El torrente sanguíneo está vacío</div>
        <div style="font-size: 11px; line-height: 1.6">Navega el monolito para inyectar SAVIA.<br>Cada agente soltará su aporte y verás los datos fluir.</div>
      </div>
    `;
    actualizarContadores();
  }

  function exportarLog() {
    const log = ESTADO.eventos.map((e, i) => ({
      paso: i + 1, tipo: e.evento?.tipo, de: e.evento?.de, timestamp: e.evento?.timestamp, payload: e.evento?.payload
    }));
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `observability-log-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function mostrarAyuda() {
    alert("🩸 ¿Cómo funciona la SAVIA?\n\nLos agentes no emiten datos con cada tecla que presionas, sino en bloques (al Guardar ficha y al Enviar a Kimi).\n\n1. El agente-paciente inyecta la sangre cuando guardas o cargas la ficha.\n2. Los agentes de clínica y labs inyectan cuando presionas 'Enviar a Kimi'.\n3. La SAVIA fluye hacia el coordinador y especialistas.\n\nTodo se reflejará en esta línea de tiempo.");
  }

  // ═══════════════════════════════════════════════════════════
  // ANIMACIONES Y ARRANQUE
  // ═══════════════════════════════════════════════════════════
  function inyectarEstilos() {
    if (document.getElementById("obs-styles")) return;
    const style = document.createElement("style");
    style.id = "obs-styles";
    style.textContent = `@keyframes obsSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`;
    document.head.appendChild(style);
  }

  function init() {
    inyectarEstilos();
    inyectarBotonFlotante();
    inyectarPanel();
    setTimeout(activarCapturador, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 500);
  }

})();
