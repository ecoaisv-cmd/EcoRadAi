/* ═══════════════════════════════════════════════════════════════════
   WRAPPER PROCEDIMIENTOS v2.4 — CON FIRMA Y SELLO PROFESIONAL
   ═══════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════════════════
   PARTE 1 — WIZARD DE PROCEDIMIENTOS
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  console.log("[Proc v2.4] Iniciando wrapper del wizard...");

  // ═══════════════════════════════════════════════════════════════
  // ESTADO
  // ═══════════════════════════════════════════════════════════════
  const PROC = {
    inicializado: false,
    intentos: 0,
    MAX_INTENTOS: 80,
    catalogo: {},
    paciente: null,
    procedimiento: null,
    pasoActual: 1,
    consentimientoFirma: null,
    consentimientoMetodo: "tablet",
    materialesUsados: [],
    recetaMedicamentos: [],
    laboratoriosSolicitados: [],
    caseId: null,
    procedimientoRealizadoId: null,
    docsGenerados: null,
    notaIA: null,
    notaEditada: null,
    recetaIA: null,
    labsIA: null,
    contextoPlan: null,
    datosEjecucion: null,
    firmante: null // NUEVO: Guarda los datos de quién firma
  };

  window.PROCEDIMIENTOS = PROC;
  window.__PROC = {
    estado: () => ({
      inicializado: PROC.inicializado,
      intentos: PROC.intentos,
      rol: window.usuarioActual?.rol,
      catalogoCargado: Object.keys(PROC.catalogo).length,
      paciente: PROC.paciente?.subject_id,
      paso: PROC.pasoActual,
      caseId: PROC.caseId,
      firmante: PROC.firmante,
      receta: PROC.recetaMedicamentos.length,
      labs: PROC.laboratoriosSolicitados.length
    }),
    recargarCatalogo: () => cargarCatalogo(),
    forzarRender: () => {
      const sec = document.getElementById("sec-procedimientos");
      if (!sec) return "Sección no existe — llama __PROC.forzarInyeccion()";
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      sec.classList.add("active");
      renderWizard();
      return "Render forzado";
    },
    forzarInyeccion: () => {
      const ok = inyectarHTML();
      console.log("[Proc v2.4] Inyección forzada:", ok);
      return ok;
    },
    verCatalogo: () => console.table(Object.values(PROC.catalogo))
  };

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════
  const esc = window.escapeHtml || function(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  };
  const toast = window.showStatus || function(msg, tipo) {
    console.log("[Proc v2.4]", tipo || "info", msg);
  };
  function $id(id) { return document.getElementById(id); }
  function debounce(fn, ms) {
    let t;
    return function() {
      clearTimeout(t);
      const ctx = this, args = arguments;
      t = setTimeout(() => fn.apply(ctx, args), ms);
    };
  }
  function ahoraFecha() { return new Date().toISOString().slice(0, 10); }
  function ahoraHora()  { return new Date().toTimeString().slice(0, 5); }

  // ═══════════════════════════════════════════════════════════════
  // PROMPTS IA
  // ═══════════════════════════════════════════════════════════════
  const PROMPT_NOTA = `Actúa como médico con 15 años de experiencia.

CONTEXTO: Generas una NOTA DE PROCEDIMIENTO narrativa para EcoRadAi.

PACIENTE:
- Nombre: {NOMBRE}
- ID: {SUBJECT_ID}
- Edad: {EDAD} años
- Sexo: {SEXO}
- DUI: {DUI}

PROCEDIMIENTO:
- Nombre: {PROCEDIMIENTO_NOMBRE}
- Código: {PROCEDIMIENTO_CODIGO}
- Categoría: {CATEGORIA}
- Complejidad: {COMPLEJIDAD}

EJECUCIÓN:
- Fecha: {FECHA}
- Indicación: {INDICACION}
- CIE-10: {CIE10}
- Técnica: {TECNICA}
- Hallazgos: {HALLAZGOS}
- Complicaciones: {COMPLICACIONES}
- Seguimiento: {SEGUIMIENTO}
- Materiales: {MATERIALES}

Genera la nota con estas 8 secciones:

1. RESUMEN DEL PROCEDIMIENTO
2. INDICACIÓN CLÍNICA
3. TÉCNICA REALIZADA
4. HALLAZGOS
5. COMPLICACIONES Y MANEJO
6. MATERIALES UTILIZADOS
7. PLAN DE SEGUIMIENTO
8. PRONÓSTICO Y RECOMENDACIONES

===JSON_ESTRUCTURADO===
{
  "procedimiento_exitoso": true,
  "requiere_seguimiento_urgente": false,
  "complicaciones_presentadas": [],
  "recomendaciones_paciente": [],
  "nivel_complejidad_real": "basica",
  "proximo_control_dias": 7
}
===FIN_JSON===

REGLAS: sin markdown, tildes y eñes correctas, español.`;

  const PROMPT_RECETA = `Actúa como médico clínico con 15 años de experiencia.

PACIENTE:
- Nombre: {NOMBRE}
- Edad: {EDAD} años
- Sexo: {SEXO}
- Alergias: {ALERGIAS}

PROCEDIMIENTO: {PROCEDIMIENTO_NOMBRE}
INDICACIÓN: {INDICACION}
HALLAZGOS: {HALLAZGOS}

Genera receta SOLO si está indicada. Si no, devuelve [] en medicamentos.

===JSON_ESTRUCTURADO===
{
  "requiere_medicacion": true,
  "justificacion": "...",
  "medicamentos": [
    {
      "farmaco": "Ibuprofeno",
      "presentacion": "tableta 400 mg",
      "dosis": "400 mg",
      "via": "oral",
      "frecuencia": "cada 8 horas",
      "duracion": "5 días",
      "indicacion": "Dolor post-procedimiento"
    }
  ]
}
===FIN_JSON===

REGLAS: dosis pediátricas si < 12 años. Sin markdown.`;

  const PROMPT_LABS = `Actúa como médico clínico.

PACIENTE:
- Nombre: {NOMBRE}
- Edad: {EDAD} años
- Sexo: {SEXO}

PROCEDIMIENTO: {PROCEDIMIENTO_NOMBRE}
INDICACIÓN: {INDICACION}
HALLAZGOS: {HALLAZGOS}
COMPLICACIONES: {COMPLICACIONES}

Genera labs SOLO si está indicado. Si no, devuelve [].

===JSON_ESTRUCTURADO===
{
  "requiere_laboratorio": true,
  "justificacion": "...",
  "laboratorios": [
    {
      "estudio": "Hemograma completo",
      "tipo": "sangre",
      "plazo_dias": 0,
      "urgente": false,
      "motivo": "..."
    }
  ]
}
===FIN_JSON===

Sin markdown.`;

  // ═══════════════════════════════════════════════════════════════
  // CATÁLOGO
  // ═══════════════════════════════════════════════════════════════
  async function cargarCatalogo() {
    if (!window.supabaseClient) return false;
    try {
      const { data, error } = await window.supabaseClient.rpc("listar_procedimientos_catalogo");
      if (error) throw error;
      PROC.catalogo = {};
      (data || []).forEach(p => { PROC.catalogo[p.procedimiento_id] = p; });
      console.log(`[Proc v2.4] ✓ Catálogo: ${data?.length || 0} procedimientos`);
      return true;
    } catch (e) {
      console.error("[Proc v2.4] Error catálogo:", e);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INYECCIÓN HTML
  // ═══════════════════════════════════════════════════════════════
  function inyectarHTML() {
    const tabs = $id("tabs-principales");
    if (!tabs) {
      console.warn("[Proc v2.4] ⚠️ #tabs-principales no existe aún");
      return false;
    }

    // 1. Inyectar TAB
    if (!document.querySelector('[data-tab="procedimientos"]')) {
      const tab = document.createElement("div");
      tab.className = "tab";
      tab.dataset.tab = "procedimientos";
      tab.dataset.acceso = "todos";
      tab.innerHTML = "🩹 Procedimientos";
      tab.onclick = () => window.cambiarTab("procedimientos");

      const refTab = tabs.querySelector('[data-tab="pacientes"]')
                  || tabs.querySelector('[data-tab="informes"]')
                  || tabs.querySelector('[data-tab="consulta"]');

      if (refTab) {
        tabs.insertBefore(tab, refTab);
      } else {
        tabs.appendChild(tab);
      }
      console.log("[Proc v2.4] ✓ Tab 'procedimientos' inyectada");
    }

    // 2. Inyectar SECCIÓN
    if (!$id("sec-procedimientos")) {
      const container = document.querySelector(".container") || document.body;
      const sec = document.createElement("div");
      sec.className = "section";
      sec.id = "sec-procedimientos";
      sec.innerHTML = `<div id="proc-wizard-container"></div>`;
      container.appendChild(sec);
      console.log("[Proc v2.4] ✓ Sección #sec-procedimientos inyectada");
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // WRAPPERS DE NAVEGACIÓN
  // ═══════════════════════════════════════════════════════════════
  function instalarWrapperCambiarTab() {
    if (typeof window.cambiarTab !== "function") return false;
    if (window.cambiarTab._procWrap) return true;

    const _orig = window.cambiarTab;
    window.cambiarTab = function(tab) {
      const result = _orig.apply(this, arguments);
      if (tab === "procedimientos") {
        setTimeout(() => {
          const sec = $id("sec-procedimientos");
          if (sec) {
            document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
            sec.classList.add("active");
            renderWizard();
          }
        }, 100);
      }
      return result;
    };
    window.cambiarTab._procWrap = true;
    return true;
  }

  function instalarWrapperAjustarUI() {
    if (typeof window.ajustarUIPorRol !== "function") return false;
    if (window.ajustarUIPorRol._procWrap) return true;

    const _orig = window.ajustarUIPorRol;
    window.ajustarUIPorRol = function(rol) {
      const result = _orig.apply(this, arguments);
      if (rol === "operador" || rol === "medico" || rol === "admin") {
        const forzarTab = () => {
          const tab = document.querySelector('[data-tab="procedimientos"]');
          if (tab) {
            tab.style.display = "";
            tab.style.visibility = "visible";
            tab.style.pointerEvents = "auto";
            tab.style.width = "";
            tab.style.height = "";
            tab.style.padding = "";
            tab.style.margin = "";
            tab.style.border = "";
            tab.style.position = "";
          }
        };
        setTimeout(forzarTab, 50);
        setTimeout(forzarTab, 300);
        setTimeout(forzarTab, 800);
        setTimeout(forzarTab, 1500);
        setTimeout(forzarTab, 3000);
      }
      return result;
    };
    window.ajustarUIPorRol._procWrap = true;
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // WIZARD
  // ═══════════════════════════════════════════════════════════════
  function renderWizard() {
    const cont = $id("proc-wizard-container");
    if (!cont) return;
    if (!PROC.paciente) PROC.pasoActual = 1;
    if (!PROC.procedimiento) PROC.pasoActual = Math.min(PROC.pasoActual, 2);

    cont.innerHTML = `
      <div class="card no-print" style="margin-bottom:14px">
        <div class="card-title">
          <span class="num">🩹</span>
          <span>Módulo de Procedimientos</span>
          <span class="card-desc">IA · Receta · Laboratorios</span>
        </div>
        ${renderProgresoPasos()}
      </div>
      <div id="proc-paso-container"></div>
    `;
    renderPaso();
  }

  function renderProgresoPasos() {
    const pasos = [
      { id: 1, label: "Paciente" },
      { id: 2, label: "Procedimiento" },
      { id: 3, label: "Consentimiento" },
      { id: 4, label: "Ejecución" },
      { id: 5, label: "Materiales" },
      { id: 6, label: "IA + Extras" },
      { id: 7, label: "Firma" }
    ];
    return `
      <div class="steps" style="margin:12px 0 0;display:flex;gap:6px;overflow-x:auto">
        ${pasos.map(p => {
          const activo = p.id === PROC.pasoActual;
          const done = p.id < PROC.pasoActual;
          return `<div class="step ${activo ? "active" : ""} ${done ? "done" : ""}" style="flex:1;min-width:60px">${p.id}. ${p.label}</div>`;
        }).join("")}
      </div>
    `;
  }

  function renderPaso() {
    const cont = $id("proc-paso-container");
    if (!cont) return;
    switch (PROC.pasoActual) {
      case 1: renderPasoPaciente(cont); break;
      case 2: renderPasoProcedimiento(cont); break;
      case 3: renderPasoConsentimiento(cont); break;
      case 4: renderPasoEjecucion(cont); break;
      case 5: renderPasoMateriales(cont); break;
      case 6: renderPasoIAExtras(cont); break;
      case 7: renderPasoFirma(cont); break;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PASO 1 — PACIENTE
  // ─────────────────────────────────────────────────────────────
  function renderPasoPaciente(cont) {
    cont.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="num">1</span>Seleccionar paciente</div>
        <div class="form-group">
          <input type="text" id="proc-buscar-paciente" placeholder="🔍 Nombre, DUI, email, ID..." oninput="procBuscarPaciente(this.value)" autocomplete="off">
        </div>
        <div id="proc-resultados-paciente" style="display:none;margin-top:10px"></div>
      </div>
    `;
    if (PROC.paciente) {
      const info = document.createElement("div");
      info.style.cssText = "background:var(--accent-light);border-radius:10px;padding:12px;margin-top:14px";
      info.innerHTML = `
        <div style="font-size:13px;font-weight:700;color:var(--corp)">${esc(PROC.paciente.nombre)}</div>
        <div style="font-size:11px;color:var(--text-secondary);font-family:monospace">
          ${esc(PROC.paciente.subject_id)} · ${PROC.paciente.edad || "—"} años · ${esc(PROC.paciente.sexo || "—")}
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:10px;width:100%;font-size:12px" onclick="procIrAPaso(2)">Continuar →</button>
      `;
      cont.querySelector(".card").appendChild(info);
    }
  }

  window.procBuscarPaciente = debounce(async function(query) {
    const cont = $id("proc-resultados-paciente");
    if (!cont) return;
    if (!query || query.trim().length < 2) { cont.style.display = "none"; return; }
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.rpc("buscar_pacientes", { query: query.trim() });
      if (error) throw error;
      if (!data || data.length === 0) {
        cont.innerHTML = `<div style="padding:12px;background:var(--bg-secondary);border-radius:8px;font-size:11px;text-align:center">Sin resultados.</div>`;
      } else {
        cont.innerHTML = data.map(p => `
          <div class="consulta-paciente-card-result" onclick="procSeleccionarPaciente('${esc(p.subject_id)}')">
            <div style="font-size:13px;font-weight:700;color:var(--corp)">${esc(p.nombre)}</div>
            <div style="font-size:10px;color:var(--text-secondary);font-family:monospace">${esc(p.subject_id)}</div>
            <div style="font-size:10px;color:var(--text-tertiary);margin-top:2px">${p.edad || "—"} años · ${esc(p.sexo || "—")}${p.dui ? " · DUI " + esc(p.dui) : ""}</div>
          </div>
        `).join("");
      }
      cont.style.display = "block";
    } catch (e) {
      cont.innerHTML = `<div style="padding:10px;background:#fff3f3;border-radius:8px;font-size:11px;color:#7a1a1a">Error: ${esc(e.message)}</div>`;
      cont.style.display = "block";
    }
  }, 350);

  window.procSeleccionarPaciente = async function(subjectId) {
    if (!window.supabaseClient) return;
    try {
      const { data, error } = await window.supabaseClient.from("patients").select("*").eq("subject_id", subjectId).single();
      if (error || !data) { toast("Paciente no encontrado", "error"); return; }
      PROC.paciente = data;
      try {
        const cuota = await verificarCuotaPaciente(subjectId);
        PROC.contextoPlan = cuota;
        if (cuota.tiene_suscripcion && !cuota.disponible) {
          const ok = confirm("⚠️ Paciente agotó cuota de procedimientos este mes.\n\n¿Continuar como ADD-ON de pago?");
          if (!ok) { PROC.paciente = null; return; }
        }
      } catch (e) {}
      toast("Paciente seleccionado", "success");
      renderWizard();
    } catch (e) {
      console.error(e);
      toast("Error", "error");
    }
  };

  async function verificarCuotaPaciente(subjectId) {
    if (!window.supabaseClient) return { tiene_suscripcion: false, disponible: true };
    try {
      const { data } = await window.supabaseClient.rpc("verificar_cuota", { p_subject_id: subjectId, p_tipo_servicio: "procedimiento" });
      return data || { tiene_suscripcion: false, disponible: true };
    } catch (e) { return { tiene_suscripcion: false, disponible: true }; }
  }

  // ─────────────────────────────────────────────────────────────
  // PASO 2 — PROCEDIMIENTO
  // ─────────────────────────────────────────────────────────────
  function renderPasoProcedimiento(cont) {
    const categorias = {
      curacion: { icon: "🩹", label: "Curaciones" },
      inyectable: { icon: "💉", label: "Inyectables" },
      sonda: { icon: "🩺", label: "Sondas" },
      cirugia_menor: { icon: "🔪", label: "Cirugía menor" },
      cuerpo_extrano: { icon: "🔍", label: "Cuerpo extraño" },
      hidratacion: { icon: "💧", label: "Hidratación IV" }
    };
    const agrupados = {};
    Object.values(PROC.catalogo).forEach(p => {
      if (!agrupados[p.categoria]) agrupados[p.categoria] = [];
      agrupados[p.categoria].push(p);
    });

    cont.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="num">2</span>Seleccionar procedimiento</div>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">Paciente: <strong>${esc(PROC.paciente?.nombre || "—")}</strong></p>
        ${Object.keys(agrupados).length === 0 
          ? '<div class="empty-state"><div class="icon">⏳</div><p>Cargando catálogo...</p></div>'
          : Object.entries(agrupados).map(([cat, items]) => `
            <h4 style="font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;margin:14px 0 8px">
              ${categorias[cat]?.icon || "📋"} ${categorias[cat]?.label || cat}
            </h4>
            <div class="estudio-selector">
              ${items.map(p => `
                <div class="estudio-card ${PROC.procedimiento?.procedimiento_id === p.procedimiento_id ? "active" : ""}" onclick="procSeleccionarProcedimiento('${p.procedimiento_id}')">
                  <div class="estudio-nombre" style="font-size:11px">${esc(p.nombre)}</div>
                  <div class="estudio-desc">${p.duracion_min} min · ${p.complejidad}</div>
                  <div class="estudio-precio">$${parseFloat(p.precio_base).toFixed(2)}</div>
                </div>
              `).join("")}
            </div>
          `).join("")}
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-secondary" onclick="procIrAPaso(1)">← Atrás</button>
          <button class="btn btn-primary" onclick="procIrAPaso(3)" ${!PROC.procedimiento ? "disabled" : ""} style="${!PROC.procedimiento ? "opacity:0.5" : ""}">Continuar →</button>
        </div>
      </div>
    `;
  }

  window.procSeleccionarProcedimiento = function(procedimientoId) {
    const proc = PROC.catalogo[procedimientoId];
    if (!proc) return;
    PROC.procedimiento = proc;
    renderPasoProcedimiento($id("proc-paso-container"));
  };

  // ─────────────────────────────────────────────────────────────
  // PASO 3 — CONSENTIMIENTO
  // ─────────────────────────────────────────────────────────────
  function renderPasoConsentimiento(cont) {
    const p = PROC.procedimiento;
    const requiere = p?.requiere_consentimiento;

    if (!requiere) {
      cont.innerHTML = `
        <div class="card">
          <div class="card-title"><span class="num">3</span>Consentimiento</div>
          <div style="background:#f0fff4;border-left:4px solid var(--positive);padding:12px 14px;border-radius:0 8px 8px 0;font-size:12px;color:#1a4a2a;margin-bottom:14px">
            ✅ Este procedimiento NO requiere consentimiento firmado.
          </div>
          <div class="btn-row">
            <button class="btn btn-secondary" onclick="procIrAPaso(2)">← Atrás</button>
            <button class="btn btn-primary" onclick="procIrAPaso(4)">Continuar →</button>
          </div>
        </div>
      `;
      return;
    }

    cont.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="num">3</span>Consentimiento informado</div>
        <div style="background:#fff9e6;border:2px solid var(--warning);padding:14px;border-radius:10px;margin-bottom:14px">
          <h4 style="font-size:13px;font-weight:700;color:#8a6a00;margin-bottom:8px">⚖️ ${esc(p.nombre)}</h4>
          <p style="font-size:11px;line-height:1.6;color:#5a4a00;margin-bottom:10px">
            He sido informado/a del procedimiento, sus beneficios, riesgos, alternativas y posibles complicaciones.
          </p>
        </div>
        <div class="form-group">
          <label>Nombre del paciente *</label>
          <input type="text" value="${esc(PROC.paciente?.nombre || "")}" readonly style="background:var(--bg-tertiary)">
        </div>
        <div style="display:flex;gap:8px;margin:12px 0">
          <button class="btn btn-primary" onclick="procAbrirFirma('tablet')" style="flex:1;font-size:12px">✍️ Firmar en pantalla</button>
          <button class="btn btn-secondary" onclick="procAbrirFirma('papel_foto')" style="flex:1;font-size:12px">📷 Foto del papel</button>
        </div>
        <div id="proc-firma-guardada-container" style="display:none;margin-top:12px;padding:10px;background:#f0fff4;border-radius:8px;border:1px solid var(--positive)">
          <div style="font-size:11px;font-weight:700;color:#1a4a2a;margin-bottom:6px">✅ Firma registrada</div>
          <img id="proc-firma-guardada-img" style="max-width:100%;max-height:100px;border-radius:4px;background:white">
        </div>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-secondary" onclick="procIrAPaso(2)">← Atrás</button>
          <button class="btn btn-primary" id="proc-btn-paso3" onclick="procIrAPaso(4)" ${!PROC.consentimientoFirma ? "disabled" : ""} style="${!PROC.consentimientoFirma ? "opacity:0.5" : ""}">Continuar →</button>
        </div>
      </div>
    `;
    if (PROC.consentimientoFirma) aplicarFirmaConsentimiento();
  }

  window.procAbrirFirma = function(metodo) {
    PROC.consentimientoMetodo = metodo || "tablet";
    if (metodo === "papel_foto") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");
      input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { PROC.consentimientoFirma = ev.target.result; aplicarFirmaConsentimiento(); };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }
    const overlay = document.createElement("div");
    overlay.id = "proc-modal-firma";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px";
    overlay.innerHTML = `
      <div style="background:var(--bg);border-radius:16px;max-width:600px;width:100%;padding:24px">
        <div style="text-align:center;margin-bottom:16px"><div style="font-size:32px">✍️</div><h3 style="font-size:16px;font-weight:700">Firma del paciente</h3></div>
        <div style="position:relative;background:#fff;border:2px dashed var(--accent);border-radius:10px;margin-bottom:12px;overflow:hidden">
          <canvas id="proc-firma-canvas" width="540" height="220" style="display:block;touch-action:none;cursor:crosshair;width:100%;max-width:540px"></canvas>
          <div id="proc-firma-placeholder" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;color:#ccc;font-size:14px;font-style:italic">Firma aquí</div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <button class="btn btn-secondary" onclick="procLimpiarFirma()" style="flex:1;font-size:12px">🧹 Borrar</button>
          <button class="btn btn-success" onclick="procGuardarFirma()" style="flex:1;font-size:12px">✅ Guardar</button>
        </div>
        <button class="btn btn-secondary" onclick="document.getElementById('proc-modal-firma').remove()" style="width:100%;font-size:12px">Cancelar</button>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(initCanvasFirma, 100);
  };

  let _procCanvasCtx = null;
  let _procFirmaTieneTrazo = false;

  function initCanvasFirma() {
    const canvas = $id("proc-firma-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1a3a5c";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    _procCanvasCtx = ctx;
    _procFirmaTieneTrazo = false;
    let dibujando = false;
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      let cx, cy;
      if (e.touches && e.touches.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      else { cx = e.clientX; cy = e.clientY; }
      return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
    };
    const start = (e) => { e.preventDefault(); dibujando = true; _procFirmaTieneTrazo = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); const ph = $id("proc-firma-placeholder"); if (ph) ph.style.display = "none"; };
    const move = (e) => { if (!dibujando) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const end = (e) => { e.preventDefault(); dibujando = false; ctx.closePath(); };
    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end, { passive: false });
  }

  window.procLimpiarFirma = function() {
    const canvas = $id("proc-firma-canvas");
    if (!canvas || !_procCanvasCtx) return;
    _procCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    _procFirmaTieneTrazo = false;
    const ph = $id("proc-firma-placeholder");
    if (ph) ph.style.display = "flex";
  };

  window.procGuardarFirma = function() {
    if (!_procFirmaTieneTrazo) { toast("Por favor firme primero", "warning"); return; }
    const canvas = $id("proc-firma-canvas");
    PROC.consentimientoFirma = canvas.toDataURL("image/png");
    document.getElementById("proc-modal-firma")?.remove();
    aplicarFirmaConsentimiento();
  };

  function aplicarFirmaConsentimiento() {
    const cont = $id("proc-firma-guardada-container");
    const img = $id("proc-firma-guardada-img");
    const btn = $id("proc-btn-paso3");
    if (cont) cont.style.display = "block";
    if (img) img.src = PROC.consentimientoFirma;
    if (btn) { btn.disabled = false; btn.style.opacity = "1"; }
  }

  // ─────────────────────────────────────────────────────────────
  // PASO 4 — EJECUCIÓN
  // ─────────────────────────────────────────────────────────────
  function renderPasoEjecucion(cont) {
    const p = PROC.procedimiento;
    const d = PROC.datosEjecucion || {};
    
    cont.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="num">4</span>Ejecución del procedimiento</div>
        <div style="background:var(--accent-light);border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px">
          <strong style="color:var(--accent-dark)">${esc(p.nombre)}</strong> · ${p.duracion_min} min
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div class="form-group"><label>Fecha *</label>
            <input type="date" id="proc-fecha" value="${d.fecha_procedimiento || ahoraFecha()}"></div>
          <div class="form-group"><label>Hora *</label>
            <input type="time" id="proc-hora-inicio" value="${d.hora_inicio || ahoraHora()}"></div>
        </div>
        <div class="form-group"><label>Indicación clínica *</label>
          <textarea id="proc-indicacion" placeholder="Motivo del procedimiento..." style="min-height:60px">${esc(d.indicacion || "")}</textarea></div>
        <div class="form-group"><label>CIE-10</label>
          <input type="text" id="proc-cie10" placeholder="Ej: S01.9" value="${esc(d.cie10 || "")}"></div>
        <div class="form-group"><label>Técnica realizada *</label>
          <textarea id="proc-tecnica" placeholder="Técnica paso a paso..." style="min-height:80px">${esc(d.tecnica || "")}</textarea></div>
        <div class="form-group"><label>Hallazgos</label>
          <textarea id="proc-hallazgos" style="min-height:60px">${esc(d.hallazgos || "")}</textarea></div>
        <div class="form-group"><label>Complicaciones</label>
          <textarea id="proc-complicaciones" placeholder="Ninguna / describir..." style="min-height:60px">${esc(d.complicaciones || "")}</textarea></div>
        <div class="form-group"><label>Plan de seguimiento</label>
          <textarea id="proc-seguimiento" style="min-height:60px">${esc(d.seguimiento || "")}</textarea></div>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-secondary" onclick="procIrAPaso(3)">← Atrás</button>
          <button class="btn btn-primary" onclick="procValidarEjecucion()">Continuar →</button>
        </div>
      </div>
    `;
  }

  window.procValidarEjecucion = function() {
    const fecha = $id("proc-fecha")?.value;
    const indicacion = $id("proc-indicacion")?.value?.trim();
    const tecnica = $id("proc-tecnica")?.value?.trim();
    
    if (!fecha) { toast("Fecha requerida", "error"); return; }
    if (!indicacion) { toast("Indicación requerida", "error"); return; }
    if (!tecnica) { toast("Técnica requerida", "error"); return; }
    
    PROC.datosEjecucion = {
      fecha_procedimiento: fecha,
      hora_inicio: $id("proc-hora-inicio")?.value || null,
      indicacion: indicacion,
      cie10: $id("proc-cie10")?.value?.trim() || null,
      tecnica: tecnica,
      hallazgos: $id("proc-hallazgos")?.value?.trim() || null,
      complicaciones: $id("proc-complicaciones")?.value?.trim() || null,
      seguimiento: $id("proc-seguimiento")?.value?.trim() || null
    };
    
    PROC.pasoActual = 5;
    renderWizard();
  };

  // ─────────────────────────────────────────────────────────────
  // PASO 5 — MATERIALES
  // ─────────────────────────────────────────────────────────────
  function renderPasoMateriales(cont) {
    const p = PROC.procedimiento;
    const estimados = Array.isArray(p.materiales_estimados) ? p.materiales_estimados : [];
    cont.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="num">5</span>Materiales utilizados</div>
        <div id="proc-materiales-lista">
          ${estimados.length === 0 
            ? '<div class="empty-state"><div class="icon">📦</div><p>Sin materiales estimados</p></div>'
            : estimados.map(m => `
              <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-secondary);border-radius:8px;margin-bottom:6px">
                <input type="checkbox" class="proc-mat-check" data-nombre="${esc(m)}" checked style="width:auto">
                <div style="flex:1;font-size:12px;font-weight:600">${esc(m)}</div>
                <input type="number" class="proc-mat-cantidad" value="1" min="1" style="width:60px;padding:6px;font-size:12px;text-align:center">
                <input type="number" class="proc-mat-costo" value="0" min="0" step="0.01" placeholder="$" style="width:80px;padding:6px;font-size:12px;text-align:center">
              </div>
            `).join("")}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="procAgregarMaterialManual()" style="margin-top:10px;font-size:11px">+ Añadir material manual</button>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-secondary" onclick="procIrAPaso(4)">← Atrás</button>
          <button class="btn btn-primary" onclick="procValidarMateriales()">Continuar →</button>
        </div>
      </div>
    `;
  }

  window.procAgregarMaterialManual = function() {
    const cont = $id("proc-materiales-lista");
    if (!cont) return;
    const nuevo = document.createElement("div");
    nuevo.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-secondary);border-radius:8px;margin-bottom:6px";
    nuevo.innerHTML = `
      <input type="checkbox" class="proc-mat-check" checked style="width:auto">
      <input type="text" class="proc-mat-nombre" placeholder="Material" style="flex:1;padding:6px;font-size:12px">
      <input type="number" class="proc-mat-cantidad" value="1" min="1" style="width:60px;padding:6px;font-size:12px;text-align:center">
      <input type="number" class="proc-mat-costo" value="0" min="0" step="0.01" placeholder="$" style="width:80px;padding:6px;font-size:12px;text-align:center">
      <button onclick="this.parentElement.remove()" style="background:var(--danger);color:white;border:none;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:12px">×</button>
    `;
    cont.appendChild(nuevo);
  };

  window.procValidarMateriales = function() {
    const materiales = [];
    document.querySelectorAll(".proc-mat-check:checked").forEach(chk => {
      const row = chk.parentElement;
      const nombre = chk.dataset.nombre || row.querySelector(".proc-mat-nombre")?.value?.trim();
      const cantidad = parseInt(row.querySelector(".proc-mat-cantidad")?.value) || 1;
      const costo = parseFloat(row.querySelector(".proc-mat-costo")?.value) || 0;
      if (nombre) materiales.push({ nombre, cantidad, costo_unitario: costo, subtotal: cantidad * costo });
    });
    PROC.materialesUsados = materiales;
    PROC.pasoActual = 6;
    renderWizard();
  };

  // ─────────────────────────────────────────────────────────────
  // PASO 6 — IA + EXTRAS
  // ─────────────────────────────────────────────────────────────
  function renderPasoIAExtras(cont) {
    const p = PROC.procedimiento;
    cont.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="num">6</span>Generación con IA</div>
        <div style="background:linear-gradient(135deg,#f0f7ff,#e8f4fd);border:2px solid #0071e3;border-radius:12px;padding:16px;margin-bottom:14px">
          <div style="font-size:12px;font-weight:700;color:#0051a3;text-transform:uppercase;margin-bottom:8px">🤖 Generar con IA</div>
          <button class="btn btn-primary" id="proc-btn-ia" onclick="procGenerarTodoIA()" style="width:100%;font-size:12px">🤖 Generar nota + receta + labs</button>
          <div id="proc-ia-error" style="display:none;margin-top:10px;padding:10px;background:#fff3f3;border-left:3px solid var(--danger);border-radius:0 6px 6px 0;font-size:11px;color:#7a1a1a"></div>
        </div>
        <div id="proc-ia-resultado" style="display:none">
          <div style="margin-bottom:16px">
            <div style="background:#f0fff4;border:2px solid var(--positive);border-radius:10px;padding:12px;margin-bottom:8px">
              <div style="font-size:12px;font-weight:700;color:#1a4a2a;text-transform:uppercase">📋 Nota de Procedimiento</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="procToggleEdicionNota()" id="proc-btn-toggle-nota" style="width:100%;margin-bottom:8px;font-size:11px">✏️ Activar edición</button>
            <div id="proc-nota-preview" style="background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:14px;font-size:12px;line-height:1.6;max-height:400px;overflow-y:auto"></div>
          </div>
          ${p.permite_receta ? `
            <div style="margin-bottom:16px">
              <div style="background:#fff9e6;border:2px solid #ff9500;border-radius:10px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:12px;font-weight:700;color:#8a6a00;text-transform:uppercase">💊 Receta Médica</div>
                <button class="btn btn-secondary btn-xs" onclick="procAgregarMedicamento()" style="font-size:10px">+ Añadir</button>
              </div>
              <div id="proc-receta-lista"></div>
            </div>
          ` : ""}
          ${p.permite_laboratorio ? `
            <div style="margin-bottom:16px">
              <div style="background:#e8f4fd;border:2px solid #0071e3;border-radius:10px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:12px;font-weight:700;color:#0051a3;text-transform:uppercase">🔬 Laboratorios</div>
                <button class="btn btn-secondary btn-xs" onclick="procAgregarLaboratorio()" style="font-size:10px">+ Añadir</button>
              </div>
              <div id="proc-labs-lista"></div>
            </div>
          ` : ""}
        </div>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-secondary" onclick="procIrAPaso(5)">← Atrás</button>
          <button class="btn btn-primary" onclick="procIrAPaso(7)">Continuar a firma →</button>
        </div>
      </div>
    `;
    renderRecetaLista();
    renderLabsLista();
    if (PROC.notaIA) renderNotaIA();
  }

  function renderNotaIA() {
    const cont = $id("proc-nota-preview");
    const wrap = $id("proc-ia-resultado");
    if (!cont || !wrap) return;
    const texto = PROC.notaEditada || PROC.notaIA?.narrativa || "";
    if (!texto) return;
    if ($id("proc-nota-textarea")) {
      cont.innerHTML = `<textarea id="proc-nota-textarea" style="width:100%;min-height:400px;font-size:12px;padding:10px;border:2px solid #0071e3;border-radius:8px;background:#fff;color:#1d1d1f;resize:vertical" oninput="PROCEDIMIENTOS.notaEditada = this.value">${esc(texto)}</textarea>`;
    } else {
      cont.innerHTML = `<div style="white-space:pre-wrap">${esc(texto)}</div>`;
    }
    wrap.style.display = "block";
  }

  window.procToggleEdicionNota = function() {
    const cont = $id("proc-nota-preview");
    const btn = $id("proc-btn-toggle-nota");
    if (!cont || !btn) return;
    if ($id("proc-nota-textarea")) {
      PROC.notaEditada = $id("proc-nota-textarea").value;
      cont.innerHTML = `<div style="white-space:pre-wrap">${esc(PROC.notaEditada)}</div>`;
      btn.innerHTML = "✏️ Activar edición";
    } else {
      const texto = PROC.notaEditada || PROC.notaIA?.narrativa || "";
      cont.innerHTML = `<textarea id="proc-nota-textarea" style="width:100%;min-height:400px;font-size:12px;padding:10px;border:2px solid #0071e3;border-radius:8px;background:#fff;color:#1d1d1f;resize:vertical">${esc(texto)}</textarea>`;
      btn.innerHTML = "👁️ Ver preview";
    }
  };

  function renderRecetaLista() {
    const cont = $id("proc-receta-lista");
    if (!cont) return;
    if (PROC.recetaMedicamentos.length === 0) {
      cont.innerHTML = '<div style="padding:14px;text-align:center;background:var(--bg-secondary);border-radius:8px;font-size:11px;color:var(--text-tertiary)">Sin medicamentos</div>';
      return;
    }
    cont.innerHTML = PROC.recetaMedicamentos.map((m, i) => `
      <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:12px;font-weight:700;color:var(--corp)">${esc(m.farmaco || "(sin nombre)")}</div>
          <button onclick="procEliminarMedicamento(${i})" style="background:var(--danger);color:white;border:none;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:11px">×</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
          <input type="text" placeholder="Presentación" value="${esc(m.presentacion || "")}" oninput="PROCEDIMIENTOS.recetaMedicamentos[${i}].presentacion=this.value" style="padding:5px;font-size:11px">
          <input type="text" placeholder="Dosis" value="${esc(m.dosis || "")}" oninput="PROCEDIMIENTOS.recetaMedicamentos[${i}].dosis=this.value" style="padding:5px;font-size:11px">
          <input type="text" placeholder="Vía" value="${esc(m.via || "")}" oninput="PROCEDIMIENTOS.recetaMedicamentos[${i}].via=this.value" style="padding:5px;font-size:11px">
          <input type="text" placeholder="Frecuencia" value="${esc(m.frecuencia || "")}" oninput="PROCEDIMIENTOS.recetaMedicamentos[${i}].frecuencia=this.value" style="padding:5px;font-size:11px">
          <input type="text" placeholder="Duración" value="${esc(m.duracion || "")}" oninput="PROCEDIMIENTOS.recetaMedicamentos[${i}].duracion=this.value" style="padding:5px;font-size:11px">
          <input type="text" placeholder="Indicación" value="${esc(m.indicacion || "")}" oninput="PROCEDIMIENTOS.recetaMedicamentos[${i}].indicacion=this.value" style="padding:5px;font-size:11px">
        </div>
      </div>
    `).join("");
  }

  window.procAgregarMedicamento = function() {
    PROC.recetaMedicamentos.push({ farmaco: "", presentacion: "", dosis: "", via: "oral", frecuencia: "", duracion: "", indicacion: "" });
    renderRecetaLista();
  };

  window.procEliminarMedicamento = function(i) {
    PROC.recetaMedicamentos.splice(i, 1);
    renderRecetaLista();
  };

  function renderLabsLista() {
    const cont = $id("proc-labs-lista");
    if (!cont) return;
    if (PROC.laboratoriosSolicitados.length === 0) {
      cont.innerHTML = '<div style="padding:14px;text-align:center;background:var(--bg-secondary);border-radius:8px;font-size:11px;color:var(--text-tertiary)">Sin laboratorios solicitados</div>';
      return;
    }
    cont.innerHTML = PROC.laboratoriosSolicitados.map((l, i) => `
      <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:12px;font-weight:700;color:var(--corp)">${esc(l.estudio || "(sin nombre)")}</div>
          <button onclick="procEliminarLaboratorio(${i})" style="background:var(--danger);color:white;border:none;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:11px">×</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
          <input type="text" placeholder="Tipo" value="${esc(l.tipo || "")}" oninput="PROCEDIMIENTOS.laboratoriosSolicitados[${i}].tipo=this.value" style="padding:5px;font-size:11px">
          <input type="number" placeholder="Plazo días" value="${l.plazo_dias || 0}" oninput="PROCEDIMIENTOS.laboratoriosSolicitados[${i}].plazo_dias=parseInt(this.value)||0" style="padding:5px;font-size:11px">
          <input type="text" placeholder="Motivo" value="${esc(l.motivo || "")}" oninput="PROCEDIMIENTOS.laboratoriosSolicitados[${i}].motivo=this.value" style="padding:5px;font-size:11px;grid-column:span 2">
        </div>
      </div>
    `).join("");
  }

  window.procAgregarLaboratorio = function() {
    PROC.laboratoriosSolicitados.push({ estudio: "", tipo: "sangre", plazo_dias: 0, urgente: false, motivo: "" });
    renderLabsLista();
  };

  window.procEliminarLaboratorio = function(i) {
    PROC.laboratoriosSolicitados.splice(i, 1);
    renderLabsLista();
  };

  window.procGenerarTodoIA = async function() {
    const errEl = $id("proc-ia-error");
    const setErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = "block"; } };
    if (errEl) errEl.style.display = "none";
    const btn = $id("proc-btn-ia");
    const original = btn?.textContent || "Generar";
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Generando...'; }

    try {
      const datos = PROC.datosEjecucion || {};

      toast("Generando nota...", "info");
      const promptNota = construirPromptNota(datos);
      const respNota = await llamarKimi(promptNota);
      const narrNota = respNota.split("===JSON_ESTRUCTURADO===")[0].trim();
      const jsonNotaMatch = respNota.match(/===JSON_ESTRUCTURADO===([\s\S]*?)===FIN_JSON===/);
      const jsonNota = jsonNotaMatch ? JSON.parse(jsonNotaMatch[1].trim()) : null;
      PROC.notaIA = { narrativa: narrNota, json: jsonNota };
      PROC.notaEditada = null;

      if (PROC.procedimiento.permite_receta) {
        toast("Generando receta...", "info");
        const promptReceta = construirPromptReceta(datos);
        const respReceta = await llamarKimi(promptReceta);
        const jsonRecetaMatch = respReceta.match(/===JSON_ESTRUCTURADO===([\s\S]*?)===FIN_JSON===/);
        if (jsonRecetaMatch) {
          try {
            const jsonReceta = JSON.parse(jsonRecetaMatch[1].trim());
            PROC.recetaMedicamentos = (jsonReceta.medicamentos || []).filter(m => m.farmaco);
            PROC.recetaIA = jsonReceta;
          } catch (e) { console.warn("Parse receta:", e); }
        }
      }

      if (PROC.procedimiento.permite_laboratorio) {
        toast("Generando labs...", "info");
        const promptLabs = construirPromptLabs(datos);
        const respLabs = await llamarKimi(promptLabs);
        const jsonLabsMatch = respLabs.match(/===JSON_ESTRUCTURADO===([\s\S]*?)===FIN_JSON===/);
        if (jsonLabsMatch) {
          try {
            const jsonLabs = JSON.parse(jsonLabsMatch[1].trim());
            PROC.laboratoriosSolicitados = (jsonLabs.laboratorios || []).filter(l => l.estudio);
            PROC.labsIA = jsonLabs;
          } catch (e) { console.warn("Parse labs:", e); }
        }
      }

      toast("✓ Nota, receta y labs generados", "success");
      renderPasoIAExtras($id("proc-paso-container"));
    } catch (e) {
      console.error("[procGenerarTodoIA]", e);
      setErr("Error: " + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = original; }
    }
  };

  function construirPromptNota(d) {
    const p = PROC.paciente;
    const proc = PROC.procedimiento;
    const mat = PROC.materialesUsados.map(m => `${m.nombre} x${m.cantidad}`).join(", ") || "No registrados";
    return PROMPT_NOTA
      .replace(/{NOMBRE}/g, p.nombre || "—")
      .replace(/{SUBJECT_ID}/g, p.subject_id)
      .replace(/{EDAD}/g, p.edad || "—")
      .replace(/{SEXO}/g, p.sexo || "—")
      .replace(/{DUI}/g, p.dui || "—")
      .replace(/{PROCEDIMIENTO_NOMBRE}/g, proc.nombre)
      .replace(/{PROCEDIMIENTO_CODIGO}/g, proc.codigo)
      .replace(/{CATEGORIA}/g, proc.categoria)
      .replace(/{COMPLEJIDAD}/g, proc.complejidad)
      .replace(/{FECHA}/g, d.fecha_procedimiento || "—")
      .replace(/{INDICACION}/g, d.indicacion || "—")
      .replace(/{CIE10}/g, d.cie10 || "—")
      .replace(/{TECNICA}/g, d.tecnica || "—")
      .replace(/{HALLAZGOS}/g, d.hallazgos || "—")
      .replace(/{COMPLICACIONES}/g, d.complicaciones || "Ninguna")
      .replace(/{SEGUIMIENTO}/g, d.seguimiento || "—")
      .replace(/{MATERIALES}/g, mat);
  }

  function construirPromptReceta(d) {
    const p = PROC.paciente;
    const proc = PROC.procedimiento;
    return PROMPT_RECETA
      .replace(/{NOMBRE}/g, p.nombre || "—")
      .replace(/{EDAD}/g, p.edad || "—")
      .replace(/{SEXO}/g, p.sexo || "—")
      .replace(/{ALERGIAS}/g, p.alergias || "Ninguna")
      .replace(/{PROCEDIMIENTO_NOMBRE}/g, proc.nombre)
      .replace(/{INDICACION}/g, d.indicacion || "—")
      .replace(/{HALLAZGOS}/g, d.hallazgos || "—");
  }

  function construirPromptLabs(d) {
    const p = PROC.paciente;
    const proc = PROC.procedimiento;
    return PROMPT_LABS
      .replace(/{NOMBRE}/g, p.nombre || "—")
      .replace(/{EDAD}/g, p.edad || "—")
      .replace(/{SEXO}/g, p.sexo || "—")
      .replace(/{PROCEDIMIENTO_NOMBRE}/g, proc.nombre)
      .replace(/{INDICACION}/g, d.indicacion || "—")
      .replace(/{HALLAZGOS}/g, d.hallazgos || "—")
      .replace(/{COMPLICACIONES}/g, d.complicaciones || "Ninguna");
  }

  async function llamarKimi(prompt) {
    if (typeof window.WORKER_URL === "undefined") throw new Error("WORKER_URL no definido");
    const proxyUrl = `${window.WORKER_URL}/proxy-kimi`;
    const model = $id("kimi-model")?.value || "kimi-k2-5";
    const ctrl = new AbortController();
    let inactivityTimer = setTimeout(() => ctrl.abort(), 90000);
    const reset = () => { clearTimeout(inactivityTimer); inactivityTimer = setTimeout(() => ctrl.abort(), 90000); };
    let resp;
    try {
      resp = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Eres médico experto. Español con tildes y eñes. Sin markdown." },
            { role: "user", content: prompt }
          ],
          max_tokens: 12000,
          reasoning_effort: "low"
        }),
        signal: ctrl.signal
      });
    } catch (err) {
      clearTimeout(inactivityTimer);
      if (err.name === "AbortError") throw new Error("Timeout 90s");
      throw new Error("Error de red: " + err.message);
    }
    if (!resp.ok) {
      clearTimeout(inactivityTimer);
      if (resp.status === 402) throw new Error("Sin saldo");
      if (resp.status === 429) throw new Error("Rate limit");
      throw new Error("HTTP " + resp.status);
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let content = "", buffer = "";
    while (true) {
      let chunk;
      try { chunk = await reader.read(); } catch (e) { clearTimeout(inactivityTimer); throw new Error("Stream: " + e.message); }
      if (chunk.done) break;
      reset();
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (payload === "[DONE]" || !payload) continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) content += delta;
        } catch (e) {}
      }
    }
    clearTimeout(inactivityTimer);
    if (!content || content.trim().length < 50) throw new Error("Respuesta vacía");
    return content;
  }

  // ─────────────────────────────────────────────────────────────
  // PASO 7 — FIRMA
  // ─────────────────────────────────────────────────────────────
  function renderPasoFirma(cont) {
    const p = PROC.procedimiento;
    const materialTotal = PROC.materialesUsados.reduce((s, m) => s + (m.subtotal || 0), 0);
    const precioBase = parseFloat(p.precio_base) || 0;
    const precioFinal = precioBase + materialTotal;
    const esOperador = window.usuarioActual?.rol === "operador";
    const requiereMedico = p.requiere_medico && esOperador;

    cont.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="num">7</span>Cierre y firma</div>
        <div style="background:var(--accent-light);border-radius:10px;padding:14px;margin-bottom:14px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
            <div><div style="color:var(--text-secondary);font-size:10px">Paciente</div><div style="font-weight:700">${esc(PROC.paciente?.nombre)}</div></div>
            <div><div style="color:var(--text-secondary);font-size:10px">Procedimiento</div><div style="font-weight:700">${esc(p.nombre)}</div></div>
            <div><div style="color:var(--text-secondary);font-size:10px">Medicamentos</div><div style="font-weight:700">${PROC.recetaMedicamentos.length}</div></div>
            <div><div style="color:var(--text-secondary);font-size:10px">Laboratorios</div><div style="font-weight:700">${PROC.laboratoriosSolicitados.length}</div></div>
            <div style="grid-column:span 2"><div style="color:var(--text-secondary);font-size:10px">Precio final</div><div style="font-weight:800;color:var(--positive);font-size:16px">$${precioFinal.toFixed(2)}</div></div>
          </div>
        </div>
        ${requiereMedico ? `
          <div style="background:#fff9e6;border:2px solid var(--warning);border-radius:10px;padding:14px;margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:#8a6a00;margin-bottom:8px">⚠️ Requiere firma médica</div>
            <select id="proc-medico-id" style="font-size:12px;width:100%;padding:8px">
              <option value="">— Seleccionar médico —</option>
              ${Object.values(window.MEDICOS_DATOS || {})
                .filter(m => m.rol === "medico" || m.rol === "admin")
                .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
                .map(m => `<option value="${m.id}">${esc(m.nombre)} (${esc(m.especialidad)})</option>`).join("")}
            </select>
          </div>
        ` : `
          <div style="background:#f0fff4;border:2px solid var(--positive);border-radius:10px;padding:14px;margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:#1a4a2a">✅ Se registrará como completado</div>
          </div>
        `}
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;font-weight:600">
            <input type="checkbox" id="proc-confirmar-check" style="width:auto">
            Confirmo que los datos son correctos
          </label>
        </div>
        <div id="proc-error" style="display:none;margin-bottom:12px;padding:10px;background:#fff3f3;border-left:3px solid var(--danger);border-radius:0 6px 6px 0;font-size:11px;color:#7a1a1a"></div>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-secondary" onclick="procIrAPaso(6)">← Atrás</button>
          <button class="btn btn-success" id="proc-btn-firmar" onclick="procGuardarProcedimiento()">
            ${requiereMedico ? "📤 Enviar a firma médica" : "✅ Guardar y generar PDFs"}
          </button>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // GUARDAR PROCEDIMIENTO
  // ═══════════════════════════════════════════════════════════════
  window.procGuardarProcedimiento = async function() {
    const errEl = $id("proc-error");
    const setErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = "block"; } };
    if (errEl) errEl.style.display = "none";

    if (!$id("proc-confirmar-check")?.checked) { setErr("Marca la casilla"); return; }
    if (!PROC.paciente || !PROC.procedimiento) { setErr("Faltan datos"); return; }
    if (!window.supabaseClient) { setErr("Sin conexión"); return; }

    if (!PROC.datosEjecucion || !PROC.datosEjecucion.fecha_procedimiento) {
      setErr("Faltan datos del paso 4 (ejecución). Vuelve al paso 4.");
      return;
    }

    const btn = $id("proc-btn-firmar");
    const original = btn?.textContent || "Guardar";
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Guardando...'; }

    try {
      if ($id("proc-nota-textarea")) PROC.notaEditada = $id("proc-nota-textarea").value;

      if (!PROC.caseId) {
        const { data, error } = await window.supabaseClient.rpc("generar_case_id_procedimiento");
        if (error) throw error;
        PROC.caseId = data;
      }

      const cuota = await verificarCuotaPaciente(PROC.paciente.subject_id);
      const esOperador = window.usuarioActual?.rol === "operador";
      const requiereMedico = PROC.procedimiento.requiere_medico && esOperador;
      const medicoSeleccionado = $id("proc-medico-id")?.value || null;

      if (requiereMedico && !medicoSeleccionado) throw new Error("Selecciona el médico");

      // ═══ NUEVO: Determinar quién firma ═══
      let firmanteId = window.usuarioActual?.id;
      let firmanteNombre = window.usuarioActual?.nombre;

      if (requiereMedico && medicoSeleccionado) {
        const datosMedico = window.MEDICOS_DATOS?.[medicoSeleccionado];
        firmanteId = medicoSeleccionado;
        firmanteNombre = datosMedico?.nombre || "Médico Validador";
      } else if (esOperador) {
        firmanteId = window.usuarioActual?.id;
        firmanteNombre = window.usuarioActual?.nombre;
      }

      PROC.firmante = {
        id: firmanteId,
        nombre: firmanteNombre,
        rol: requiereMedico ? "Médico Validador" : (esOperador ? "Operador de Salud" : "Médico Tratante"),
        datosSello: window.MEDICOS_DATOS?.[firmanteId] || null
      };

      const materialTotal = PROC.materialesUsados.reduce((s, m) => s + (m.subtotal || 0), 0);
      const empresaId = PROC.paciente.empresa_id;
      let precios = {
        precio_base: parseFloat(PROC.procedimiento.precio_base),
        tarifa_preferencial_pct: 0,
        materiales: materialTotal,
        precio_final: parseFloat(PROC.procedimiento.precio_base) + materialTotal
      };
      if (empresaId) {
        try {
          const { data } = await window.supabaseClient.rpc("calcular_precio_procedimiento", {
            p_empresa_id: empresaId,
            p_procedimiento_id: PROC.procedimiento.procedimiento_id,
            p_materiales_total: materialTotal
          });
          if (data) precios = data;
        } catch (e) {}
      }

      let consHash = null;
      if (PROC.consentimientoFirma) {
        const input = PROC.paciente.subject_id + PROC.procedimiento.procedimiento_id + Date.now();
        const buf = new TextEncoder().encode(input);
        const hash = await crypto.subtle.digest("SHA-256", buf);
        consHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
      }

      const ahora = new Date();
      const estadoInicial = requiereMedico ? "pendiente_firma" : "firmado";
      const notaFinal = PROC.notaEditada || PROC.notaIA?.narrativa || "";
      const d = PROC.datosEjecucion;

      const payload = {
        procedimiento_id: PROC.procedimiento.procedimiento_id,
        procedimiento_nombre: PROC.procedimiento.nombre,
        procedimiento_codigo: PROC.procedimiento.codigo,
        categoria: PROC.procedimiento.categoria,
        fecha_procedimiento: d.fecha_procedimiento,
        hora_inicio: d.hora_inicio,
        indicacion: d.indicacion,
        cie10: d.cie10,
        tecnica: d.tecnica,
        hallazgos: d.hallazgos,
        complicaciones: d.complicaciones,
        seguimiento: d.seguimiento,
        nota_ia_narrativa: PROC.notaIA?.narrativa || null,
        nota_ia_json: PROC.notaIA?.json || null,
        nota_final: notaFinal || null,
        generada_con_ia: !!PROC.notaIA,
        materiales: PROC.materialesUsados,
        receta_medicamentos: PROC.recetaMedicamentos,
        laboratorios_solicitados: PROC.laboratoriosSolicitados,
        precios,
        consentimiento: PROC.consentimientoFirma ? {
          metodo: PROC.consentimientoMetodo,
          imagen: PROC.consentimientoFirma,
          hash: consHash,
          firmado_at: ahora.toISOString(),
          nombre: PROC.paciente.nombre,
          dui: PROC.paciente.dui
        } : null,
        operador_id: window.usuarioActual?.id,
        operador_nombre: window.usuarioActual?.nombre,
        firmante: PROC.firmante, // Guardamos al firmante en el JSON
        paciente: {
          subject_id: PROC.paciente.subject_id,
          nombre: PROC.paciente.nombre,
          edad: PROC.paciente.edad,
          sexo: PROC.paciente.sexo,
          dui: PROC.paciente.dui,
          departamento: PROC.paciente.departamento,
          municipio: PROC.paciente.municipio
        }
      };

      const insertData = {
        case_id: PROC.caseId,
        subject_id: PROC.paciente.subject_id,
        procedimiento_id: PROC.procedimiento.procedimiento_id,
        operador_id: window.usuarioActual?.id,
        operador_nombre: window.usuarioActual?.nombre,
        medico_id: medicoSeleccionado,
        fecha_procedimiento: d.fecha_procedimiento,
        hora_inicio: d.hora_inicio,
        estado: estadoInicial,
        indicacion: d.indicacion,
        cie10_principal: d.cie10,
        tecnica_realizada: d.tecnica,
        hallazgos: d.hallazgos,
        complicaciones: d.complicaciones,
        plan_seguimiento: d.seguimiento,
        nota_ia_narrativa: payload.nota_ia_narrativa,
        nota_ia_json: payload.nota_ia_json,
        nota_final: payload.nota_final,
        generada_con_ia: payload.generada_con_ia,
        receta_medicamentos: PROC.recetaMedicamentos,
        receta_generada: PROC.recetaMedicamentos.length > 0,
        laboratorios_solicitados: PROC.laboratoriosSolicitados,
        laboratorios_generados: PROC.laboratoriosSolicitados.length > 0,
        consentimiento_informado: !!PROC.consentimientoFirma,
        consentimiento_firmado_at: PROC.consentimientoFirma ? ahora.toISOString() : null,
        consentimiento_firma_imagen: PROC.consentimientoFirma,
        consentimiento_hash: consHash,
        consentimiento_nombre: PROC.paciente.nombre,
        consentimiento_dui: PROC.paciente.dui,
        materiales_usados: PROC.materialesUsados,
        complejidad_calculada: PROC.procedimiento.complejidad,
        complejidad_final: PROC.procedimiento.complejidad,
        precio_base: precios.precio_base,
        precio_materiales: materialTotal,
        precio_final: precios.precio_final,
        payload,
        created_by: window.usuarioActual?.id
      };

      const { data: insertado, error: errIns } = await window.supabaseClient
        .from("procedimientos_realizados")
        .insert(insertData)
        .select()
        .single();

      if (errIns) throw errIns;
      PROC.procedimientoRealizadoId = insertado.procedimiento_realizado_id;

      if (requiereMedico && medicoSeleccionado) {
        try {
          await window.supabaseClient.from("notificaciones_medicas").insert({
            medico_id: medicoSeleccionado,
            tipo: "procedimiento_pendiente_firma",
            prioridad: "alta",
            referencia_id: insertado.procedimiento_realizado_id,
            referencia_tipo: "procedimiento",
            mensaje: `Procedimiento ${PROC.caseId} de ${PROC.paciente.nombre} pendiente de firma`,
            payload: { case_id: PROC.caseId, procedimiento: PROC.procedimiento.nombre }
          });
        } catch (e) {}
      }

      if (!cuota.tiene_suscripcion || cuota.disponible) {
        try {
          await window.supabaseClient.rpc("consumir_cuota", {
            p_subject_id: PROC.paciente.subject_id,
            p_tipo_servicio: "procedimiento",
            p_referencia_id: PROC.caseId
          });
        } catch (e) {}
      }

      try {
        const { data: episodioId } = await window.supabaseClient.rpc("generar_episodio_id");
        if (episodioId) {
          await window.supabaseClient.from("episodios_clinicos").insert({
            episodio_id: episodioId,
            subject_id: PROC.paciente.subject_id,
            tipo: "procedimiento",
            estado: requiereMedico ? "abierto" : "cerrado",
            caso_inicial_id: PROC.caseId,
            casos_vinculados: [PROC.caseId],
            metadata: { procedimiento_id: PROC.procedimiento.procedimiento_id }
          });
          await window.supabaseClient.from("procedimientos_realizados")
            .update({ episodio_id: episodioId })
            .eq("procedimiento_realizado_id", PROC.procedimientoRealizadoId);
        }
      } catch (e) {}

      const docs = await generarDocumentosProcedimiento(insertado, payload);
      PROC.docsGenerados = docs;

      for (const [tipo, html] of Object.entries(docs)) {
        if (!html) continue;
        try {
          await window.supabaseClient.from("artifacts").upsert({
            artifact_id: PROC.caseId + ":" + tipo,
            case_id: PROC.caseId,
            tipo: tipo,
            html: html
          }, { onConflict: "artifact_id" });
        } catch (e) {}
      }

      mostrarDocumentosProcedimiento(docs, requiereMedico);

      toast(requiereMedico 
        ? `✓ Procedimiento ${PROC.caseId} enviado a firma médica` 
        : `✓ Procedimiento ${PROC.caseId} firmado y guardado`, "success");

    } catch (e) {
      console.error("[procGuardarProcedimiento]", e);
      setErr("Error: " + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = original; }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // GENERAR DOCUMENTOS
  // ─────────────────────────────────────────────────────────────
  async function generarDocumentosProcedimiento(registro, payload) {
    const docs = { nota_procedimiento: construirNotaHTML(registro, payload) };
    if (PROC.consentimientoFirma) docs.consentimiento = construirConsentimientoHTML(registro, payload);
    if (PROC.recetaMedicamentos.length > 0) docs.receta = construirRecetaHTML(registro, payload);
    if (PROC.laboratoriosSolicitados.length > 0) docs.orden_laboratorio = construirLabsHTML(registro, payload);
    docs.indicaciones_paciente = construirIndicacionesHTML(registro, payload);
    return docs;
  }

  function construirNotaHTML(r, p) {
    const esc = window.escapeHtml || (s => String(s || ""));
    const fecha = new Date(r.created_at).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
    const notaTexto = PROC.notaEditada || PROC.notaIA?.narrativa || p.tecnica;

    return `
      <div style="font-family:Helvetica,Arial,sans-serif;background:#fff;color:#1d1d1f;max-width:800px;margin:0 auto;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1a3a5c,#0071e3);color:#fff;padding:20px 24px;text-align:center">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.85">EcoRadAi</div>
          <h2 style="font-size:18px;font-weight:700;margin:6px 0">NOTA DE PROCEDIMIENTO</h2>
          <div style="font-size:11px;opacity:0.9">${esc(p.paciente.nombre)} · ${p.paciente.edad || "—"} años · ${esc(p.paciente.sexo || "—")}</div>
          <div style="font-size:10px;opacity:0.85;margin-top:3px">ID: ${esc(p.paciente.subject_id)} · ${esc(fecha)}</div>
        </div>
        <div style="padding:20px 24px">
          <h4 style="font-size:11px;color:#0071e3;text-transform:uppercase;font-weight:700;border-bottom:1.5px solid #e8e8ed;padding-bottom:4px;margin-bottom:8px">PROCEDIMIENTO</h4>
          <p style="font-size:12px;font-weight:700;margin-bottom:4px">${esc(p.procedimiento_nombre)} (${esc(p.procedimiento_codigo)})</p>
          <p style="font-size:11px;color:#666;margin-bottom:12px">${esc(p.categoria)} · ${PROC.procedimiento.duracion_min} min</p>
          ${PROC.notaIA ? `
            <h4 style="font-size:11px;color:#0071e3;text-transform:uppercase;font-weight:700;border-bottom:1.5px solid #e8e8ed;padding-bottom:4px;margin:14px 0 8px">INFORME CLÍNICO</h4>
            <div style="font-size:11px;line-height:1.7;white-space:pre-wrap">${esc(notaTexto || "")}</div>
          ` : `
            <h4 style="font-size:11px;color:#0071e3;text-transform:uppercase;font-weight:700;border-bottom:1.5px solid #e8e8ed;padding-bottom:4px;margin:14px 0 8px">INDICACIÓN</h4>
            <p style="font-size:11px;line-height:1.6">${esc(p.indicacion || "—")}</p>
            <h4 style="font-size:11px;color:#0071e3;text-transform:uppercase;font-weight:700;border-bottom:1.5px solid #e8e8ed;padding-bottom:4px;margin:14px 0 8px">TÉCNICA</h4>
            <p style="font-size:11px;line-height:1.6;white-space:pre-wrap">${esc(p.tecnica || "—")}</p>
          `}
          ${PROC.materialesUsados.length > 0 ? `
            <h4 style="font-size:11px;color:#0071e3;text-transform:uppercase;font-weight:700;border-bottom:1.5px solid #e8e8ed;padding-bottom:4px;margin:14px 0 8px">MATERIALES</h4>
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              ${PROC.materialesUsados.map(m => `<tr style="border-bottom:1px solid #eee"><td style="padding:4px">${esc(m.nombre)}</td><td style="padding:4px;text-align:center">×${m.cantidad}</td><td style="padding:4px;text-align:right">$${(m.subtotal || 0).toFixed(2)}</td></tr>`).join("")}
            </table>
          ` : ""}
          <div style="margin-top:20px;padding:14px;background:#f0f7ff;border-left:4px solid #0071e3;border-radius:0 8px 8px 0">
            <div style="font-size:11px;font-weight:700;color:#0051a3;margin-bottom:6px">RESPONSABLE DEL PROCEDIMIENTO</div>
            <div style="font-size:12px;font-weight:700;color:#1a3a5c">${esc(p.operador_nombre || "—")}</div>
            <div style="font-size:10px;color:#666;margin-top:2px">Case: ${esc(r.case_id)}</div>
          </div>

          <!-- NUEVO: Bloque de firma profesional con sello -->
          <div style="margin-top:30px; page-break-inside:avoid;">
            ${renderBloqueFirma({
              nombre: PROC.firmante?.nombre || "Profesional de Salud",
              csspm: PROC.firmante?.datosSello?.csspm || "N/E",
              especialidad: PROC.firmante?.rol || "Profesional Responsable",
              medico_id: PROC.firmante?.id
            }, fecha)}
          </div>
        </div>
      </div>
    `;
  }

  function construirRecetaHTML(r, p) {
    const esc = window.escapeHtml || (s => String(s || ""));
    const fecha = new Date(r.created_at).toLocaleDateString("es-ES");
    return `
      <div style="font-family:Helvetica,Arial,sans-serif;background:#fff;color:#1d1d1f;max-width:800px;margin:0 auto;border:2px solid #1a3a5c;border-radius:12px;overflow:hidden">
        <div style="background:#1a3a5c;color:#fff;text-align:center;padding:16px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.85">EcoRadAi</div>
          <h2 style="font-size:20px;font-weight:700;letter-spacing:2px;margin:6px 0">RECETA MÉDICA</h2>
        </div>
        <div style="padding:22px 26px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;background:#f8f9fa;border-left:4px solid #0071e3;padding:12px 16px;margin-bottom:18px;font-size:11px">
            <div><strong style="font-size:9px;text-transform:uppercase">Paciente</strong><br>${esc(p.paciente.nombre)}</div>
            <div><strong style="font-size:9px;text-transform:uppercase">ID</strong><br>${esc(p.paciente.subject_id)}</div>
            <div><strong style="font-size:9px;text-transform:uppercase">Fecha</strong><br>${esc(fecha)}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:10px">
            <thead><tr style="background:#f0f7ff">
              <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;border-bottom:1.5px solid #0071e3">Fármaco</th>
              <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;border-bottom:1.5px solid #0071e3">Dosis/Vía</th>
              <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;border-bottom:1.5px solid #0071e3">Frecuencia</th>
              <th style="padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;border-bottom:1.5px solid #0071e3">Duración</th>
            </tr></thead>
            <tbody>
              ${PROC.recetaMedicamentos.map(m => `<tr>
                <td style="padding:6px 8px;border-bottom:1px solid #e8e8ed"><strong>${esc(m.farmaco)}</strong><br><span style="font-size:9px;color:#666">${esc(m.presentacion || "")}</span></td>
                <td style="padding:6px 8px;border-bottom:1px solid #e8e8ed">${esc(m.dosis || "")} ${esc(m.via || "")}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e8e8ed">${esc(m.frecuencia || "")}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e8e8ed">${esc(m.duracion || "")}</td>
              </tr>`).join("")}
            </tbody>
          </table>
          
          <!-- FIRMA DEL PROFESIONAL -->
          <div style="margin-top:30px; page-break-inside:avoid;">
            ${renderBloqueFirma({
              nombre: PROC.firmante?.nombre || "Profesional de Salud",
              csspm: PROC.firmante?.datosSello?.csspm || "N/E",
              especialidad: PROC.firmante?.rol || "Profesional Responsable",
              medico_id: PROC.firmante?.id
            }, fecha)}
          </div>
        </div>
      </div>
    `;
  }

  function construirLabsHTML(r, p) {
    const esc = window.escapeHtml || (s => String(s || ""));
    const fecha = new Date(r.created_at).toLocaleDateString("es-ES");
    return `
      <div style="font-family:Helvetica,Arial,sans-serif;background:#fff;color:#1d1d1f;max-width:800px;margin:0 auto;border:2px solid #1a3a5c;border-radius:12px;overflow:hidden">
        <div style="background:#1a3a5c;color:#fff;text-align:center;padding:16px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.85">EcoRadAi</div>
          <h2 style="font-size:18px;font-weight:700;letter-spacing:1.5px;margin:6px 0">ORDEN DE LABORATORIO</h2>
        </div>
        <div style="padding:22px 26px">
          <div style="background:#f8f9fa;border-left:4px solid #0071e3;padding:12px 16px;margin-bottom:18px;font-size:11px">
            <div><strong>Paciente:</strong> ${esc(p.paciente.nombre)} (${esc(p.paciente.subject_id)})</div>
            <div><strong>Fecha:</strong> ${esc(fecha)}</div>
          </div>
          <ol style="font-size:12px;line-height:1.9;margin-left:20px">
            ${PROC.laboratoriosSolicitados.map(l => `<li><strong>${esc(l.estudio)}</strong>${l.urgente ? ' <span style="color:#ff3b30;font-weight:700">URGENTE</span>' : ""}${l.motivo ? `<br><span style="color:#666;font-size:10px">${esc(l.motivo)}</span>` : ""}</li>`).join("")}
          </ol>
        </div>
      </div>
    `;
  }

  function construirConsentimientoHTML(r, p) {
    const esc = window.escapeHtml || (s => String(s || ""));
    const fecha = new Date(r.consentimiento_firmado_at).toLocaleString("es-ES");
    return `
      <div style="font-family:Helvetica,Arial,sans-serif;background:#fff;color:#1d1d1f;max-width:800px;margin:0 auto;border:2px solid #1a3a5c;border-radius:12px;overflow:hidden">
        <div style="background:#1a3a5c;color:#fff;text-align:center;padding:16px">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.85">EcoRadAi</div>
          <h2 style="font-size:18px;font-weight:700;letter-spacing:1.5px;margin:6px 0">CONSENTIMIENTO INFORMADO</h2>
        </div>
        <div style="padding:24px">
          <p style="font-size:12px;line-height:1.7;margin-bottom:14px">
            Yo, <strong>${esc(p.paciente.nombre)}</strong>, con DUI ${esc(p.paciente.dui || "—")}, autorizo el procedimiento:
          </p>
          <div style="background:#f0f7ff;padding:12px;border-radius:8px;margin-bottom:14px">
            <div style="font-size:13px;font-weight:700;color:#1a3a5c">${esc(p.procedimiento_nombre)}</div>
          </div>
          <div style="text-align:center;padding:20px;background:#f8fbff;border:2px solid #1a3a5c;border-radius:8px;margin-bottom:20px">
            <img src="${PROC.consentimientoFirma}" style="max-width:100%;max-height:120px;margin-bottom:8px">
            <div style="border-top:1.5px solid #1a3a5c;width:70%;margin:8px auto"></div>
            <div style="font-size:12px;font-weight:700;color:#1a3a5c">${esc(p.paciente.nombre)}</div>
            <div style="font-size:10px;color:#666">DUI: ${esc(p.paciente.dui || "—")}</div>
            <div style="font-size:10px;color:#999;margin-top:6px">Firmado: ${esc(fecha)}</div>
          </div>
          
          <!-- FIRMA DEL PROFESIONAL -->
          <div style="margin-top:30px; page-break-inside:avoid;">
            ${renderBloqueFirma({
              nombre: PROC.firmante?.nombre || "Profesional de Salud",
              csspm: PROC.firmante?.datosSello?.csspm || "N/E",
              especialidad: PROC.firmante?.rol || "Profesional Responsable",
              medico_id: PROC.firmante?.id
            }, fecha)}
          </div>
        </div>
      </div>
    `;
  }

  function construirIndicacionesHTML(r, p) {
    const esc = window.escapeHtml || (s => String(s || ""));
    const fecha = new Date(r.created_at).toLocaleDateString("es-ES");
    return `
      <div style="font-family:Helvetica,Arial,sans-serif;background:#fff;color:#1d1d1f;max-width:700px;margin:0 auto;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#34c759,#1a4a2a);color:#fff;padding:20px 24px;text-align:center">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.85">EcoRadAi</div>
          <h2 style="font-size:18px;font-weight:700;margin:6px 0">INDICACIONES AL PACIENTE</h2>
          <div style="font-size:11px;opacity:0.9">${esc(p.paciente.nombre)} · ${esc(fecha)}</div>
        </div>
        <div style="padding:24px">
          <div style="background:#f0fff4;border-left:4px solid #34c759;padding:14px;border-radius:0 8px 8px 0;margin-bottom:14px">
            <div style="font-size:13px;font-weight:700;color:#1a3a5c">${esc(p.procedimiento_nombre)}</div>
          </div>
          ${PROC.procedimiento.indicaciones_post ? `<h4 style="font-size:11px;color:#34c759;text-transform:uppercase;font-weight:700;border-bottom:1.5px solid #d4f5dc;padding-bottom:4px;margin:14px 0 8px">CUIDADOS</h4><p style="font-size:12px;line-height:1.7;white-space:pre-wrap">${esc(PROC.procedimiento.indicaciones_post)}</p>` : ""}
          ${p.seguimiento ? `<h4 style="font-size:11px;color:#34c759;text-transform:uppercase;font-weight:700;border-bottom:1.5px solid #d4f5dc;padding-bottom:4px;margin:14px 0 8px">SEGUIMIENTO</h4><p style="font-size:12px;line-height:1.7;white-space:pre-wrap">${esc(p.seguimiento)}</p>` : ""}
          <div style="background:#fff3f3;border-left:4px solid #ff3b30;padding:12px;border-radius:0 8px 8px 0;margin-top:14px">
            <div style="font-size:11px;font-weight:700;color:#7a1a1a;margin-bottom:4px">⚠️ SIGNOS DE ALARMA</div>
            <p style="font-size:11px;line-height:1.6;color:#7a1a1a">Fiebre >38.5°C, sangrado abundante, dolor intenso que no cede, enrojecimiento extenso, pus o mal olor.</p>
          </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // MOSTRAR DOCUMENTOS
  // ─────────────────────────────────────────────────────────────
  function mostrarDocumentosProcedimiento(docs, requiereMedico) {
    const cont = $id("proc-paso-container");
    if (!cont) return;
    const lista = [
      { key: "nota_procedimiento", nombre: "📋 Nota de procedimiento" },
      { key: "consentimiento", nombre: "⚖️ Consentimiento" },
      { key: "receta", nombre: "💊 Receta médica" },
      { key: "orden_laboratorio", nombre: "🔬 Orden de laboratorio" },
      { key: "indicaciones_paciente", nombre: "📄 Indicaciones al paciente" }
    ].filter(x => docs[x.key]);

    cont.innerHTML = `
      <div class="card">
        <div class="card-title">
          <span class="num" style="background:${requiereMedico ? "#ff9500" : "#34c759"}">${requiereMedico ? "⏳" : "✅"}</span>
          <span>${requiereMedico ? "Enviado a firma médica" : "Procedimiento completado"}</span>
        </div>
        <div style="background:${requiereMedico ? "#fff9e6" : "#f0fff4"};border-left:4px solid ${requiereMedico ? "#ff9500" : "#34c759"};padding:14px;border-radius:0 8px 8px 0;margin-bottom:16px;font-size:12px">
          ${requiereMedico 
            ? `El procedimiento <strong>${esc(PROC.caseId)}</strong> fue enviado al médico.`
            : `El procedimiento <strong>${esc(PROC.caseId)}</strong> fue registrado exitosamente.`}
        </div>
        ${lista.map(d => `
          <div style="display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;padding:10px 12px;background:var(--bg-secondary);border-radius:8px;margin-bottom:6px">
            <div style="font-size:12px;font-weight:600;color:var(--corp)">${d.nombre}</div>
            <button class="btn btn-secondary btn-xs" onclick="procVerDocumento('${d.key}')" style="font-size:11px">👁️ Ver</button>
            <button class="btn btn-primary btn-xs" onclick="procDescargarDocumento('${d.key}')" style="font-size:11px">📥 PDF</button>
          </div>
        `).join("")}
        <div class="btn-row" style="margin-top:16px">
          <button class="btn btn-primary" onclick="procDescargarTodos()">📥 Descargar TODOS</button>
          <button class="btn btn-secondary" onclick="procNuevo()">🆕 Nuevo procedimiento</button>
        </div>
      </div>
    `;
  }

  window.procVerDocumento = function(key) {
    if (!PROC.docsGenerados?.[key]) return;
    const overlay = document.createElement("div");
    overlay.id = "proc-modal-doc";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;overflow-y:auto;padding:16px";
    overlay.innerHTML = `
      <div style="max-width:900px;margin:0 auto">
        <div style="position:sticky;top:0;z-index:2;background:var(--bg);padding:14px 18px;border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:14px;font-weight:700">Documento</div>
          <button onclick="document.getElementById('proc-modal-doc').remove()" style="background:var(--bg-tertiary);border:none;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer">×</button>
        </div>
        <div style="background:var(--bg);border-radius:0 0 12px 12px;padding:20px">${PROC.docsGenerados[key]}</div>
      </div>
    `;
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  };

  window.procDescargarDocumento = async function(key) {
    if (!PROC.docsGenerados?.[key]) return;
    const contenedor = document.createElement("div");
    contenedor.style.cssText = "position:fixed;left:-99999px;top:0;width:800px;background:#fff;padding:0";
    contenedor.innerHTML = PROC.docsGenerados[key];
    document.body.appendChild(contenedor);
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const mg = 10;
      const cw = pw - 2 * mg;
      const canvas = await html2canvas(contenedor, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgH = (canvas.height * cw) / canvas.width;
      if (imgH <= ph - 2 * mg) {
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", mg, mg, cw, imgH);
      } else {
        const pxPorMm = canvas.width / cw;
        const altoPaginaPx = (ph - 2 * mg) * pxPorMm;
        let offsetY = 0, pagina = 0;
        while (offsetY < canvas.height) {
          if (pagina > 0) pdf.addPage();
          const altoCorte = Math.min(altoPaginaPx, canvas.height - offsetY);
          const temp = document.createElement("canvas");
          temp.width = canvas.width;
          temp.height = altoCorte;
          const ctx = temp.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, temp.width, temp.height);
          ctx.drawImage(canvas, 0, offsetY, canvas.width, altoCorte, 0, 0, canvas.width, altoCorte);
          pdf.addImage(temp.toDataURL("image/png"), "PNG", mg, mg, cw, altoCorte / pxPorMm);
          offsetY += altoCorte;
          pagina++;
        }
      }
      pdf.save(`${key}_${PROC.caseId}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast("✓ PDF descargado", "success");
    } catch (e) {
      console.error("[procDescargarDocumento]", e);
      toast("Error: " + e.message, "error");
    } finally {
      document.body.removeChild(contenedor);
    }
  };

  window.procDescargarTodos = async function() {
    const keys = Object.keys(PROC.docsGenerados || {}).filter(k => PROC.docsGenerados[k]);
    for (const key of keys) {
      await procDescargarDocumento(key);
      await new Promise(r => setTimeout(r, 800));
    }
  };

  window.procNuevo = function() {
    Object.assign(PROC, {
      paciente: null, procedimiento: null, pasoActual: 1,
      consentimientoFirma: null, materialesUsados: [],
      recetaMedicamentos: [], laboratoriosSolicitados: [],
      caseId: null, procedimientoRealizadoId: null,
      docsGenerados: null, notaIA: null, notaEditada: null,
      recetaIA: null, labsIA: null, datosEjecucion: null, firmante: null
    });
    renderWizard();
  };

  window.procIrAPaso = function(paso) {
    if (paso < 1 || paso > 7) return;
    if (paso > 1 && !PROC.paciente) { toast("Selecciona paciente", "error"); return; }
    if (paso > 2 && !PROC.procedimiento) { toast("Selecciona procedimiento", "error"); return; }
    if (paso > 3 && PROC.procedimiento?.requiere_consentimiento && !PROC.consentimientoFirma) {
      toast("Falta firma consentimiento", "error");
      return;
    }
    if (paso > 4 && !PROC.datosEjecucion?.fecha_procedimiento) {
      toast("Completa el paso 4 (ejecución) primero", "error");
      return;
    }
    PROC.pasoActual = paso;
    renderWizard();
  };

  // ═══════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════════
  async function inicializar() {
    PROC.intentos++;
    if (!window.supabaseClient || !window.usuarioActual) {
      if (PROC.intentos < PROC.MAX_INTENTOS) setTimeout(inicializar, 250);
      return;
    }
    const rol = window.usuarioActual.rol;
    if (!["operador", "medico", "admin"].includes(rol)) {
      console.log("[Proc v2.4] Rol no aplicable:", rol);
      return;
    }

    const okHTML = inyectarHTML();
    const okTab = instalarWrapperCambiarTab();
    const okUI  = instalarWrapperAjustarUI();
    const okCat = await cargarCatalogo();

    if (okHTML && okTab && okUI && okCat) {
      PROC.inicializado = true;
      console.log("[Proc v2.4] ✓ Inicializado. Catálogo:", Object.keys(PROC.catalogo).length);
      return;
    }
    if (PROC.intentos < PROC.MAX_INTENTOS) {
      setTimeout(inicializar, 250);
    } else {
      console.error("[Proc v2.4] ❌ Timeout tras", PROC.MAX_INTENTOS, "intentos. Estado:", {
        okHTML, okTab, okUI, okCat,
        usuarioActual: window.usuarioActual?.rol,
        supabaseClient: !!window.supabaseClient
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(inicializar, 800));
  } else {
    setTimeout(inicializar, 800);
  }

  window.addEventListener("ecoradai:login", () => {
    PROC.intentos = 0;
    setTimeout(inicializar, 500);
  });

  console.log("[Proc v2.4] ✓ Wrapper del wizard cargado. Diagnóstico: __PROC.estado()");

})();  /* ← CIERRE DEL IIFE v2.4 */


/* ═══════════════════════════════════════════════════════════════════
   PARTE 2 — HISTORIAL DE PROCEDIMIENTOS EN #sec-informes
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  "use strict";

  console.log("[Proc Historial v2.4] Iniciando...");

  const PH = {
    inicializado: false,
    intentos: 0,
    MAX_INTENTOS: 80,
    cache: [],
    filtroEstado: "todos",
    busqueda: ""
  };

  window.__PROC_HISTORIAL = {
    estado: () => ({
      inicializado: PH.inicializado,
      intentos: PH.intentos,
      procedimientos: PH.cache.length,
      filtro: PH.filtroEstado
    }),
    recargar: () => window.procHistorialCargar(),
    forzarInyeccion: () => inyectarSeccionHistorial(true)
  };

  const esc = window.escapeHtml || function(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  };
  const toast = window.showStatus || function(msg, tipo) {
    console.log("[Proc Historial v2.4]", tipo || "info", msg);
  };
  function $id(id) { return document.getElementById(id); }
  function debounce(fn, ms) {
    let t;
    return function() {
      clearTimeout(t);
      const ctx = this, args = arguments;
      t = setTimeout(() => fn.apply(ctx, args), ms);
    };
  }

  // ═══════════════════════════════════════════════════════════
  // INYECTAR PESTAÑA DENTRO DE #sec-informes
  // ═══════════════════════════════════════════════════════════
  function inyectarSeccionHistorial(forzar) {
    const secInformes = $id("sec-informes");
    if (!secInformes) {
      if (forzar) console.warn("[Proc Historial v2.4] #sec-informes no existe aún");
      return false;
    }

    if ($id("proc-historial-wrap")) return true;

    let card = secInformes.querySelector(".card");
    if (!card) {
      card = document.createElement("div");
      card.className = "card";
      card.innerHTML = '<div class="card-title"><span class="num">📁</span>Casos guardados</div><div id="informes-lista-container"><div class="empty-state"><div class="icon">📁</div><p>No hay casos guardados</p></div></div>';
      secInformes.appendChild(card);
    }

    const wrap = document.createElement("div");
    wrap.id = "proc-historial-wrap";
    wrap.style.cssText = "margin-top:16px;padding-top:16px;border-top:2px dashed var(--border)";

    wrap.innerHTML = `
      <div class="card-title" style="margin-bottom:10px">
        <span class="num" style="background:#d4a017">🩹</span>
        <span>Historial de procedimientos</span>
        <button class="btn btn-secondary btn-xs" style="margin-left:auto" onclick="procHistorialCargar()">🔄</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div class="form-group" style="margin-bottom:0">
          <label style="font-size:11px;font-weight:600">Estado</label>
          <select id="proc-hist-estado" style="font-size:12px" onchange="procHistorialCambiarFiltro(this.value)">
            <option value="todos">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="firmado">Firmado</option>
            <option value="pendiente_firma">Pendiente firma</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label style="font-size:11px;font-weight:600">Límite</label>
          <input type="number" id="proc-hist-limit" value="100" min="10" max="500"
                 style="font-size:12px" onchange="procHistorialCargar()">
        </div>
      </div>

      <div class="form-group" style="margin-bottom:12px">
        <input type="text" id="proc-hist-buscar"
               placeholder="🔍 Buscar por paciente, procedimiento o ID..."
               oninput="procHistorialBuscar(this.value)"
               style="font-size:12px">
      </div>

      <div id="proc-hist-lista">
        <div class="empty-state"><div class="icon">⏳</div><p>Cargando procedimientos...</p></div>
      </div>
    `;

    card.appendChild(wrap);
    console.log("[Proc Historial v2.4] ✓ Sección inyectada en #sec-informes");
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  // CARGAR PROCEDIMIENTOS
  // ═══════════════════════════════════════════════════════════
  window.procHistorialCargar = async function() {
    const cont = $id("proc-hist-lista");
    if (!cont) {
      console.warn("[Proc Historial v2.4] #proc-hist-lista no existe");
      return;
    }
    if (!window.supabaseClient) {
      cont.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>Sin conexión a Supabase</p></div>';
      return;
    }

    cont.innerHTML = '<div class="empty-state"><div class="icon">⏳</div><p>Cargando...</p></div>';

    const estado = $id("proc-hist-estado")?.value || "todos";
    const limite = parseInt($id("proc-hist-limit")?.value) || 100;

    try {
      let query = window.supabaseClient
        .from("procedimientos_realizados")
        .select("procedimiento_realizado_id, case_id, subject_id, procedimiento_id, fecha_procedimiento, estado, medico_nombre, operador_nombre, created_at")
        .order("created_at", { ascending: false })
        .limit(limite);

      if (estado !== "todos") query = query.eq("estado", estado);

      const { data, error } = await query;
      if (error) throw error;

      PH.cache = data || [];

      const subjectIds = [...new Set(PH.cache.map(p => p.subject_id).filter(Boolean))];
      let mapaPacientes = {};
      if (subjectIds.length > 0) {
        const { data: pacs } = await window.supabaseClient
          .from("patients")
          .select("subject_id, nombre, edad, sexo")
          .in("subject_id", subjectIds);
        if (pacs) mapaPacientes = Object.fromEntries(pacs.map(p => [p.subject_id, p]));
      }

      renderLista(mapaPacientes);

    } catch (e) {
      console.error("[procHistorialCargar]", e);
      cont.innerHTML = `
        <div class="empty-state">
          <div class="icon">⚠️</div>
          <p>Error al cargar: ${esc(e.message)}</p>
          <button class="btn btn-primary btn-sm" onclick="procHistorialCargar()" style="margin-top:10px">🔄 Reintentar</button>
        </div>`;
    }
  };

  function renderLista(mapaPacientes) {
    const cont = $id("proc-hist-lista");
    if (!cont) return;

    let lista = PH.cache.slice();
    const q = (PH.busqueda || "").toLowerCase().trim();
    if (q) {
      lista = lista.filter(p => {
        const pac = mapaPacientes[p.subject_id] || {};
        return (pac.nombre || "").toLowerCase().includes(q) ||
               (p.procedimiento_id || "").toLowerCase().includes(q) ||
               (p.case_id || "").toLowerCase().includes(q);
      });
    }

    if (lista.length === 0) {
      cont.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>Sin procedimientos</p></div>';
      return;
    }

    const estadoCfg = {
      borrador: { color: "#86868b", label: "Borrador", icono: "📝" },
      firmado:  { color: "#34c759", label: "Firmado",  icono: "✅" },
      pendiente_firma: { color: "#ff9500", label: "Pendiente", icono: "⏳" },
      anulado:  { color: "#ff3b30", label: "Anulado",  icono: "❌" }
    };

    cont.innerHTML = `
      <div style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">
        <strong>${lista.length}</strong> procedimiento(s)
      </div>
      ${lista.map(p => {
        const pac = mapaPacientes[p.subject_id] || {};
        const cfg = estadoCfg[p.estado] || estadoCfg.borrador;
        return `
          <div class="card" style="border-left:4px solid ${cfg.color};padding:12px;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
              <div style="flex:1;min-width:200px">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                  <div style="font-size:13px;font-weight:700;color:var(--corp)">
                    🩹 ${esc(pac.nombre || "Sin nombre")}
                  </div>
                  <span style="background:${cfg.color};color:white;font-size:9px;font-weight:700;padding:2px 8px;border-radius:100px;text-transform:uppercase">
                    ${cfg.icono} ${cfg.label}
                  </span>
                </div>
                <div style="font-size:11px;color:var(--text-secondary)">
                  <strong>Procedimiento:</strong> ${esc((p.procedimiento_id || "").replace(/_/g, " "))}
                </div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">
                  📅 ${esc(p.fecha_procedimiento || "")}
                  ${pac.edad ? " · " + pac.edad + " años" : ""}
                  ${p.medico_nombre ? " · 🩺 " + esc(p.medico_nombre) : ""}
                  ${p.operador_nombre ? " · 👤 " + esc(p.operador_nombre) : ""}
                </div>
                <div style="font-size:9px;color:var(--text-tertiary);margin-top:4px;font-family:var(--font-mono)">
                  ${esc(p.case_id)}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px">
                <button class="btn btn-primary btn-xs" style="font-size:10px"
                        onclick="procHistorialVer('${p.case_id}')">
                  👁️ Ver documentos
                </button>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    `;
  }

  window.procHistorialCambiarFiltro = function(estado) {
    PH.filtroEstado = estado;
    window.procHistorialCargar();
  };

  window.procHistorialBuscar = debounce(function(valor) {
    PH.busqueda = valor;
    window.procHistorialCargar();
  }, 300);

  // ═══════════════════════════════════════════════════════════
  // VER DOCUMENTOS
  // ═══════════════════════════════════════════════════════════
  window.procHistorialVer = async function(caseId) {
    if (!window.supabaseClient) { toast("Sin conexión", "error"); return; }

    toast("Cargando documentos...", "info");

    try {
      const { data: proc, error: errP } = await window.supabaseClient
        .from("procedimientos_realizados")
        .select("*")
        .eq("case_id", caseId)
        .maybeSingle();

      if (errP || !proc) throw new Error("Procedimiento no encontrado");

      const { data: pac } = await window.supabaseClient
        .from("patients")
        .select("nombre, edad, sexo, subject_id")
        .eq("subject_id", proc.subject_id)
        .maybeSingle();

      const { data: arts, error: errA } = await window.supabaseClient
        .from("artifacts")
        .select("tipo, html")
        .eq("case_id", caseId);

      if (errA) throw new Error("Error leyendo documentos: " + errA.message);

      const docs = {};
      (arts || []).forEach(a => { if (a.html) docs[a.tipo] = a.html; });

      const overlay = document.createElement("div");
      overlay.id = "modal-proc-hist";
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);z-index:99999;overflow-y:auto;padding:16px";

      const titulos = {
        nota_procedimiento: "🩹 Nota del procedimiento",
        receta: "💊 Receta",
        orden_laboratorio: "🔬 Órdenes de laboratorio",
        orden_imagen: "🖼️ Órdenes de imagen",
        referencia: "📤 Hoja de referencia",
        consentimiento: "✍️ Consentimiento",
        indicaciones_paciente: "📄 Indicaciones al paciente"
      };

      let docsHTML = "";
      if (Object.keys(docs).length === 0) {
        docsHTML = `
          <div style="background:#fff9e6;border-left:4px solid #ff9500;border-radius:0 8px 8px 0;padding:16px;font-size:12px;color:#8a6a00;text-align:center">
            <div style="font-size:32px;margin-bottom:8px">⚠️</div>
            Este procedimiento no tiene documentos guardados.
          </div>
        `;
      } else {
        Object.entries(docs).forEach(([tipo, html]) => {
          docsHTML += `
            <div style="margin-bottom:24px">
              <div style="
                position:sticky;top:0;z-index:1;
                background:var(--bg);padding:8px 12px;
                border-left:4px solid var(--accent);
                border-radius:0 6px 6px 0;
                font-size:11px;font-weight:700;color:var(--accent);
                text-transform:uppercase;letter-spacing:0.5px;
                margin-bottom:8px;
              ">${titulos[tipo] || tipo}</div>
              <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
                ${html}
              </div>
            </div>
          `;
        });
      }

      overlay.innerHTML = `
        <div style="max-width:900px;margin:0 auto">
          <div style="position:sticky;top:0;z-index:3;background:#d4a017;border-radius:var(--radius-lg) var(--radius-lg) 0 0;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px;box-shadow:0 4px 12px rgba(0,0,0,0.2)">
            <div style="flex:1;min-width:0;color:#fff">
              <div style="font-size:15px;font-weight:700">🩹 Procedimiento — ${esc(pac?.nombre || "Sin nombre")}</div>
              <div style="font-size:11px;opacity:0.9;margin-top:2px">
                ${esc((proc.procedimiento_id || "").replace(/_/g, " "))} · ${esc(proc.fecha_procedimiento || "")}
              </div>
              <div style="font-size:10px;opacity:0.8;margin-top:2px;font-family:monospace">
                ${esc(proc.case_id)}
              </div>
            </div>
            <button onclick="document.getElementById('modal-proc-hist').remove()"
                    style="background:rgba(255,255,255,0.2);border:none;width:34px;height:34px;border-radius:50%;font-size:18px;color:#fff;cursor:pointer;flex-shrink:0">×</button>
          </div>
          <div style="background:var(--bg-secondary);border-radius:0 0 var(--radius-lg) var(--radius-lg);padding:16px;box-shadow:0 20px 60px rgba(0,0,0,0.4)">
            ${docsHTML}
          </div>
        </div>
      `;

      overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);

    } catch (e) {
      console.error("[procHistorialVer]", e);
      toast("Error: " + e.message, "error");
    }
  };

  // ═══════════════════════════════════════════════════════════
  // HOOKS
  // ═══════════════════════════════════════════════════════════
  function instalarHooks() {
    if (window.cambiarTab && !window.cambiarTab._procHistHook) {
      const _orig = window.cambiarTab;
      window.cambiarTab = function(tab) {
        const r = _orig.apply(this, arguments);
        if (tab === "informes") {
          setTimeout(() => {
            inyectarSeccionHistorial();
            window.procHistorialCargar();
          }, 250);
        }
        return r;
      };
      window.cambiarTab._procHistHook = true;
      console.log("[Proc Historial v2.4] ✓ Hook cambiarTab instalado");
    }

    if (typeof window.renderCasosGuardados === "function" && !window.renderCasosGuardados._procHistHook) {
      const _origRender = window.renderCasosGuardados;
      window.renderCasosGuardados = async function() {
        const r = await _origRender.apply(this, arguments);
        setTimeout(() => {
          inyectarSeccionHistorial();
          window.procHistorialCargar();
        }, 300);
        return r;
      };
      window.renderCasosGuardados._procHistHook = true;
      console.log("[Proc Historial v2.4] ✓ Hook renderCasosGuardados instalado");
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INICIALIZAR
  // ═══════════════════════════════════════════════════════════
  function intentarInicializar() {
    PH.intentos++;

    const rol = window.usuarioActual?.rol;
    const rolesPermitidos = ["admin", "medico", "operador"];

    if (!rol || !rolesPermitidos.includes(rol)) {
      if (PH.intentos < PH.MAX_INTENTOS) setTimeout(intentarInicializar, 300);
      return;
    }

    const okSec = inyectarSeccionHistorial();
    instalarHooks();

    if (okSec) {
      PH.inicializado = true;
      console.log("[Proc Historial v2.4] ✓ Inicializado para rol:", rol);
      const tabActiva = document.querySelector("#tabs-principales .tab.active");
      if (tabActiva?.dataset.tab === "informes") {
        window.procHistorialCargar();
      }
      return;
    }

    if (PH.intentos < PH.MAX_INTENTOS) {
      setTimeout(intentarInicializar, 300);
    } else {
      console.warn("[Proc Historial v2.4] ⚠️ Timeout tras", PH.MAX_INTENTOS, "intentos");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(intentarInicializar, 1000));
  } else {
    setTimeout(intentarInicializar, 1000);
  }

  window.addEventListener("ecoradai:login", () => {
    PH.intentos = 0;
    setTimeout(intentarInicializar, 800);
  });

  console.log("[Proc Historial v2.4] ✓ Módulo cargado. Diagnóstico: __PROC_HISTORIAL.estado()");

})();  /* ← CIERRE DEL IIFE v2.4 */
