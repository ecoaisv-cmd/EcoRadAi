// ═══════════════════════════════════════════════════════════════
// ARBOL-UI.JS — UI del Historial del Paciente (Guardián)
// Versión: 1.0.0
// 
// Inyectar en index.html después de observability-wrapper-v15.js:
//   <script src="arbol-ui.js?v=1" defer></script>
//
// Comportamiento por rol:
//   • Médico/Admin → Modal automático al seleccionar paciente con historial
//   • Operador     → Banner discreto (click para ver modal)
//   • Cualquiera   → Puede consultar via window.arbolUIMostrarHistorial()
// ═══════════════════════════════════════════════════════════════

(function() {
  "use strict";

  const VERSION = "1.0.0";
  const UI = {
    inicializado: false,
    intentos: 0,
    MAX_INTENTOS: 40,
    intervalo_ms: 250,
    ultimoHistorial: null,
    modalAbierto: false,
    cachePorPaciente: new Map()
  };

  window.ARBOL_UI = UI;

  // ═══════════════════════════════════════════════════════════════
  // API PÚBLICA DE DEBUG
  // ═══════════════════════════════════════════════════════════════
  window.__ARBOL_UI = {
    estado: () => ({
      inicializado: UI.inicializado,
      intentos: UI.intentos,
      modalAbierto: UI.modalAbierto,
      cacheSize: UI.cachePorPaciente.size,
      ultimoHistorial: UI.ultimoHistorial?.subject_id
    }),
    mostrar: (subjectId) => mostrarModalHistorial(subjectId),
    cerrar: () => cerrarModalHistorial(),
    limpiarCache: () => {
      UI.cachePorPaciente.clear();
      UI.ultimoHistorial = null;
      console.log("[Arbol-UI] Cache limpiada");
    },
    simularHistorial: (subjectId) => {
      const historialFake = generarHistorialDemo(subjectId);
      procesarHistorial(historialFake);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════
  function log(...args) { console.log("[Arbol-UI]", ...args); }
  function warn(...args) { console.warn("[Arbol-UI]", ...args); }
  function error(...args) { console.error("[Arbol-UI]", ...args); }

  function $id(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function formatearFecha(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("es-ES", {
        year: "numeric", month: "short", day: "2-digit"
      });
    } catch { return iso; }
  }

  function formatearFechaHora(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("es-ES", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch { return iso; }
  }

  function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return null;
    try {
      const hoy = new Date();
      const nac = new Date(fechaNacimiento);
      let edad = hoy.getFullYear() - nac.getFullYear();
      const m = hoy.getMonth() - nac.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
      return edad;
    } catch { return null; }
  }

  function colorPorNivel(nivel) {
    const n = String(nivel || "").toUpperCase();
    if (n.includes("MUY ALTO")) return "#ff3b30";
    if (n.includes("ALTO")) return "#ff9500";
    if (n.includes("MODERADO")) return "#ffcc00";
    if (n.includes("BAJO")) return "#34c759";
    return "#86868b";
  }

  function iconoPorTipo(tipo) {
    if (tipo === "tamizaje") return "🩺";
    if (tipo === "consulta") return "📋";
    return "📄";
  }

  // ═══════════════════════════════════════════════════════════════
  // BANNER (operador)
  // ═══════════════════════════════════════════════════════════════
  function mostrarBanner(historial) {
    // Eliminar banner anterior si existe
    const existente = $id("arbol-ui-banner");
    if (existente) existente.remove();

    const total = historial.total_casos || 0;
    const alertas = historial.alertas || [];
    const alertasAltas = alertas.filter(a => a.severidad === "alta").length;
    const ultimoRiesgo = historial.ultimo_riesgo || "—";

    const banner = document.createElement("div");
    banner.id = "arbol-ui-banner";
    banner.style.cssText = `
      position: fixed;
      top: 70px;
      left: 50%;
      transform: translateX(-50%) translateY(-200%);
      background: linear-gradient(135deg, #1a3a5c, #0071e3);
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 9997;
      display: flex;
      align-items: center;
      gap: 14px;
      max-width: 90%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      cursor: pointer;
      transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;

    const alertasTexto = alertasAltas > 0
      ? ` · ⚠️ ${alertasAltas} alerta${alertasAltas !== 1 ? "s" : ""} alta${alertasAltas !== 1 ? "s" : ""}`
      : alertas.length > 0
        ? ` · ${alertas.length} alerta${alertas.length !== 1 ? "s" : ""}`
        : "";

    banner.innerHTML = `
      <span style="font-size: 22px">🩸</span>
      <div style="flex: 1; min-width: 0">
        <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px">
          Historial: ${total} caso${total !== 1 ? "s" : ""} previo${total !== 1 ? "s" : ""}
        </div>
        <div style="font-size: 11px; opacity: 0.9">
          Último riesgo: <strong>${escapeHtml(ultimoRiesgo)}</strong>${alertasTexto}
        </div>
      </div>
      <button style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      ">Ver historial</button>
      <button style="
        background: transparent;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
        opacity: 0.7;
      " title="Cerrar">×</button>
    `;

    // Click en banner → abrir modal
    banner.addEventListener("click", (e) => {
      if (e.target.textContent === "×") {
        banner.style.transform = "translateX(-50%) translateY(-200%)";
        setTimeout(() => banner.remove(), 400);
        return;
      }
      mostrarModalHistorial(historial.subject_id);
    });

    document.body.appendChild(banner);

    // Animar entrada
    setTimeout(() => {
      banner.style.transform = "translateX(-50%) translateY(0)";
    }, 50);

    // Auto-cerrar después de 8s
    setTimeout(() => {
      if (banner.parentNode) {
        banner.style.transform = "translateX(-50%) translateY(-200%)";
        setTimeout(() => banner.remove(), 400);
      }
    }, 8000);

    log("Banner mostrado para", historial.subject_id);
  }

  // ═══════════════════════════════════════════════════════════════
  // MODAL (médico/admin o click en banner)
  // ═══════════════════════════════════════════════════════════════
  async function mostrarModalHistorial(subjectId) {
    if (!subjectId) {
      warn("Sin subject_id para mostrar historial");
      return;
    }

    // Verificar cache
    let historial = UI.cachePorPaciente.get(subjectId);

    // Si no está en cache, cargar desde Supabase
    if (!historial && window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from("savia_pacientes")
          .select("*")
          .eq("subject_id", subjectId)
          .maybeSingle();

        if (error) throw error;
        historial = data;
      } catch (e) {
        error("Error cargando historial:", e);
      }
    }

    if (!historial) {
      warn("Sin historial para", subjectId);
      if (typeof window.showStatus === "function") {
        window.showStatus("Este paciente no tiene historial previo", "info");
      }
      return;
    }

    // Eliminar modal anterior si existe
    const existente = $id("arbol-ui-modal-historial");
    if (existente) existente.remove();

    UI.modalAbierto = true;
    UI.ultimoHistorial = historial;
    UI.cachePorPaciente.set(subjectId, historial);

    // Construir modal
    const modal = document.createElement("div");
    modal.id = "arbol-ui-modal-historial";
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 99998;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 20px 20px;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    modal.innerHTML = construirContenidoModal(historial);

    // Click fuera para cerrar
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cerrarModalHistorial();
    });

    document.body.appendChild(modal);

    // Bindear botones
    bindearBotonesModal(modal, historial);

    log("Modal mostrado para", subjectId);
  }

  function construirContenidoModal(historial) {
    const subjectId = historial.subject_id || "—";
    const total = historial.total_casos || 0;
    const totalTamizajes = historial.total_tamizajes || 0;
    const totalConsultas = historial.total_consultas || 0;
    const ultimoRiesgo = historial.ultimo_riesgo || "—";
    const alertas = historial.alertas || [];
    const tendencias = historial.tendencias || {};
    const casos = (historial.historial || []).slice().reverse();

    const colorRiesgo = colorPorNivel(ultimoRiesgo);

    // ─── Header ───
    const headerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a3a5c 0%, #ff3b30 100%);
        color: white;
        padding: 20px 24px;
        border-radius: 16px 16px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      ">
        <div style="flex: 1; min-width: 0">
          <div style="font-size: 20px; font-weight: 800; margin-bottom: 4px">
            🩸 Historial del Paciente
          </div>
          <div style="font-size: 12px; opacity: 0.9; font-family: ui-monospace, monospace">
            ${escapeHtml(subjectId)}
          </div>
          <div style="font-size: 11px; opacity: 0.85; margin-top: 4px">
            Última actualización: ${formatearFechaHora(historial.ultima_actualizacion)}
          </div>
        </div>
        <button id="arbol-ui-modal-cerrar" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 18px;
          cursor: pointer;
          flex-shrink: 0;
        " title="Cerrar">×</button>
      </div>
    `;

    // ─── Resumen de KPIs ───
    const resumenHTML = `
      <div style="
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 16px 20px;
        background: #f0f7ff;
        border-bottom: 1px solid #d2d2d7;
      ">
        <div style="text-align: center; padding: 8px 4px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.04)">
          <div style="font-size: 26px; font-weight: 800; color: #0071e3">${total}</div>
          <div style="font-size: 10px; color: #6e6e73; text-transform: uppercase; font-weight: 700">Casos</div>
        </div>
        <div style="text-align: center; padding: 8px 4px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.04)">
          <div style="font-size: 26px; font-weight: 800; color: #34c759">${totalTamizajes}</div>
          <div style="font-size: 10px; color: #6e6e73; text-transform: uppercase; font-weight: 700">Tamizajes</div>
        </div>
        <div style="text-align: center; padding: 8px 4px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.04)">
          <div style="font-size: 26px; font-weight: 800; color: #0071e3">${totalConsultas}</div>
          <div style="font-size: 10px; color: #6e6e73; text-transform: uppercase; font-weight: 700">Consultas</div>
        </div>
        <div style="text-align: center; padding: 8px 4px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.04)">
          <div style="font-size: 18px; font-weight: 800; color: ${colorRiesgo}; padding-top: 6px">${escapeHtml(ultimoRiesgo)}</div>
          <div style="font-size: 10px; color: #6e6e73; text-transform: uppercase; font-weight: 700">Riesgo</div>
        </div>
      </div>
    `;

    // ─── Alertas ───
    let alertasHTML = "";
    if (alertas.length > 0) {
      alertasHTML = `
        <div style="padding: 16px 20px; border-bottom: 1px solid #e8e8ed">
          <div style="font-size: 12px; font-weight: 800; color: #1a3a5c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px">
            ⚠️ Alertas Activas (${alertas.length})
          </div>
          ${alertas.map(a => {
            const color = a.severidad === "alta" ? "#ff3b30"
                        : a.severidad === "media" ? "#ff9500"
                        : "#ffcc00";
            const label = a.severidad === "alta" ? "ALTA"
                        : a.severidad === "media" ? "MEDIA"
                        : "BAJA";
            return `
              <div style="
                background: ${color}11;
                border-left: 4px solid ${color};
                border-radius: 0 8px 8px 0;
                padding: 10px 14px;
                margin-bottom: 8px;
                font-size: 12px;
                line-height: 1.5;
              ">
                <span style="
                  background: ${color};
                  color: white;
                  font-size: 9px;
                  font-weight: 800;
                  padding: 2px 6px;
                  border-radius: 4px;
                  margin-right: 6px;
                  letter-spacing: 0.5px;
                ">${label}</span>
                <strong>${escapeHtml(a.tipo || "alerta")}</strong>: ${escapeHtml(a.mensaje || "")}
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    // ─── Tendencias ───
    let tendenciasHTML = "";
    const tieneTendencias = Object.entries(tendencias).some(([k, v]) => {
      if (k === "riesgo_global") return Array.isArray(v) && v.length > 0;
      return Array.isArray(v) && v.length >= 1;
    });

    if (tieneTendencias) {
      tendenciasHTML = `
        <div style="padding: 16px 20px; border-bottom: 1px solid #e8e8ed">
          <div style="font-size: 12px; font-weight: 800; color: #1a3a5c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px">
            📈 Tendencias
          </div>
          ${construirTablaTendencias(tendencias)}
        </div>
      `;
    }

    // ─── Casos previos ───
    let casosHTML = "";
    if (casos.length > 0) {
      casosHTML = `
        <div style="padding: 16px 20px; border-bottom: 1px solid #e8e8ed">
          <div style="font-size: 12px; font-weight: 800; color: #1a3a5c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px">
            📅 Casos Previos (${casos.length})
          </div>
          ${casos.map(caso => construirCardCaso(caso)).join("")}
        </div>
      `;
    }

    // ─── Footer ───
    const footerHTML = `
      <div style="padding: 16px 20px; display: flex; gap: 8px">
        <button id="arbol-ui-modal-cerrar-2" style="
          flex: 1;
          padding: 12px;
          background: #0071e3;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        ">
          ✅ Continuar con la atención
        </button>
      </div>
    `;

    // ─── Ensamblar ───
    return `
      <div style="
        background: white;
        border-radius: 16px;
        max-width: 720px;
        width: 100%;
        max-height: calc(100vh - 80px);
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      ">
        ${headerHTML}
        ${resumenHTML}
        ${alertasHTML}
        ${tendenciasHTML}
        ${casosHTML}
        ${footerHTML}
      </div>
    `;
  }

  function construirTablaTendencias(tendencias) {
    const metricas = [
      { key: "peso", label: "Peso", unidad: "kg", esMejora: (d) => d < 0 },
      { key: "presion_sistolica", label: "PA sistólica", unidad: "mmHg", esMejora: (d) => d < 0 },
      { key: "presion_diastolica", label: "PA diastólica", unidad: "mmHg", esMejora: (d) => d < 0 },
      { key: "glucosa", label: "Glucosa", unidad: "mg/dL", esMejora: (d) => d < 0 },
      { key: "hba1c", label: "HbA1c", unidad: "%", esMejora: (d) => d < 0 },
      { key: "imc", label: "IMC", unidad: "kg/m²", esMejora: (d) => d < 0 }
    ];

    return metricas.map(m => {
      const serie = tendencias[m.key];
      if (!Array.isArray(serie) || serie.length === 0) return "";

      const primero = serie[0].valor;
      const ultimo = serie[serie.length - 1].valor;
      const delta = ultimo - primero;
      const deltaFmt = delta === 0 ? "sin cambio"
                     : delta > 0 ? `+${delta.toFixed(1)}`
                     : `${delta.toFixed(1)}`;
      const mejora = m.esMejora ? m.esMejora(delta) : false;
      const colorDelta = delta === 0 ? "#86868b"
                       : mejora ? "#34c759"
                       : delta > 0 ? "#ff3b30"
                       : "#ff9500";

      // Mini sparkline
      const valores = serie.map(s => s.valor);
      const min = Math.min(...valores);
      const max = Math.max(...valores);
      const rango = max - min || 1;
      const sparkline = valores.map((v, i) => {
        const pct = ((v - min) / rango) * 100;
        return `<span style="
          display: inline-block;
          width: 6px;
          height: ${4 + (pct / 100) * 20}px;
          background: #0071e3;
          border-radius: 2px;
          margin-right: 2px;
          vertical-align: bottom;
        "></span>`;
      }).join("");

      return `
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
          font-size: 12px;
        ">
          <div style="flex: 1">
            <div style="font-weight: 700; color: #1d1d1f">${m.label}</div>
            <div style="font-size: 10px; color: #86868b; margin-top: 2px">
              ${primero} → ${ultimo} ${m.unidad}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px">
            <div style="height: 24px; display: flex; align-items: flex-end">
              ${sparkline}
            </div>
            <div style="
              font-weight: 800;
              font-size: 12px;
              color: ${colorDelta};
              min-width: 60px;
              text-align: right;
            ">${deltaFmt}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  function construirCardCaso(caso) {
    const nivel = caso.informe_kimi?.riesgo_global?.nivel || "MODERADO";
    const color = colorPorNivel(nivel);
    const icono = iconoPorTipo(caso.tipo);
    const fecha = formatearFecha(caso.fecha);
    const dx = (caso.informe_kimi?.json_estructurado?.diagnosticos || [])
      .map(d => d.cie10 || d.codigo)
      .filter(Boolean)
      .slice(0, 3)
      .join(", ") || "—";
    const plan = caso.informe_kimi?.json_estructurado?.plan || {};
    const farmacos = (plan.farmacologico || []).map(f => f.farmaco).filter(Boolean).slice(0, 3);
    const planResumen = farmacos.length > 0 ? farmacos.join(", ") : "Sin tratamiento farmacológico";

    return `
      <div style="
        background: #f9f9fa;
        border-left: 4px solid ${color};
        border-radius: 0 8px 8px 0;
        padding: 12px 14px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
      "
      onmouseover="this.style.transform='translateX(2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
      onmouseout="this.style.transform='translateX(0)';this.style.boxShadow='none'">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6px;
          gap: 10px;
        ">
          <div style="flex: 1; min-width: 0">
            <div style="font-size: 13px; font-weight: 800; color: #1a3a5c">
              ${icono} ${escapeHtml(caso.tipo || "caso")} · ${fecha}
            </div>
            <div style="
              font-size: 9px;
              color: #86868b;
              font-family: ui-monospace, monospace;
              margin-top: 2px;
            ">${escapeHtml(caso.case_id || "")}</div>
          </div>
          <div style="
            background: ${color};
            color: white;
            padding: 3px 10px;
            border-radius: 100px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.5px;
            flex-shrink: 0;
          ">${escapeHtml(nivel)}</div>
        </div>
        <div style="font-size: 11px; color: #333; line-height: 1.5; margin-bottom: 4px">
          <strong>CIE-10:</strong> ${escapeHtml(dx)}
        </div>
        <div style="font-size: 11px; color: #666; line-height: 1.5">
          <strong>Plan:</strong> ${escapeHtml(planResumen)}
        </div>
        ${(caso.interconsultas_ejecutadas || []).length > 0 ? `
          <div style="
            font-size: 10px;
            color: #0071e3;
            font-weight: 700;
            margin-top: 6px;
          ">
            🩺 ${caso.interconsultas_ejecutadas.length} interconsulta(s) ejecutada(s)
          </div>
        ` : ""}
      </div>
    `;
  }

  function bindearBotonesModal(modal, historial) {
    const btnCerrar1 = modal.querySelector("#arbol-ui-modal-cerrar");
    const btnCerrar2 = modal.querySelector("#arbol-ui-modal-cerrar-2");

    if (btnCerrar1) btnCerrar1.addEventListener("click", cerrarModalHistorial);
    if (btnCerrar2) btnCerrar2.addEventListener("click", cerrarModalHistorial);

    // Tecla ESC
    const escHandler = (e) => {
      if (e.key === "Escape") {
        cerrarModalHistorial();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  function cerrarModalHistorial() {
    const modal = $id("arbol-ui-modal-historial");
    if (modal) {
      modal.style.opacity = "0";
      modal.style.transition = "opacity 0.2s";
      setTimeout(() => modal.remove(), 200);
    }
    UI.modalAbierto = false;
  }

  // ═══════════════════════════════════════════════════════════════
  // PROCESAR HISTORIAL SEGÚN ROL
  // ═══════════════════════════════════════════════════════════════
  function procesarHistorial(historial) {
    if (!historial || !historial.subject_id) return;

    const rol = window.usuarioActual?.rol || "operador";
    const total = historial.total_casos || 0;

    // Guardar en cache
    UI.cachePorPaciente.set(historial.subject_id, historial);
    UI.ultimoHistorial = historial;

    log(`Historial recibido: ${historial.subject_id} · ${total} casos · rol: ${rol}`);

    // Médico o Admin → modal automático
    if (rol === "medico" || rol === "admin") {
      mostrarModalHistorial(historial.subject_id);
    }
    // Operador → banner discreto
    else if (rol === "operador") {
      mostrarBanner(historial);
    }
    // Otros → solo log
    else {
      log("Rol sin UI específica:", rol);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SUSCRIPCIÓN A EVENTOS DEL GUARDIÁN
  // ═══════════════════════════════════════════════════════════════
  function suscribirEventosGuardian() {
    if (!window.SAVIA) {
      warn("SAVIA no disponible para suscribirse");
      return false;
    }

    try {
      // Usar kernel.on() porque es lo que usan los agentes
      if (window.kernel && typeof window.kernel.on === "function") {
        window.kernel.on("savia:guardian:historial-paciente", (evt) => {
          log("📥 Evento historial-paciente recibido");
          procesarHistorial(evt.payload);
        });

        window.kernel.on("savia:guardian:paciente-nuevo", (evt) => {
          log("🆕 Evento paciente-nuevo recibido");
          const subjectId = evt.payload?.subject_id;

          if (subjectId) {
            UI.cachePorPaciente.delete(subjectId);
          }

          // Notificación discreta
          if (typeof window.showStatus === "function") {
            window.showStatus("🩸 Primera vez que se atiende a este paciente", "info");
          }
        });

        window.kernel.on("savia:guardian:actualizada", (evt) => {
          log("🩸 Evento actualizada recibido:", evt.payload?.case_id);
          const subjectId = evt.payload?.subject_id;

          // Invalidar cache para forzar recarga
          if (subjectId) {
            UI.cachePorPaciente.delete(subjectId);
          }
        });

        window.kernel.on("savia:guardian:alerta-nueva", (evt) => {
          log("⚠️ Evento alerta-nueva recibido");
          const alertas = evt.payload?.alertas || [];

          // Mostrar alertas como toasts
          alertas.forEach(a => {
            if (typeof window.showStatus === "function") {
              const icono = a.severidad === "alta" ? "🚨" : "⚠️";
              window.showStatus(`${icono} ${a.mensaje}`, "warning");
            }
          });
        });

        log("✓ Suscrito a 4 eventos del guardián");
        return true;
      }

      // Fallback: usar SAVIA.suscribir si kernel no tiene .on
      if (typeof window.SAVIA.suscribir === "function") {
        window.SAVIA.suscribir("arbol-ui", [
          "savia:guardian:historial-paciente",
          "savia:guardian:paciente-nuevo",
          "savia:guardian:actualizada",
          "savia:guardian:alerta-nueva"
        ], (evt) => {
          switch (evt.tipo) {
            case "savia:guardian:historial-paciente":
              procesarHistorial(evt.payload);
              break;
            case "savia:guardian:paciente-nuevo":
              if (typeof window.showStatus === "function") {
                window.showStatus("🩸 Primera vez que se atiende a este paciente", "info");
              }
              break;
            case "savia:guardian:alerta-nueva":
              (evt.payload?.alertas || []).forEach(a => {
                if (typeof window.showStatus === "function") {
                  window.showStatus(`⚠️ ${a.mensaje}`, "warning");
                }
              });
              break;
          }
        });

        log("✓ Suscrito a 4 eventos del guardián (fallback SAVIA)");
        return true;
      }

      warn("No hay método de suscripción disponible");
      return false;

    } catch (e) {
      error("Error suscribiendo a guardián:", e);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HISTORIAL DEMO (para testing sin datos reales)
  // ═══════════════════════════════════════════════════════════════
  function generarHistorialDemo(subjectId) {
    const hoy = new Date();
    const hace3meses = new Date(hoy.getTime() - 90 * 24 * 60 * 60 * 1000);
    const hace6meses = new Date(hoy.getTime() - 180 * 24 * 60 * 60 * 1000);

    return {
      subject_id: subjectId || "PAC-DEMO-0001",
      total_casos: 3,
      total_tamizajes: 2,
      total_consultas: 1,
      ultimo_riesgo: "ALTO",
      ultima_actualizacion: hoy.toISOString(),
      alertas: [
        {
          tipo: "tendencia_hta",
          severidad: "alta",
          mensaje: "Presión sistólica subió de 138 a 145 mmHg en 6 meses"
        },
        {
          tipo: "prediabetes_progresiva",
          severidad: "media",
          mensaje: "HbA1c subió de 5.9 a 6.1% en 6 meses"
        }
      ],
      tendencias: {
        peso: [
          { fecha: hace6meses.toISOString().slice(0, 10), valor: 82 },
          { fecha: hace3meses.toISOString().slice(0, 10), valor: 83 },
          { fecha: hoy.toISOString().slice(0, 10), valor: 84 }
        ],
        presion_sistolica: [
          { fecha: hace6meses.toISOString().slice(0, 10), valor: 138 },
          { fecha: hace3meses.toISOString().slice(0, 10), valor: 142 },
          { fecha: hoy.toISOString().slice(0, 10), valor: 145 }
        ],
        presion_diastolica: [
          { fecha: hace6meses.toISOString().slice(0, 10), valor: 88 },
          { fecha: hace3meses.toISOString().slice(0, 10), valor: 92 },
          { fecha: hoy.toISOString().slice(0, 10), valor: 95 }
        ],
        glucosa: [
          { fecha: hace6meses.toISOString().slice(0, 10), valor: 110 },
          { fecha: hoy.toISOString().slice(0, 10), valor: 120 }
        ],
        hba1c: [
          { fecha: hace6meses.toISOString().slice(0, 10), valor: 5.9 },
          { fecha: hoy.toISOString().slice(0, 10), valor: 6.1 }
        ],
        imc: [
          { fecha: hace6meses.toISOString().slice(0, 10), valor: 28.4 },
          { fecha: hoy.toISOString().slice(0, 10), valor: 29.1 }
        ],
        riesgo_global: [
          { fecha: hace6meses.toISOString().slice(0, 10), nivel: "MODERADO" },
          { fecha: hoy.toISOString().slice(0, 10), nivel: "ALTO" }
        ]
      },
      historial: [
        {
          case_id: "ECO-META-20260115-ABC123",
          tipo: "tamizaje",
          fecha: hace6meses.toISOString().slice(0, 10),
          informe_kimi: {
            riesgo_global: { nivel: "MODERADO" },
            json_estructurado: {
              diagnosticos: [
                { cie10: "R73", descripcion: "Hiperglucemia" },
                { cie10: "I10", descripcion: "Hipertensión" }
              ],
              plan: {
                farmacologico: [
                  { farmaco: "Metformina" }
                ]
              }
            }
          },
          interconsultas_ejecutadas: []
        },
        {
          case_id: "CONS-20260320-001",
          tipo: "consulta",
          fecha: hace3meses.toISOString().slice(0, 10),
          informe_kimi: {
            riesgo_global: { nivel: "MODERADO" },
            json_estructurado: {
              diagnosticos: [
                { cie10: "R51", descripcion: "Cefalea" }
              ],
              plan: {
                farmacologico: [
                  { farmaco: "Paracetamol" }
                ]
              }
            }
          },
          interconsultas_ejecutadas: [
            { especialista: "internista", nombre: "IA-Internista" }
          ]
        },
        {
          case_id: "ECO-META-20260710-XYZ789",
          tipo: "tamizaje",
          fecha: hoy.toISOString().slice(0, 10),
          informe_kimi: {
            riesgo_global: { nivel: "ALTO" },
            json_estructurado: {
              diagnosticos: [
                { cie10: "R73", descripcion: "Hiperglucemia" },
                { cie10: "I10", descripcion: "HTA" }
              ],
              plan: {
                farmacologico: [
                  { farmaco: "Metformina" },
                  { farmaco: "Enalapril" }
                ]
              }
            }
          },
          interconsultas_ejecutadas: [
            { especialista: "nutricionista", nombre: "IA-Nutricionista" },
            { especialista: "cardiologo", nombre: "IA-Cardiólogo" }
          ]
        }
      ]
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // INICIALIZACIÓN CON REINTENTOS
  // ═══════════════════════════════════════════════════════════════
  function intentarInicializar() {
    UI.intentos++;

    // Esperar kernel + SAVIA
    if (!window.kernel || !window.SAVIA) {
      if (UI.intentos < UI.MAX_INTENTOS) {
        setTimeout(intentarInicializar, UI.intervalo_ms);
      } else {
        warn("Timeout esperando kernel + SAVIA");
      }
      return;
    }

    // Suscribir a eventos
    const ok = suscribirEventosGuardian();

    if (ok) {
      UI.inicializado = true;
      log(`✓ Inicializado v${VERSION} en intento ${UI.intentos}`);
      log(`   Rol actual: ${window.usuarioActual?.rol || "sin login"}`);
      log(`   Diagnóstico: window.__ARBOL_UI.estado()`);
    } else if (UI.intentos < UI.MAX_INTENTOS) {
      setTimeout(intentarInicializar, UI.intervalo_ms);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ARRANQUE
  // ═══════════════════════════════════════════════════════════════
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(intentarInicializar, 600));
  } else {
    setTimeout(intentarInicializar, 600);
  }

  // Reintentar al login
  window.addEventListener("ecoradai:login", () => {
    UI.intentos = 0;
    setTimeout(intentarInicializar, 500);
  });

  console.log(`%c[Arbol-UI] ✓ v${VERSION} cargado. Esperando kernel+SAVIA...`, "background:#34c759;color:white;padding:4px 8px;border-radius:4px;font-weight:bold");

})();
