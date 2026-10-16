/**
 * agente-paciente.js
 * Capa: RAÍZ
 * Dominio: identidad
 * Versión: 1.1.0 (Sprint 3 Fase A)
 * 
 * Emite: savia:aporte-paciente
 */

export const agentePaciente = {
  id: "agente-paciente",
  version: "1.1.0",
  nombre: "Agente Paciente",
  icono: "👤",
  capa: "raiz",
  dominio: "identidad",
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
    "paciente:seleccionado",
    "paciente:guardado",
    "paciente:consentimiento-otorgado",
    "paciente:busqueda-iniciada",
    "savia:aporte-paciente"
  ],

  eventos_suscritos: [
    "consulta:firmada",
    "tamizaje:firmado"
  ],

  async init(kernel) {
    console.log("[agente-paciente] Inicializando...");

    // Suscribirse a eventos de otros agentes
    kernel.on("consulta:firmada", (evt) => {
      console.log("[agente-paciente] Consulta firmada:", evt.payload?.case_id);
    });

    kernel.on("tamizaje:firmado", (evt) => {
      console.log("[agente-paciente] Tamizaje firmado:", evt.payload?.case_id);
    });

    // Escuchar cuando se selecciona un paciente para emitir aporte
    kernel.on("paciente:seleccionado", (evt) => {
      const p = evt.payload;
      console.log("[agente-paciente] Paciente seleccionado:", p?.subject_id);
      
      // Emitir aporte a SAVIA
      window.kernel.emit("savia:aporte-paciente", {
        subject_id: p?.subject_id,
        nombre: p?.nombre,
        edad: p?.edad,
        sexo: p?.sexo,
        dui: p?.dui,
        departamento: p?.departamento,
        municipio: p?.municipio,
        zona_geografica: p?.zona_geografica,
        empresa: p?.empresa,
        email: p?.email,
        telefono: p?.telefono,
        timestamp: new Date().toISOString()
      });
    });

    console.log("[agente-paciente] ✓ Listo");
  },

  async recibir(evt) {
    console.log("[agente-paciente] Evento recibido:", evt.tipo, evt.payload);
  },

  async mount(container, params) {
    console.log("[agente-paciente] mount() — pendiente de UI propia");
  },

  api: {
    /**
     * Busca pacientes por query.
     */
    async buscar(query) {
      if (!query || query.trim().length < 2) return [];
      try {
        const { data, error } = await window.supabaseClient.rpc("buscar_pacientes", {
          query: query.trim()
        });
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("[agente-paciente.buscar]", e);
        return [];
      }
    },

    /**
     * Obtiene un paciente por subject_id.
     */
    async obtener(subjectId) {
      if (!subjectId) return null;
      try {
        const { data, error } = await window.supabaseClient
          .from("patients")
          .select("*")
          .eq("subject_id", subjectId)
          .maybeSingle();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error("[agente-paciente.obtener]", e);
        return null;
      }
    },

    /**
     * Guarda un paciente.
     */
    async guardar(pacienteData) {
      try {
        const { error } = await window.supabaseClient
          .from("patients")
          .upsert(pacienteData, { onConflict: "subject_id" });
        if (error) throw error;
        return true;
      } catch (e) {
        console.error("[agente-paciente.guardar]", e);
        return false;
      }
    },

    /**
     * Aporta el contexto del paciente actual a SAVIA.
     */
    async aportar() {
      const p = window._pacienteActual;
      if (!p) return null;
      const aporte = {
        subject_id: p.subject_id,
        nombre: p.nombre,
        edad: p.edad,
        sexo: p.sexo,
        email: p.email,
        telefono: p.telefono,
        empresa: p.empresa,
        departamento: p.departamento,
        municipio: p.municipio
      };
      
      window.kernel.emit("savia:aporte-paciente", {
        ...aporte,
        timestamp: new Date().toISOString()
      });
      
      return aporte;
    },

    /**
     * Regenera el subject_id desde el nombre.
     */
    async regenerarId(nombre) {
      if (!nombre) throw new Error("Falta nombre");
      const { data, error } = await window.supabaseClient.rpc("generar_subject_id", {
        p_nombre: nombre
      });
      if (error) throw error;
      return data;
    }
  }
};

export default agentePaciente;
