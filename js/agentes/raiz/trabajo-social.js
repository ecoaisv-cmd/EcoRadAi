/**
 * agente-trabajo-social.js
 * Capa: RAÍZ
 * Dominio: social
 * Versión: 1.0.0
 * 
 * NUEVO — no envuelve nada del monolito.
 * 
 * Funciones:
 *   - Evaluación de contexto socioeconómico
 *   - Análisis con IA del contexto familiar/laboral/habitacional
 *   - Registro de vulnerabilidad social
 *   - Sugerencia de intervenciones
 * 
 * Tabla SQL: trabajo_social_evaluaciones (ya creada en Sprint 0)
 */

export const agenteTrabajoSocial = {
  id: "agente-trabajo-social",
  version: "1.0.0",
  nombre: "Agente Trabajo Social",
  icono: "🤝",
  capa: "raiz",
  dominio: "social",
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
    "social:evaluacion-iniciada",
    "social:evaluacion-completada",
    "social:bandera-roja-detectada",
    "social:intervencion-sugerida"
  ],

  eventos_suscritos: [
    "paciente:seleccionado",
    "consulta:firmada",
    "tamizaje:firmado"
  ],

  // ═══════════════════════════════════════════════════════════
  // ESTADO INTERNO
  // ═══════════════════════════════════════════════════════════
  _evaluacionActual: null,
  _banderasRojas: [],

  // ═══════════════════════════════════════════════════════════
  // PROMPT DE IA PARA TRABAJO SOCIAL
  // ═══════════════════════════════════════════════════════════
  promptIA: `Eres trabajador social clínico con 15 años de experiencia en El Salvador.

Analiza el contexto del paciente y devuelve JSON con:
- contexto_familiar: { estado_civil, numero_hijos, composicion, convivencia, red_apoyo }
- contexto_economico: { ingreso_mensual_estimado, capacidad_pago, cobertura_salud, barreras }
- contexto_laboral: { ocupacion_actual, exposicion_laboral, estabilidad }
- contexto_habitacional: { tipo_vivienda, servicios_basicos, condiciones }
- vulnerabilidad_nivel: "baja" | "media" | "alta"
- factores_vulnerabilidad: []
- intervenciones_sugeridas: [{ tipo, accion, plazo_dias }]
- banderas_rojas: []

Usa tildes y ñ. NUNCA reemplaces ñ por n.

REGLAS ANTI-MARKDOWN:
- NO uses asteriscos ni almohadillas.
- Títulos en MAYÚSCULAS sin símbolos.

Devuelve SOLO JSON válido.`,

  async init(kernel) {
    console.log("[agente-trabajo-social] Inicializando...");

    kernel.on("paciente:seleccionado", (evt) => {
      this._evaluacionActual = null;
      this._banderasRojas = [];
      console.log("[agente-trabajo-social] Paciente cambió, reset estado");
    });

    console.log("[agente-trabajo-social] ✓ Listo");
  },

  async recibir(evt) {
    console.log("[agente-trabajo-social] Evento recibido:", evt.tipo);
  },

  async mount(container, params) {
    console.log("[agente-trabajo-social] mount() — pendiente de UI propia");
  },

  // ═══════════════════════════════════════════════════════════
  // API PÚBLICA
  // ═══════════════════════════════════════════════════════════
  api: {
    /**
     * Obtiene el contexto social registrado de un paciente.
     */
    async obtener(subjectId) {
      if (!subjectId || !window.supabaseClient) return null;
      try {
        const { data, error } = await window.supabaseClient
          .from("trabajo_social_evaluaciones")
          .select("*")
          .eq("subject_id", subjectId)
          .order("fecha_evaluacion", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error("[agente-trabajo-social.obtener]", e);
        return null;
      }
    },

    /**
     * Guarda una evaluación de trabajo social.
     */
    async guardar(evaluacion) {
      if (!evaluacion?.subject_id) {
        throw new Error("Falta subject_id");
      }
      if (!window.supabaseClient) {
        throw new Error("Sin conexión a Supabase");
      }

      const registro = {
        subject_id: evaluacion.subject_id,
        fecha_evaluacion: evaluacion.fecha_evaluacion || new Date().toISOString().slice(0, 10),
        evaluador_id: window.usuarioActual?.id || null,
        contexto_familiar: evaluacion.contexto_familiar || {},
        contexto_economico: evaluacion.contexto_economico || {},
        contexto_laboral: evaluacion.contexto_laboral || {},
        contexto_habitacional: evaluacion.contexto_habitacional || {},
        red_apoyo: evaluacion.red_apoyo || {},
        vulnerabilidad_nivel: evaluacion.vulnerabilidad_nivel || "baja",
        intervenciones_sugeridas: evaluacion.intervenciones_sugeridas || [],
        factores_vulnerabilidad: evaluacion.factores_vulnerabilidad || [],
        banderas_rojas: evaluacion.banderas_rojas || []
      };

      try {
        const { data, error } = await window.supabaseClient
          .from("trabajo_social_evaluaciones")
          .insert(registro)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.error("[agente-trabajo-social.guardar]", e);
        throw e;
      }
    },

    /**
     * Ejecuta análisis con IA del contexto social.
     */
    async analizarConIA(datosPaciente, contextoFormulario) {
      const prompt = `${this.promptIA}

DATOS DEL PACIENTE:
${JSON.stringify(datosPaciente, null, 2)}

CONTEXTO APORTADO:
${JSON.stringify(contextoFormulario, null, 2)}`;

      const proxyUrl = `${window.WORKER_URL || "https://ecokimi2.emazzini2020.workers.dev"}/proxy-kimi`;

      try {
        const resp = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "kimi-k2-5",
            messages: [
              { role: "system", content: "Devuelves SIEMPRE JSON válido." },
              { role: "user", content: prompt }
            ],
            max_tokens: 4096,
            reasoning_effort: "low",
            response_format: { type: "json_object" }
          })
        });

        if (!resp.ok) throw new Error("HTTP " + resp.status);

        const data = await resp.json();
        let content = data.choices?.[0]?.message?.content || "{}";
        content = content.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();

        const parsed = JSON.parse(content);
        this._evaluacionActual = parsed;
        this._banderasRojas = parsed.banderas_rojas || [];

        return parsed;
      } catch (e) {
        console.error("[agente-trabajo-social.analizarConIA]", e);
        throw e;
      }
    },

    /**
     * Detecta banderas rojas de vulnerabilidad social.
     */
    detectarBanderasRojas(contexto) {
      const banderas = [];

      // Violencia intrafamiliar
      if (contexto.contexto_familiar?.convivencia?.toLowerCase().includes("violencia")) {
        banderas.push("Violencia intrafamiliar reportada");
      }

      // Sin red de apoyo
      if (contexto.red_apoyo?.disponible === false) {
        banderas.push("Sin red de apoyo identificada");
      }

      // Sin cobertura de salud
      if (contexto.contexto_economico?.cobertura_salud === "ninguna") {
        banderas.push("Sin cobertura de salud");
      }

      // Vivienda inadecuada
      if (contexto.contexto_habitacional?.servicios_basicos?.includes("sin agua")) {
        banderas.push("Sin acceso a agua potable");
      }

      // Trabajo infantil
      if (contexto.contexto_laboral?.trabajo_infantil === true) {
        banderas.push("Sospecha de trabajo infantil");
      }

      // Adulto mayor solo
      if (contexto.contexto_familiar?.convivencia === "solo" && contexto.contexto_familiar?.edad_mayor === true) {
        banderas.push("Adulto mayor viviendo solo");
      }

      this._banderasRojas = banderas;
      return banderas;
    },

    /**
     * Devuelve la última evaluación en memoria.
     */
    evaluacionActual() {
      return this._evaluacionActual;
    },

    /**
     * Devuelve las banderas rojas detectadas.
     */
    banderasRojas() {
      return this._banderasRojas;
    },

    /**
     * Aporta el contexto social a otros agentes.
     */
    async aportar(subjectId) {
      const eval_ = await this.obtener(subjectId);
      if (!eval_) return null;
      return {
        vulnerabilidad_nivel: eval_.vulnerabilidad_nivel,
        factores_vulnerabilidad: eval_.factores_vulnerabilidad,
        banderas_rojas: eval_.banderas_rojas,
        intervenciones_sugeridas: eval_.intervenciones_sugeridas
      };
    }
  }
};

export default agenteTrabajoSocial;
