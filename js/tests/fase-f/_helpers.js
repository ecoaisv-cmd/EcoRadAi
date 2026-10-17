// js/tests/fase-f/_helpers.js
// v3 FINAL — buscar agentes en kernel.agentes (confirmado por diagnóstico)

export const FaseFHelpers = {
  // ═══════════════════════════════════════════════════════════
  // ASERCIÓN
  // ═══════════════════════════════════════════════════════════
  assert(condicion, mensaje) {
    if (!condicion) throw new Error(`[ASSERT FALLIDO] ${mensaje}`);
    return true;
  },

  assertEqual(actual, esperado, mensaje) {
    if (actual !== esperado) {
      throw new Error(
        `[ASSERT FALLIDO] ${mensaje}\n  Esperado: ${JSON.stringify(esperado)}\n  Actual:   ${JSON.stringify(actual)}`
      );
    }
    return true;
  },

  assertMayorQue(actual, minimo, mensaje) {
    if (!(actual > minimo)) {
      throw new Error(`[ASSERT FALLIDO] ${mensaje} (${actual} no es > ${minimo})`);
    }
    return true;
  },

  assertIncluye(arr, item, mensaje) {
    if (!Array.isArray(arr) || !arr.includes(item)) {
      throw new Error(`[ASSERT FALLIDO] ${mensaje}\n  Array: ${JSON.stringify(arr)}\n  Buscado: ${item}`);
    }
    return true;
  },

  // ═══════════════════════════════════════════════════════════
  // ESPERA
  // ═══════════════════════════════════════════════════════════
  esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  async esperarHasta(condicion, timeoutMs = 15000, intervaloMs = 200, etiqueta = "condición") {
    const inicio = Date.now();
    while (Date.now() - inicio < timeoutMs) {
      try { if (condicion()) return true; } catch (e) {}
      await FaseFHelpers.esperar(intervaloMs);
    }
    throw new Error(`[TIMEOUT] ${etiqueta} no se cumplió en ${timeoutMs}ms`);
  },

  // ═══════════════════════════════════════════════════════════
  // CAPTURA DE EVENTOS
  // ═══════════════════════════════════════════════════════════
  instalarCapturadorEventos() {
    const capturados = {
      solicitar: [], respuestas: [], plan: null, decision: null,
      sinInterconsultas: false, _restaurar: null
    };
    const savia = window.SAVIA;
    if (!savia) throw new Error("SAVIA no disponible");
    const origPropagar = savia.propagar;
    if (typeof origPropagar === "function") {
      savia.propagar = function (evento) {
        if (evento && evento.tipo) {
          if (evento.tipo === "savia:solicitar-analisis") capturados.solicitar.push(evento.payload?.especialista || "?");
          if (evento.tipo === "especialista:respuesta") capturados.respuestas.push(evento.payload?.especialista || "?");
          if (evento.tipo === "savia:tronco:plan-integrado") capturados.plan = evento.payload;
          if (evento.tipo === "medico:decision-interconsultas") capturados.decision = evento.payload;
          if (evento.tipo === "savia:tronco:sin-interconsultas") capturados.sinInterconsultas = true;
        }
        return origPropagar.apply(this, arguments);
      };
      capturados._restaurar = () => { savia.propagar = origPropagar; };
    }
    return capturados;
  },

  // ═══════════════════════════════════════════════════════════
  // v3 FINAL — kernel.agentes confirmado por diagnóstico
  // ═══════════════════════════════════════════════════════════
  contarAgentes() {
    // Fuente confirmada: kernel.agentes es la Map con los 45 agentes
    const map = window.kernel?.agentes;
    if (!map || typeof map.keys !== "function") {
      return {
        fuente: "ninguna",
        total: 0, especialistas: 0, maestros: 0, raiz: 0,
        detalle: { especialistas: [], maestros: [], raiz: [], todos: [] }
      };
    }

    const ids = [...map.keys()];
    const especialistas = ids.filter(id => id.startsWith("especialista-"));
    const maestros = ids.filter(id =>
      ["agente-coordinador", "agente-investigador", "agente-administrador"].includes(id)
    );
    const raiz = ids.filter(id =>
      id.startsWith("agente-") &&
      !maestros.includes(id) &&
      ["agente-paciente", "agente-clinica", "agente-laboratorio",
       "agente-imagen", "agente-trabajo-social", "agente-savia-consolidadora"].includes(id)
    );

    return {
      fuente: "kernel.agentes",
      total: ids.length,
      especialistas: especialistas.length,
      maestros: maestros.length,
      raiz: raiz.length,
      detalle: { especialistas, maestros, raiz, todos: ids }
    };
  },

  // ═══════════════════════════════════════════════════════════
  // TEXTO CON ORTOGRAFÍA SANA
  // ═══════════════════════════════════════════════════════════
  textoPruebaConTildes() {
    return "Evaluación de la función renal. El riñón derecho mide 10 cm. " +
           "Diagnóstico: hipertensión arterial. Presión arterial elevada. " +
           "Se recomienda nutrición adecuada y sueño reparador. " +
           "El niño presenta señal de deshidratación leve.";
  },

  // ═══════════════════════════════════════════════════════════
  // REPORTE DE TEST
  // ═══════════════════════════════════════════════════════════
  crearReporte(nombre) {
    const pasos = [];
    const inicio = Date.now();
    return {
      nombre, pasos, ok: false, error: null, duracion_ms: 0,
      agregarPaso(nombrePaso, ok, mensaje) {
        pasos.push({ nombre: nombrePaso, ok, mensaje: mensaje || "" });
        console.log(`  ${ok ? "✓" : "✗"} ${nombrePaso}${mensaje ? " — " + mensaje : ""}`);
      },
      finalizar(ok, error) {
        this.ok = ok; this.error = error || null;
        this.duracion_ms = Date.now() - inicio;
        return this;
      }
    };
  }
};

export default FaseFHelpers;
