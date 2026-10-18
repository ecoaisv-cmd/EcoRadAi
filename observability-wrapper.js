// ═══════════════════════════════════════════════════════════════
// OBSERVABILITY WRAPPER v10.0 — EcoRadAi
// Estrategia: DOM Sniper (Observador de cambios en la pantalla)
// ═══════════════════════════════════════════════════════════════
(function() {
  "use strict";

  const VERSION = "10.0";
  const ESTADO = {
    panelAbierto: false,
    capturadorActivo: false,
    eventos: [],
    ultimaSeccion: ""
  };

  console.log(`%c[Observability] 🚀 Visor v${VERSION} (DOM-Sniper) cargando...`, "background:#0071e3;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");

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
  // UI
  // ═══════════════════════════════════════════════════════════
  function inyectarBotonFlotante() {
    if (document.getElementById("obs-fab")) return;
    const fab = document.createElement("button");
    fab.id = "obs-fab"; fab.innerHTML = "🔬"; fab.title = "Visor de SAVIA";
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
          <div style="font-size: 11px; opacity: 0.85; margin-top: 2px">v${VERSION}</div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center">
          <button id="obs-clear" title="Limpiar" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px">🗑️</button>
          <button id="obs-close" title="Cerrar" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 14px">✕</button>
        </div>
      </div>

      <div id="obs-narrativa" style="flex: 1; overflow-y: auto; padding: 14px; background: #f9f9fa; display: flex; flex-direction: column; gap: 16px; position: relative">
        <div style="position: absolute; left: 24px; top: 20px; bottom: 20px; width: 4px; background: linear-gradient(180deg, #34c759, #0071e3); border-radius: 4px; opacity: 0.15; z-index: 0"></div>
        <div id="obs-sangre-vacia" style="text-align: center; padding: 40px 20px; color: #86868b; font-size: 12px; z-index: 1; background: #f9f9fa">
          <div style="font-size: 42px; margin-bottom: 10px">🌿</div>
          <div style="font-size: 13px; font-weight: 700; color: #6e6e73; margin-bottom: 6px">El árbol está listo</div>
        </div>
      </div>

      <div style="padding: 10px 18px; background: white; border-top: 1px solid #d2d2d7; display: flex; gap: 6px; justify-content: space-between; flex-shrink: 0">
        <button id="obs-export" style="flex: 1; padding: 8px; background: #34c759; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer">📥 Exportar log</button>
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
    } else {
      panel.style.right = "-400px";
      body.style.marginRight = "0";
      body.style.width = "100%";
      if (fab) fab.style.right = "20px";
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RENDERIZADO (CON ACTUALIZACIÓN INTELIGENTE)
  // ═══════════════════════════════════════════════════════════
  function agregarPaso(config) {
    const narrativa = document.getElementById("obs-narrativa");
    if (!narrativa) return;
    const empty = document.getElementById("obs-sangre-vacia");
    if (empty) empty.remove();

    const tarjetasExistentes = narrativa.querySelectorAll('.obs-card-item');
    let tarjetaVieja = null;
    
    // Buscar si ya existe una tarjeta del mismo tipo
    for (const t of tarjetasExistentes) {
      if (t.dataset.tipo === config.titulo) {
        tarjetaVieja = t;
        break;
      }
    }

    if (tarjetaVieja) {
      // Actualizar en lugar de duplicar
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

    // Crear nueva tarjeta
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
          <div style="font-size: 10px; color: #86868b; font-family: ui-monospace, monospace">agente-sistema · <span class="obs-card-time">${formatearHora(new Date().toISOString())}</span></div>
        </div>
        <span style="font-size: 9px; font-weight: 800; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; background: ${color}; color: white; flex-shrink: 0; letter-spacing: 0.5px">${config.badge || ""}</span>
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
  // DOM SNIPER (El verdadero capturador de eventos)
  // ═══════════════════════════════════════════════════════════
  function iniciarDomSniper() {
    console.log("%c[Observability] 🎯 DOM-Sniper iniciado.", "color:#0071e3;font-weight:700");

    // 1. Observar la pantalla de Paciente / Laboratorios / Vitales
    const observer = new MutationObserver((mutations) => {
      // Paciente
      const pacActivo = window._consultaState?.paciente || window._pacienteActual;
      if (pacActivo && pacActivo.subject_id && !pacActivo.subject_id.includes("????")) {
        const nombre = pacActivo.nombre || "Paciente";
        const sid = pacActivo.subject_id;
        
        agregarPaso({
          color: "#0071e3", badge: "RAÍZ", titulo: "Registro de Paciente",
          html: `<strong>Nombre:</strong> ${escapeHtml(nombre)}<br><strong>ID:</strong> ${escapeHtml(sid)}<br><strong>Edad:</strong> ${pacActivo.edad || "—"} años<br><strong>Sexo:</strong> ${pacActivo.sexo || "—"}`,
          rawJSON: { subject: pacActivo }
        });
      }

      // Laboratorios (si hay valores en los inputs)
      const labs = {};
      if (typeof LABS_REGISTRY !== "undefined") {
        LABS_REGISTRY._items.forEach(l => {
          const el = document.getElementById(l.id);
          if (el && el.value && el.value.trim() !== "") {
            const key = l.id.replace(/^lab-/, "").replace(/-/g, "_");
            labs[key] = el.value;
          }
        });
      }
      if (Object.keys(labs).length > 0) {
        agregarPaso({
          color: "#34c759", badge: "RAÍZ", titulo: "Resultados de Laboratorio",
          html: `El agente-laboratorio ha capturado <strong>${Object.keys(labs).length}</strong> examen(es).<br>${Object.entries(labs).slice(0,3).map(([k,v]) => `<strong>${escapeHtml(k.replace(/_/g," "))}:</strong> ${escapeHtml(v)}`).join("<br>")}`,
          rawJSON: { labs }
        });
      }
    });

    // Observar cambios en el documento
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });

    // 2. Capturar el análisis clínico (botón de la IA)
    setInterval(() => {
      const motivo = document.getElementById("cons-motivo")?.value?.trim();
      const enfActual = document.getElementById("cons-enfermedad-actual")?.value?.trim();
      if (motivo || enfActual) {
        agregarPaso({
          color: "#34c759", badge: "RAÍZ", titulo: "Anamnesis (Subjetivo)",
          html: `<strong>Motivo:</strong> ${escapeHtml(motivo || "—")}<br><strong>Enfermedad actual:</strong> ${escapeHtml(enfActual || "—")}`,
          rawJSON: { subjetivo: { motivo, enfermedad_actual: enfActual } }
        });
      }

      const efGeneral = document.getElementById("cons-ef-general")?.value?.trim();
      const efTorax = document.getElementById("cons-ef-torax_pulmones")?.value?.trim();
      if (efGeneral || efTorax) {
        agregarPaso({
          color: "#34c759", badge: "RAÍZ", titulo: "Examen Físico",
          html: `<strong>General:</strong> ${escapeHtml(efGeneral || "—")}<br><strong>Tórax/Pulmones:</strong> ${escapeHtml(efTorax || "—")}`,
          rawJSON: { examen_fisico: { general: efGeneral, torax_pulmones: efTorax } }
        });
      }
    }, 2000); // Revisa cada 2 segundos
  }

  // ═══════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════
  function limpiarPanel() {
    if (!confirm("¿Limpiar la SAVIA del árbol?")) return;
    ESTADO.eventos = [];
    const narrativa = document.getElementById("obs-narrativa");
    if (narrativa) {
      narrativa.innerHTML = `
        <div style="position: absolute; left: 24px; top: 20px; bottom: 20px; width: 4px; background: linear-gradient(180deg, #34c759, #0071e3); border-radius: 4px; opacity: 0.15; z-index: 0"></div>
        <div id="obs-sangre-vacia" style="text-align: center; padding: 40px 20px; color: #86868b; font-size: 12px; z-index: 1; background: #f9f9fa">
          <div style="font-size: 42px; margin-bottom: 10px">🌿</div>
          <div style="font-size: 13px; font-weight: 700; color: #6e6e73; margin-bottom: 6px">El árbol está listo</div>
        </div>
      `;
    }
  }

  function exportarLog() {
    const tarjetas = document.querySelectorAll(".obs-card-item");
    const log = Array.from(tarjetas).map((t, i) => ({
      paso: i + 1,
      tipo: t.dataset.tipo,
      html: t.querySelector('.obs-card-body')?.innerText.substring(0, 100) + "..."
    }));
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `observability-savia-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function mostrarAyuda() {
    alert("🌿 Visor DOM-Sniper v10.0\n\nEste visor lee directamente lo que está en tu pantalla. Si seleccionas un paciente, aparecerá su tarjeta. Si escribes laboratorios o notas, aparecerán actualizadas.");
  }

  // ═══════════════════════════════════════════════════════════
  // INICIO
  // ═══════════════════════════════════════════════════════════
  function init() {
    inyectarBotonFlotante();
    inyectarPanel();
    iniciarDomSniper();
    console.log(`%c[Observability] ✅ Visor v${VERSION} inicializado.`, "background:#34c759;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }

})();
