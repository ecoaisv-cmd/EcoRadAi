// ═══════════════════════════════════════════════════════════════
// OBSERVABILITY WRAPPER v15.0 — EcoRadAi
// Visor con 3 modos: Evolución · Auditoría · Técnico
// ═══════════════════════════════════════════════════════════════
(function() {
  "use strict";

  const VERSION = "15.0";
  const OBS = {
    panelAbierto: false,
    capturadorActivo: false,
    modo: "evolucion",
    eventos: [],
    huellas: new Set()
  };

  console.log(`%c[Observability] 🚀 Visor v${VERSION} — 3 modos cargando...`, "background:#0071e3;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");

  window._OBS_V15 = OBS;

  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function formatearHora(iso) {
    try {
      return new Date(iso || Date.now()).toLocaleString("es-ES", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
      });
    } catch { return "—"; }
  }

  // ═══════════════════════════════════════════════════════════
  // MIGRAR DESDE v13.0 SI EXISTE
  // ═══════════════════════════════════════════════════════════
  function migrarDesdeV13() {
    const fabViejo = document.getElementById("obs-fab");
    const panelViejo = document.getElementById("obs-panel");
    
    if (fabViejo || panelViejo) {
      console.log("[Observability v15] 🔄 Migrando desde v13.0...");
      
      // Eliminar panel viejo
      if (panelViejo) panelViejo.remove();
      
      // Reemplazar onclick del fab
      if (fabViejo) {
        fabViejo.onclick = null;
        fabViejo.addEventListener("click", togglePanel);
        fabViejo.innerHTML = "📋";
        fabViejo.title = "Visor de SAVIA (Notas de evolución)";
        console.log("[Observability v15] ✓ Botón flotante migrado");
      }
      
      // Eliminar monkey-patch viejo
      ["propagar", "enviar", "emitirContexto"].forEach(metodo => {
        if (window.SAVIA?.[metodo]?._obsKernelPatched) {
          delete window.SAVIA[metodo]._obsKernelPatched;
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INYECTAR UI
  // ═══════════════════════════════════════════════════════════
  function inyectarBotonFlotante() {
    let fab = document.getElementById("obs-fab");
    if (fab) return; // Ya existe

    fab = document.createElement("button");
    fab.id = "obs-fab";
    fab.innerHTML = "📋";
    fab.title = "Visor de SAVIA (Notas de evolución)";
    fab.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #34c759, #0071e3);
      color: white;
      border: none;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(52,199,89,0.4);
      z-index: 99998;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    fab.addEventListener("click", togglePanel);
    document.body.appendChild(fab);
  }

  function inyectarPanel() {
    if (document.getElementById("obs-panel")) return;

    const panel = document.createElement("div");
    panel.id = "obs-panel";
    panel.style.cssText = `
      position: fixed;
      top: 0;
      right: -420px;
      width: 400px;
      height: 100vh;
      background: #f5f5f7;
      border-left: 2px solid #34c759;
      box-shadow: -8px 0 32px rgba(0,0,0,0.2);
      z-index: 99999;
      transition: right 0.3s ease;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1d1d1f;
    `;

    panel.innerHTML = `
      <div style="padding:14px 18px;background:linear-gradient(135deg,#1a3a5c,#34c759);color:white;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div>
          <div style="font-size:14px;font-weight:800;letter-spacing:-0.3px">📋 SAVIA</div>
          <div style="font-size:11px;opacity:0.85;margin-top:2px">Notas de evolución · v${VERSION}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span id="obs-badge" style="font-size:10px;font-weight:700;padding:4px 10px;border-radius:100px;background:rgba(255,255,255,0.2);text-transform:uppercase">Esperando</span>
          <button id="obs-clear" title="Limpiar" style="background:rgba(255,255,255,0.2);border:none;color:white;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px">🗑️</button>
          <button id="obs-close" title="Cerrar" style="background:rgba(255,255,255,0.2);border:none;color:white;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px">✕</button>
        </div>
      </div>
      
      <div id="obs-selector-modo" style="padding:10px 14px;background:#fff;border-bottom:1px solid #d2d2d7;display:flex;gap:6px;flex-shrink:0">
        <button class="obs-modo-btn" data-modo="evolucion" style="flex:1;padding:6px;border-radius:6px;border:1.5px solid #34c759;background:#e8f9ec;color:#1a4a2a;font-size:10px;font-weight:700;cursor:pointer">📋 Evolución</button>
        <button class="obs-modo-btn" data-modo="auditoria" style="flex:1;padding:6px;border-radius:6px;border:1.5px solid #d2d2d7;background:#fff;color:#6e6e73;font-size:10px;font-weight:700;cursor:pointer">🌿 Auditoría</button>
        <button class="obs-modo-btn" data-modo="tecnico" style="flex:1;padding:6px;border-radius:6px;border:1.5px solid #d2d2d7;background:#fff;color:#6e6e73;font-size:10px;font-weight:700;cursor:pointer">⚙️ Técnico</button>
      </div>
      
      <div id="obs-narrativa" style="flex:1;overflow-y:auto;padding:14px;background:#f9f9fa;display:flex;flex-direction:column;gap:12px">
        <div id="obs-vacia" style="text-align:center;padding:40px 20px;color:#86868b;font-size:12px">
          <div style="font-size:42px;margin-bottom:10px">📋</div>
          <div style="font-size:13px;font-weight:700;color:#6e6e73;margin-bottom:6px">Hoja de evolución vacía</div>
          <div style="font-size:11px;line-height:1.6">A medida que el médico atiende al paciente, las notas aparecerán aquí.</div>
        </div>
      </div>
      
      <div style="padding:10px 18px;background:#fff;border-top:1px solid #d2d2d7;display:flex;gap:6px;flex-shrink:0">
        <button id="obs-export" style="flex:1;padding:8px;background:#34c759;color:white;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">📥 Exportar log</button>
      </div>
    `;

    document.body.appendChild(panel);

    // Bindear botones
    document.getElementById("obs-close").addEventListener("click", togglePanel);
    document.getElementById("obs-clear").addEventListener("click", limpiarPanel);
    document.getElementById("obs-export").addEventListener("click", exportarLog);

    document.querySelectorAll(".obs-modo-btn").forEach(btn => {
      btn.addEventListener("click", () => cambiarModo(btn.dataset.modo));
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CONTROLES
  // ═══════════════════════════════════════════════════════════
  function togglePanel() {
    const panel = document.getElementById("obs-panel");
    const fab = document.getElementById("obs-fab");
    const body = document.body;
    if (!panel || !body) return;

    OBS.panelAbierto = !OBS.panelAbierto;

    if (OBS.panelAbierto) {
      panel.style.right = "0";
      body.style.marginRight = "400px";
      body.style.width = "calc(100% - 400px)";
      if (fab) fab.style.right = "420px";
    } else {
      panel.style.right = "-420px";
      body.style.marginRight = "0";
      body.style.width = "100%";
      if (fab) fab.style.right = "20px";
    }
  }

  function cambiarModo(modo) {
    OBS.modo = modo;
    document.querySelectorAll(".obs-modo-btn").forEach(btn => {
      const activo = btn.dataset.modo === modo;
      btn.style.borderColor = activo ? "#34c759" : "#d2d2d7";
      btn.style.background = activo ? "#e8f9ec" : "#fff";
      btn.style.color = activo ? "#1a4a2a" : "#6e6e73";
    });
    render();
  }

  function limpiarPanel() {
    if (!confirm("¿Limpiar la hoja de evolución?")) return;
    OBS.eventos = [];
    OBS.huellas.clear();
    render();
  }

  function exportarLog() {
    const log = OBS.eventos.map((e, i) => ({
      paso: i + 1,
      tipo: e.tipo,
      de: e.de,
      timestamp: e.timestamp,
      payload: e.payload
    }));
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evolucion-savia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ═══════════════════════════════════════════════════════════
  // NARRATIVA POR TIPO DE EVENTO
  // ═══════════════════════════════════════════════════════════
  function generarNarrativa(evt) {
    const tipo = evt.tipo || "";
    const p = evt.payload || {};

    if (tipo.includes("aporte-paciente")) {
      const s = p.subject || p;
      return {
        seccion: "INGRESO",
        titulo: "Identidad del paciente",
        icono: "👤",
        narrativa: `El agente-paciente capturó la identidad: ${s.nombre || "—"} · ${s.edad || "—"} años · ${s.sexo || "—"} · ID ${s.subject_id || "—"}.`
      };
    }
    if (tipo.includes("aporte-subjetivo")) {
      const s = p.subjetivo || p;
      return {
        seccion: "ANAMNESIS",
        titulo: "Motivo de consulta",
        icono: "📝",
        narrativa: `El agente-clínica capturó la anamnesis: motivo "${s.motivo_consulta || "—"}", EVA ${s.eva_dolor ?? "—"}/10, evolución ${s.evolucion || "—"}.`
      };
    }
    if (tipo.includes("aporte-examen-fisico")) {
      const ef = p.examen_fisico || {};
      const n = Object.keys(ef).length;
      return {
        seccion: "EXAMEN FÍSICO",
        titulo: "Evaluación clínica",
        icono: "🩺",
        narrativa: `El agente-clínica capturó el examen físico: ${n} regiones evaluadas.`
      };
    }
    if (tipo.includes("aporte-clinica-tamizaje")) {
      const sv = p.signos_vitales || {};
      return {
        seccion: "SIGNOS VITALES",
        titulo: "Antropometría y vitales",
        icono: "💓",
        narrativa: `El agente-clínica capturó vitales: peso ${sv.peso_kg || "—"} kg · PA ${sv.presion_sistolica_mmhg || "—"}/${sv.presion_diastolica_mmhg || "—"} mmHg · FC ${sv.frecuencia_cardiaca_lpm || "—"} lpm.`
      };
    }
    if (tipo.includes("aporte-clinica-consulta")) {
      const sv = p.signos_vitales || {};
      return {
        seccion: "SIGNOS VITALES",
        titulo: "Vitales de consulta",
        icono: "💓",
        narrativa: `El agente-clínica capturó los vitales: PA ${sv.presion_sistolica_mmhg || "—"}/${sv.presion_diastolica_mmhg || "—"} mmHg · T° ${sv.temperatura || "—"}°C · SatO2 ${sv.saturacion_o2_pct || "—"}%.`
      };
    }
    if (tipo.includes("aporte-diagnosticos")) {
      const dx = (p.diagnosticos || [])[0] || {};
      return {
        seccion: "DIAGNÓSTICO",
        titulo: "Impresión clínica",
        icono: "🎯",
        narrativa: `El agente-clínica capturó los diagnósticos. Principal: ${dx.cie10 || "—"} ${dx.descripcion || "—"}. Riesgo: ${p.nivel_riesgo || "—"}.`
      };
    }
    if (tipo.includes("aporte-laboratorio")) {
      const n = Object.keys(p.labs || {}).length;
      const alt = (p.alteraciones || []).length;
      return {
        seccion: "LABORATORIO",
        titulo: "Resultados recibidos",
        icono: "🔬",
        narrativa: `El agente-laboratorio capturó ${n} valores. ${alt > 0 ? `⚠️ ${alt} alteración(es) detectada(s).` : "Sin alteraciones."}`
      };
    }
    if (tipo.includes("aporte-imagen")) {
      return {
        seccion: "IMÁGENES",
        titulo: "Estudios de imagen",
        icono: "🖼️",
        narrativa: `El agente-imagen capturó ${p.total || 0} imágenes. Protocolo: ${p.protocolo?.titulo || "—"}.`
      };
    }
    if (tipo.includes("aporte-social")) {
      return {
        seccion: "SOCIAL",
        titulo: "Contexto social",
        icono: "🤝",
        narrativa: `El agente-trabajo-social capturó el contexto social. Vulnerabilidad: ${p.vulnerabilidad_nivel || "—"}.`
      };
    }
    if (tipo.includes("tamizaje:contexto-unificado")) {
      const kb = (JSON.stringify(p).length / 1024).toFixed(1);
      return {
        seccion: "CONSOLIDACIÓN",
        titulo: "SAVIA 1 construida",
        icono: "📦",
        narrativa: `La consolidadora de tamizaje construyó la SAVIA 1 del caso ${p.case_id || "—"}. Contexto: ${p.contexto_id || "—"}. Tamaño: ${kb} KB.`
      };
    }
    if (tipo.includes("consulta:contexto-unificado")) {
      const kb = (JSON.stringify(p).length / 1024).toFixed(1);
      return {
        seccion: "CONSOLIDACIÓN",
        titulo: "SAVIA 2 construida",
        icono: "📦",
        narrativa: `La consolidadora de consulta construyó la SAVIA 2 del caso ${p.case_id || "—"}. Contexto: ${p.contexto_id || "—"}. Tamaño: ${kb} KB.`
      };
    }
    if (tipo.includes("guardian:historial-paciente")) {
      return {
        seccion: "HISTORIAL",
        titulo: "Historial del paciente",
        icono: "🩸",
        narrativa: `El guardián detectó ${p.total_casos || 0} caso(s) previo(s). ${(p.alertas || []).length} alerta(s) activa(s): ${(p.alertas || []).map(a => a.mensaje).join("; ") || "sin alertas"}.`
      };
    }
    if (tipo.includes("guardian:actualizada")) {
      return {
        seccion: "GUARDIÁN",
        titulo: "SAVIA acumulativa actualizada",
        icono: "🩸",
        narrativa: `El guardián acumuló el caso ${p.case_id || "—"}. Total: ${p.total_casos || 0} caso(s). Último riesgo: ${p.ultimo_riesgo || "—"}.`
      };
    }
    if (tipo.includes("guardian:alerta-nueva")) {
      const alertas = p.alertas || [];
      return {
        seccion: "ALERTA",
        titulo: "Nueva alerta detectada",
        icono: "⚠️",
        narrativa: `El guardián detectó nuevas alertas: ${alertas.map(a => a.mensaje).join("; ")}.`
      };
    }
    if (tipo.includes("guardian:paciente-nuevo")) {
      return {
        seccion: "HISTORIAL",
        titulo: "Primera vez",
        icono: "🆕",
        narrativa: `Primera vez que se atiende a este paciente (${p.subject_id || "—"}).`
      };
    }

    return {
      seccion: "EVENTO",
      titulo: tipo,
      icono: "📌",
      narrativa: `Evento del sistema: ${tipo} emitido por ${evt.de || "agente"}.`
    };
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER POR MODO
  // ═══════════════════════════════════════════════════════════
  function render() {
    const cont = document.getElementById("obs-narrativa");
    if (!cont) return;

    if (OBS.eventos.length === 0) {
      cont.innerHTML = `
        <div id="obs-vacia" style="text-align:center;padding:40px 20px;color:#86868b;font-size:12px">
          <div style="font-size:42px;margin-bottom:10px">📋</div>
          <div style="font-size:13px;font-weight:700;color:#6e6e73;margin-bottom:6px">Hoja de evolución vacía</div>
          <div style="font-size:11px;line-height:1.6">A medida que el médico atiende al paciente, las notas aparecerán aquí.</div>
        </div>
      `;
      return;
    }

    if (OBS.modo === "evolucion") {
      cont.innerHTML = OBS.eventos.map(evt => {
        const n = generarNarrativa(evt);
        const fecha = formatearHora(evt.timestamp);
        return `
          <div style="background:#fff;border-left:4px solid #34c759;border-radius:0 8px 8px 0;padding:14px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div style="font-size:10px;color:#86868b;font-family:monospace">🕐 ${fecha}</div>
              <span style="font-size:9px;font-weight:700;background:#e8f9ec;color:#1a4a2a;padding:2px 8px;border-radius:100px">${n.seccion}</span>
            </div>
            <div style="font-size:13px;font-weight:800;color:#1a3a5c;margin-bottom:6px">${n.icono} ${n.titulo}</div>
            <div style="font-size:12px;line-height:1.65;color:#333;text-align:justify">${escapeHtml(n.narrativa)}</div>
            <details style="margin-top:8px">
              <summary style="font-size:9px;color:#86868b;cursor:pointer">Ver datos crudos</summary>
              <pre style="margin-top:6px;background:#f5f5f5;padding:8px;border-radius:4px;font-size:9px;max-height:150px;overflow:auto;white-space:pre-wrap;word-break:break-all">${escapeHtml(JSON.stringify(evt.payload, null, 2))}</pre>
            </details>
          </div>
        `;
      }).join("");

    } else if (OBS.modo === "auditoria") {
      cont.innerHTML = OBS.eventos.map(evt => {
        const n = generarNarrativa(evt);
        const fecha = formatearHora(evt.timestamp);
        return `
          <div style="background:#fff;border:1px solid #e8e8ed;border-radius:10px;padding:10px 12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <div style="font-size:11px;font-weight:700;color:#1a3a5c">${n.icono} ${evt.de || "agente"}</div>
              <span style="font-size:9px;color:#86868b;font-family:monospace">${fecha}</span>
            </div>
            <div style="font-size:10px;color:#6e6e73;font-family:monospace;margin-bottom:4px">${escapeHtml(evt.tipo)}</div>
            <div style="font-size:11.5px;line-height:1.5;color:#333">${escapeHtml(n.narrativa.substring(0, 200))}</div>
            <details style="margin-top:6px">
              <summary style="font-size:9px;color:#86868b;cursor:pointer">JSON</summary>
              <pre style="margin-top:4px;background:#f5f5f5;padding:6px;border-radius:4px;font-size:9px;max-height:120px;overflow:auto;white-space:pre-wrap;word-break:break-all">${escapeHtml(JSON.stringify(evt, null, 2))}</pre>
            </details>
          </div>
        `;
      }).join("");

    } else {
      cont.innerHTML = OBS.eventos.map(evt => `
        <div style="background:#1d1d1f;color:#f5f5f7;border-radius:8px;padding:10px 12px;font-family:monospace;font-size:10px;line-height:1.5;overflow:auto;max-height:300px">
          <pre style="margin:0;white-space:pre-wrap;word-break:break-all">${escapeHtml(JSON.stringify(evt, null, 2))}</pre>
        </div>
      `).join("");
    }

    // Auto-scroll
    const ultimo = cont.lastElementChild;
    if (ultimo) ultimo.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ═══════════════════════════════════════════════════════════
  // CAPTURA DE EVENTOS
  // ═══════════════════════════════════════════════════════════
  function capturarEvento(evt) {
    if (!evt || !evt.tipo) return;
    const huella = evt.tipo + "|" + JSON.stringify(evt.payload || {}).substring(0, 200);
    if (OBS.huellas.has(huella)) return;
    OBS.huellas.add(huella);
    OBS.eventos.push({
      tipo: evt.tipo,
      de: evt.de || "agente",
      payload: evt.payload || {},
      timestamp: evt.timestamp || new Date().toISOString()
    });
    render();
  }

  // ═══════════════════════════════════════════════════════════
  // MONKEY-PATCH DE SAVIA
  // ═══════════════════════════════════════════════════════════
  function activarCaptura() {
    if (OBS.capturadorActivo) return;

    const intentar = setInterval(() => {
      if (!window.SAVIA) return;

      const metodos = ["propagar", "enviar", "emitirContexto"];
      let alguno = false;

      metodos.forEach(metodo => {
        if (typeof window.SAVIA[metodo] !== "function") return;
        if (window.SAVIA[metodo]._obsV15Patched) return;

        const original = window.SAVIA[metodo];
        window.SAVIA[metodo] = function() {
          let evt;
          if (metodo === "emitirContexto") {
            evt = {
              tipo: arguments[1],
              payload: arguments[2] || {},
              de: arguments[3]?.de || "agente",
              timestamp: new Date().toISOString()
            };
          } else {
            evt = arguments[0];
          }
          capturarEvento(evt);
          return original.apply(this, arguments);
        };
        window.SAVIA[metodo]._obsV15Patched = true;
        alguno = true;
      });

      if (alguno) {
        OBS.capturadorActivo = true;
        const badge = document.getElementById("obs-badge");
        if (badge) {
          badge.textContent = "✅ Activo";
          badge.style.background = "rgba(52,199,89,0.6)";
        }
        console.log("[Observability v15] ✓ Captura activa");
        clearInterval(intentar);
      }
    }, 500);

    // Timeout después de 15s
    setTimeout(() => clearInterval(intentar), 15000);
  }

  // ═══════════════════════════════════════════════════════════
  // AUTO-INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════
  function init() {
    migrarDesdeV13();
    inyectarBotonFlotante();
    inyectarPanel();
    activarCaptura();
    console.log(`[Observability] ✓ Visor v${VERSION} listo — Modo: ${OBS.modo}`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }

  console.log(`%c[Observability] ✓ Visor v${VERSION} cargado`, "background:#34c759;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");

})();
