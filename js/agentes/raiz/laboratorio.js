/**
 * agente-laboratorio.js
 * Capa: RAÍZ
 * Dominio: laboratorio
 * Versión: 1.1.0 (Sprint 3 Fase A)
 * 
 * Emite: savia:aporte-laboratorio
 */

export const agenteLaboratorio = {
  id: "agente-laboratorio",
  version: "1.1.0",
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
    "laboratorio:guardado",
    "savia:aporte-laboratorio"
  ],

  eventos_suscritos: [
    "paciente:seleccionado",
    "consulta:firmada",
    "tamizaje:firmado",
    "laboratorio:actualizado"
  ],

  async init(kernel) {
    console.log("[agente-laboratorio] Inicializando...");

    kernel.on("paciente:seleccionado", (evt) => {
      console.log("[agente-laboratorio] Recalculando labs para:", evt.payload?.subject_id);
      this.api.recalcularCalculados();
    });

    // Emitir aporte cuando los labs se actualizan
    kernel.on("laboratorio:actualizado", (evt) => {
      this._emitirAporte();
    });

    console.log("[agente-laboratorio] ✓ Listo");
  },

  async recibir(evt) {
    console.log("[agente-laboratorio] Evento recibido:", evt.tipo);
    // Si nos avisan que un caso se firmó, emitir el aporte final
    if (evt.tipo === "tamizaje:firmado" || evt.tipo === "consulta:firmada") {
      this._emitirAporte();
    }
  },

  async mount(container, params) {
    console.log("[agente-laboratorio] mount() — pendiente de UI propia");
  },

  _emitirAporte() {
    const labs = this.api.recoger();
    const alteraciones = this.api.detectarAlteraciones(labs);
    
    window.kernel.emit("savia:aporte-laboratorio", {
      labs: labs,
      alteraciones: alteraciones.alteraciones || [],
      severidad_global: alteraciones.severidad_global || "normal",
      total_alterados: alteraciones.total_alterados || 0,
      timestamp: new Date().toISOString()
    });
    
    console.log("[agente-laboratorio] 📤 Aporte emitido con", alteraciones.total_alterados, "alteraciones");
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
     * Lista los labs registrados.
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
     * Obtiene un lab por id.
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
     * Recalcula los valores calculados.
     */
    recalcularCalculados() {
      if (typeof window.calcHOMA === "function") window.calcHOMA();
      if (typeof window.calcTFG === "function") window.calcTFG();
    },

    /**
     * Aporta los labs a SAVIA.
     */
    async aportar() {
      this._emitirAporte();
      return this.recoger();
    }
  }
};

export default agenteLaboratorio;
