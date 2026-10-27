/**
 * ═══════════════════════════════════════════════════════════════════
 * SAVIA CONSOLIDADORA — CONSULTA
 * Capa: RAÍZ
 * Sprint 3 Fase F
 * ═══════════════════════════════════════════════════════════════════
 */

export const agenteConsolidadoraConsulta = {
  id: "agente-consolidadora-consulta",
  version: "1.0.0",
  nombre: "Consolidadora de Consulta",
  icono: "📦",
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
    "savia:consulta:contexto-unificado"
  ],

  eventos_suscritos: [
    "savia:aporte-paciente",
    "savia:aporte-subjetivo",
    "savia:aporte-examen-fisico",
    "savia:aporte-clinica-consulta",
    "savia:aporte-diagnosticos",
    "savia:aporte-laboratorio",
    "savia:aporte-social",
    "savia:consulta:solicitar-consolidacion"
  ],

  _aportes: {
    paciente: null,
    subjetivo: null,
    examen_fisico: null,
    clinica: null,
    diagnosticos: null,
    laboratorio: null,
    social: null
  },
  _caseIdActual: null,
  _consolidacionesRealizadas: 0,

  async init(kernel) {
    console.log("[Consolidadora-Consulta] ▶ Inicializando...");

    kernel.on("savia:aporte-paciente", (evt) => {
      this._recibirAporte("paciente", evt);
    });

    kernel.on("savia:aporte-subjetivo", (evt) => {
      this._recibirAporte("subjetivo", evt);
    });

    kernel.on("savia:aporte-examen-fisico", (evt) => {
      this._recibirAporte("examen_fisico", evt);
    });

    kernel.on("savia:aporte-clinica-consulta", (evt) => {
      this._recibirAporte("clinica", evt);
    });

    kernel.on("savia:aporte-diagnosticos", (evt) => {
      this._recibirAporte("diagnosticos", evt);
    });

    kernel.on("savia:aporte-laboratorio", (evt) => {
      this._recibirAporte("laboratorio", evt);
    });

    kernel.on("savia:aporte-social", (evt) => {
      this._recibirAporte("social", evt);
    });

    kernel.on("savia:consulta:solicitar-consolidacion", async (evt) => {
      await this._consolidar(evt.payload);
    });

    console.log("[Consolidadora-Consulta] ✓ Suscrito a 8 eventos");
  },

  _recibirAporte(tipo, evt) {
    const payload = evt.payload || {};
    this._aportes[tipo] = payload;

    if (payload._case_id) {
      this._caseIdActual = payload._case_id;
    } else if (payload.case_id) {
      this._caseIdActual = payload.case_id;
    }

    console.log(`[Consolidadora-Consulta] 📥 Aporte ${tipo} · case: ${this._caseIdActual}`);
  },

  async _consolidar(payload) {
    const caseId = payload?.case_id || payload?.caseId || this._caseIdActual;

    if (!caseId) {
      console.warn("[Consolidadora-Consulta] ⚠️ Sin case_id");
      return;
    }

    const contexto_id = `SAV-CONSULTA-${caseId}`;

    console.log(`[Consolidadora-Consulta] 🌊 Consolidando SAVIA 2: ${contexto_id}`);

    const savia = {
      contexto_id,
      origen: "consulta",
      case_id: caseId,
      subject_id: this._aportes.paciente?.subject_id,
      timestamp: new Date().toISOString(),

      // Subject
      subject: this._aportes.paciente,

      // Subjetivo (S)
      subjetivo: this._aportes.subjetivo?.subjetivo || this._aportes.subjetivo || {},

      // Examen físico (O)
      examen_fisico: this._aportes.examen_fisico?.examen_fisico || this._aportes.examen_fisico || {},

      // Signos vitales (O)
      signos_vitales: this._aportes.clinica?.signos_vitales || {},

      // Análisis (A)
      diagnosticos: this._aportes.diagnosticos?.diagnosticos || [],
      diagnostico_diferencial: this._aportes.diagnosticos?.diagnostico_diferencial || [],
      impresion_clinica: this._aportes.diagnosticos?.impresion_clinica || null,
      nivel_riesgo: this._aportes.diagnosticos?.nivel_riesgo || "MODERADO",

      // Labs
      labs: this._aportes.laboratorio?.labs || {},
      alteraciones_labs: this._aportes.laboratorio?.alteraciones || [],
      severidad_labs: this._aportes.laboratorio?.severidad_global || "normal",

      // Social
      contexto_social: this._aportes.social,

      raw: payload.raw || null
    };

    try {
      if (window.SAVIA && typeof window.SAVIA.emitirContexto === "function") {
        await window.SAVIA.emitirContexto(
          contexto_id,
          "savia:consulta:contexto-unificado",
          savia,
          { de: this.id, flujo: "ascendente" }
        );
      } else if (window.kernel) {
        await window.kernel.emit("savia:consulta:contexto-unificado", savia);
      }

      this._consolidacionesRealizadas++;
      console.log(`[Consolidadora-Consulta] ✅ SAVIA 2 emitida: ${contexto_id}`);
      console.log(`[Consolidadora-Consulta]    Total: ${this._consolidacionesRealizadas}`);

    } catch (e) {
      console.error("[Consolidadora-Consulta] ❌ Error:", e);
    }

    this._limpiar();
  },

  _limpiar() {
    this._aportes = {
      paciente: null,
      subjetivo: null,
      examen_fisico: null,
      clinica: null,
      diagnosticos: null,
      laboratorio: null,
      social: null
    };
    this._caseIdActual = null;
    console.log("[Consolidadora-Consulta] 🧹 Estado limpiado");
  },

  async recibir(evt) { /* no-op */ },
  async mount() { /* sin UI */ },

  api: {
    estadoAportes() {
      return {
        paciente: !!agenteConsolidadoraConsulta._aportes.paciente,
        subjetivo: !!agenteConsolidadoraConsulta._aportes.subjetivo,
        examen_fisico: !!agenteConsolidadoraConsulta._aportes.examen_fisico,
        clinica: !!agenteConsolidadoraConsulta._aportes.clinica,
        diagnosticos: !!agenteConsolidadoraConsulta._aportes.diagnosticos,
        laboratorio: !!agenteConsolidadoraConsulta._aportes.laboratorio,
        social: !!agenteConsolidadoraConsulta._aportes.social,
        caseId: agenteConsolidadoraConsulta._caseIdActual,
        consolidaciones: agenteConsolidadoraConsulta._consolidacionesRealizadas
      };
    },

    async forzarConsolidacion(payload) {
      return await agenteConsolidadoraConsulta._consolidar(payload);
    }
  }
};

export default agenteConsolidadoraConsulta;
