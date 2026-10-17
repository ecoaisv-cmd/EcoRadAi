// ═══════════════════════════════════════════════════════════════
// OBSERVABILITY WRAPPER v7.0 — EcoRadAi Sprint 3
// Lógica: Escucha pasiva del Kernel. NO lee el DOM.
// Pinta lo que los agentes reales (RAÍZ, TRONCO, FRUTO) emiten.
// ═══════════════════════════════════════════════════════════════

(function() {
  "use strict";

  const VERSION = "7.0";
  const ESTADO = {
    panelAbierto: false,
    capturadorActivo: false,
    pasoActual: 0,
    eventos: [],
    contextoIdActual: null,
    iniciado: false,
    saviaDisponible: false
  };

  console.log(`%c[Observability] 🚀 Visor v${VERSION} (Modo Escucha) cargando...`, "background:#0071e3;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 1 — ESCUDO Y HELPERS
  // ═══════════════════════════════════════════════════════════
  window.addEventListener("error", (e) => {
    if (e.message && (e.message.includes("docx") || e.message.includes("qrcode"))) { e.preventDefault(); return true; }
  }, true);

  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function formatearHora(iso) {
    try { return new Date(iso || Date.now()).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); } 
    catch { return "—"; }
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 2 — UI INJECTION
  // ═══════════════════════════════════════════════════════════
  function inyectarBotonFlotante() {
    if (document.getElementById("obs-fab")) return;
    const fab = document.createElement("button");
    fab.id = "obs-fab"; fab.innerHTML = "🔬"; fab.title = "Observabilidad (Flujo de SAVIA)";
    fab.style.cssText = `position: fixed; bottom: 90px; right: 20px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #34c759, #0071e3); color: white; border: none; font-size: 24px; cursor: pointer; box-shadow: 0 8px 24px rgba(52,199,89,0.4); z-index: 99998; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center;`;
    fab.addEventListener("click", togglePanel);
    document.body.appendChild(fab);
  }

  function inyectarPanel() {
    if (document.getElementById("obs-panel")) return;
    const panel = document.createElement("div");
    panel.id = "obs-panel";
    panel.style.cssText = `position: fixed; top: 0; right: -400px; width: 380px; height: 100vh; background: #f5f5f7; border-left: 2px solid #34c759; box-shadow: -8px 0 32px rgba(0,0,0,0.2); z-index: 99999; transition: right 0.3s ease; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1d1d1f;`;

    panel.innerHTML = `
      <div style="padding: 14px 18px; background: linear-gradient(135deg, #1a3a5c, #34c759); color: white; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-shrink: 0">
        <div>
          <div style="font-size: 14px; font-weight: 800; letter-spacing: -0.3px">🌿 Flujo de SAVIA</div>
          <div style="font-size: 11px; opacity: 0.85; margin-top: 2px">Sprint 3 · v${VERSION}</div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center">
          <span id="obs-badge" style="font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 100px; background: rgba(255,255,255,0.2); text-transform: uppercase">Esperando</span>
          <button id="obs-clear" title="Limpiar" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px">🗑️</button>
          <button id="obs-close" title="Cerrar" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px">✕</button>
        </div>
      </div>

      <div id="obs-contadores" style="display: flex; gap: 6px; padding: 10px 18px; background: white; border-bottom: 1px solid #d2d2d7; flex-wrap: wrap; flex-shrink: 0">
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #e8f4fd; border-radius: 100px; font-size: 10px; font-weight: 700"><span style="width: 8px; height: 8px; border-radius: 50%; background: #0071e3"></span><span>RAÍZ: <span id="obs-c-raiz">0</span></span></div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #fff9e6; border-radius: 100px; font-size: 10px; font-weight: 700"><span style="width: 8px; height: 8px; border-radius: 50%; background: #d4a017"></span><span>TRONCO: <span id="obs-c-tronco">0</span></span></div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #f0fff4; border-radius: 100px; font-size: 10px; font-weight: 700"><span style="width: 8px; height: 8px; border-radius: 50%; background: #34c759"></span><span>SAVIA: <span id="obs-c-savia">0</span></span></div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #faf5ff; border-radius: 100px; font-size: 10px; font-weight: 700"><span style="width: 8px; height: 8px; border-radius: 50%; background: #7c3aed"></span><span>KIMI: <span id="obs-c-kimi">0</span></span></div>
        <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: #fff3f3; border-radius: 100px; font-size: 10px; font-weight: 700"><span style="width: 8px; height: 8px; border-radius: 50%; background: #ff3b30"></span><span>FRUTO: <span id="obs-c-fruto">0</span></span></div>
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
    document.getElementById("obs-diag").addEventListener("click", mostrarDiagnostico);
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
  // SECCIÓN 3 — ACTIVAR ESCUCHA (¡El núcleo del visor!)
  // ═══════════════════════════════════════════════════════════
  async function activarCapturador() {
    if (ESTADO.capturadorActivo) return;

    // Esperar a que el kernel exponga SAVIA
    let intentos = 0;
    while (!window.SAVIA && intentos < 60) {
      await new Promise(r => setTimeout(r, 1000));
      intentos++;
    }

    if (!window.SAVIA) {
      const badge = document.getElementById("obs-badge");
      if (badge) { badge.textContent = "⚠️ Sin SAVIA"; badge.style.background = "rgba(255,149,0,0.6)"; }
      return;
    }

    // Engancharse al bus de SAVIA
    const saviaOriginal = window.SAVIA.propagar;
    window.SAVIA.propagar = function(evento) {
      // 1. Pintar el evento en el visor
      try { procesarEvento(evento); } catch (e) { console.warn("[Observability] Error pintando evento:", e); }
      // 2. Dejar que el Kernel siga procesando normalmente
      return saviaOriginal.apply(this, arguments);
    };
    
    ESTADO.capturadorActivo = true;
    const badge = document.getElementById("obs-badge");
    if (badge) { badge.textContent = "✅ Activo"; badge.style.background = "rgba(52,199,89,0.6)"; }
    console.log("[Observability] ✅ Visor enganchado al bus de eventos de SAVIA");
  }

  function procesarEvento(evento) {
    if (!evento || !evento.tipo) return;
    const tipo = evento.tipo;
    const payload = evento.payload || {};

    // Mapeo de eventos del Kernel a funciones de pintado
    try {
      if (tipo === "savia:aporte-paciente") return renderPaciente(payload, evento);
      if (tipo === "savia:aporte-clinica") return renderClinica(payload, evento);
      if (tipo === "savia:aporte-laboratorio") return renderLaboratorio(payload, evento);
      if (tipo === "savia:raiz:contexto-unificado") return renderSaviaRaiz(payload, evento);
      if (tipo === "savia:tronco:informe-kimi") return renderTronco(payload, evento);
      if (tipo === "especialista:respuesta") return renderEspecialista(payload, evento);
      if (tipo === "savia:tronco:plan-integrado") return renderPlan(payload, evento);
    } catch (e) {
      console.error("[Observability] Error procesando", tipo, e);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 4 — PINTADO DE EVENTOS (UI)
  // ═══════════════════════════════════════════════════════════
  function agregarPaso(config) {
    ESTADO.pasoActual++;
    const narrativa = document.getElementById("obs-narrativa");
    if (!narrativa) return;
    const empty = document.getElementById("obs-sangre-vacia");
    if (empty) empty.remove();

    const card = document.createElement("div");
    card.style.cssText = `position: relative; z-index: 1; background: white; border: 1px solid #e8e8ed; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); animation: obsSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); margin-left: 20px; overflow: hidden;`;

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
    const c = { raiz: ESTADO.eventos.filter(e => e.tipo === "raiz").length, tronco: ESTADO.eventos.filter(e => e.tipo === "tronco").length, savia: ESTADO.eventos.filter(e => e.tipo === "savia").length, kimi: ESTADO.eventos.filter(e => e.tipo === "kimi").length, fruto: ESTADO.eventos.filter(e => e.tipo === "fruto").length };
    ["raiz", "tronco", "savia", "kimi", "fruto"].forEach(k => {
      const el = document.getElementById(`obs-c-${k}`);
      if (el) el.textContent = c[k];
    });
  }

  function renderPaciente(payload, evento) {
    const s = payload.subject || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    agregarPaso({ color: "#34c759", badge: "RAÍZ", badgeColor: "#0071e3", titulo: "Aporte Paciente", subtitulo: `savia:aporte-paciente · ${formatearHora(evento.timestamp)}`, html: `<div style="font-size:11px;"><strong>${escapeHtml(s.nombre)}</strong> (${escapeHtml(s.subject_id)})</div>` });
  }

  function renderClinica(payload, evento) {
    const c = payload.clinica || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    Object.keys(c).forEach(k => {
      if (c[k] === null || c[k] === undefined || typeof c[k] === 'object') return;
      filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${k}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; font-weight: 700; text-align: right">${c[k]}</td></tr>`;
    });
    agregarPaso({ color: "#34c759", badge: "RAÍZ", badgeColor: "#0071e3", titulo: "Aporte Clínica", subtitulo: `savia:aporte-clinica · ${formatearHora(evento.timestamp)}`, html: `<table style="width:100%;font-size:11px;border-collapse:collapse;">${filas}</table>` });
  }

  function renderLaboratorio(payload, evento) {
    const l = payload.labs || payload;
    ESTADO.eventos.push({ tipo: "raiz", evento });
    let filas = "";
    Object.keys(l).forEach(k => {
      if (l[k] === null || l[k] === undefined) return;
      filas += `<tr><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-weight: 600; color: #1a3a5c">${k}</td><td style="padding: 5px 10px; border-bottom: 1px solid #e8e8ed; font-family: monospace; font-weight: 700; text-align: right">${l[k]}</td></tr>`;
    });
    agregarPaso({ color: "#34c759", badge: "RAÍZ", badgeColor: "#0071e3", titulo: "Aporte Laboratorio", subtitulo: `savia:aporte-laboratorio · ${formatearHora(evento.timestamp)}`, html: `<table style="width:100%;font-size:11px;border-collapse:collapse;">${filas}</table>` });
  }

  function renderSaviaRaiz(payload, evento) {
    ESTADO.eventos.push({ tipo: "savia", evento });
    agregarPaso({ color: "#34c759", badge: "SAVIA", badgeColor: "#34c759", titulo: "Consolidación RAÍZ", subtitulo: `savia:raiz:contexto-unificado · ${formatearHora(evento.timestamp)}`, html: `<div style="font-size:11px;color:#333;">Contexto unificado generado con éxito.</div>` });
  }

  function renderTronco(payload, evento) {
    ESTADO.eventos.push({ tipo: "tronco", evento });
    agregarPaso({ color: "#d4a017", badge: "TRONCO", badgeColor: "#d4a017", titulo: "Coordinador (Informe Kimi)", subtitulo: `savia:tronco:informe-kimi · ${formatearHora(evento.timestamp)}`, html: `<div style="font-size:11px;color:#333;">Análisis del coordinador completado.</div>` });
  }

  function renderEspecialista(payload, evento) {
    ESTADO.eventos.push({ tipo: "tronco", evento });
    agregarPaso({ color: "#d4a017", badge: "TRONCO", badgeColor: "#d4a017", titulo: `Especialista: ${payload.especialista || "—"}`, subtitulo: `especialista:respuesta · ${formatearHora(evento.timestamp)}`, html: `<div style="font-size:11px;color:#333;">Análisis recibido.</div>` });
  }

  function renderPlan(payload, evento) {
    ESTADO.eventos.push({ tipo: "fruto", evento });
    agregarPaso({ color: "#ff3b30", badge: "FRUTO", badgeColor: "#ff3b30", titulo: "Plan Integrado Final", subtitulo: `savia:tronco:plan-integrado · ${formatearHora(evento.timestamp)}`, html: `<div style="font-size:11px;color:#333;">Plan generado con éxito.</div>` });
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 5 — UTILIDADES
  // ═══════════════════════════════════════════════════════════
  function limpiarPanel() {
    if (!confirm("¿Limpiar la SAVIA del árbol?")) return;
    ESTADO.pasoActual = 0; ESTADO.eventos = [];
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
    alert("🌿 ¿Cómo funciona la SAVIA?\n\nEl Visor es un observador pasivo. Se engancha al bus de eventos del Kernel (window.SAVIA.propagar) y pinta los eventos que los agentes emiten:\n\n- RAÍZ: aporta datos crudos (paciente, clínica, labs).\n- TRONCO: Coordinador y Especialistas analizan.\n- FRUTO: Plan Integrado Final.\n\nTodo se refleja en esta línea de tiempo.");
  }

  function mostrarDiagnostico() {
    const diag = {
      "Versión wrapper": VERSION,
      "SAVIA disponible": !!window.SAVIA,
      "Capturador activo": ESTADO.capturadorActivo,
      "Eventos capturados": ESTADO.eventos.length,
      "Contexto actual": ESTADO.contextoIdActual || "—",
      "Paciente actual": window._consultaState?.paciente?.nombre || "—"
    };
    console.table(diag);
    
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
  // SECCIÓN 6 — INICIALIZACIÓN
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
    
    setTimeout(activarCapturador, 2000);
    
    console.log(`%c[Observability] ✅ Visor v${VERSION} inicializado. Escuchando el bus de SAVIA.`, "background:#34c759;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }

})();
