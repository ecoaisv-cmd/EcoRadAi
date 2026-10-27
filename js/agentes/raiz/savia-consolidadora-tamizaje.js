/**
 * ═══════════════════════════════════════════════════════════════════
 * SAVIA CONSOLIDADORA — TAMIZAJE
 * Capa: RAÍZ
 * Sprint 3 Fase F
 * ═══════════════════════════════════════════════════════════════════
 * 
 * RESPONSABILIDADES:
 *   1. Escuchar los 5 aportes del módulo Tamizaje
 *   2. Acumularlos por case_id
 *   3. Al recibir el gatillo, consolidarlos en SAVIA 1
 *   4. Emitir savia:tamizaje:contexto-unificado
 * 
 * EVENTOS QUE ESCUCHA:
 *   - savia:aporte-paciente
 *   - savia:aporte-clinica-tamizaje
 *   - savia:aporte-laboratorio
 *   - savia:aporte-imagen
 *   - savia:aporte-social
 *   - savia:tamizaje:solicitar-consolidacion (gatillo)
 * 
 * EVENTO QUE EMITE:
 *   - savia:tamizaje:contexto-unificado
 */

export const agenteConsolidadoraTamizaje = {
  /* ─── METADATOS ─── */
  id: "agente-consolidadora-tamizaje",
  version: "1.0.0",
  nombre: "Consolidadora de Tamizaje",
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

  /* ─── EVENTOS ─── */
  eventos_emitidos: [
    "savia:tamizaje:contexto-unificado"
  ],

  eventos_suscritos: [
    "savia:aporte-paciente",
    "savia:aporte-clinica-tamizaje",
    "savia:aporte-laboratorio",
    "savia:aporte-imagen",
    "savia:aporte-social",
    "savia:tamizaje:solicitar-consolidacion"
  ],

  /* ─── ESTADO INTERNO ─── */
  _aportes: {
    paciente: null,
    clinica: null,
    laboratorio: null,
    imagen: null,
    social: null
  },
  _caseIdActual: null,
  _consolidacionesRealizadas: 0,

  /* ─── INICIALIZACIÓN ─── */
  async init(kernel) {
    console.log("[Consolidadora-Tamizaje] ▶ Inicializando...");

    // Suscribirse a cada tipo de aporte
    kernel.on("savia:aporte-paciente", (evt) => {
      this._recibirAporte("paciente", evt);
    });

    kernel.on("savia:aporte-clinica-tamizaje", (evt) => {
      this._recibirAporte("clinica", evt);
    });

    kernel.on("savia:aporte-laboratorio", (evt) => {
      this._recibirAporte("laboratorio", evt);
    });

    kernel.on("savia:aporte-imagen", (evt) => {
      this._recibirAporte("imagen", evt);
    });

    kernel.on("savia:aporte-social", (evt) => {
      this._recibirAporte("social", evt);
    });

    // Gatillo de consolidación
    kernel.on("savia:tamizaje:solicitar-consolidacion", async (evt) => {
      await this._consolidar(evt.payload);
    });

    console.log("[Consolidadora-Tamizaje] ✓ Suscrito a 6 eventos");
  },

  /* ─── RECIBIR APORTE ─── */
  _recibirAporte(tipo, evt) {
    const payload = evt.payload || {};
    this._aportes[tipo] = payload;

    // Capturar case_id si viene
    if (payload._case_id) {
      this._caseIdActual = payload._case_id;
    } else if (payload.case_id) {
      this._caseIdActual = payload.case_id;
    }

    const resumen = {
      paciente: !!this._aportes.paciente,
      clinica: !!this._aportes.clinica,
      laboratorio: !!this._aportes.laboratorio,
      imagen: !!this._aportes.imagen,
      social: !!this._aportes.social
    };

    console.log(`[Consolidadora-Tamizaje] 📥 Aporte ${tipo} · case: ${this._caseIdActual}`, resumen);
  },

  /* ─── CONSOLIDAR ─── */
  async _consolidar(payload) {
    const caseId = payload?.case_id || payload?.caseId || this._caseIdActual;

    if (!caseId) {
      console.warn("[Consolidadora-Tamizaje] ⚠️ Sin case_id, no se puede consolidar");
      return;
    }

    const contexto_id = `SAV-TAMIZAJE-${caseId}`;

    console.log(`[Consolidadora-Tamizaje] 🌊 Consolidando SAVIA 1: ${contexto_id}`);

    // Construir la SAVIA 1
    const savia = {
      contexto_id,
      origen: "tamizaje",
      case_id: caseId,
      subject_id: this._aportes.paciente?.subject_id,
      timestamp: new Date().toISOString(),

      // Subject (demográficos)
      subject: this._aportes.paciente,

      // Clínica
      signos_vitales: this._aportes.clinica?.signos_vitales || {},
      antropometria: this._aportes.clinica?.antropometria || {},
      habitos: this._aportes.clinica?.habitos || {},
      escalas_clinicas: this._aportes.clinica?.escalas || {},

      // Laboratorio
      labs: this._aportes.laboratorio?.labs || {},
      alteraciones_labs: this._aportes.laboratorio?.alteraciones || [],
      severidad_labs: this._aportes.laboratorio?.severidad_global || "normal",
      total_alterados: this._aportes.laboratorio?.total_alterados || 0,

      // Imagen
      imagenes: this._aportes.imagen?.imagenes || [],
      total_imagenes: this._aportes.imagen?.total || 0,
      protocolo: this._aportes.imagen?.protocolo,
      hallazgos_imagen: this._aportes.imagen?.hallazgos || {},

      // Social
      contexto_social: this._aportes.social,

      // Raw por si algún consumidor lo necesita
      raw: payload.raw || null
    };

    // Emitir
    try {
      if (window.SAVIA && typeof window.SAVIA.emitirContexto === "function") {
        await window.SAVIA.emitirContexto(
          contexto_id,
          "savia:tamizaje:contexto-unificado",
          savia,
          { de: this.id, flujo: "ascendente" }
        );
      } else if (window.kernel) {
        // Fallback
        await window.kernel.emit("savia:tamizaje:contexto-unificado", savia);
      }

      this._consolidacionesRealizadas++;
      console.log(`[Consolidadora-Tamizaje] ✅ SAVIA 1 emitida: ${contexto_id}`);
      console.log(`[Consolidadora-Tamizaje]    Total consolidaciones: ${this._consolidacionesRealizadas}`);

    } catch (e) {
      console.error("[Consolidadora-Tamizaje] ❌ Error emitiendo:", e);
    }

    this._limpiar();
  },

  /* ─── LIMPIAR ─── */
  _limpiar() {
    this._aportes = {
      paciente: null,
      clinica: null,
      laboratorio: null,
      imagen: null,
      social: null
    };
    this._caseIdActual = null;
    console.log("[Consolidadora-Tamizaje] 🧹 Estado limpiado");
  },

  /* ─── STUBS ─── */
  async recibir(evt) {
    // No-op: usamos kernel.on() directamente
  },

  async mount(container, params) {
    // Sin UI propia
  },

  /* ─── API PÚBLICA ─── */
  api: {
    estadoAportes() {
      return {
        paciente: !!agenteConsolidadoraTamizaje._aportes.paciente,
        clinica: !!agenteConsolidadoraTamizaje._aportes.clinica,
        laboratorio: !!agenteConsolidadoraTamizaje._aportes.laboratorio,
        imagen: !!agenteConsolidadoraTamizaje._aportes.imagen,
        social: !!agenteConsolidadoraTamizaje._aportes.social,
        caseId: agenteConsolidadoraTamizaje._caseIdActual,
        consolidaciones: agenteConsolidadoraTamizaje._consolidacionesRealizadas
      };
    },

    async forzarConsolidacion(payload) {
      return await agenteConsolidadoraTamizaje._consolidar(payload);
    }
  }
};

export default agenteConsolidadoraTamizaje;
