/**
 * ═══════════════════════════════════════════════════════════════════════
 * AGENTE COORDINADOR — Director Clínico del TRONCO
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Sprint 3 — Fase C
 * 
 * RESPONSABILIDADES:
 *   1. Escuchar SAVIA RAÍZ (contexto unificado de los 6 agentes de raíz)
 *   2. Extraer diagnóstico/plan/riesgo del informe Kimi (raw de SAVIA RAÍZ)
 *   3. Emitir SAVIA TRONCO (informe-kimi) con el análisis base
 *   4. Esperar decisión del médico sobre qué especialistas activar
 *   5. Si médico NO pide especialistas → emitir sin-interconsultas
 *   6. Si médico SÍ pide especialistas → emitir solicitar-analisis para cada uno
 *   7. Acumular respuestas de especialistas
 *   8. Consolidar plan base + aportes de especialistas
 *   9. Emitir SAVIA TRONCO (plan-integrado) con todo el análisis
 * 
 * @module agentes/tronco/coordinador
 * @version 2.0.0
 */

import SAVIA from "../../kernel/savia.js";
import MEMORIA from "../../kernel/memoria.js";

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════════════════════════ */

const TIPOS = {
  RAIZ_UNIFICADO: "savia:raiz:contexto-unificado",
  MEDICO_DECISION: "medico:decision-interconsultas",
  ESPECIALISTA_RESPUESTA: "especialista:respuesta",
  TRONCO_INFORME: "savia:tronco:informe-kimi",
  TRONCO_SIN_INTER: "savia:tronco:sin-interconsultas",
  TRONCO_PLAN: "savia:tronco:plan-integrado",
  SOLICITAR_ANALISIS: "savia:solicitar-analisis"
};

const TIMEOUT_ESPERA_ESPECIALISTAS_MS = 5 * 60 * 1000; // 5 minutos

/* ═══════════════════════════════════════════════════════════════════════
   ESTADO INTERNO
   ═══════════════════════════════════════════════════════════════════════ */

const ESTADO = {
  contextosActivos: new Map(),
  informesEmitidos: 0,
  planesIntegrados: 0,
  errores: [],
  iniciado_at: null
};

/* ═══════════════════════════════════════════════════════════════════════
   AGENTE
   ═══════════════════════════════════════════════════════════════════════ */

export const agenteCoordinador = {
  /* ─── METADATOS ─── */
  id: "agente-coordinador",
  nombre: "Coordinador Clínico",
  capa: "tronco",
  tipo: "tronco",
  dominio: "clinica",
  version: "2.0.0",
  descripcion: "Director clínico que orquesta el flujo de interconsultas",

  suscripciones: [
    TIPOS.RAIZ_UNIFICADO,
    TIPOS.MEDICO_DECISION,
    TIPOS.ESPECIALISTA_RESPUESTA
  ],

  /* ─── INICIALIZACIÓN ─── */
  async init() {
    console.log("[Coordinador] ▶ Inicializando agente...");
    ESTADO.iniciado_at = new Date().toISOString();
    ESTADO.informesEmitidos = 0;
    ESTADO.planesIntegrados = 0;
    ESTADO.errores = [];
    ESTADO.contextosActivos.clear();
    console.log("[Coordinador] ✓ Agente listo");
    return true;
  },

  /* ─── MANEJADOR DE EVENTOS ─── */
  async onEvento(evento) {
    const { tipo, payload } = evento;

    try {
      switch (tipo) {
        case TIPOS.RAIZ_UNIFICADO:
          return await this._procesarSaviaRaiz(payload);

        case TIPOS.MEDICO_DECISION:
          return await this._procesarDecisionMedico(payload);

        case TIPOS.ESPECIALISTA_RESPUESTA:
          return await this._acumularRespuestaEspecialista(payload);

        default:
          return null;
      }
    } catch (e) {
      console.error(`[Coordinador] ✗ Error procesando ${tipo}:`, e);
      ESTADO.errores.push({
        tipo,
        mensaje: e.message,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  },

  /* ─── PROCESO 1: SAVIA RAÍZ → SAVIA TRONCO ─── */
  async _procesarSaviaRaiz(savia) {
    const inicio = Date.now();
    const contextoId = savia?.contexto_id;

    if (!contextoId) {
      console.warn("[Coordinador] SAVIA RAÍZ sin contexto_id, ignorando");
      return null;
    }

    if (!savia.case_id) {
      console.warn("[Coordinador] SAVIA RAÍZ sin case_id, ignorando");
      return null;
    }

    console.log(`[Coordinador] ▶ Procesando SAVIA RAÍZ: ${contextoId}`);

    const informeKimi = this._extraerInformeKimi(savia);

    const registro = {
      savia,
      case_id: savia.case_id,
      subject_id: savia.subject?.subject_id || savia.raw?.subject?.subject_id,
      origen: savia.origen || "desconocido",
      informeKimi,
      timestamp: new Date().toISOString(),
      interconsultasSugeridas: informeKimi.interconsultas_sugeridas || [],
      respuestasEspecialistas: [],
      interconsultasPendientes: 0,
      decisionMedico: null,
      timeoutId: null
    };

    ESTADO.contextosActivos.set(contextoId, registro);

    const resultado = await this._emitirInformeKimi(contextoId, registro);

    const duracion = Date.now() - inicio;
    console.log(`[Coordinador] ✓ Informe TRONCO emitido en ${duracion}ms`);
    console.log(`[Coordinador]   → Interconsultas sugeridas: ${registro.interconsultasSugeridas.length}`);

    return resultado;
  },

  async _emitirInformeKimi(contextoId, registro) {
    const payload = {
      case_id: registro.case_id,
      subject_id: registro.subject_id,
      origen: registro.origen,
      diagnostico: registro.informeKimi.diagnostico,
      diagnostico_diferencial: registro.informeKimi.diagnostico_diferencial,
      plan: registro.informeKimi.plan,
      riesgo: registro.informeKimi.riesgo,
      metricas: registro.informeKimi.metricas,
      findings: registro.informeKimi.findings,
      interconsultas_sugeridas: registro.interconsultasSugeridas,
      emitido_at: new Date().toISOString()
    };

    const resultado = await SAVIA.emitirContexto(
      contextoId,
      TIPOS.TRONCO_INFORME,
      payload,
      { de: this.id, flujo: "descendente" }
    );

    ESTADO.informesEmitidos++;
    return resultado;
  },

  /* ─── EXTRACCIÓN DEL INFORME KIMI ─── */
  _extraerInformeKimi(savia) {
    const raw = savia.raw || {};
    const jsonEstructurado = raw.json_estructurado || raw._json || {};

    if (jsonEstructurado && Object.keys(jsonEstructurado).length > 0) {
      console.log("[Coordinador]   Extrayendo de JSON estructurado");
      return {
        diagnostico: jsonEstructurado.diagnosticos || [],
        diagnostico_diferencial: jsonEstructurado.diagnostico_diferencial || [],
        plan: jsonEstructurado.plan || {},
        riesgo: jsonEstructurado.riesgo_global || { nivel: "MODERADO", score: 0 },
        interconsultas_sugeridas: jsonEstructurado.interconsultas_sugeridas || [],
        metricas: jsonEstructurado.metrics || [],
        findings: jsonEstructurado.findings || {},
        banderas_rojas: jsonEstructurado.banderas_rojas || []
      };
    }

    console.log("[Coordinador]   JSON estructurado no disponible, parseando narrativa");
    const narrativa = raw.narrativa_completa || raw.narrativa || savia.narrativa || "";
    
    return {
      diagnostico: this._parsearDiagnosticos(narrativa),
      diagnostico_diferencial: [],
      plan: { farmacologico: [], no_farmacologico: [], metas: [], laboratorios: [], derivaciones: [], seguimiento: {} },
      riesgo: this._parsearRiesgo(narrativa),
      interconsultas_sugeridas: [],
      metricas: [],
      findings: {},
      banderas_rojas: []
    };
  },

  _parsearDiagnosticos(narrativa) {
    if (!narrativa) return [];
    const diagnosticos = [];
    const regexCie10 = /([A-Z]\d{2}(?:\.\d{1,2})?)\s*[-:–]\s*([^\n.]+)/g;
    let match;
    while ((match = regexCie10.exec(narrativa)) !== null) {
      diagnosticos.push({
        cie10: match[1],
        descripcion: match[2].trim(),
        tipo: diagnosticos.length === 0 ? "principal" : "secundario",
        certeza: "clinico"
      });
    }
    return diagnosticos;
  },

  _parsearRiesgo(narrativa) {
    if (!narrativa) return { nivel: "MODERADO", score: 0 };
    const upper = narrativa.toUpperCase();
    if (upper.includes("MUY ALTO")) return { nivel: "MUY ALTO", score: 10 };
    if (upper.includes("ALTO")) return { nivel: "ALTO", score: 7 };
    if (upper.includes("MODERADO")) return { nivel: "MODERADO", score: 5 };
    if (upper.includes("BAJO")) return { nivel: "BAJO", score: 2 };
    return { nivel: "MODERADO", score: 5 };
  },

  /* ─── PROCESO 2: DECISIÓN DEL MÉDICO ─── */
  async _procesarDecisionMedico(payload) {
    const { contexto_id, interconsultas_autorizadas, medico_id } = payload;

    if (!contexto_id) {
      console.warn("[Coordinador] Decisión sin contexto_id, ignorando");
      return null;
    }

    const registro = ESTADO.contextosActivos.get(contexto_id);
    if (!registro) {
      console.warn(`[Coordinador] Contexto no encontrado: ${contexto_id}`);
      return null;
    }

    console.log(`[Coordinador] ▶ Decisión del médico recibida: ${contexto_id}`);
    console.log(`[Coordinador]   → Interconsultas autorizadas: ${interconsultas_autorizadas?.length || 0}`);

    registro.decisionMedico = {
      interconsultas_autorizadas: interconsultas_autorizadas || [],
      medico_id: medico_id || null,
      timestamp: new Date().toISOString()
    };

    if (!interconsultas_autorizadas || interconsultas_autorizadas.length === 0) {
      return await this._emitirSinInterconsultas(contexto_id, registro);
    }

    return await this._solicitarAnalisisEspecialistas(contexto_id, registro, interconsultas_autorizadas);
  },

  async _emitirSinInterconsultas(contextoId, registro) {
    console.log(`[Coordinador] → Emitiendo sin-interconsultas: ${contextoId}`);

    const payload = {
      case_id: registro.case_id,
      subject_id: registro.subject_id,
      origen: registro.origen,
      diagnostico: registro.informeKimi.diagnostico,
      plan: registro.informeKimi.plan,
      riesgo: registro.informeKimi.riesgo,
      razon: "Medico decidio no solicitar interconsultas",
      decision_at: new Date().toISOString()
    };

    const resultado = await SAVIA.emitirContexto(
      contextoId,
      TIPOS.TRONCO_SIN_INTER,
      payload,
      { de: this.id, flujo: "descendente" }
    );

    ESTADO.contextosActivos.delete(contextoId);
    ESTADO.planesIntegrados++;

    return resultado;
  },

  async _solicitarAnalisisEspecialistas(contextoId, registro, interconsultasAutorizadas) {
    console.log(`[Coordinador] → Solicitando análisis a ${interconsultasAutorizadas.length} especialistas`);

    registro.respuestasEspecialistas = [];
    registro.interconsultasPendientes = interconsultasAutorizadas.length;

    registro.timeoutId = setTimeout(() => {
      this._manejarTimeoutEspecialistas(contextoId);
    }, TIMEOUT_ESPERA_ESPECIALISTAS_MS);

    for (const item of interconsultasAutorizadas) {
      const especialistaKey = typeof item === "string" ? item : item.especialista;
      const prioridad = item.prioridad || "media";
      const justificacion = item.justificacion || "";

      const payload = {
        case_id: registro.case_id,
        subject_id: registro.subject_id,
        contexto_id: contextoId,
        especialista: especialistaKey,
        prioridad,
        justificacion,
        savia_raw: registro.savia,
        informe_kimi: registro.informeKimi,
        solicitado_at: new Date().toISOString()
      };

      await SAVIA.emitirContexto(
        contextoId,
        TIPOS.SOLICITAR_ANALISIS,
        payload,
        { de: this.id, para: `especialista-${especialistaKey}`, flujo: "descendente" }
      );

      console.log(`[Coordinador]   → Solicitado: ${especialistaKey} (${prioridad})`);
    }

    return { solicitados: interconsultasAutorizadas.length };
  },

  /* ─── PROCESO 3: ACUMULAR RESPUESTAS ─── */
  async _acumularRespuestaEspecialista(payload) {
    const { contexto_id, especialista, resultado } = payload;

    if (!contexto_id) {
      console.warn("[Coordinador] Respuesta sin contexto_id");
      return null;
    }

    const registro = ESTADO.contextosActivos.get(contexto_id);
    if (!registro) {
      console.warn(`[Coordinador] Contexto no encontrado: ${contexto_id}`);
      return null;
    }

    const yaExiste = registro.respuestasEspecialistas.find(r => r.especialista === especialista);
    if (yaExiste) {
      console.log(`[Coordinador] Respuesta duplicada de ${especialista}, ignorando`);
      return null;
    }

    registro.respuestasEspecialistas.push({
      especialista,
      resultado,
      recibida_at: new Date().toISOString()
    });

    registro.interconsultasPendientes--;

    console.log(`[Coordinador] ✓ Respuesta de ${especialista}. Pendientes: ${registro.interconsultasPendientes}`);

    if (registro.interconsultasPendientes <= 0) {
      clearTimeout(registro.timeoutId);
      return await this._emitirPlanIntegrado(contexto_id, registro);
    }

    return { pendientes: registro.interconsultasPendientes };
  },

  async _manejarTimeoutEspecialistas(contextoId) {
    const registro = ESTADO.contextosActivos.get(contextoId);
    if (!registro) return;

    console.warn(`[Coordinador] ⏱️ Timeout esperando especialistas: ${contextoId}`);
    await this._emitirPlanIntegrado(contextoId, registro, true);
  },

  /* ─── PROCESO 4: EMITIR PLAN INTEGRADO ─── */
  async _emitirPlanIntegrado(contextoId, registro, parcial = false) {
    console.log(`[Coordinador] → Emitiendo plan-integrado: ${contextoId}${parcial ? " (PARCIAL)" : ""}`);

    const planConsolidado = this._consolidarPlan(
      registro.informeKimi.plan,
      registro.respuestasEspecialistas
    );

    const payload = {
      case_id: registro.case_id,
      subject_id: registro.subject_id,
      origen: registro.origen,
      diagnostico: registro.informeKimi.diagnostico,
      diagnostico_diferencial: registro.informeKimi.diagnostico_diferencial,
      plan_base: registro.informeKimi.plan,
      plan_integrado: planConsolidado,
      riesgo: registro.informeKimi.riesgo,
      metricas: registro.informeKimi.metricas,
      findings: registro.informeKimi.findings,
      interconsultas_ejecutadas: registro.respuestasEspecialistas,
      interconsultas_sugeridas: registro.interconsultasSugeridas,
      total_especialistas: registro.respuestasEspecialistas.length,
      parcial,
      emitido_at: new Date().toISOString()
    };

    const resultado = await SAVIA.emitirContexto(
      contextoId,
      TIPOS.TRONCO_PLAN,
      payload,
      { de: this.id, flujo: "descendente" }
    );

    await this._persistirEnMemoria(registro, planConsolidado);

    ESTADO.planesIntegrados++;
    ESTADO.contextosActivos.delete(contextoId);

    console.log(`[Coordinador] ✓ Plan integrado emitido. Especialistas: ${registro.respuestasEspecialistas.length}`);

    return resultado;
  },

  /* ─── CONSOLIDACIÓN DE PLAN ─── */
  _consolidarPlan(planBase, respuestasEspecialistas) {
    const consolidado = JSON.parse(JSON.stringify(planBase || {}));

    consolidado.farmacologico = consolidado.farmacologico || [];
    consolidado.no_farmacologico = consolidado.no_farmacologico || [];
    consolidado.metas = consolidado.metas || [];
    consolidado.laboratorios = consolidado.laboratorios || [];
    consolidado.derivaciones = consolidado.derivaciones || [];

    for (const resp of respuestasEspecialistas) {
      const r = resp.resultado;
      if (!r || r.error) continue;
      const especialista = resp.especialista;

      if (Array.isArray(r.tratamiento)) {
        for (const t of r.tratamiento) {
          if (t.farmaco && !consolidado.farmacologico.find(f => f.farmaco === t.farmaco)) {
            consolidado.farmacologico.push({ ...t, aportado_por: especialista });
          }
        }
      }

      if (r.plan_alimentario) {
        const intervencion = typeof r.plan_alimentario === "string" 
          ? r.plan_alimentario 
          : JSON.stringify(r.plan_alimentario);
        consolidado.no_farmacologico.push({ categoria: "nutricion", intervencion, aportado_por: especialista });
      }

      if (r.plan_ejercicio) {
        consolidado.no_farmacologico.push({ categoria: "ejercicio", intervencion: r.plan_ejercicio, aportado_por: especialista });
      }

      if (Array.isArray(r.recomendaciones)) {
        for (const rec of r.recomendaciones) {
          consolidado.no_farmacologico.push({
            categoria: "general",
            intervencion: typeof rec === "string" ? rec : (rec.texto || JSON.stringify(rec)),
            aportado_por: especialista
          });
        }
      }

      if (Array.isArray(r.metas)) {
        for (const m of r.metas) {
          const metrica = m.metrica || m.nombre;
          if (metrica && !consolidado.metas.find(x => x.metrica === metrica)) {
            consolidado.metas.push({ ...m, metrica, aportado_por: especialista });
          }
        }
      }

      if (Array.isArray(r.laboratorios_seguimiento)) {
        for (const l of r.laboratorios_seguimiento) {
          const nombre = typeof l === "string" ? l : (l.estudio || l.nombre);
          if (nombre && !consolidado.laboratorios.find(x => (x.estudio || x) === nombre)) {
            consolidado.laboratorios.push(typeof l === "string" ? { estudio: l } : l);
          }
        }
      }

      if (Array.isArray(r.banderas_rojas) && r.banderas_rojas.length > 0) {
        consolidado.banderas_rojas = consolidado.banderas_rojas || [];
        for (const br of r.banderas_rojas) {
          consolidado.banderas_rojas.push({
            descripcion: typeof br === "string" ? br : JSON.stringify(br),
            aportado_por: especialista
          });
        }
      }
    }

    consolidado._consolidado = true;
    consolidado._especialistas_involucrados = respuestasEspecialistas
      .filter(r => !r.resultado?.error)
      .map(r => r.especialista);
    consolidado._consolidado_at = new Date().toISOString();

    return consolidado;
  },

  /* ─── PERSISTENCIA ─── */
  async _persistirEnMemoria(registro, planConsolidado) {
    try {
      if (!MEMORIA || typeof MEMORIA.registrar !== "function") return;
      await MEMORIA.registrar({
        contexto_id: registro.savia?.contexto_id,
        case_id: registro.case_id,
        subject_id: registro.subject_id,
        tipo: "tronco_plan_integrado",
        diagnostico: registro.informeKimi.diagnostico,
        riesgo: registro.informeKimi.riesgo,
        num_interconsultas: registro.respuestasEspecialistas.length,
        especialistas: planConsolidado._especialistas_involucrados,
        timestamp: new Date().toISOString()
      });
      console.log("[Coordinador] ✓ Persistido en memoria colectiva");
    } catch (e) {
      console.warn("[Coordinador] Error persistiendo en memoria:", e);
    }
  },

  /* ─── API PÚBLICA ─── */
  getEstado() {
    return {
      id: this.id,
      version: this.version,
      informesEmitidos: ESTADO.informesEmitidos,
      planesIntegrados: ESTADO.planesIntegrados,
      contextosActivos: ESTADO.contextosActivos.size,
      errores: ESTADO.errores.length,
      iniciado_at: ESTADO.iniciado_at
    };
  },

  obtenerContexto(contextoId) {
    return ESTADO.contextosActivos.get(contextoId) || null;
  },

  listarContextos() {
    return Array.from(ESTADO.contextosActivos.entries()).map(([id, ctx]) => ({
      contexto_id: id,
      case_id: ctx.case_id,
      subject_id: ctx.subject_id,
      interconsultas_pendientes: ctx.interconsultasPendientes,
      tiene_decision_medico: !!ctx.decisionMedico,
      timestamp: ctx.timestamp
    }));
  },

  limpiarContexto(contextoId) {
    const registro = ESTADO.contextosActivos.get(contextoId);
    if (registro?.timeoutId) clearTimeout(registro.timeoutId);
    return ESTADO.contextosActivos.delete(contextoId);
  }
};

export default agenteCoordinador;
