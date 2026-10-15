/**
 * Adapter del módulo de Suscripciones.
 */

export const agenteSuscripciones = {
  id: "agente-suscripciones",
  version: "1.0.0",
  nombre: "Suscripciones y Facturación",
  icono: "💳",
  capa: "tronco",
  dominio: "suscripciones",
  categoria: "admin",
  
  permisos: {
    ver: ["admin", "paciente"],
    editar: ["admin"]
  },
  
  eventos_emitidos: [
    "cuota:verificada",
    "cuota:consumida",
    "suscripcion:activada"
  ],
  
  eventos_suscritos: [
    "consulta:firmada",
    "tamizaje:firmado"
  ],
  
  async init(kernel) {
    console.log("[Suscripciones] Init");
    
    // Hook: al firmar consulta, consumir cuota
    kernel.on("consulta:firmada", async (data) => {
      await this.api.consumirCuota(data.subject_id, "consulta", data.case_id);
    });
    
    // Hook: al firmar tamizaje, consumir cuota
    kernel.on("tamizaje:firmado", async (data) => {
      await this.api.consumirCuota(data.subject_id, "tamizaje", data.case_id);
    });
  },
  
  async recibir(evt) {
    const { de, tipo, payload } = evt;
    console.log(`[Suscripciones] Recibe de ${de}: ${tipo}`);
    return { ok: true };
  },
  
  async mount(container, params) {
    if (typeof window.cambiarTab === "function") {
      window.cambiarTab("admin");
      setTimeout(() => window.cambiarSubtabAdmin("suscripciones"), 200);
    }
  },
  
  api: {
    async verificarCuota(subjectId, tipoServicio) {
      if (typeof window.verificarCuotaClinica === "function") {
        return window.verificarCuotaClinica(subjectId, tipoServicio);
      }
      return { disponible: true, tiene_suscripcion: false };
    },
    
    async consumirCuota(subjectId, tipoServicio, referenciaId) {
      if (typeof window.consumirCuotaClinica === "function") {
        return window.consumirCuotaClinica(subjectId, tipoServicio, referenciaId);
      }
      return { ok: true };
    },
    
    async activarPlan(subjectId, planId) {
      if (typeof window.activarSuscripcionManual === "function") {
        return window.activarSuscripcionManual(subjectId, planId);
      }
    }
  }
};
