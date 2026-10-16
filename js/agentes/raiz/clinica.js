/**
 * agente-clinica.js
 * Capa: RAÍZ
 * Dominio: clinica
 * Versión: 1.0.0
 * 
 * Envuelve:
 *   - recogerClinica()
 *   - CONSULTA_SISTEMAS
 *   - CONSULTA_ANTECEDENTES
 *   - CONSULTA_EXAMEN_FISICO
 *   - CONSULTA_VITALES
 *   - ESCALAS_REGISTRY (parcial)
 */

export const agenteClinica = {
  id: "agente-clinica",
  version: "1.0.0",
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
    "clinica:vitales-capturados"
  ],

  eventos_suscritos: [
    "paciente:seleccionado",
    "consulta:firmada"
  ],

  async init(kernel) {
    console.log("[agente-clinica] Inicializando...");

    kernel.on("paciente:seleccionado", (evt) => {
      console.log("[agente-clinica] Paciente seleccionado:", evt.payload?.subject_id);
    });

    console.log("[agente-clinica] ✓ Listo");
  },

  async recibir(evt) {
    console.log("[agente-clinica] Evento recibido:", evt.tipo);
  },

  async mount(container, params) {
    console.log("[agente-clinica] mount() — pendiente de UI propia");
  },

  api: {
    /**
     * Recolecta TODA la clínica actual desde el DOM.
     * Reutiliza la función del monolito.
     */
    recoger() {
      if (typeof window.recogerClinica === "function") {
        return window.recogerClinica();
      }
      console.warn("[agente-clinica.recoger] recogerClinica no disponible");
      return {};
    },

    /**
     * Devuelve las constantes clínicas (sistemas, antecedentes, examen físico).
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
     * Cuenta cuántas escalas clínicas hay registradas.
     */
    contarEscalas() {
      if (window.ESCALAS_REGISTRY?._items) {
        return window.ESCALAS_REGISTRY._items.length;
      }
      return 0;
    },

    /**
     * Recalcula TODAS las escalas (IMC, TFG, PHQ9, etc.).
     */
    recalcular() {
      if (typeof window.recalcularTodasLasEscalas === "function") {
        window.recalcularTodasLasEscalas();
        return true;
      }
      return false;
    },

    /**
     * Recoge signos vitales para el contexto de interconsultas.
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
    }
  }
};

export default agenteClinica;
