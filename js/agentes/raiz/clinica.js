/**
 * ═══════════════════════════════════════════════════════════════════
 * AGENTE CLÍNICA
 * Capa: RAÍZ · Sprint 3 Fase F
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Emite (depende del módulo activo):
 *   TAMIZAJE:
 *     - savia:aporte-clinica-tamizaje (vitales + antropometría + hábitos + escalas)
 *   CONSULTA:
 *     - savia:aporte-subjetivo (S)
 *     - savia:aporte-examen-fisico (O)
 *     - savia:aporte-clinica-consulta (vitales)
 *     - savia:aporte-diagnosticos (A)
 *   LEGACY (compatibilidad):
 *     - savia:aporte-clinica (siempre, para la savia-consolidadora vieja)
 */

export const agenteClinica = {
  id: "agente-clinica",
  version: "2.0.0",
  nombre: "Agente Clínica",
  icono: "🩺",
  capa: "raiz",
  dominio: "clinica",
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
    "clinica:datos-recogidos",
    "clinica:escalas-actualizadas",
    "clinica:vitales-capturados",
    "savia:aporte-clinica",
    "savia:aporte-clinica-tamizaje",
    "savia:aporte-clinica-consulta",
    "savia:aporte-subjetivo",
    "savia:aporte-examen-fisico",
    "savia:aporte-diagnosticos"
  ],

  eventos_suscritos: [
    "paciente:seleccionado",
    "consulta:firmada",
    "tamizaje:firmado",
    "clinica:actualizada",
    "vitales:actualizados"
  ],

  async init(kernel) {
    console.log("[agente-clinica] ▶ Inicializando v2.0.0...");

    // Al seleccionar paciente → emitir aporte inicial
    kernel.on("paciente:seleccionado", (evt) => {
      console.log("[agente-clinica] Paciente seleccionado:", evt.payload?.subject_id);
      this._emitirAporte();
    });

    // Al actualizar clínica → emitir aporte
    kernel.on("clinica:actualizada", () => {
      this._emitirAporte();
    });

    // Al actualizar vitales → emitir aporte
    kernel.on("vitales:actualizados", () => {
      this._emitirAporte();
    });

    console.log("[agente-clinica] ✓ Listo");
  },

  async recibir(evt) {
    console.log("[agente-clinica] Evento recibido:", evt.tipo);

    if (evt.tipo === "tamizaje:firmado" || evt.tipo === "consulta:firmada") {
      this._emitirAporte();
    }
  },

  async mount(container, params) {
    console.log("[agente-clinica] mount() — sin UI propia");
  },

  /* ═══════════════════════════════════════════════════════════
     EMISIÓN DE APORTES DIFERENCIADOS
     ═══════════════════════════════════════════════════════════ */
  _emitirAporte() {
    const clinica = this.api.recoger();

    // Detectar módulo activo
    const esConsulta = !!(window._consultaState?.paciente);
    const caso = esConsulta 
      ? window._consultaState 
      : (window._casoActual || window.casoActual);
    const caseId = caso?.case_id || caso?.caseId || null;

    const aporteBase = {
      _case_id: caseId,
      case_id: caseId,
      timestamp: new Date().toISOString()
    };

    // ═══════════════════════════════════════════════════════════
    // LEGACY: emitir siempre savia:aporte-clinica (compatibilidad)
    // ═══════════════════════════════════════════════════════════
    try {
      window.kernel.emit("savia:aporte-clinica", {
        ...aporteBase,
        signos_vitales: {
          peso_kg: clinica.peso_kg,
          talla_cm: clinica.talla_cm,
          imc: clinica.imc,
          circunferencia_cintura_cm: clinica.circunferencia_cintura_cm,
          presion_sistolica: clinica.presion_sistolica_mmhg,
          presion_diastolica: clinica.presion_diastolica_mmhg,
          frecuencia_cardiaca: clinica.frecuencia_cardiaca_lpm,
          saturacion_o2: clinica.saturacion_o2_pct,
          temperatura: clinica.temperatura
        },
        examen_fisico: clinica.examen_fisico || {},
        escalas: clinica.escalas || {},
        habitos: clinica.habitos || {}
      });
    } catch (e) {
      console.warn("[agente-clinica] Error emitiendo legacy:", e);
    }

    // ═══════════════════════════════════════════════════════════
    // NUEVOS APORTES DIFERENCIADOS
    // ═══════════════════════════════════════════════════════════
    if (!esConsulta) {
      // ─── TAMIZAJE ───
      try {
        window.kernel.emit("savia:aporte-clinica-tamizaje", {
          ...aporteBase,
          signos_vitales: {
            peso_kg: clinica.peso_kg,
            talla_cm: clinica.talla_cm,
            imc: clinica.imc,
            presion_sistolica_mmhg: clinica.presion_sistolica_mmhg,
            presion_diastolica_mmhg: clinica.presion_diastolica_mmhg,
            frecuencia_cardiaca_lpm: clinica.frecuencia_cardiaca_lpm,
            saturacion_o2_pct: clinica.saturacion_o2_pct,
            temperatura: clinica.temperatura
          },
          antropometria: {
            peso_kg: clinica.peso_kg,
            talla_cm: clinica.talla_cm,
            imc: clinica.imc,
            circunferencia_cintura_cm: clinica.circunferencia_cintura_cm,
            circunferencia_cervical_cm: clinica.circunferencia_cervical_cm
          },
          habitos: clinica.habitos || {},
          escalas: clinica.escalas || {}
        });
        console.log("[agente-clinica] 📤 Aporte TAMIZAJE emitido");
      } catch (e) {
        console.warn("[agente-clinica] Error emitiendo aporte tamizaje:", e);
      }

    } else {
      // ─── CONSULTA ───

      // S — Subjetivo
      try {
        window.kernel.emit("savia:aporte-subjetivo", {
          ...aporteBase,
          subjetivo: {
            motivo_consulta: document.getElementById("cons-motivo")?.value?.trim() || "",
            enfermedad_actual: document.getElementById("cons-enfermedad-actual")?.value?.trim() || "",
            eva_dolor: parseInt(document.getElementById("cons-eva")?.value) || null,
            evolucion: document.getElementById("cons-evolucion")?.value?.trim() || "",
            revision_sistemas: this._recogerRevisionSistemas(),
            antecedentes: this._recogerAntecedentes(),
            alergias: document.getElementById("cons-alergias")?.value?.trim() || "",
            medicamentos: document.getElementById("cons-medicamentos")?.value?.trim() || "",
            habitos: {
              tabaco: document.getElementById("cons-habito-tabaco")?.value?.trim() || "",
              alcohol: document.getElementById("cons-habito-alcohol")?.value?.trim() || "",
              ejercicio: document.getElementById("cons-habito-ejercicio")?.value?.trim() || "",
              sueno: document.getElementById("cons-habito-sueno")?.value?.trim() || ""
            }
          }
        });
        console.log("[agente-clinica] 📤 Aporte SUBJETIVO emitido");
      } catch (e) {
        console.warn("[agente-clinica] Error emitiendo subjetivo:", e);
      }

      // O — Examen físico
      try {
        window.kernel.emit("savia:aporte-examen-fisico", {
          ...aporteBase,
          examen_fisico: this._recogerExamenFisico()
        });
        console.log("[agente-clinica] 📤 Aporte EXAMEN FÍSICO emitido");
      } catch (e) {
        console.warn("[agente-clinica] Error emitiendo examen físico:", e);
      }

      // O — Signos vitales consulta
      try {
        window.kernel.emit("savia:aporte-clinica-consulta", {
          ...aporteBase,
          signos_vitales: {
            presion_sistolica_mmhg: parseFloat(document.getElementById("cons-vit-ta_sistolica")?.value) || null,
            presion_diastolica_mmhg: parseFloat(document.getElementById("cons-vit-ta_diastolica")?.value) || null,
            frecuencia_cardiaca_lpm: parseFloat(document.getElementById("cons-vit-fc")?.value) || null,
            frecuencia_respiratoria_rpm: parseFloat(document.getElementById("cons-vit-fr")?.value) || null,
            temperatura: parseFloat(document.getElementById("cons-vit-temperatura")?.value) || null,
            saturacion_o2_pct: parseFloat(document.getElementById("cons-vit-sato2")?.value) || null,
            peso_kg: parseFloat(document.getElementById("cons-vit-peso_kg")?.value) || null,
            talla_cm: parseFloat(document.getElementById("cons-vit-talla_cm")?.value) || null,
            imc: parseFloat(document.getElementById("cons-vit-imc_calc")?.value) || null
          }
        });
        console.log("[agente-clinica] 📤 Aporte VITALES CONSULTA emitido");
      } catch (e) {
        console.warn("[agente-clinica] Error emitiendo vitales consulta:", e);
      }

      // A — Diagnósticos
      try {
        const s = window._consultaState;
        window.kernel.emit("savia:aporte-diagnosticos", {
          ...aporteBase,
          diagnosticos: s?.diagnosticos || [],
          diagnostico_diferencial: s?.iaJSON?.diagnostico_diferencial || [],
          nivel_riesgo: document.getElementById("cons-nivel-riesgo")?.value || "MODERADO",
          impresion_clinica: document.getElementById("cons-impresion-final")?.value?.trim() || "",
          banderas_rojas: s?.iaJSON?.banderas_rojas || []
        });
        console.log("[agente-clinica] 📤 Aporte DIAGNÓSTICOS emitido");
      } catch (e) {
        console.warn("[agente-clinica] Error emitiendo diagnósticos:", e);
      }
    }
  },

  /* ─── HELPERS ─── */
  _recogerRevisionSistemas() {
    const sistemas = window.CONSULTA_SISTEMAS || [];
    const result = {};
    sistemas.forEach(sys => {
      const val = document.getElementById("cons-sys-" + sys.id)?.value?.trim();
      if (val) result[sys.id] = val;
    });
    return result;
  },

  _recogerAntecedentes() {
    const antecedentes = window.CONSULTA_ANTECEDENTES || [];
    const result = {};
    antecedentes.forEach(a => {
      const val = document.getElementById("cons-ant-" + a.id)?.value?.trim();
      if (val) result[a.id] = val;
    });
    return result;
  },

  _recogerExamenFisico() {
    const examen = window.CONSULTA_EXAMEN_FISICO || [];
    const result = {};
    examen.forEach(e => {
      const val = document.getElementById("cons-ef-" + e.id)?.value?.trim();
      if (val) result[e.id] = val;
    });
    return result;
  },

  /* ─── API ─── */
  api: {
    recoger() {
      if (typeof window.recogerClinica === "function") {
        return window.recogerClinica();
      }
      console.warn("[agente-clinica.recoger] recogerClinica no disponible");
      return {};
    },

    constantes() {
      return {
        sistemas: window.CONSULTA_SISTEMAS || [],
        antecedentes: window.CONSULTA_ANTECEDENTES || [],
        examen_fisico: window.CONSULTA_EXAMEN_FISICO || [],
        vitales: window.CONSULTA_VITALES || []
      };
    },

    contarEscalas() {
      if (window.ESCALAS_REGISTRY?._items) {
        return window.ESCALAS_REGISTRY._items.length;
      }
      return 0;
    },

    recalcular() {
      if (typeof window.recalcularTodasLasEscalas === "function") {
        window.recalcularTodasLasEscalas();
        return true;
      }
      return false;
    },

    vitales() {
      const clinica = this.recoger();
      return {
        peso_kg: clinica.peso_kg,
        talla_cm: clinica.talla_cm,
        imc: clinica.imc,
        presion_sistolica_mmhg: clinica.presion_sistolica_mmhg,
        presion_diastolica_mmhg: clinica.presion_diastolica_mmhg,
        frecuencia_cardiaca_lpm: clinica.frecuencia_cardiaca_lpm,
        saturacion_o2_pct: clinica.saturacion_o2_pct
      };
    },

    async aportar() {
      agenteClinica._emitirAporte();
      return this.recoger();
    }
  }
};

export default agenteClinica;
