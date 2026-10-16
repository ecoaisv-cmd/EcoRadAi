/**
 * ═══════════════════════════════════════════════════════════════════════
 * AGENTE INVESTIGADOR — Analytics Clínico del TRONCO
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Sprint 3 — Fase C
 * 
 * RESPONSABILIDADES:
 *   1. Escuchar planes integrados y sin interconsultas (casos completados)
 *   2. Anonimizar datos clínicos
 *   3. Registrar en memoria colectiva
 *   4. Detectar patrones epidemiológicos
 *   5. Emitir insights a SAVIA
 * 
 * @module agentes/tronco/investigador
 * @version 1.0.0
 */

import SAVIA from "../../kernel/savia.js";
import MEMORIA from "../../kernel/memoria.js";

const TIPOS_ESCUCHAR = [
  "savia:tronco:sin-interconsultas",
  "savia:tronco:plan-integrado",
  "savia:fruto:documentos-listos",
  "savia:fruto:paciente-feedback"
];

const TIPOS_EMITIR = {
  INSIGHT: "savia:investigador:insight",
  ALERTA: "savia:investigador:alerta-epidemiologica"
};

const UMBRAL_ALERTA = 5;
const UMBRAL_INSIGHT = 10;

const ESTADO = {
  planesProcesados: 0,
  patronesDetectados: [],
  contadorPorZona: {},
  contadorPorDiagnostico: {},
  ultimoAnalisis: null,
  iniciado_at: null
};

export const agenteInvestigador = {
  /* ─── METADATOS ─── */
  id: "agente-investigador",
  nombre: "Investigador Clínico",
  capa: "tronco",
  tipo: "tronco",
  dominio: "analytics",
  version: "1.0.0",
  descripcion: "Analytics clínico que aprende de cada caso completado",

  suscripciones: TIPOS_ESCUCHAR,

  /* ─── INICIALIZACIÓN ─── */
  async init() {
    console.log("[Investigador] ▶ Inicializando agente...");
    ESTADO.iniciado_at = new Date().toISOString();
    ESTADO.planesProcesados = 0;
    ESTADO.patronesDetectados = [];
    ESTADO.contadorPorZona = {};
    ESTADO.contadorPorDiagnostico = {};
    console.log("[Investigador] ✓ Agente listo");
    return true;
  },

  /* ─── MANEJADOR ─── */
  async onEvento(evento) {
    const { tipo, payload } = evento;

    try {
      if (!TIPOS_ESCUCHAR.includes(tipo)) return null;
      return await this._procesarCasoCompletado(tipo, payload);
    } catch (e) {
      console.error(`[Investigador] ✗ Error procesando ${tipo}:`, e);
      return null;
    }
  },

  /* ─── PROCESO PRINCIPAL ─── */
  async _procesarCasoCompletado(tipo, payload) {
    const inicio = Date.now();

    const datos = this._extraerDatosAnonimos(tipo, payload);

    await this._registrarEnMemoria(datos);

    this._actualizarContadores(datos);

    if (ESTADO.planesProcesados % 5 === 0) {
      await this._analizarPatrones();
    }

    ESTADO.planesProcesados++;
    ESTADO.ultimoAnalisis = new Date().toISOString();

    const duracion = Date.now() - inicio;
    console.log(`[Investigador] ✓ Caso ${ESTADO.planesProcesados} procesado en ${duracion}ms`);

    return {
      procesado: true,
      total_planes: ESTADO.planesProcesados,
      patrones_detectados: ESTADO.patronesDetectados.length
    };
  },

  /* ─── ANONIMIZACIÓN ─── */
  _extraerDatosAnonimos(tipo, payload) {
    const plan = payload.plan_integrado || payload.plan_base || payload.plan || {};
    const diagnostico = payload.diagnostico || [];
    const riesgo = payload.riesgo || { nivel: "MODERADO" };
    const zona = payload.zona || payload.departamento || "desconocida";

    return {
      tipo_flujo: tipo.replace("savia:tronco:", ""),
      riesgo: riesgo.nivel,
      riesgo_score: riesgo.score || 0,
      diagnosticos_cie10: diagnostico.map(d => d.cie10 || d.codigo).filter(Boolean),
      num_diagnosticos: diagnostico.length,
      num_farmacos: (plan.farmacologico || []).length,
      num_intervenciones: (plan.no_farmacologico || []).length,
      num_metas: (plan.metas || []).length,
      num_derivaciones: (plan.derivaciones || []).length,
      zona,
      consolidado: plan._consolidado || false,
      especialistas_involucrados: (plan._especialistas_involucrados || []).length,
      timestamp: new Date().toISOString()
    };
  },

  /* ─── PERSISTENCIA ─── */
  async _registrarEnMemoria(datos) {
    try {
      if (MEMORIA && typeof MEMORIA.registrarAnalisis === "function") {
        await MEMORIA.registrarAnalisis({
          tipo: "tronco_completado",
          datos,
          timestamp: new Date().toISOString()
        });
      }

      if (window.supabaseClient) {
        try {
          await window.supabaseClient.from("memoria_colectiva").insert({
            tipo: "tronco_completado",
            datos,
            created_at: new Date().toISOString()
          });
        } catch (e) { /* silencioso */ }
      }
    } catch (e) {
      console.warn("[Investigador] Error registrando en memoria:", e);
    }
  },

  /* ─── CONTADORES ─── */
  _actualizarContadores(datos) {
    const zona = datos.zona || "desconocida";
    if (!ESTADO.contadorPorZona[zona]) {
      ESTADO.contadorPorZona[zona] = { total: 0, por_riesgo: {} };
    }
    ESTADO.contadorPorZona[zona].total++;
    ESTADO.contadorPorZona[zona].por_riesgo[datos.riesgo] = 
      (ESTADO.contadorPorZona[zona].por_riesgo[datos.riesgo] || 0) + 1;

    for (const cie10 of datos.diagnosticos_cie10) {
      if (!ESTADO.contadorPorDiagnostico[cie10]) {
        ESTADO.contadorPorDiagnostico[cie10] = 0;
      }
      ESTADO.contadorPorDiagnostico[cie10]++;
    }
  },

  /* ─── ANÁLISIS DE PATRONES ─── */
  async _analizarPatrones() {
    console.log("[Investigador] ▶ Analizando patrones...");
    const patrones = [];

    for (const [zona, data] of Object.entries(ESTADO.contadorPorZona)) {
      const riesgoAlto = (data.por_riesgo["ALTO"] || 0) + (data.por_riesgo["MUY ALTO"] || 0);
      const ratio = data.total > 0 ? riesgoAlto / data.total : 0;
      if (data.total >= UMBRAL_INSIGHT && ratio >= 0.5) {
        patrones.push({
          tipo: "riesgo_alto_frecuente",
          zona,
          total_casos: data.total,
          ratio_riesgo_alto: ratio,
          severidad: "media"
        });
      }
    }

    for (const [cie10, count] of Object.entries(ESTADO.contadorPorDiagnostico)) {
      if (count >= UMBRAL_ALERTA) {
        patrones.push({
          tipo: "diagnostico_frecuente",
          cie10,
          count,
          severidad: count >= UMBRAL_INSIGHT ? "alta" : "media"
        });
      }
    }

    const nuevosPatrones = patrones.filter(p => 
      !ESTADO.patronesDetectados.find(existente => 
        existente.tipo === p.tipo && 
        existente.zona === p.zona && 
        existente.cie10 === p.cie10
      )
    );

    if (nuevosPatrones.length > 0) {
      ESTADO.patronesDetectados.push(...nuevosPatrones);
      await this._emitirInsights(nuevosPatrones);
      console.log(`[Investigador] ✓ ${nuevosPatrones.length} nuevos patrones detectados`);
    }
  },

  async _emitirInsights(patrones) {
    try {
      await SAVIA.enviar({
        de: this.id,
        tipo: TIPOS_EMITIR.INSIGHT,
        flujo: "lateral",
        payload: {
          patrones,
          total_planes_procesados: ESTADO.planesProcesados,
          timestamp: new Date().toISOString()
        }
      });

      const criticos = patrones.filter(p => p.severidad === "alta");
      if (criticos.length > 0) {
        await this._emitirAlerta(criticos);
      }
    } catch (e) {
      console.warn("[Investigador] Error emitiendo insights:", e);
    }
  },

  async _emitirAlerta(patronesCriticos) {
    try {
      await SAVIA.enviar({
        de: this.id,
        tipo: TIPOS_EMITIR.ALERTA,
        flujo: "lateral",
        payload: {
          alertas: patronesCriticos,
          timestamp: new Date().toISOString()
        }
      });
    } catch (e) {
      console.warn("[Investigador] Error emitiendo alertas:", e);
    }
  },

  /* ─── API PÚBLICA ─── */
  getEstado() {
    return {
      id: this.id,
      version: this.version,
      planesProcesados: ESTADO.planesProcesados,
      patronesDetectados: ESTADO.patronesDetectados.length,
      ultimoAnalisis: ESTADO.ultimoAnalisis,
      iniciado_at: ESTADO.iniciado_at,
      zonasRegistradas: Object.keys(ESTADO.contadorPorZona).length,
      diagnosticosUnicos: Object.keys(ESTADO.contadorPorDiagnostico).length
    };
  },

  obtenerPatrones() {
    return [...ESTADO.patronesDetectados];
  },

  obtenerEstadisticasZona() {
    return JSON.parse(JSON.stringify(ESTADO.contadorPorZona));
  },

  obtenerTopDiagnosticos(limite = 10) {
    return Object.entries(ESTADO.contadorPorDiagnostico)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limite)
      .map(([cie10, count]) => ({ cie10, count }));
  }
};

export default agenteInvestigador;
