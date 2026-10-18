// ═══════════════════════════════════════════════════════════════
// OBSERVABILITY WRAPPER v13.0 — EcoRadAi
// Visor pasivo: escucha a los agentes a través de SAVIA
// ═══════════════════════════════════════════════════════════════
(function() {
  "use strict";

  const VERSION = "13.0";
  const ESTADO = {
    panelAbierto: false,
    capturadorActivo: false,
    eventos: [],
    huellas: new Set()
  };

  console.log(`%c[Observability] 🚀 Visor v${VERSION} cargando...`, "background:#0071e3;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");

  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function formatearHora(iso) {
    try {
      return new Date(iso || Date.now()).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch { return "—"; }
  }

  // ═══════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════
  function inyectarBotonFlotante() {
    if (document.getElementById("obs-fab")) return;
    const fab = document.createElement("button");
    fab.id = "obs-fab";
    fab.innerHTML = "🔬";
    fab.title = "Visor de SAVIA";
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
      <div style="padding: 14px 18px; background: linear-gradient(135deg, #1a3a5c, #34c759); color: white; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0">
        <div>
          <div style="font-size: 14px; font-weight: 800; letter-spacing: -0.3px">🌿 SAVIA en Vivo</div>
          <div style="font-size: 11px; opacity: 0.85; margin-top: 2px">Narrativa de Agentes v${VERSION}</div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center">
          <span id="obs-badge" style="font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 100px; background: rgba(255,255,255,0.2); text-transform: uppercase">Esperando</span>
          <button id="obs-clear" title="Limpiar" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px">🗑️</button>
          <button id="obs-close" title="Cerrar" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px">✕</button>
        </div>
      </div>
      <div id="obs-narrativa" style="flex: 1; overflow-y: auto; padding: 14px; background: #f9f9fa; display: flex; flex-direction: column; gap: 16px; position: relative">
        <div style="position: absolute; left: 24px; top: 20px; bottom: 20px; width: 4px; background: linear-gradient(180deg, #34c759, #0071e3); border-radius: 4px; opacity: 0.15; z-index: 0"></div>
        <div id="obs-sangre-vacia" style="text-align: center; padding: 40px 20px; color: #86868b; font-size: 12px; z-index: 1; background: #f9f9fa">
          <div style="font-size: 42px; margin-bottom: 10px">🌿</div>
          <div style="font-size: 13px; font-weight: 700; color: #6e6e73; margin-bottom: 6px">Escuchando al Kernel...</div>
          <div style="font-size: 11px; line-height: 1.6">Llena los formularios para que los agentes empiecen a aportar SAVIA.</div>
        </div>
      </div>
      <div style="padding: 10px 18px; background: white; border-top: 1px solid #d2d2d7; display: flex; gap: 6px; flex-shrink: 0">
        <button id="obs-export" style="flex: 1; padding: 8px; background: #34c759; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer">📥 Exportar log</button>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById("obs-close").addEventListener("click", togglePanel);
    document.getElementById("obs-clear").addEventListener("click", limpiarPanel);
    document.getElementById("obs-export").addEventListener("click", exportarLog);
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
    } else {
      panel.style.right = "-400px";
      body.style.marginRight = "0";
      body.style.width = "100%";
      if (fab) fab.style.right = "20px";
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RENDERIZADO CON HUELLA DIGITAL (Anti-duplicados)
  // ═══════════════════════════════════════════════════════════
  function agregarPaso(config) {
    const narrativa = document.getElementById("obs-narrativa");
    if (!narrativa) return;
    const empty = document.getElementById("obs-sangre-vacia");
    if (empty) empty.remove();

    const huella = config.titulo + "|" + JSON.stringify(config.rawJSON || {});
    if (ESTADO.huellas.has(huella)) {
      return;
    }
    ESTADO.huellas.add(huella);

    const tarjetasExistentes = narrativa.querySelectorAll('.obs-card-item');
    let tarjetaVieja = null;

    for (const t of tarjetasExistentes) {
      if (t.dataset.tipo === config.titulo) {
        tarjetaVieja = t;
        break;
      }
    }

    if (tarjetaVieja) {
      const body = tarjetaVieja.querySelector('.obs-card-body');
      if (body) body.innerHTML = config.html;
      const timeSpan = tarjetaVieja.querySelector('.obs-card-time');
      if (timeSpan) timeSpan.textContent = formatearHora(new Date().toISOString());

      let badgeAct = tarjetaVieja.querySelector('.obs-updated-badge');
      if (!badgeAct) {
        badgeAct = document.createElement('span');
        badgeAct.className = 'obs-updated-badge';
        badgeAct.style = "font-size:8px;font-weight:700;background:#ff9500;color:white;padding:2px 6px;border-radius:4px;margin-left:6px;text-transform:uppercase";
        badgeAct.textContent = "Actualizado";
        const header = tarjetaVieja.querySelector('.obs-card-title');
        if (header) header.appendChild(badgeAct);
      }
      return;
    }

    const card = document.createElement("div");
    card.className = "obs-card-item";
    card.dataset.tipo = config.titulo;
    card.style.cssText = `position: relative; z-index: 1; background: white; border: 1px solid #e8e8ed; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); margin-left: 20px; overflow: hidden;`;

    const color = config.color || "#34c759";
    const jsonBtnHTML = config.rawJSON ? `
      <div class="obs-json-container" style="margin-top: 10px;">
        <button onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'"
                style="background: none; border: 1px dashed #ccc; color: #666; font-size: 9px; padding: 2px 6px; border-radius: 4px; cursor: pointer; width: 100%;">
          { } Ver JSON crudo
        </button>
        <pre style="display: none; margin-top: 4px; background: #f5f5f5; padding: 8px; border-radius: 4px; font-size: 9px; max-height: 150px; overflow: auto; white-space: pre-wrap; word-break: break-all;">${escapeHtml(JSON.stringify(config.rawJSON, null, 2))}</pre>
      </div>
    ` : "";

    card.innerHTML = `
      <div style="padding: 12px 16px; background: ${color}11; border-bottom: 1px solid ${color}22; display: flex; align-items: flex-start; gap: 12px; position: relative">
        <div style="position: absolute; left: -31px; top: 14px; width: 16px; height: 16px; border-radius: 50%; background: ${color}; border: 3px solid white; box-shadow: 0 0 0 2px ${color}44; z-index: 2"></div>
        <div style="flex: 1; min-width: 0">
          <div class="obs-card-title" style="font-size: 13px; font-weight: 800; color: #1d1d1f; margin-bottom: 2px">${escapeHtml(config.titulo)}</div>
          <div style="font-size: 10px; color: #86868b; font-family: ui-monospace, monospace">${escapeHtml(config.agente || "agente")} · <span class="obs-card-time">${formatearHora(new Date().toISOString())}</span></div>
        </div>
        <span style="font-size: 9px; font-weight: 800; padding: 4px 10px; border-radius: 100px; background: ${color}; color: white; flex-shrink: 0; letter-spacing: 0.5px">${config.badge || ""}</span>
      </div>
      <div class="obs-card-body" style="padding: 16px; font-size: 12px; line-height: 1.6; color: #333;">
        ${config.html || ""}
        ${jsonBtnHTML}
      </div>
    `;

    narrativa.appendChild(card);
    setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }

  // ═══════════════════════════════════════════════════════════
  // CONEXIÓN AL KERNEL (Escucha a los agentes)
  // ═══════════════════════════════════════════════════════════
  function activarKernelSniper() {
    if (ESTADO.capturadorActivo) return;

    const intentarEnganchar = setInterval(() => {
      if (!window.SAVIA) return;

      const metodos = ["propagar", "enviar", "publicar", "emitirContexto"];
      metodos.forEach(metodo => {
        if (typeof window.SAVIA[metodo] === "function" && !window.SAVIA[metodo]._obsKernelPatched) {
          const original = window.SAVIA[metodo];
          window.SAVIA[metodo] = function() {
            const evento = arguments[0];
            if (metodo === "emitirContexto") {
              procesarEventoKernel({
                tipo: arguments[1],
                payload: arguments[2] || {},
                de: arguments[3]?.de || "agente",
                timestamp: new Date().toISOString()
              });
            } else {
              procesarEventoKernel(evento);
            }
            return original.apply(this, arguments);
          };
          window.SAVIA[metodo]._obsKernelPatched = true;
        }
      });

      ESTADO.capturadorActivo = true;
      document.getElementById("obs-badge").textContent = "✅ Activo";
      document.getElementById("obs-badge").style.background = "rgba(52,199,89,0.6)";
      clearInterval(intentarEnganchar);
    }, 500);
  }

  function procesarEventoKernel(evento) {
    if (!evento || !evento.tipo) return;
    const payload = evento.payload || {};

    if (evento.tipo.includes("paciente")) {
      agregarPaso({
        color: "#0071e3", badge: "RAÍZ", agente: evento.de,
        titulo: "Agente-Paciente",
        html: `<strong>Identidad capturada:</strong><br>Nombre: ${escapeHtml(payload.subject?.nombre || "—")}<br>ID: ${escapeHtml(payload.subject?.subject_id || "—")}`,
        rawJSON: payload
      });
    }
    else if (evento.tipo.includes("subjetivo")) {
      agregarPaso({
        color: "#34c759", badge: "RAÍZ", agente: evento.de,
        titulo: "Agente-Clínica: Subjetivo",
        html: `<strong>Anamnesis:</strong><br>Motivo: ${escapeHtml(payload.subjetivo?.motivo || "—")}<br>Enfermedad actual: ${escapeHtml(payload.subjetivo?.enfermedad_actual || "—")}`,
        rawJSON: payload
      });
    }
    else if (evento.tipo.includes("examen")) {
      agregarPaso({
        color: "#34c759", badge: "RAÍZ", agente: evento.de,
        titulo: "Agente-Clínica: Examen Físico",
        html: `<strong>Hallazgos:</strong> Se registraron ${Object.keys(payload.examen_fisico || {}).length} regiones anatómicas.`,
        rawJSON: payload
      });
    }
    else if (evento.tipo.includes("clinica")) {
      agregarPaso({
        color: "#34c759", badge: "RAÍZ", agente: evento.de,
        titulo: "Agente-Clínica: Signos Vitales",
        html: `<strong>Signos capturados:</strong> Peso: ${payload.clinica?.peso_kg || "—"} kg, PA: ${payload.clinica?.presion_sistolica_mmhg || "—"}/${payload.clinica?.presion_diastolica_mmhg || "—"}`,
        rawJSON: payload
      });
    }
    else if (evento.tipo.includes("laboratorio")) {
      agregarPaso({
        color: "#34c759", badge: "RAÍZ", agente: evento.de,
        titulo: "Agente-Laboratorio",
        html: `<strong>Exámenes recibidos:</strong> ${Object.keys(payload.labs || {}).length} valores capturados.`,
        rawJSON: payload
      });
    }
    else if (evento.tipo.includes("raiz:contexto-unificado")) {
      agregarPaso({
        color: "#0071e3", badge: "SAVIA", agente: evento.de,
        titulo: "Consolidación RAÍZ",
        html: `<strong>SAVIA formada:</strong> Todos los aportes se unificaron en un solo contexto clínico.`,
        rawJSON: payload
      });
    }
  }

  function limpiarPanel() {
    if (!confirm("¿Limpiar la SAVIA del árbol?")) return;
    ESTADO.huellas.clear();
    const narrativa = document.getElementById("obs-narrativa");
    if (narrativa) {
      narrativa.innerHTML = `<div id="obs-sangre-vacia" style="text-align: center; padding: 40px 20px; color: #86868b; font-size: 12px;"><div style="font-size: 42px; margin-bottom: 10px">🌿</div><div style="font-size: 13px; font-weight: 700; color: #6e6e73; margin-bottom: 6px">Escuchando al Kernel...</div><div style="font-size: 11px; line-height: 1.6">Llena los formularios para que los agentes empiecen a aportar SAVIA.</div></div>`;
    }
  }

  function exportarLog() {
    const log = Array.from(ESTADO.huellas).map((h, i) => ({ paso: i + 1, hash: h }));
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `observability-savia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function init() {
    inyectarBotonFlotante();
    inyectarPanel();
    activarKernelSniper();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }

})();
