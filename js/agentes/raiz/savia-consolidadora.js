/**
 * agente-savia-consolidadora.js
 * Capa: RAÍZ
 * Dominio: savia
 * Versión: 1.0.0
 * 
 * Responsabilidad:
 *   Escuchar los 5 aportes de los agentes de RAÍZ y consolidarlos
 *   en una única SAVIA unificada cuando el caso se firma.
 * 
 * Emite: savia:raiz:contexto-unificado
 */

export const agenteSaviaConsolidadora = {
  id: "agente-savia-consolidadora",
  version: "1.0.0",
  nombre: "Consolidador de SAVIA RAÍZ",
  icono: "🌊",
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
    "savia:raiz:contexto-unificado"
  ],

  eventos_suscritos: [
    "savia:aporte-paciente",
    "savia:aporte-clinica",
    "savia:aporte-laboratorio",
    "savia:aporte-imagen",
    "savia:aporte-social",
    "tamizaje:firmado",
    "consulta:firmada"
  ],

  _aportesActuales: {
    paciente: null,
    clinica: null,
    laboratorio: null,
    imagen: null,
    social: null
  },

  _casoActualId: null,
  _consolidacionesRealizadas: 0,

  async init(kernel) {
    console.log("[agente-savia-consolidadora] Inicializando...");

    // Suscribirse a los 5 aportes de RAÍZ
    kernel.on("savia:aporte-paciente", (evt) => {
      this._recibirAporte("paciente", evt.payload);
    });

    kernel.on("savia:aporte-clinica", (evt) => {
      this._recibirAporte("clinica", evt.payload);
    });

    kernel.on("savia:aporte-laboratorio", (evt) => {
      this._recibirAporte("laboratorio", evt.payload);
    });

    kernel.on("savia:aporte-imagen", (evt) => {
      this._recibirAporte("imagen", evt.payload);
    });

    kernel.on("savia:aporte-social", (evt) => {
      this._recibirAporte("social", evt.payload);
    });

    // Escuchar eventos de firma para consolidar
   kernel.on("tamizaje:firmado", (evt) => {
  // Esperar 150ms para dar tiempo a que todos los agentes emitan sus aportes
  setTimeout(() => {
    agenteSaviaConsolidadora._consolidarYemitir(evt.payload, "tamizaje");
  }, 150);
});

kernel.on("consulta:firmada", (evt) => {
  setTimeout(() => {
    agenteSaviaConsolidadora._consolidarYemitir(evt.payload, "consulta");
  }, 150);
});

    console.log("[agente-savia-consolidadora] ✓ Listo");
  },

  async recibir(evt) {
    console.log("[agente-savia-consolidadora] Evento:", evt.tipo);
  },

  async mount(container, params) {
    console.log("[agente-savia-consolidadora] mount() — no requiere UI");
  },

  /**
   * Recibe un aporte de un agente de RAÍZ.
   */
  _recibirAporte(tipo, datos) {
    this._aportesActuales[tipo] = datos;
    console.log(`[agente-savia-consolidadora] 📥 Aporte recibido: ${tipo}`);
  },

  /**
   * Consolida los 5 aportes y emite la SAVIA RAÍZ.
   */
  async _consolidarYemitir(payload, origen) {
    const caseId = payload?.case_id || payload?.caseId;
    if (!caseId) {
      console.warn("[agente-savia-consolidadora] Sin case_id, no se puede consolidar");
      return;
    }

    // Generar contexto_id único
    const contexto_id = `SAV-RAIZ-${caseId}`;

    // Consolidar los 5 aportes
    const saviaRaiz = {
      contexto_id,
      origen,
      case_id: caseId,
      timestamp: new Date().toISOString(),

      subject: this._aportesActuales.paciente || null,

      signos_vitales: this._aportesActuales.clinica?.signos_vitales || null,
      examen_fisico: this._aportesActuales.clinica?.examen_fisico || null,
      escalas_clinicas: this._aportesActuales.clinica?.escalas || {},

      labs: this._aportesActuales.laboratorio?.labs || {},
      alteraciones_labs: this._aportesActuales.laboratorio?.alteraciones || [],
      severidad_labs: this._aportesActuales.laboratorio?.severidad_global || "normal",

      hallazgos_imagen: this._aportesActuales.imagen?.hallazgos || {},
      imagenes_meta: this._aportesActuales.imagen?.meta || null,

      contexto_social: this._aportesActuales.social || null,

      // Payload original por si algún consumidor lo necesita
      raw: payload
    };

    console.log(`[agente-savia-consolidadora] 🌊 Consolidando SAVIA RAÍZ para ${caseId}`);
    console.log(`[agente-savia-consolidadora]   Aportes: paciente=${!!this._aportesActuales.paciente}, clinica=${!!this._aportesActuales.clinica}, labs=${!!this._aportesActuales.laboratorio}, imagen=${!!this._aportesActuales.imagen}, social=${!!this._aportesActuales.social}`);

    // Emitir a SAVIA
    if (window.SAVIA && typeof window.SAVIA.emitirContexto === "function") {
      await window.SAVIA.emitirContexto(
        contexto_id,
        "savia:raiz:contexto-unificado",
        saviaRaiz,
        { de: "agente-savia-consolidadora", flujo: "ascendente" }
      );
      this._consolidacionesRealizadas++;
    } else if (window.kernel) {
      // Fallback usando kernel.emit
      window.kernel.emit("savia:raiz:contexto-unificado", saviaRaiz);
    } else {
      console.error("[agente-savia-consolidadora] No hay SAVIA ni kernel");
    }

    // Limpiar aportes para el próximo caso
    this._aportesActuales = {
      paciente: null,
      clinica: null,
      laboratorio: null,
      imagen: null,
      social: null
    };
    this._casoActualId = null;
  },

 api: {
    /**
     * Estado actual de los aportes recibidos.
     */
    estadoAportes() {
      // Referencia explícita al agente (no usar `this` porque apunta al objeto api)
      const agente = agenteSaviaConsolidadora;
      return {
        paciente: !!agente._aportesActuales.paciente,
        clinica: !!agente._aportesActuales.clinica,
        laboratorio: !!agente._aportesActuales.laboratorio,
        imagen: !!agente._aportesActuales.imagen,
        social: !!agente._aportesActuales.social,
        caso: agente._casoActualId,
        consolidaciones: agente._consolidacionesRealizadas
      };
    },

    /**
     * Fuerza la consolidación (útil para tests).
     */
    async forzarConsolidacion(payload, origen) {
      const agente = agenteSaviaConsolidadora;
      return await agente._consolidarYemitir(payload, origen);
    }
  }
};

export default agenteSaviaConsolidadora;
