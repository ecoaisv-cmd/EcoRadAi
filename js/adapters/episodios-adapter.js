/**
 * Adapter del módulo de Interconsultas Episódicas.
 */

export const agenteEpisodios = {
  id: "agente-episodios",
  version: "1.0.0",
  nombre: "Interconsultas IA Episódicas",
  icono: "📂",
  capa: "tronco",
  dominio: "episodios",
  categoria: "clinico",
  
  permisos: {
    ver: ["medico", "admin"],
    editar: ["medico", "admin"]
  },
  
  eventos_emitidos: [
    "episodio:creado",
    "episodio:cerrado",
    "resultado:alterado"
  ],
  
  eventos_suscritos: [
    "consulta:firmada",
    "tamizaje:firmado"
  ],
  
  async init(kernel) {
    console.log("[Episodios] Init");
    
    // Hook: al firmar consulta con órdenes, crear episodio
    kernel.on("consulta:firmada", async (data) => {
      if (data.tiene_ordenes) {
        await this.api.crearEpisodioDesdeConsulta(data);
      }
    });
  },
  
  async recibir(evt) {
    const { de, tipo, payload } = evt;
    console.log(`[Episodios] Recibe de ${de}: ${tipo}`);
    return { ok: true };
  },
  
  async mount(container, params) {
    if (typeof window.abrirPanelEpisodios === "function") {
      await window.abrirPanelEpisodios();
    }
  },
  
  api: {
    async crearEpisodioDesdeConsulta(data) {
      if (typeof window.crearEpisodioClinico === "function") {
        return window.crearEpisodioClinico({
          subject_id: data.subject_id,
          tipo: "consulta",
          estado: "en_espera_resultados",
          caso_inicial_id: data.case_id
        });
      }
    },
    
    async entregarResultados(subjectId) {
      if (typeof window.abrirModalEntregaResultados === "function") {
        return window.abrirModalEntregaResultados(subjectId);
      }
    }
  }
};
