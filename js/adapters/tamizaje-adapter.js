/**
 * Adapter del módulo de Tamizaje legacy hacia el kernel.
 * Envuelve el código existente sin modificarlo.
 */

export const agenteTamizaje = {
  id: "agente-tamizaje",
  version: "1.0.0",
  nombre: "Tamizaje con IA",
  icono: "🩺",
  capa: "tronco",
  dominio: "tamizaje",
  categoria: "clinico",
  
  // Permisos
  permisos: {
    ver: ["operador", "medico", "admin"],
    editar: ["operador", "medico"],
    firmar: ["medico"]
  },
  
  // Dependencias
  requiere: {
    entidades: ["paciente", "medico"],
    servicios: ["ia", "pdf", "firma"]
  },
  
  // Eventos que emite
  eventos_emitidos: [
    "tamizaje:iniciado",
    "tamizaje:analisis-completo",
    "tamizaje:firmado"
  ],
  
  // Eventos que consume
  eventos_suscritos: [
    "paciente:seleccionado",
    "cuota:verificada"
  ],
  
  // Ciclo de vida
  async init(kernel) {
    console.log("[Tamizaje] Init");
    
    // Suscribirse a eventos de paciente
    kernel.on("paciente:seleccionado", (paciente) => {
      this._pacienteActual = paciente;
    });
  },
  
  async recibir(evt) {
    const { de, tipo, payload } = evt;
    console.log(`[Tamizaje] Recibe de ${de}: ${tipo}`);
    
    switch (tipo) {
      case "paciente:seleccionado":
        this._pacienteActual = payload;
        return { ok: true };
      
      case "cuota:verificada":
        return { cuota_disponible: payload.disponible };
      
      default:
        return { ok: true };
    }
  },
  
  // Montar: redirige al módulo legacy
  async mount(container, params) {
    if (typeof window.cambiarTab === "function") {
      window.cambiarTab("captura");
    }
  },
  
  // API pública para otros agentes
  api: {
    async listarTamizajes() {
      return window.TAMIZAJES_REGISTRY?.listar() || [];
    },
    
    async obtenerTamizaje(id) {
      return window.TAMIZAJES_REGISTRY?.obtener(id);
    },
    
    async generarInforme(caso) {
      const g = id => document.getElementById(id)?.value || "";
      const d = caso.timeline?.delta_vs_prev || {};
      const n = window.normalizarNivel(caso.riesgo_global?.nivel);
      const r = window.recomendarPlanPorRiesgo(n);
      return window.renderArtifacts(caso, g, d, n, r);
    }
  }
};
