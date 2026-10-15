/**
 * Adapter del Portal del Paciente.
 */

export const agentePortal = {
  id: "agente-portal",
  version: "1.0.0",
  nombre: "Portal del Paciente",
  icono: "👤",
  capa: "tronco",
  dominio: "portal",
  categoria: "paciente",
  
  permisos: {
    ver: ["paciente", "admin"]
  },
  
  async init(kernel) {
    console.log("[Portal] Init");
  },
  
  async recibir(evt) {
    return { ok: true };
  },
  
  async mount(container, params) {
    const secPortal = document.getElementById("sec-paciente-portal");
    if (secPortal) {
      document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
      secPortal.classList.add("active");
    }
    if (typeof window.cargarPortalPaciente === "function") {
      await window.cargarPortalPaciente();
    }
  }
};
