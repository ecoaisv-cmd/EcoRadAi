// ═══════════════════════════════════════════════════════════════
// OBSERVABILITY WRAPPER v9.1 — EcoRadAi Sprint 3
// Fix: Narrativa completa + Actualización de tarjetas sin duplicar
// ═══════════════════════════════════════════════════════════════

(function() {
  "use strict";

  const VERSION = "9.1";
  const ESTADO = {
    panelAbierto: false,
    capturadorActivo: false,
    eventos: [],
    contextoIdActual: null,
    iniciado: false
  };

  console.log(`%c[Observability] 🚀 Visor v${VERSION} (Modo Narrativa Clínica) cargando...`, "background:#0071e3;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");

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
  // SECCIÓN 2 — UI INJECTION (Panel del Visor)
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
  // SECCIÓN 3 — CAPTURA MULTICANAL
  // ═══════════════════════════════════════════════════════════
  async function activarCapturador() {
    if (ESTADO.capturadorActivo) return;

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

    const metodos = ["propagar", "emitir", "enviar", "publicar"];
    metodos.forEach(metodo => {
      if (typeof window.SAVIA[metodo] === "function" && !window.SAVIA[metodo]._obsPatched) {
        const original = window.SAVIA[metodo];
        window.SAVIA[metodo] = function(evento) {
          try { procesarEvento(evento); } catch (e) { console.warn("[Observability] Error:", e); }
          return original.apply(this, arguments);
        };
        window.SAVIA[metodo]._obsPatched = true;
      }
    });

    if (typeof window.SAVIA.emitirContexto === "function" && !window.SAVIA.emitirContexto._obsPatched) {
      const origEmitir = window.SAVIA.emitirContexto;
      window.SAVIA.emitirContexto = async function(contextoId, tipo, payload, meta) {
        ESTADO.contextoIdActual = contextoId;
        try {
          procesarEvento({ tipo, payload, de: meta?.de || "agente", timestamp: new Date().toISOString() });
        } catch (e) {}
        return origEmitir.apply(this, arguments);
      };
      window.SAVIA.emitirContexto._obsPatched = true;
    }

    ESTADO.capturadorActivo = true;
    const badge = document.getElementById("obs-badge");
    if (badge) { badge.textContent = "✅ Activo"; badge.style.background = "rgba(52,199,89,0.6)"; }
  }

  function procesarEvento(evento) {
    if (!evento || !evento.tipo) return;
    const tipo = evento.tipo;
    const payload = evento.payload || {};

    try {
      if (tipo.includes("raiz") || tipo.includes("aporte")) return renderRaiz(tipo, payload, evento);
      if (tipo.includes("tronco") || tipo.includes("especialista") || tipo.includes("medico")) return renderTronco(tipo, payload, evento);
      if (tipo.includes("fruto") || tipo.includes("plan")) return renderFruto(tipo, payload, evento);
    } catch (e) {
      console.error("[Observability] Error pintando", tipo, e);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 4 — RENDERIZADO NARRATIVO (CON ACTUALIZACIÓN)
  // ═══════════════════════════════════════════════════════════
  
  function agregarPaso(config) {
    const narrativa = document.getElementById("obs-narrativa");
    if (!narrativa) return;
    const empty = document.getElementById("obs-sangre-vacia");
    if (empty) empty.remove();

    // ═══════════════════════════════════════════════════════════
    // NUEVO v9.1: Lógica de actualización (Evitar duplicados)
    // ═══════════════════════════════════════════════════════════
    const tarjetasExistentes = narrativa.querySelectorAll('.obs-card-item');
    let tarjetaVieja = null;
    const agenteActual = (config.subtitulo || "").split('·')[0].trim();
    
    for (const t of tarjetasExistentes) {
      if (t.dataset.tipo === config.titulo && t.dataset.agente === agenteActual) {
        tarjetaVieja = t;
        break;
      }
    }

    if (tarjetaVieja) {
      console.log(`[Observability] Actualizando tarjeta: ${config.titulo}`);
      
      const body = tarjetaVieja.querySelector('.obs-card-body');
      if (body) body.innerHTML = config.html;
      
      const jsonContainer = tarjetaVieja.querySelector('.obs-json-container');
      if (jsonContainer && config.rawJSON) {
        jsonContainer.innerHTML = `
          <button onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'" 
                  style="background: none; border: 1px dashed #ccc; color: #666; font-size: 9px; padding: 2px 6px; border-radius: 4px; cursor: pointer; width: 100%;">
            { } Ver JSON crudo
          </button>
          <pre style="display: none; margin-top: 4px; background: #f5f5f5; padding: 8px; border-radius: 4px; font-size: 9px; max-height: 150px; overflow: auto; white-space: pre-wrap; word-break: break-all;">${escapeHtml(JSON.stringify(config.rawJSON, null, 2))}</pre>
        `;
      }
      
      let badgeAct = tarjetaVieja.querySelector('.obs-updated-badge');
      if (!badgeAct) {
        badgeAct = document.createElement('span');
        badgeAct.className = 'obs-updated-badge';
        badgeAct.style = "font-size:8px;font-weight:700;background:#ff9500;color:white;padding:2px 6px;border-radius:4px;margin-left:6px;text-transform:uppercase";
        badgeAct.textContent = "Actualizado";
        const header = tarjetaVieja.querySelector('.obs-card-title');
        if (header) header.appendChild(badgeAct);
      }
      
      tarjetaVieja.style.animation = 'none';
      tarjetaVieja.offsetHeight; 
      tarjetaVieja.style.animation = 'obsFlash 1s';
      
      return; 
    }

    // ─── Si no existe, crear tarjeta nueva ───
    const card = document.createElement("div");
    card.className = "obs-card-item";
    card.dataset.tipo = config.titulo;
    card.dataset.agente = agenteActual;
    card.style.cssText = `position: relative; z-index: 1; background: white; border: 1px solid #e8e8ed; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); animation: obsSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); margin-left: 20px; overflow: hidden;`;

    const badgeColor = config.badgeColor || config.color || "#34c759";
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
          <div style="font-size: 10px; color: #86868b; font-family: ui-monospace, monospace">${escapeHtml(config.subtitulo || "")}</div>
        </div>
        <span style="font-size: 9px; font-weight: 800; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; background: ${badgeColor}; color: white; flex-shrink: 0; letter-spacing: 0.5px">${config.badge || ""}</span>
      </div>
      <div class="obs-card-body" style="padding: 16px; font-size: 12px; line-height: 1.6; color: #333;">
        ${config.html || ""}
        ${jsonBtnHTML}
      </div>
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

  // ─── RENDER: RAÍZ ───
  function renderRaiz(tipo, payload, evento) {
    ESTADO.eventos.push({ tipo: "raiz", evento });
    
    let titulo = "Agente de Captura";
    let narrativa = "";
    let badgeColor = "#0071e3"; 

    if (tipo.includes("paciente")) {
      titulo = "Registro de Paciente";
      const subj = payload.subject || {};
      const partes = [
        subj.nombre && `<strong>Nombre:</strong> ${escapeHtml(subj.nombre)}`,
        subj.subject_id && `<strong>ID:</strong> ${escapeHtml(subj.subject_id)}`,
        subj.edad && `<strong>Edad:</strong> ${escapeHtml(String(subj.edad))} años`,
        subj.sexo && `<strong>Sexo:</strong> ${escapeHtml(subj.sexo)}`
      ].filter(Boolean);
      narrativa = partes.length > 0
        ? `El agente-paciente capturó la identidad del paciente.<br>${partes.join("<br>")}`
        : "El agente-paciente registró datos del paciente.";
    } 
    else if (tipo.includes("subjetivo")) {
      titulo = "Anamnesis (Subjetivo)";
      const s = payload.subjetivo || {};
      const lineas = [];
      if (s.motivo) lineas.push(`<strong>Motivo:</strong> ${escapeHtml(s.motivo)}`);
      if (s.enfermedad_actual) lineas.push(`<strong>Enfermedad actual:</strong> ${escapeHtml(s.enfermedad_actual)}`);
      if (s.revision_sistemas && Object.keys(s.revision_sistemas).length > 0) {
        const rev = Object.entries(s.revision_sistemas).map(([k, v]) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}`).join("<br>");
        lineas.push(`<strong>Revisión por sistemas:</strong><br>${rev}`);
      }
      narrativa = lineas.length > 0
        ? lineas.join("<br><br>")
        : "El agente-clinica capturó la anamnesis del paciente (sin detalles).";
    }
    else if (tipo.includes("examen")) {
      titulo = "Examen Físico";
      const ef = payload.examen_fisico || {};
      const regiones = Object.entries(ef).map(([k, v]) => `<strong>${escapeHtml(k.replace(/_/g, " "))}:</strong> ${escapeHtml(v)}`);
      narrativa = regiones.length > 0
        ? `Se registraron hallazgos en ${regiones.length} región(es):<br>${regiones.join("<br>")}`
        : "El agente-clinica registró el examen físico.";
    }
    else if (tipo.includes("clinica")) {
      titulo = "Signos Vitales y Antropometría";
      const c = payload.clinica || payload;
      const filas = [];
      if (c.peso_kg) filas.push(`Peso: <strong>${c.peso_kg} kg</strong>`);
      if (c.talla_cm) filas.push(`Talla: <strong>${c.talla_cm} cm</strong>`);
      if (c.imc) filas.push(`IMC: <strong>${c.imc}</strong>`);
      if (c.circunferencia_cintura_cm) filas.push(`Cintura: <strong>${c.circunferencia_cintura_cm} cm</strong>`);
      if (c.presion_sistolica_mmhg) filas.push(`PA: <strong>${c.presion_sistolica_mmhg}/${c.presion_diastolica_mmhg || "—"} mmHg</strong>`);
      if (c.frecuencia_cardiaca_lpm) filas.push(`FC: <strong>${c.frecuencia_cardiaca_lpm} lpm</strong>`);
      if (c.saturacion_o2_pct) filas.push(`SatO2: <strong>${c.saturacion_o2_pct}%</strong>`);
      narrativa = filas.length > 0
        ? `El agente-clinica capturó signos vitales:<br>${filas.join(" · ")}`
        : "El agente-clinica capturó signos vitales.";
    }
    else if (tipo.includes("laboratorio")) {
      titulo = "Resultados de Laboratorio";
      const l = payload.labs || payload;
      const entries = Object.entries(l);
      narrativa = entries.length > 0
        ? `Se han recibido ${entries.length} examen(es):<br>` +
          entries.slice(0, 5).map(([k, v]) => `<strong>${escapeHtml(k.replace(/_/g, " "))}:</strong> ${escapeHtml(String(v))}`).join("<br>") +
          (entries.length > 5 ? `<br>... y ${entries.length - 5} más` : "")
        : "El agente-laboratorio registró exámenes de laboratorio.";
    }
    else if (tipo.includes("contexto-unificado") || tipo === "savia:raiz:contexto-unificado") {
      titulo = "Consolidación de SAVIA RAÍZ";
      narrativa = `El agente-savia-consolidadora ha unificado todos los aportes en un solo contexto clínico (${escapeHtml(payload.contexto_id || "—")}), listo para el TRONCO.`;
      ESTADO.eventos.push({ tipo: "savia", evento });
      badgeColor = "#34c759"; 
    }
    else {
      titulo = "Evento de Captura";
      narrativa = `El agente <strong>${escapeHtml(evento.de || "desconocido")}</strong> emitió el evento <code>${escapeHtml(tipo)}</code> con ${Object.keys(payload).length} campo(s).`;
    }

    agregarPaso({ 
      color: "#34c759", badge: "RAÍZ", badgeColor: badgeColor, 
      titulo, subtitulo: `${evento.de || 'agente'} · ${formatearHora(evento.timestamp)}`, 
      html: `<div style="font-size:12px; line-height:1.5;">${narrativa}</div>`,
      rawJSON: payload
    });
  }

  // ─── RENDER: TRONCO ───
  function renderTronco(tipo, payload, evento) {
    ESTADO.eventos.push({ tipo: "tronco", evento });
    
    let titulo = "Procesamiento TRONCO";
    let narrativa = "";

    if (tipo.includes("informe-kimi")) {
      titulo = "Análisis del Coordinador";
      narrativa = `El coordinador ha procesado la SAVIA con Kimi y ha generado el informe base. Se detectaron <strong>${payload.interconsultas_sugeridas?.length || 0}</strong> interconsultas sugeridas.`;
    }
    else if (tipo.includes("especialista")) {
      titulo = `Análisis de Especialista: ${payload.especialista || "—"}`;
      narrativa = `El agente especialista ha revisado el caso y emitió su diagnóstico: <em>"${payload.resultado?.resumen || payload.resumen || "Análisis completado."}"</em>`;
    }
    else if (tipo.includes("medico")) {
      titulo = "Validación del Médico";
      narrativa = `El médico validador ha revisado el caso y autorizado el plan de acción.`;
    }

    agregarPaso({ 
      color: "#d4a017", badge: "TRONCO", badgeColor: "#d4a017", 
      titulo, subtitulo: `${evento.de || 'agente'} · ${formatearHora(evento.timestamp)}`, 
      html: `<div style="font-size:12px; line-height:1.5;">${narrativa}</div>`,
      rawJSON: payload
    });
  }

  // ─── RENDER: FRUTO ───
  function renderFruto(tipo, payload, evento) {
    ESTADO.eventos.push({ tipo: "fruto", evento });
    
    let titulo = "Generación de FRUTO";
    let narrativa = "";

    if (tipo.includes("plan")) {
      titulo = "Plan Integrado Final";
      narrativa = `El tejido ha consolidado el diagnóstico y los planes de los especialistas en un <strong>Plan Farmacológico y No Farmacológico</strong> listo para el paciente.`;
    }

    agregarPaso({ 
      color: "#ff3b30", badge: "FRUTO", badgeColor: "#ff3b30", 
      titulo, subtitulo: `${evento.de || 'agente'} · ${formatearHora(evento.timestamp)}`, 
      html: `<div style="font-size:12px; line-height:1.5;">${narrativa}</div>`,
      rawJSON: payload
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SECCIÓN 5 — UTILIDADES
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
    alert("🌿 ¿Cómo funciona la SAVIA?\n\nEl Visor es un observador pasivo. Se engancha a los canales del Kernel (window.SAVIA) y pinta cada evento que los agentes emiten.\n\nSi corriges un dato y vuelves a avanzar, el Visor actualizará la tarjeta en lugar de duplicarla.");
  }

  function mostrarDiagnostico() {
    const diag = {
      "Versión wrapper": VERSION,
      "SAVIA disponible": !!window.SAVIA,
      "Canales enganchados": ["propagar", "emitir", "enviar", "publicar", "emitirContexto"].filter(m => window.SAVIA?.[m]?._obsPatched).join(", ") || "Ninguno",
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
    style.textContent = `
      @keyframes obsSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes obsFlash { 0% { background-color: rgba(255, 149, 0, 0.3); } 100% { background-color: white; } }
    `;
    document.head.appendChild(style);
  }

  function init() {
    if (ESTADO.iniciado) return;
    ESTADO.iniciado = true;
    
    try { inyectarEstilos(); } catch (e) {}
    try { inyectarBotonFlotante(); } catch (e) {}
    try { inyectarPanel(); } catch (e) {}
    
    setTimeout(activarCapturador, 2000);
    
    console.log(`%c[Observability] ✅ Visor v${VERSION} inicializado.`, "background:#34c759;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }

})();
