/**
 * agente-laboratorio.js
 * Capa: RAÍZ
 * Dominio: laboratorio
 * Versión: 1.0.0
 * 
 * Envuelve:
 *   - LABS_REGISTRY
 *   - parsearLabsConIA()
 *   - recogerLabs()
 *   - detectarAlteraciones()
 *   - calcHOMA(), calcTFG()
 */

export const agenteLaboratorio = {
  id: "agente-laboratorio",
  version: "1.0.0",
  nombre: "Agente Laboratorio",
  icono: "🔬",
  capa: "raiz",
  dominio: "laboratorio",
  categoria: "clinico",

  permisos: {
    ver: ["operador", "medico", "admin"],
    editar: ["operador", "medico", "admin"]
  },

  requiere: {
    entidades: ["paciente"],
    servicios: ["supabase", "ia"]
  },

  eventos_emitidos: [
    "laboratorio:parseado",
    "laboratorio:alteraciones-detectadas",
    "laboratorio:guardado"
  ],

  eventos_suscritos: [
    "paciente:seleccionado",
    "consulta:firmada"
  ],

  async init(kernel) {
    console.log("[agente-laboratorio] Inicializando...");

    kernel.on("paciente:seleccionado", (evt) => {
      console.log("[agente-laboratorio] Recalculando labs para:", evt.payload?.subject_id);
      this.api.recalcularCalculados();
    });

    console.log("[agente-laboratorio] ✓ Listo");
  },

  async recibir(evt) {
    console.log("[agente-laboratorio] Evento recibido:", evt.tipo);
  },

  async mount(container, params) {
    console.log("[agente-laboratorio] mount() — pendiente de UI propia");
  },

  api: {
    /**
     * Recolecta los valores de labs del DOM.
     */
    recoger() {
      if (typeof window.recogerLabs === "function") {
        return window.recogerLabs();
      }
      return {};
    },

    /**
     * Lista los labs registrados en el LABS_REGISTRY.
     */
    listar(filtro) {
      if (window.LABS_REGISTRY?.listar) {
        return window.LABS_REGISTRY.listar(filtro);
      }
      return [];
    },

    /**
     * Agrupa los labs por categoría.
     */
    agrupar(filtro) {
      if (window.LABS_REGISTRY?.agrupar) {
        return window.LABS_REGISTRY.agrupar(filtro);
      }
      return [];
    },

    /**
     * Obtiene un lab específico por id.
     */
    obtener(labId) {
      if (window.LABS_REGISTRY?._items) {
        return window.LABS_REGISTRY._items.find(l => l.id === labId);
      }
      return null;
    },

    /**
     * Ejecuta el parseo de labs con IA.
     */
    async parsearConIA(textoRaw) {
      if (typeof window.parsearLabsConIA === "function") {
        const ta = document.getElementById("labs-raw");
        if (ta && textoRaw) ta.value = textoRaw;
        return await window.parsearLabsConIA();
      }
      throw new Error("parsearLabsConIA no disponible");
    },

    /**
     * Detecta alteraciones en los valores de labs.
     */
    detectarAlteraciones(valores) {
      if (typeof window.detectarAlteraciones === "function") {
        return window.detectarAlteraciones(valores);
      }
      return { alteraciones: [], severidad_global: "normal", total_alterados: 0 };
    },

    /**
     * Recalcula los valores calculados (HOMA-IR, TFG, etc.).
     */
    recalcularCalculados() {
      if (typeof window.calcHOMA === "function") window.calcHOMA();
      if (typeof window.calcTFG === "function") window.calcTFG();
    },

    /**
     * Aporta los labs para interconsultas.
     */
    async aportar() {
      const labs = this.recoger();
      const alteraciones = this.detectarAlteraciones(labs);
      return {
        valores: labs,
        alteraciones: alteraciones.alteraciones,
        severidad_global: alteraciones.severidad_global
      };
    }
  }
};

export default agenteLaboratorio;
