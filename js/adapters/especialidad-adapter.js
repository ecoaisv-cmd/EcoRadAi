/**
 * Adapter del módulo de Consulta Especialidad.
 */

export const agenteEspecialidad = {
  id: "agente-especialidad",
  version: "1.0.0",
  nombre: "Consulta Especialidad",
  icono: "🩺",
  capa: "tronco",
  dominio: "especialidad",
  categoria: "clinico",
  
  permisos: {
    ver: ["medico", "admin"],
    editar: ["medico"]
  },
  
  async init(kernel) {
    console.log("[Especialidad] Init");
  },
  
  async recibir(evt) {
    return { ok: true };
  },
  
  async mount(container, params) {
    if (typeof window.cambiarTab === "function") {
      window.cambiarTab("consulta");
    }
  },
  
  api: {
    listarContextos() {
      return window.ConsultaEspecialidad?.contextos || {};
    },
    
    seleccionarContexto(ctx) {
      if (typeof window.seleccionarContexto === "function") {
        return window.seleccionarContexto(ctx);
      }
    },
    
    sugerirPorEdad(edad, sexo) {
      if (typeof window.ConsultaEspecialidad?.sugerirPorEdad === "function") {
        return window.ConsultaEspecialidad.sugerirPorEdad(edad, sexo);
      }
      return null;
    }
  }
};
