// ═══════════════════════════════════════════════════════════════
// OBSERVABILITY WRAPPER v5.1 — EcoRadAi Sprint 3
// FIX: Deduplicación de eventos, modal de diagnóstico,
//      detección de dirección de paso
// ═══════════════════════════════════════════════════════════════

(function() {
  "use strict";

  const VERSION = "5.1";
  const ESTADO = {
    panelAbierto: false,
    capturadorActivo: false,
    pasoActual: 0,
    eventos: [],
    contextoIdActual: null,
    iniciado: false,
    saviaDisponible: false,
    intervaloVigilante: null,
    intentosSavia: 0,
    // ✅ FIX: Cache de hashes para deduplicación
    hashesEmitidos: new Set(),
    ultimoStepIndex: -1
  };

  let ultimoPacienteInyectado = "";
  let ultimaSeccionVista = "";
  let _debounceClickTimer = null;

  console.log(`%c[Observability] 🚀 Wrapper v${VERSION} cargando...`, "background:#0071e3;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 1 — ESCUDO: Silenciador de errores externos
  // ═══════════════════════════════════════════════════════════
  window.addEventListener("error", (e) => {
    if (e.message && (e.message.includes("docx") || e.message.includes("qrcode"))) {
      e.preventDefault();
      return true;
    }
    if (e.target && e.target.tagName === "SCRIPT") {
      const src = (e.target.src || "").toLowerCase();
      if (src.includes("docx") || src.includes("qrcode")) {
        e.preventDefault();
        console.warn("[Observability] 🔇 Script externo caído (silenciado):", src);
        return true;
      }
    }
  }, true);

  window.addEventListener("unhandledrejection", (e) => {
    const reason = String(e.reason || "");
    if (reason.includes("docx") || reason.includes("qrcode")) {
      e.preventDefault();
    }
  });

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 2 — HELPERS
  // ═══════════════════════════════════════════════════════════
  function esperarSavia(maxIntentos, intervaloMs) {
    maxIntentos = maxIntentos || 60;
    intervaloMs = intervaloMs || 1000;
    return new Promise((resolve) => {
      let intentos = 0;
      const interval = setInterval(() => {
        intentos++;
        if (window.SAVIA && typeof window.SAVIA.propagar === "function") {
          clearInterval(interval);
          ESTADO.saviaDisponible = true;
          console.log(`[Observability] ✓ SAVIA detectado en intento ${intentos}`);
          resolve(window.SAVIA);
        } else if (intentos >= maxIntentos) {
          clearInterval(interval);
          console.warn(`[Observability] ⚠️ SAVIA no disponible tras ${intentos} intentos.`);
          resolve(null);
        }
      }, intervaloMs);
    });
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function formatearHora(iso) {
    try {
      return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch { return "—"; }
  }

  function leerNumero(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const val = el.value;
    if (val === "") return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }

  // ✅ FIX: Generar hash único para un aporte
  function generarHashAporte(tipo, contextoId, datos) {
    const str = tipo + "|" + (contextoId || "") + "|" + JSON.stringify(datos);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return tipo + "_" + Math.abs(hash).toString(36);
  }

  // ✅ FIX: Verificar si un aporte ya fue emitido
  function yaFueEmitido(hash) {
    if (ESTADO.hashesEmitidos.has(hash)) {
      console.log("[Observability] ⏭️ Aporte ya emitido, ignorando:", hash);
      return true;
    }
    return false;
  }

  // ✅ FIX: Marcar aporte como emitido
  function marcarComoEmitido(hash) {
    ESTADO.hashesEmitidos.add(hash);
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 3 — INTERPRETACIONES CLÍNICAS
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
  // SECCIÓN 4 — INYECCIÓN DE UI
  // ═══════════════════════════════════════════════════════════
  function inyectarBotonFlotante() {
    if (document.getElementById("obs-fab")) return;
    const fab = document.createElement("button");
    fab.id = "obs-fab";
    fab.innerHTML = "🔬"; 
    fab.title = "Observabilidad (Flujo de SAVIA)";
    fab.style.cssText = `
      position: fixed; bottom: 90px; right: 20px; width: 56px; height: 56px;
      border-radius: 50%; background: linear-gradient(135deg, #34c759, #0071e3);
      color: white; border: none; font-size: 24px; cursor: pointer;
      box-shadow: 0 8px 24px rgba(52,199,89,0.4); z-index: 99998;
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
      background: #f5f5f7; border-left: 2px solid #34c759;
      box-shadow: -8px 0 32px rgba(0,0,0,0.2); z-index: 99999;
      transition: right 0.3s ease; display: flex; flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1d1d1f;
    `;

    panel.innerHTML = `
      <div style="padding: 14px 18px; background: linear-gradient(135deg, #1a3a5c, #34c759); color: white; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-shrink: 0">
        <div>
          <div style="font-size: 14px; font-weight: 800; letter-spacing: -0.3px">🌿 Flujo de SAVIA</div>
          <div style="font-size: 11px; opacity: 0.85; margin-top: 2px">Sprint 3 · Árbol de agentes · v${VERSION}</div>
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
        <div style="position: absolute; left: 24px; top: 20px; bottom: 20px; width: 4px; background: linear-gradient(180deg, #34c759, #0071e3); border-radius: 4px; opacity: 0.15; z-index: 0"></div>
        <div id="obs-sangre-vacia" style="text-align: center; padding: 40px 20px; color: #86868b; font-size: 12px; z-index: 1; background: #f9f9fa">
          <div style="font-size: 42px; margin-bottom: 10px">🌿</div>
          <div style="font-size: 13px; font-weight: 700; color: #6e6e73; margin-bottom: 6px">El árbol está listo</div>
          <div style="font-size: 11px; line-height: 1.6">Navega el monolito para que los agentes empiecen a aportar SAVIA.</div>
        </div>
      </div>

      <div style="padding: 10px 18px; background: white; border-top: 1px solid #d2d2d7; display: flex; gap: 6px; justify-content: space-between; flex-shrink: 0">
        <button id="obs-export" style="flex: 1; padding: 8px; background: #34c759; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer">📥 Exportar log</button>
        <button id="obs-help" style="flex: 1; padding: 8px; background: #d2d2d7; color: #1d1d1f; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer">❓ Ayuda</button>
        <button id="obs-diag" style="flex: 0.6; padding: 8px; background: #0071e3; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer">🔧 Diag</button>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById("obs-close").addEventListener("click", togglePanel);
    document.getElementById("obs-clear").addEventListener("click", limpiarPanel);
    document.getElementById("obs-export").addEventListener("click", exportarLog);
    document.getElementById("obs-help").addEventListener("click", mostrarAyuda);
    document.getElementById("obs-diag").addEventListener("click", mostrarDiagnostico); // ✅ FIX: ahora abre modal
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
  // SECCIÓN 5 — CAPTURADOR SAVIA
  // ═══════════════════════════════════════════════════════════
  async function activarCapturador() {
    if (ESTADO.capturadorActivo) return;

    const savia = await esperarSavia(60, 1000);
    
    if (!savia) {
      const badge = document.getElementById("obs-badge");
      if (badge) {
        badge.textContent = "⚠️ Sin SAVIA";
        badge.style.background = "rgba(255,149,0,0.6)";
      }
      ESTADO.capturadorActivo = true;
      return;
    }

    if (savia.propagar._obsPatched) {
      ESTADO.capturadorActivo = true;
      return;
    }

    const origPropagar = savia.propagar;
    savia.propagar = function(evento) {
      try { procesarEvento(evento); } catch (e) { console.warn("[Observability] Error procesando evento:", e); }
      return origPropagar.apply(this, arguments);
    };
    savia.propagar._obsPatched = true;
    ESTADO.capturadorActivo = true;
    ESTADO.saviaDisponible = true;

    const badge = document.getElementById("obs-badge");
    if (badge) {
      badge.textContent = "✅ Activo";
      badge.style.background = "rgba(52,199,89,0.6)";
    }
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
  // SECCIÓN 6 — RENDER UI (con deduplicación)
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
      normal: { bg: "#f0fff4", fg: "#1a4a2a" }, leve: { bg: "#fff9e6", fg: "#8a6a00" },
      moderado: { bg: "#ffe8d1", fg: "#8a4400" }, alto: { bg: "#ffdad6", fg: "#7a1a1a" },
      critico: { bg: "#ff3b30", fg: "white" }
    };
    const c = colors[sev] || colors.normal;
    return `<span style="display: inline-block; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 100px; background: ${c.bg}; color: ${c.fg}; text-transform: uppercase">${label}</span>`;
  }

  function agregarPaso(config, hash) {
    // ✅ FIX: Verificar deduplicación
    if (hash && yaFueEmitido(hash)) {
      return;
    }
    if (hash) marcarComoEmitido(hash);

    ESTADO.pasoActual++;
    const narrativa = document.getElementById("obs-narrativa");
    if (!narrativa) return;
    const empty = document.getElementById("obs-sangre-vacia");
    if (empty) empty.remove();

    const card = document.createElement("div");
    card.style.cssText = `
      position: relative; z-index: 1; background: white; border: 1px solid #e8e8ed;
      border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);
      animation: obsSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      margin-left: 20px; overflow: hidden;
    `;

    const badgeColor = config.badgeColor || config.color || "#34c759";
    const color = config.color || "#34c759";

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

  // RENDERS ESPECÍFICOS (con hash para deduplicación)
  function renderAportePaciente(payload, evento) {
    const s = payload.subject || payload;
    const hash = generarHashAporte("paciente", payload.contexto_id, s);
    ESTADO.eventos.push({ tipo: "raiz", evento });
    const filas = `
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c; width: 40%">Nombre</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; font-weight: 700; text-align: right">${escapeHtml(s.nombre || "—")}</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">ID</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; text-align: right">${escapeHtml(s.subject_id || "—")}</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">Edad</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; text-align: right">${escapeHtml(String(s.edad || "—"))} años</td></tr>
      <tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">Sexo</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; text-align: right">${escapeHtml(s.sexo || "—")}</td></tr>
    `;
    agregarPaso({ color: "#34c759", badge: "RAÍZ", badgeColor: "#0071e3", titulo: "Aporte Paciente (Demografía)", subtitulo: `savia:aporte-paciente · ${formatearHora(evento.timestamp)}`, html: `${tablaDatos(filas)}<div style="margin-top:8px; font-size:10px; color:#34c759; font-weight:700;">🌿 SAVIA inyectada al árbol</div>` }, hash);
  }

  function renderAporteClinica(payload, evento) {
    const c = payload.clinica || payload;
    const hash = generarHashAporte("clinica", payload.contexto_id, c);
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    ["imc", "presion_sistolica_mmhg", "presion_diastolica_mmhg", "frecuencia_cardiaca_lpm"].forEach(k => {
      if (c[k] !== undefined && c[k] !== null) {
        const i = interpretarClave(k, c[k]);
        filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${k}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; font-weight: 700; text-align: right">${c[k]}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; text-align: center">${sevBadge(i.sev, i.label)}</td></tr>`;
      }
    });
    agregarPaso({ color: "#34c759", badge: "RAÍZ", badgeColor: "#0071e3", titulo: "Aporte Clínica (Signos Vitales)", subtitulo: `savia:aporte-clinica · ${formatearHora(evento.timestamp)}`, html: `${tablaDatos(filas, ["Dato", "Valor", "Estado"])}` }, hash);
  }

  function renderAporteLaboratorio(payload, evento) {
    const labs = payload.labs || payload;
    const hash = generarHashAporte("labs", payload.contexto_id, labs);
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    Object.keys(labs).forEach(k => {
      if (labs[k] === null || labs[k] === undefined) return;
      const i = interpretarClave(k, labs[k]);
      filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${NOMBRES_LABS[k] || k}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; font-weight: 700; text-align: right">${labs[k]} ${UNIDADES_LABS[k]||""}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; text-align: center">${sevBadge(i.sev, i.label)}</td></tr>`;
    });
    if(!filas) return;
    agregarPaso({ color: "#34c759", badge: "RAÍZ", badgeColor: "#0071e3", titulo: "Aporte Laboratorio", subtitulo: `savia:aporte-laboratorio · ${formatearHora(evento.timestamp)}`, html: `${tablaDatos(filas, ["Examen", "Valor", "Estado"])}` }, hash);
  }

  function renderAporteImagen(payload, evento) {
    const img = payload.imagen || payload;
    const hash = generarHashAporte("imagen", payload.contexto_id, img);
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    Object.keys(img).forEach(k => {
      if (img[k] === null || img[k] === undefined) return;
      filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${k}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; text-align: right">${img[k]}</td></tr>`;
    });
    if(!filas) return;
    agregarPaso({ color: "#34c759", badge: "RAÍZ", badgeColor: "#0071e3", titulo: "Aporte Imagen", subtitulo: `savia:aporte-imagen · ${formatearHora(evento.timestamp)}`, html: `${tablaDatos(filas)}` }, hash);
  }

  function renderAporteSocial(payload, evento) {
    const soc = payload.social || payload;
    const hash = generarHashAporte("social", payload.contexto_id, soc);
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    Object.keys(soc).forEach(k => {
      if (soc[k] === null || soc[k] === undefined) return;
      filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${k}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; text-align: right">${soc[k]}</td></tr>`;
    });
    if(!filas) return;
    agregarPaso({ color: "#34c759", badge: "RAÍZ", badgeColor: "#0071e3", titulo: "Aporte Trabajo Social", subtitulo: `savia:aporte-social · ${formatearHora(evento.timestamp)}`, html: `${tablaDatos(filas)}` }, hash);
  }

  function renderSaviaRaiz(payload, evento) {
    const hash = generarHashAporte("savia_raiz", payload.contexto_id, payload);
    ESTADO.eventos.push({ tipo: "savia", evento });
    const s = payload.subject || {};
    const ics = (payload.raw?._json_estructurado?.interconsultas_sugeridas) || [];
    const chips = ics.map(ic => `<span style="display:inline-block; font-size:10px; font-weight:700; padding:3px 8px; border-radius:100px; background:#e8f4fd; color:#0071e3; font-family:monospace; margin:2px">${ic.especialista}</span>`).join("");
    agregarPaso({ color: "#34c759", badge: "SAVIA", badgeColor: "#34c759", titulo: "Consolidación: SAVIA RAÍZ", subtitulo: `savia:raiz:contexto-unificado · ${formatearHora(evento.timestamp)}`, html: `
      <div style="margin-bottom: 10px; color: #333; font-size: 12px">La consolidadora unió los aportes en un solo contexto.</div>
      <div style="background:#f0fff4; border-radius:8px; padding:10px; font-size:11px; border:1px solid #34c75944">
        <strong>Paciente:</strong> ${escapeHtml(s.nombre)}<br>
        <strong>Labs:</strong> ${Object.keys(payload.labs||{}).length} exámenes<br>
        <strong>Sugerencias IA:</strong> ${ics.length} interconsultas<br>
        ${chips ? `<div style="margin-top:6px">${chips}</div>` : ""}
      </div>
    ` }, hash);
  }

  function renderCoordinadorInforme(payload, evento) {
    const hash = generarHashAporte("coordinador", payload.contexto_id, payload);
    ESTADO.eventos.push({ tipo: "tronco", evento });
    const ics = payload.interconsultas_sugeridas || [];
    let filas = "";
    ics.forEach(ic => {
      const pColor = ic.prioridad === "alta" ? "critico" : ic.prioridad === "media" ? "leve" : "normal";
      filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${ic.especialista}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; text-align: center">${sevBadge(pColor, ic.prioridad)}</td></tr>`;
    });
    agregarPaso({ color: "#d4a017", badge: "TRONCO", badgeColor: "#d4a017", titulo: "Cerebro: Informe TRONCO", subtitulo: `savia:tronco:informe-kimi · ${formatearHora(evento.timestamp)}`, html: `
      <div style="margin-bottom: 10px; color: #333; font-size: 12px">El coordinador procesó la SAVIA y extrajo las interconsultas.</div>
      ${ics.length > 0 ? tablaDatos(filas, ["Especialista", "Prioridad"]) : '<div style="color:#ff9500;font-size:11px;">No se detectaron interconsultas en el JSON.</div>'}
    ` }, hash);
  }

  function renderEspecialistaRespuesta(payload, evento) {
    const hash = generarHashAporte("especialista", payload.contexto_id, payload);
    ESTADO.eventos.push({ tipo: "tronco", evento });
    const esp = payload.especialista || "Especialista";
    const res = payload.resultado || payload;
    agregarPaso({ color: "#d4a017", badge: "TRONCO", badgeColor: "#d4a017", titulo: `Órgano: Respuesta de ${esp}`, subtitulo: `especialista:respuesta · ${formatearHora(evento.timestamp)}`, html: `<div style="font-size:11px; color:#333; max-height:100px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(res.resumen || res.diagnostico || "Especialista procesó el caso.")}</div>` }, hash);
  }

  function renderPlanIntegrado(payload, evento) {
    const hash = generarHashAporte("plan", payload.contexto_id, payload);
    ESTADO.eventos.push({ tipo: "fruto", evento });
    agregarPaso({ color: "#ff3b30", badge: "FRUTO", badgeColor: "#ff3b30", titulo: "Tejido: Plan Integrado Final", subtitulo: `savia:tronco:plan-integrado · ${formatearHora(evento.timestamp)}`, html: `<div style="background:#fff3f3; padding:10px; border-radius:8px; font-size:11px;">El plan final ha sido generado exitosamente.</div>` }, hash);
  }

  function renderDecisionMedico(payload, evento) {
    const hash = generarHashAporte("decision", payload.contexto_id, payload);
    ESTADO.eventos.push({ tipo: "tronco", evento });
    const ics = payload.interconsultas || [];
    agregarPaso({ color: "#1a3a5c", badge: "MÉDICO", badgeColor: "#1a3a5c", titulo: `Médico autorizó ${ics.length} interconsultas`, subtitulo: `medico:decision-interconsultas · ${formatearHora(evento.timestamp)}`, html: `<div style="font-size:11px; color:#333;">El médico dio el visto bueno para que los especialistas analicen el caso.</div>` }, hash);
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 7 — INYECTORES DE SAVIA (con verificación de hash)
  // ═══════════════════════════════════════════════════════════
  async function emitirAportePacienteDesdeEstado(pac) {
    if (!window.SAVIA || !pac) return;
    ESTADO.contextoIdActual = `SAV-RAIZ-${pac.subject_id}-${Date.now()}`;
    const hash = generarHashAporte("paciente", ESTADO.contextoIdActual, pac);
    if (yaFueEmitido(hash)) return;
    marcarComoEmitido(hash);
    try {
      await window.SAVIA.emitirContexto(ESTADO.contextoIdActual, "savia:aporte-paciente", {
        contexto_id: ESTADO.contextoIdActual,
        subject: { subject_id: pac.subject_id, nombre: pac.nombre, edad: pac.edad, sexo: pac.sexo, departamento: pac.departamento, empresa: pac.empresa || null }
      }, { de: "agente-paciente" });
    } catch(e) { console.warn(e); }
  }

  async function emitirAporteClinica() {
    if (!window.SAVIA || !ESTADO.contextoIdActual) return;
    const clinica = {};
    const mapa = [
      ["cl-peso", "cons-vit-peso_kg", "peso_kg"], ["cl-talla", "cons-vit-talla_cm", "talla_cm"],
      ["cl-imc", "cons-vit-imc_calc", "imc"], ["cl-pas", "cons-vit-ta_sistolica", "presion_sistolica_mmhg"],
      ["cl-pad", "cons-vit-ta_diastolica", "presion_diastolica_mmhg"], ["cl-fc", "cons-vit-fc", "frecuencia_cardiaca_lpm"],
      ["cl-actividad", "cons-habito-ejercicio", "actividad_fisica"]
    ];
    mapa.forEach(([idTamizaje, idConsulta, key]) => {
      let v = leerNumero(idTamizaje);
      if (v === null) v = leerNumero(idConsulta); 
      if (key === "actividad_fisica") {
        const el = document.getElementById(idConsulta);
        if (el && el.value) clinica.habitos = { actividad_fisica_min_semana: el.value };
      } else if (v !== null) clinica[key] = v;
    });
    if (Object.keys(clinica).length === 0) return;
    
    const hash = generarHashAporte("clinica", ESTADO.contextoIdActual, clinica);
    if (yaFueEmitido(hash)) return;
    marcarComoEmitido(hash);

    try {
      await window.SAVIA.emitirContexto(ESTADO.contextoIdActual, "savia:aporte-clinica", { contexto_id: ESTADO.contextoIdActual, clinica }, { de: "agente-clinica" });
    } catch(e) { console.warn(e); }
  }

  async function emitirAporteLaboratorio() {
    if (!window.SAVIA || !ESTADO.contextoIdActual) return;
    const labs = {};
    const mapa = [
      ["lab-glucosa", "cons-lab-glucosa", "glucosa"], ["lab-hba1c", "cons-lab-hba1c", "hba1c"],
      ["lab-insulina", "cons-lab-insulina", "insulina"], ["lab-homa", "cons-lab-homa", "homa_ir"],
      ["lab-ct", "cons-lab-ct", "ct"], ["lab-ldl", "cons-lab-ldl", "ldl"],
      ["lab-hdl", "cons-lab-hdl", "hdl"], ["lab-tg", "cons-lab-tg", "tg"],
      ["lab-alt", "cons-lab-alt", "alt"], ["lab-creatinina", "cons-lab-creatinina", "creatinina"],
      ["lab-tfg", "cons-lab-tfg", "tfg"]
    ];
    mapa.forEach(([idTamizaje, idConsulta, key]) => {
      let v = leerNumero(idTamizaje);
      if (v === null) v = leerNumero(idConsulta);
      if (v !== null) labs[key] = v;
    });
    if (Object.keys(labs).length === 0) return;

    const hash = generarHashAporte("labs", ESTADO.contextoIdActual, labs);
    if (yaFueEmitido(hash)) return;
    marcarComoEmitido(hash);

    try {
      await window.SAVIA.emitirContexto(ESTADO.contextoIdActual, "savia:aporte-laboratorio", { contexto_id: ESTADO.contextoIdActual, labs }, { de: "agente-laboratorio" });
    } catch(e) { console.warn(e); }
  }

  async function emitirSaviaRaiz() {
    if (!window.SAVIA || !ESTADO.contextoIdActual) return;
    const pac = window._consultaState?.paciente || {};
    if (!pac.nombre || !pac.subject_id) return;
    let icSugeridas = [];
    try {
      const aiResponse = document.getElementById("ai-response-text")?.textContent || "";
      const m = aiResponse.match(/===JSON_ESTRUCTURADO===([\s\S]*?)===FIN_JSON===/);
      if (m) icSugeridas = JSON.parse(m[1].trim()).interconsultas_sugeridas || [];
    } catch (e) {}
    const hash = generarHashAporte("savia_raiz", ESTADO.contextoIdActual, { pac, icSugeridas });
    if (yaFueEmitido(hash)) return;
    marcarComoEmitido(hash);
    try {
      await window.SAVIA.emitirContexto(ESTADO.contextoIdActual, "savia:raiz:contexto-unificado", {
        contexto_id: ESTADO.contextoIdActual, case_id: `ECO-OBS-${Date.now()}`, origen: "tamizaje",
        subject: { subject_id: pac.subject_id, nombre: pac.nombre, edad: pac.edad, sexo: pac.sexo },
        labs: (() => { const l={}; ["lab-glucosa|glucosa","lab-hba1c|hba1c","lab-homa|homa_ir","lab-ldl|ldl","lab-hdl|hdl","lab-tg|tg"].forEach(p=>{const [id,k]=p.split("|");const v=leerNumero(id);if(v!==null)l[k]=v;});return l; })(),
        clinica: { imc: leerNumero("cl-imc"), presion_sistolica_mmhg: leerNumero("cl-pas") },
        raw: { _json_estructurado: { interconsultas_sugeridas: icSugeridas, diagnostico_diferencial: [], plan: { farmacologico: [], no_farmacologico: [], metas: [] } }, interconsultas_sugeridas: icSugeridas }
      }, { de: "agente-savia-consolidadora" });
    } catch(e) { console.warn(e); }
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 8 — INSTALAR HOOKS (con detección de dirección)
  // ═══════════════════════════════════════════════════════════
  function instalarHooks() {
    if (typeof window.guardarFichaPaciente === "function" && !window.guardarFichaPaciente._obsPatched) {
      const orig = window.guardarFichaPaciente;
      window.guardarFichaPaciente = async function() {
        const r = await orig.apply(this, arguments);
        setTimeout(() => {
          if (window._consultaState?.paciente) {
            const pac = window._consultaState.paciente;
            if (pac.subject_id && !pac.subject_id.includes("????") && pac.subject_id !== ultimoPacienteInyectado) {
              ultimoPacienteInyectado = pac.subject_id;
              emitirAportePacienteDesdeEstado(pac);
            }
          }
        }, 1500); 
        return r;
      };
      window.guardarFichaPaciente._obsPatched = true;
    }

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
    }

    if (typeof window.nextStep === "function" && !window.nextStep._obsPatched) {
      const origNext = window.nextStep;
      window.nextStep = async function() {
        const seq = window.getStepSequence ? window.getStepSequence() : [];
        const pasoActual = window.currentStep;
        const pasoAnterior = ESTADO.ultimoStepIndex;
        
        // ✅ FIX: Solo emitir si se AVANZA (pasoActual > pasoAnterior)
        if (pasoActual > pasoAnterior) {
          const seccionActual = seq[pasoActual];
          if (seccionActual === "sec-vitales") await emitirAporteClinica();
          else if (seccionActual === "sec-labs") await emitirAporteLaboratorio();
          else if (seccionActual === "sec-clinica") await emitirAporteSocial();
        }
        
        ESTADO.ultimoStepIndex = pasoActual;
        return origNext.apply(this, arguments);
      };
      window.nextStep._obsPatched = true;
    }

    if (typeof window.consultaIrAObjetivo === "function" && !window.consultaIrAObjetivo._obsPatched) {
      const origObjetivo = window.consultaIrAObjetivo;
      window.consultaIrAObjetivo = async function() {
        await emitirAporteClinica();
        return origObjetivo.apply(this, arguments);
      };
      window.consultaIrAObjetivo._obsPatched = true;
    }

    if (typeof window.consultaIrAAnalisis === "function" && !window.consultaIrAAnalisis._obsPatched) {
      const origAnalisis = window.consultaIrAAnalisis;
      window.consultaIrAAnalisis = async function() {
        await emitirAporteLaboratorio();
        return origAnalisis.apply(this, arguments);
      };
      window.consultaIrAAnalisis._obsPatched = true;
    }

    if (!window._obs_botones_parcheados) {
      window._obs_botones_parcheados = true;
      document.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const texto = (btn.textContent || "").toLowerCase();
        
        // ✅ FIX: Ignorar botones de "Atrás" o "Volver"
        if (texto.includes("atrás") || texto.includes("volver") || texto.includes("←")) {
          return;
        }
        
        if (texto.includes("siguiente") || texto.includes("continuar") || texto.includes("objetivo") || texto.includes("análisis")) {
          clearTimeout(_debounceClickTimer);
          _debounceClickTimer = setTimeout(() => {
            emitirAporteClinica();
            emitirAporteLaboratorio();
            emitirAporteSocial();
          }, 300);
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 9 — VIGILANTES
  // ═══════════════════════════════════════════════════════════
  function iniciarVigilanteDePaciente() {
    let intervalo = 1000;
    const MAX_INTERVALO = 10000;
    
    function ciclo() {
      let huboCambio = false;
      if (window._consultaState && window._consultaState.paciente) {
        const pac = window._consultaState.paciente;
        if (pac.subject_id && !pac.subject_id.includes("????") && pac.subject_id !== ultimoPacienteInyectado) {
          ultimoPacienteInyectado = pac.subject_id;
          huboCambio = true;
          emitirAportePacienteDesdeEstado(pac);
        }
      }
      if (huboCambio) {
        intervalo = 1000;
      } else {
        intervalo = Math.min(intervalo * 1.5, MAX_INTERVALO);
      }
      ESTADO.intervaloVigilante = setTimeout(ciclo, intervalo);
    }
    ciclo();
  }

  function iniciarVigilanteDeSecciones() {
    const observer = new MutationObserver(() => {
      const esTamizaje = document.getElementById("sec-captura")?.classList.contains("active");
      const esConsulta = document.getElementById("sec-consulta")?.classList.contains("active");
      if (!esTamizaje && !esConsulta) return;
      let seccionActual = "";
      if (esTamizaje) {
        const tarjetas = document.querySelectorAll("#sec-captura .section.active");
        if (tarjetas.length > 0) seccionActual = tarjetas[0].id;
      } else if (esConsulta) {
        const tarjetas = document.querySelectorAll("#sec-consulta .card");
        for (let card of tarjetas) {
          if (card.style.display !== "none" && card.offsetParent !== null) { seccionActual = card.id; break; }
        }
      }
      if (seccionActual && seccionActual !== ultimaSeccionVista) {
        if (seccionActual.includes("paciente") || seccionActual.includes("consulta-tipo")) {
          ultimaSeccionVista = seccionActual;
          return; 
        }
        ultimaSeccionVista = seccionActual;
        if (seccionActual === "sec-vitales" || seccionActual === "consulta-objetivo-card") emitirAporteClinica();
        else if (seccionActual === "sec-labs") emitirAporteLaboratorio();
        else if (seccionActual === "sec-clinica" || seccionActual === "consulta-subjetivo-card") emitirAporteSocial();
        else if (seccionActual === "sec-analisis" || seccionActual === "consulta-analisis-card") emitirAporteLaboratorio();
      }
    });
    const target = document.getElementById("sec-captura") || document.body;
    observer.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 10 — UTILIDADES DEL PANEL
  // ═══════════════════════════════════════════════════════════
  function limpiarPanel() {
    if (!confirm("¿Limpiar la SAVIA del árbol?")) return;
    ESTADO.pasoActual = 0; ESTADO.eventos = []; ultimoPacienteInyectado = "";
    ESTADO.hashesEmitidos.clear(); // ✅ FIX: Limpiar cache de hashes
    ESTADO.ultimoStepIndex = -1;
    const narrativa = document.getElementById("obs-narrativa");
    if (narrativa) {
      narrativa.innerHTML = `
        <div style="position: absolute; left: 24px; top: 20px; bottom: 20px; width: 4px; background: linear-gradient(180deg, #34c759, #0071e3); border-radius: 4px; opacity: 0.15; z-index: 0"></div>
        <div id="obs-sangre-vacia" style="text-align: center; padding: 40px 20px; color: #86868b; font-size: 12px; z-index: 1; background: #f9f9fa">
          <div style="font-size: 42px; margin-bottom: 10px">🌿</div>
          <div style="font-size: 13px; font-weight: 700; color: #6e6e73; margin-bottom: 6px">El árbol está listo</div>
          <div style="font-size: 11px; line-height: 1.6">Navega el monolito para que los agentes empiecen a aportar SAVIA.</div>
        </div>
      `;
    }
    actualizarContadores();
  }

  function exportarLog() {
    const log = ESTADO.eventos.map((e, i) => ({ paso: i + 1, tipo: e.evento?.tipo, de: e.evento?.de, timestamp: e.evento?.timestamp, payload: e.evento?.payload }));
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `observability-savia-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function mostrarAyuda() {
    alert("🌿 ¿Cómo funciona la SAVIA?\n\n1. El agente-paciente inyecta SAVIA al Guardar o Cargar la ficha.\n2. Los agentes de clínica y labs inyectan al presionar 'Enviar a Kimi' o al avanzar de sección.\n3. La SAVIA fluye hacia el coordinador y especialistas.\n\nTodo se refleja en esta línea de tiempo.\n\n🔧 Botón 'Diag': muestra un modal con el estado interno del wrapper.\n\n📥 Exportar log: genera un JSON con todos los eventos capturados.");
  }

  // ✅ FIX: Diagnóstico en modal flotante (no bloquea la vista)
  function mostrarDiagnostico() {
    const savia = window.SAVIA;
    const diag = {
      "Versión wrapper": VERSION,
      "SAVIA disponible": !!savia,
      "SAVIA.emitirContexto": typeof savia?.emitirContexto,
      "SAVIA.propagar": typeof savia?.propagar,
      "SAVIA.propagar._obsPatched": savia?.propagar?._obsPatched || false,
      "Capturador activo": ESTADO.capturadorActivo,
      "Intentos SAVIA": ESTADO.intentosSavia,
      "Eventos capturados": ESTADO.eventos.length,
      "Aportes únicos": ESTADO.hashesEmitidos.size,
      "Contexto actual": ESTADO.contextoIdActual || "—",
      "Paciente actual": window._consultaState?.paciente?.nombre || "—",
      "Último paciente inyectado": ultimoPacienteInyectado || "—",
      "Click handler instalado": !!window._obs_botones_parcheados,
      "Vigilante paciente": !!ESTADO.intervaloVigilante,
      "_pacienteActual": !!window._pacienteActual,
      "_consultaState": !!window._consultaState
    };
    console.table(diag);
    
    // Crear modal flotante
    const overlay = document.createElement("div");
    overlay.id = "obs-diag-modal";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px";
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.4)">
        <div style="padding:16px 20px;background:linear-gradient(135deg,#1a3a5c,#0071e3);color:white;display:flex;justify-content:space-between;align-items:center;border-radius:16px 16px 0 0">
          <h3 style="font-size:15px;font-weight:700;margin:0">🔧 Diagnóstico del Visor</h3>
          <button onclick="document.getElementById('obs-diag-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;width:32px;height:32px;border-radius:50%;font-size:16px;color:white;cursor:pointer">×</button>
        </div>
        <div style="padding:20px">
          <div style="background:#f9f9fa;border-radius:8px;padding:14px;font-size:11px;font-family:ui-monospace,monospace;white-space:pre-wrap;word-break:break-all">
            ${Object.entries(diag).map(([k,v]) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid #e8e8ed"><span style="color:#666">${escapeHtml(k)}</span><span style="font-weight:700;color:#1d1d1f;text-align:right">${escapeHtml(String(v))}</span></div>`).join("")}
          </div>
        </div>
        <div style="padding:0 20px 20px;text-align:center">
          <button onclick="document.getElementById('obs-diag-modal').remove()" style="padding:10px 24px;background:#0071e3;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">Cerrar</button>
        </div>
      </div>
    `;
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 11 — INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════
  function inyectarEstilos() {
    if (document.getElementById("obs-styles")) return;
    const style = document.createElement("style");
    style.id = "obs-styles";
    style.textContent = `@keyframes obsSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`;
    document.head.appendChild(style);
  }

  function init() {
    if (ESTADO.iniciado) return;
    ESTADO.iniciado = true;
    
    try { inyectarEstilos(); } catch (e) {}
    try { inyectarBotonFlotante(); } catch (e) {}
    try { inyectarPanel(); } catch (e) {}
    
    setTimeout(activarCapturador, 3000);
    try { iniciarVigilanteDePaciente(); } catch (e) {}
    try { iniciarVigilanteDeSecciones(); } catch (e) {}
    
    let intentos = 0;
    const intervalHooks = setInterval(() => {
      try { instalarHooks(); } catch (e) {}
      intentos++;
      if (intentos > 60) clearInterval(intervalHooks);
    }, 1000);
    
    console.log(`%c[Observability] ✅ Wrapper v${VERSION} inicializado`, "background:#34c759;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 12 — API PÚBLICA
  // ═══════════════════════════════════════════════════════════
  window.activarVisorSAVIA = function() {
    ESTADO.iniciado = false;
    init();
  };

  window.desactivarVisorSAVIA = function() {
    const panel = document.getElementById("obs-panel");
    const fab = document.getElementById("obs-fab");
    if (panel) panel.remove();
    if (fab) fab.remove();
    ESTADO.iniciado = false;
    ESTADO.panelAbierto = false;
    document.body.style.marginRight = "0";
    document.body.style.width = "100%";
  };

  window.diagnosticarVisorSAVIA = function() {
    mostrarDiagnostico();
    return {
      version: VERSION,
      iniciado: ESTADO.iniciado,
      saviaDisponible: ESTADO.saviaDisponible,
      capturadorActivo: ESTADO.capturadorActivo,
      eventos: ESTADO.eventos.length,
      aportesUnicos: ESTADO.hashesEmitidos.size,
      contextoId: ESTADO.contextoIdActual
    };
  };

  window.OBSERVABILITY_WRAPPER = {
    VERSION,
    ESTADO,
    activar: () => window.activarVisorSAVIA(),
    desactivar: () => window.desactivarVisorSAVIA(),
    diagnosticar: () => window.diagnosticarVisorSAVIA()
  };

  // ═══════════════════════════════════════════════════════════
  // ARRANQUE
  // ═══════════════════════════════════════════════════════════
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }

  console.log(`%c[Observability] Wrapper v${VERSION} cargado.`, "background:#0071e3;color:white;padding:4px 8px;border-radius:4px;font-size:11px");
})();
