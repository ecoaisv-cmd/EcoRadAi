/**
 * ═══════════════════════════════════════════════════════════════════
 * AGENTE GUARDIÁN
 * Capa: RAÍZ
 * Sprint 3 Fase F
 * ═══════════════════════════════════════════════════════════════════
 * 
 * RESPONSABILIDADES:
 *   1. Mantener la SAVIA acumulativa por paciente
 *   2. Al seleccionar paciente → emitir historial o paciente-nuevo
 *   3. Al recibir informe Kimi → acumular caso + recalcular tendencias
 *   4. Detectar alertas automáticamente
 *   5. Persistir en tabla savia_pacientes
 */

import SAVIA from "../../kernel/savia.js";

export const agenteGuardian = {
  id: "agente-guardian",
  version: "1.0.0",
  nombre: "Agente Guardián",
  icono: "🩸",
  capa: "raiz",
  dominio: "savia",
  categoria: "clinico",

  permisos: {
    ver: ["operador", "medico", "admin"],
    editar: ["operador", "medico", "admin"]
  },

  requiere: {
    entidades: ["paciente", "caso"],
    servicios: ["supabase"]
  },

  eventos_emitidos: [
    "savia:guardian:historial-paciente",
    "savia:guardian:paciente-nuevo",
    "savia:guardian:actualizada",
    "savia:guardian:alerta-nueva"
  ],

  eventos_suscritos: [
    "paciente:seleccionado",
    "savia:tronco:informe-kimi"
  ],

  _cache: new Map(),

  async init(kernel) {
    console.log("[Guardián] ▶ Inicializando...");

    kernel.on("paciente:seleccionado", (evt) => {
      const payload = evt.payload || {};
      const subjectId = payload.subject_id || payload.paciente?.subject_id || payload.subject?.subject_id;
      this._alSeleccionarPaciente(subjectId);
    });

    kernel.on("savia:tronco:informe-kimi", (evt) => {
      this._acumularCaso(evt.payload);
    });

    console.log("[Guardián] ✓ Suscrito a 2 eventos");
  },

  /* ═══════════════════════════════════════════════════════════
     AL SELECCIONAR PACIENTE
     ═══════════════════════════════════════════════════════════ */
  async _alSeleccionarPaciente(subjectId) {
    if (!subjectId) {
      console.warn("[Guardián] Sin subject_id al seleccionar paciente");
      return;
    }

    console.log(`[Guardián] 🔍 Consultando historial: ${subjectId}`);

    const historial = await this._cargarHistorial(subjectId);

    if (!historial || !historial.total_casos || historial.total_casos === 0) {
      console.log(`[Guardián] 🆕 Paciente nuevo: ${subjectId}`);
      try {
        await SAVIA.enviar({
          de: this.id,
          tipo: "savia:guardian:paciente-nuevo",
          flujo: "descendente",
          payload: { subject_id: subjectId }
        });
      } catch (e) {
        console.warn("[Guardián] Error emitiendo paciente-nuevo:", e);
      }
    } else {
      console.log(`[Guardián] 🩸 Historial encontrado: ${historial.total_casos} caso(s)`);
      try {
        await SAVIA.enviar({
          de: this.id,
          tipo: "savia:guardian:historial-paciente",
          flujo: "descendente",
          payload: { ...historial, subject_id: subjectId }
        });
      } catch (e) {
        console.warn("[Guardián] Error emitiendo historial:", e);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     ACUMULAR CASO
     ═══════════════════════════════════════════════════════════ */
  async _acumularCaso(payload) {
    if (!payload || !payload.subject_id || !payload.case_id) {
      console.warn("[Guardián] Payload incompleto para acumular:", {
        subject_id: payload?.subject_id,
        case_id: payload?.case_id
      });
      return;
    }

    const subjectId = payload.subject_id;
    const caseId = payload.case_id;
    const origen = payload.origen || "desconocido";

    console.log(`[Guardián] 📥 Acumulando caso ${caseId} para ${subjectId}`);

    // 1) Cargar registro actual o crear uno nuevo
    let registro = await this._cargarHistorial(subjectId);

    if (!registro) {
      registro = {
        subject_id: subjectId,
        historial: [],
        tendencias: {},
        alertas: [],
        total_casos: 0,
        total_tamizajes: 0,
        total_consultas: 0,
        ultimo_riesgo: null,
        ultima_actualizacion: null
      };
    }

    // 2) Evitar duplicados
    if (registro.historial.some(c => c.case_id === caseId)) {
      console.log(`[Guardián] ⏭️ Caso ya acumulado: ${caseId}`);
      return;
    }

    // 3) Añadir el nuevo caso
    const nuevoCaso = {
      case_id: caseId,
      tipo: origen,
      fecha: new Date().toISOString().slice(0, 10),
      contexto_id: `SAV-${origen === "tamizaje" ? "TAMIZAJE" : "CONSULTA"}-${caseId}`,
      datos: payload.datos || payload.raw || {},
      informe_kimi: {
        narrativa: payload.narrativa || null,
        json_estructurado: payload.json_estructurado || null,
        riesgo_global: payload.riesgo || { nivel: "MODERADO" }
      },
      interconsultas_ejecutadas: payload.interconsultas_ejecutadas || []
    };

    registro.historial.push(nuevoCaso);

    // 4) Recalcular totales
    registro.total_casos = registro.historial.length;
    registro.total_tamizajes = registro.historial.filter(c => c.tipo === "tamizaje").length;
    registro.total_consultas = registro.historial.filter(c => c.tipo === "consulta").length;
    registro.ultimo_riesgo = nuevoCaso.informe_kimi?.riesgo_global?.nivel || "MODERADO";
    registro.ultima_actualizacion = new Date().toISOString();

    // 5) Recalcular tendencias
    registro.tendencias = this._calcularTendencias(registro.historial);

    // 6) Detectar nuevas alertas
    const alertasNuevas = this._detectarAlertas(registro, nuevoCaso);
    const alertasExistentes = registro.alertas || [];
    const alertasFinales = [...alertasExistentes];

    alertasNuevas.forEach(a => {
      if (!alertasFinales.some(x => x.tipo === a.tipo)) {
        alertasFinales.push(a);
        console.log(`[Guardián] ⚠️ Nueva alerta: ${a.tipo} - ${a.mensaje}`);
      }
    });
    registro.alertas = alertasFinales;

    // 7) Persistir
    await this._persistirHistorial(registro);

    // 8) Emitir actualización
    try {
      await SAVIA.enviar({
        de: this.id,
        tipo: "savia:guardian:actualizada",
        flujo: "descendente",
        payload: {
          subject_id: subjectId,
          case_id: caseId,
          total_casos: registro.total_casos,
          ultimo_riesgo: registro.ultimo_riesgo
        }
      });
    } catch (e) {
      console.warn("[Guardián] Error emitiendo actualizada:", e);
    }

    // 9) Emitir alertas nuevas
    if (alertasNuevas.length > 0) {
      try {
        await SAVIA.enviar({
          de: this.id,
          tipo: "savia:guardian:alerta-nueva",
          flujo: "descendente",
          payload: { subject_id: subjectId, alertas: alertasNuevas }
        });
      } catch (e) {
        console.warn("[Guardián] Error emitiendo alerta-nueva:", e);
      }
    }

    console.log(`[Guardián] ✅ Caso acumulado. Total: ${registro.total_casos} caso(s)`);
  },

  /* ═══════════════════════════════════════════════════════════
     TENDENCIAS
     ═══════════════════════════════════════════════════════════ */
  _calcularTendencias(historial) {
    const tendencias = {
      peso: [],
      presion_sistolica: [],
      presion_diastolica: [],
      glucosa: [],
      hba1c: [],
      imc: [],
      riesgo_global: []
    };

    historial.forEach(caso => {
      const fecha = caso.fecha;
      const d = caso.datos || {};
      const sv = d.signos_vitales || d.clinica?.signos_vitales || {};
      const labs = d.labs || {};

      if (sv.peso_kg) {
        tendencias.peso.push({ fecha, valor: sv.peso_kg, caso: caso.case_id });
      }
      if (sv.presion_sistolica_mmhg) {
        tendencias.presion_sistolica.push({ fecha, valor: sv.presion_sistolica_mmhg });
      }
      if (sv.presion_diastolica_mmhg) {
        tendencias.presion_diastolica.push({ fecha, valor: sv.presion_diastolica_mmhg });
      }
      if (sv.imc) {
        tendencias.imc.push({ fecha, valor: sv.imc });
      }
      if (labs.glucosa) {
        tendencias.glucosa.push({ fecha, valor: labs.glucosa });
      }
      if (labs.hba1c) {
        tendencias.hba1c.push({ fecha, valor: labs.hba1c });
      }
      if (caso.informe_kimi?.riesgo_global?.nivel) {
        tendencias.riesgo_global.push({ fecha, nivel: caso.informe_kimi.riesgo_global.nivel });
      }
    });

    return tendencias;
  },

  /* ═══════════════════════════════════════════════════════════
     ALERTAS
     ═══════════════════════════════════════════════════════════ */
  _detectarAlertas(registro, nuevoCaso) {
    const alertas = [];
    const t = registro.tendencias || {};

    // HTA progresiva
    if (t.presion_sistolica?.length >= 2) {
      const n = t.presion_sistolica.length;
      const anterior = t.presion_sistolica[n - 2].valor;
      const actual = t.presion_sistolica[n - 1].valor;
      if (actual - anterior > 5) {
        alertas.push({
          tipo: "tendencia_hta",
          severidad: "alta",
          mensaje: `Presión sistólica subió de ${anterior} a ${actual} mmHg`,
          fecha_deteccion: new Date().toISOString()
        });
      }
    }

    // Prediabetes progresiva
    if (t.hba1c?.length >= 2) {
      const n = t.hba1c.length;
      const anterior = t.hba1c[n - 2].valor;
      const actual = t.hba1c[n - 1].valor;
      if (actual - anterior > 0.2) {
        alertas.push({
          tipo: "prediabetes_progresiva",
          severidad: "media",
          mensaje: `HbA1c subió de ${anterior} a ${actual}%`,
          fecha_deteccion: new Date().toISOString()
        });
      }
    }

    // Riesgo elevado
    const nivel = nuevoCaso.informe_kimi?.riesgo_global?.nivel;
    if (nivel === "ALTO" || nivel === "MUY ALTO") {
      alertas.push({
        tipo: "riesgo_elevado",
        severidad: "alta",
        mensaje: `Nivel de riesgo ${nivel}`,
        fecha_deteccion: new Date().toISOString()
      });
    }

    // Pérdida de peso no intencional
    if (t.peso?.length >= 2) {
      const n = t.peso.length;
      const anterior = t.peso[n - 2].valor;
      const actual = t.peso[n - 1].valor;
      if (anterior - actual > 5) {
        alertas.push({
          tipo: "perdida_peso",
          severidad: "media",
          mensaje: `Peso bajó de ${anterior} a ${actual} kg`,
          fecha_deteccion: new Date().toISOString()
        });
      }
    }

    return alertas;
  },

  /* ═══════════════════════════════════════════════════════════
     PERSISTENCIA
     ═══════════════════════════════════════════════════════════ */
  async _persistirHistorial(registro) {
    if (!window.supabaseClient) {
      console.warn("[Guardián] Sin Supabase, usando cache local");
      this._cache.set(registro.subject_id, registro);
      return;
    }

    try {
      const { error } = await window.supabaseClient
        .from("savia_pacientes")
        .upsert({
          subject_id: registro.subject_id,
          historial: registro.historial,
          tendencias: registro.tendencias,
          alertas: registro.alertas,
          total_casos: registro.total_casos,
          total_tamizajes: registro.total_tamizajes,
          total_consultas: registro.total_consultas,
          ultimo_riesgo: registro.ultimo_riesgo,
          ultima_actualizacion: registro.ultima_actualizacion,
          updated_at: new Date().toISOString()
        }, { onConflict: "subject_id" });

      if (error) {
        console.warn("[Guardián] Error persistiendo:", error.message);
      } else {
        console.log(`[Guardián] 💾 Historial persistido: ${registro.subject_id}`);
      }

      this._cache.set(registro.subject_id, registro);
    } catch (e) {
      console.warn("[Guardián] Excepción persistiendo:", e.message);
      this._cache.set(registro.subject_id, registro);
    }
  },

  async _cargarHistorial(subjectId) {
    if (!subjectId) return null;

    // Cache primero
    if (this._cache.has(subjectId)) {
      return this._cache.get(subjectId);
    }

    if (!window.supabaseClient) return null;

    try {
      const { data, error } = await window.supabaseClient
        .from("savia_pacientes")
        .select("*")
        .eq("subject_id", subjectId)
        .maybeSingle();

      if (error) {
        console.warn("[Guardián] Error cargando:", error.message);
        return null;
      }

      if (data) {
        this._cache.set(subjectId, data);
      }
      return data;
    } catch (e) {
      console.warn("[Guardián] Excepción cargando:", e.message);
      return null;
    }
  },

  /* ═══════════════════════════════════════════════════════════
     API PÚBLICA
     ═══════════════════════════════════════════════════════════ */
  async consultarGuardian({ subject_id }) {
    return await this._cargarHistorial(subject_id);
  },

  async consultarTodosGuardian() {
    if (!window.supabaseClient) return [];
    try {
      const { data } = await window.supabaseClient
        .from("savia_pacientes")
        .select("*")
        .order("updated_at", { ascending: false });
      return data || [];
    } catch (e) {
      return [];
    }
  },

  async recibir(evt) { /* no-op */ },
  async mount() { /* sin UI */ }
};

export default agenteGuardian;
