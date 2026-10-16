/**
 * agente-paciente.js
 * Capa: RAÍZ
 * Dominio: identidad
 * Versión: 1.0.0
 * 
 * Envuelve:
 *   - buscarPacienteLive()
 *   - seleccionarPacienteExistente()
 *   - mostrarFormularioPacienteNuevo()
 *   - guardarFichaPaciente()
 *   - guardarConsentimientoPaciente()
 *   - regenerarSubjectId()
 */

export const agentePaciente = {
  id: "agente-paciente",
  version: "1.0.0",
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
    "paciente:busqueda-iniciada"
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

    console.log("[agente-paciente] ✓ Listo");
  },

  async recibir(evt) {
    console.log("[agente-paciente] Evento recibido:", evt.tipo, evt.payload);
  },

  async mount(container, params) {
    // En el futuro, montar UI del agente aquí
    console.log("[agente-paciente] mount() — pendiente de UI propia");
  },

  api: {
    /**
     * Busca pacientes por query (nombre, DUI, email, teléfono, ID).
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
     * Obtiene un paciente completo por subject_id.
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
     * Guarda o actualiza un paciente.
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
     * Aporta el contexto del paciente actual a otro agente.
     */
    async aportar() {
      const p = window._pacienteActual;
      if (!p) return null;
      return {
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
