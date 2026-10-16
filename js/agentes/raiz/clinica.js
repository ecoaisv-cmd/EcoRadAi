/**
 * agente-clinica.js
 * Capa: RAÍZ
 * Dominio: clinica
 * Versión: 1.1.0 (Sprint 3 Fase A)
 * 
 * Emite: savia:aporte-clinica
 */

export const agenteClinica = {
  id: "agente-clinica",
  version: "1.1.0",
  nombre: "Agente Clínica",
  icono: "🩺",
  capa: "raiz",
  dominio: "clinica",
  categoria: "clinico",

  permisos: {
    ver: ["operador", "medico", "admin"],
    editar: ["operador", "medico", "admin"]
  },

  requiere: {
    entidades: ["paciente"],
    servicios: ["supabase"]
  },

  eventos_emitidos: [
    "clinica:datos-recogidos",
    "clinica:escalas-actualizadas",
    "clinica:vitales-capturados",
    "savia:aporte-clinica"
  ],

  eventos_suscritos: [
    "paciente:seleccionado",
    "consulta:firmada",
    "clinica:actualizada"
  ],

  async init(kernel) {
    console.log("[agente-clinica] Inicializando...");

   kernel.on("paciente:seleccionado", (evt) => {
  console.log("[agente-clinica] Paciente seleccionado:", evt.payload?.subject_id);
  // Emitir aporte inicial (aunque sea vacío)
  agenteClinica._emitirAporte();
});

// Emitir aporte cuando la clínica cambia
kernel.on("clinica:actualizada", () => {
  agenteClinica._emitirAporte();
});

kernel.on("vitales:actualizados", () => {
  agenteClinica._emitirAporte();
});
    // Emitir aporte cuando la clínica se actualiza
    kernel.on("clinica:actualizada", (evt) => {
      this._emitirAporte();
    });

    console.log("[agente-clinica] ✓ Listo");
  },

  async recibir(evt) {
    console.log("[agente-clinica] Evento recibido:", evt.tipo);
    // Si nos avisan que un caso se firmó, emitir el aporte final
    if (evt.tipo === "tamizaje:firmado" || evt.tipo === "consulta:firmada") {
      this._emitirAporte();
    }
  },

  async mount(container, params) {
    console.log("[agente-clinica] mount() — pendiente de UI propia");
  },

  _emitirAporte() {
    const clinica = this.api.recoger();
    window.kernel.emit("savia:aporte-clinica", {
      signos_vitales: {
        peso_kg: clinica.peso_kg,
        talla_cm: clinica.talla_cm,
        imc: clinica.imc,
        circunferencia_cintura_cm: clinica.circunferencia_cintura_cm,
        presion_sistolica: clinica.presion_sistolica_mmhg,
        presion_diastolica: clinica.presion_diastolica_mmhg,
        frecuencia_cardiaca: clinica.frecuencia_cardiaca_lpm,
        saturacion_o2: clinica.saturacion_o2_pct
      },
      examen_fisico: clinica.examen_fisico || {},
      escalas: clinica.escalas || {},
      habitos: clinica.habitos || {},
      timestamp: new Date().toISOString()
    });
    console.log("[agente-clinica] 📤 Aporte emitido");
  },

  api: {
    /**
     * Recolecta TODA la clínica actual desde el DOM.
     */
    recoger() {
      if (typeof window.recogerClinica === "function") {
        return window.recogerClinica();
      }
      console.warn("[agente-clinica.recoger] recogerClinica no disponible");
      return {};
    },

    /**
     * Constantes clínicas.
     */
    constantes() {
      return {
        sistemas: window.CONSULTA_SISTEMAS || [],
        antecedentes: window.CONSULTA_ANTECEDENTES || [],
        examen_fisico: window.CONSULTA_EXAMEN_FISICO || [],
        vitales: window.CONSULTA_VITALES || []
      };
    },

    /**
     * Cuenta las escalas clínicas registradas.
     */
    contarEscalas() {
      if (window.ESCALAS_REGISTRY?._items) {
        return window.ESCALAS_REGISTRY._items.length;
      }
      return 0;
    },

    /**
     * Recalcula todas las escalas.
     */
    recalcular() {
      if (typeof window.recalcularTodasLasEscalas === "function") {
        window.recalcularTodasLasEscalas();
        return true;
      }
      return false;
    },

    /**
     * Recoge signos vitales.
     */
    vitales() {
      const clinica = this.recoger();
      return {
        peso_kg: clinica.peso_kg,
        talla_cm: clinica.talla_cm,
        imc: clinica.imc,
        presion_sistolica_mmhg: clinica.presion_sistolica_mmhg,
        presion_diastolica_mmhg: clinica.presion_diastolica_mmhg,
        frecuencia_cardiaca_lpm: clinica.frecuencia_cardiaca_lpm,
        saturacion_o2_pct: clinica.saturacion_o2_pct
      };
    },

    /**
     * Aporta el contexto clínico a SAVIA.
     */
    async aportar() {
      this._emitirAporte();
      return this.recoger();
    }
  }
};

export default agenteClinica;
