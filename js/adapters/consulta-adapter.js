/**
 * Adapter del módulo de Consulta SOAP legacy hacia el kernel.
 */

export const agenteConsulta = {
  id: "agente-consulta",
  version: "1.0.0",
  nombre: "Consulta Médica SOAP",
  icono: "🩺",
  capa: "tronco",
  dominio: "consulta",
  categoria: "clinico",
  
  permisos: {
    ver: ["medico", "operador", "admin"],
    editar: ["medico", "admin"],
    firmar: ["medico"]
  },
  
  requiere: {
    entidades: ["paciente", "medico"],
    servicios: ["ia", "pdf", "firma"]
  },
  
  eventos_emitidos: [
    "consulta:iniciada",
    "consulta:firmada",
    "consulta:orden-lab-creada",
    "consulta:receta-creada"
  ],
  
  eventos_suscritos: [
    "paciente:seleccionado",
    "laboratorio:resultados-listos"
  ],
  
  async init(kernel) {
    console.log("[Consulta] Init");
    
    kernel.on("laboratorio:resultados-listos", (data) => {
      // Precargar resultados si la consulta está abierta
      if (window._consultaState?.paciente?.subject_id === data.subject_id) {
        console.log("[Consulta] Resultados precargados");
      }
    });
  },
  
  async recibir(evt) {
    const { de, tipo, payload } = evt;
    console.log(`[Consulta] Recibe de ${de}: ${tipo}`);
    
    switch (tipo) {
      case "paciente:seleccionado":
        return { ok: true };
      
      case "laboratorio:resultados-listos":
        return { precargado: true };
      
      default:
        return { ok: true };
    }
  },
  
  async mount(container, params) {
    if (typeof window.cambiarTab === "function") {
      window.cambiarTab("consulta");
    }
  },
  
  api: {
    async nuevaConsulta(paciente) {
      if (window.seleccionarPacienteConsulta) {
        await window.seleccionarPacienteConsulta(paciente.subject_id);
      }
    },
    
    async ejecutarAnalisis() {
      if (window.ejecutarAnalisisConsulta) {
        return window.ejecutarAnalisisConsulta();
      }
    },
    
    async firmar() {
      if (window.firmarYGenerarConsulta) {
        return window.firmarYGenerarConsulta();
      }
    }
  }
};
