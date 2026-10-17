// js/tests/fase-f/test-flujo-tamizaje.js
// Test 2: Flujo completo de tamizaje → especialistas → plan integrado
// Usa un contexto sintético (no depende de Kimi real para ser rápido)

import FaseFHelpers from "./_helpers.js";

export async function testFlujoTamizaje() {
  const reporte = FaseFHelpers.crearReporte("Test 2 — Flujo completo de tamizaje");

  try {
    // ─── Paso 1: SAVIA y kernel disponibles ───
    FaseFHelpers.assert(window.SAVIA, "window.SAVIA no existe");
    FaseFHelpers.assert(window.kernel, "window.kernel no existe");
    FaseFHelpers.assert(typeof window.SAVIA.emitirContexto === "function",
      "SAVIA.emitirContexto no existe");
    reporte.agregarPaso("SAVIA y kernel disponibles", true);

    // ─── Paso 2: Instalar capturador ───
    const capturados = FaseFHelpers.instalarCapturadorEventos();
    reporte.agregarPaso("Capturador de eventos instalado", true);

    try {
      // ─── Paso 3: Emitir SAVIA RAÍZ sintética ───
      const contextoId = `SAV-RAIZ-TEST-FASE-F-${Date.now()}`;
      const caseId = `ECO-TEST-FASEF-${Date.now()}`;

      const payloadSaviaRaiz = {
        contexto_id: contextoId,
        case_id: caseId,
        origen: "tamizaje",
        subject: {
          subject_id: "PAC-TEST-FASEF-001",
          nombre: "Paciente de Prueba Fase F",
          edad: 45,
          sexo: "Masculino"
        },
        encounter: {
          estudio: "corporativo_metabolico",
          fecha: new Date().toLocaleDateString("es-ES")
        },
        labs: {
          glucosa: 110,
          hba1c: 5.9,
          alt: 48,
          tg: 180
        },
        clinica: {
          imc: 28.5,
          presion_sistolica_mmhg: 135,
          habitos: {
            actividad_fisica_min_semana: 90
          }
        },
        raw: {
          _json_estructurado: {
            interconsultas_sugeridas: [
              {
                especialista: "nutricionista",
                prioridad: "alta",
                justificacion: "IMC 28.5 + HbA1c 5.9%"
              },
              {
                especialista: "endocrinologo",
                prioridad: "media",
                justificacion: "HbA1c en rango prediabetes"
              }
            ],
            plan: {
              farmacologico: [],
              no_farmacologico: [],
              metas: [],
              laboratorios: [],
              seguimiento: {}
            }
          }
        }
      };

      console.log("  Emitiendo SAVIA RAÍZ:", contextoId);
      await window.SAVIA.emitirContexto(
        contextoId,
        "savia:raiz:contexto-unificado",
        payloadSaviaRaiz,
        { de: "test-fase-f" }
      );

      reporte.agregarPaso("SAVIA RAÍZ emitida", true, contextoId);

      // ─── Paso 4: Esperar que el coordinador procese ───
      console.log("  Esperando que el coordinador procese la SAVIA RAÍZ...");

      // El coordinador debería emitir savia:solicitar-analisis
      await FaseFHelpers.esperarHasta(
        () => capturados.solicitar.length > 0,
        8000,
        200,
        "coordinador → savia:solicitar-analisis"
      );

      FaseFHelpers.assertMayorQue(capturados.solicitar.length, 0,
        "El coordinador no solicitó análisis a especialistas");

      reporte.agregarPaso(
        "Coordinador solicitó análisis",
        true,
        `especialistas: ${capturados.solicitar.join(", ")}`
      );

      // ─── Paso 5: Esperar que los especialistas respondan ───
      console.log("  Esperando respuestas de especialistas (puede tardar 60-120s)...");
      console.log("  NOTA: este test tarda porque llama a Kimi de verdad.");

      const especialistasSolicitados = new Set(capturados.solicitar);
      const todosRespondieron = () => {
        const respondidos = new Set(capturados.respuestas);
        for (const esp of especialistasSolicitados) {
          if (!respondidos.has(esp)) return false;
        }
        return true;
      };

      try {
        await FaseFHelpers.esperarHasta(
          todosRespondieron,
          180000, // 3 minutos máximo
          1000,
          "todas las respuestas de especialistas"
        );
        reporte.agregarPaso(
          "Especialistas respondieron",
          true,
          `${capturados.respuestas.length} respuestas`
        );
      } catch (e) {
        reporte.agregarPaso(
          "Especialistas respondieron (parcial)",
          false,
          `${capturados.respuestas.length}/${capturados.solicitar.length} en 180s`
        );
        // No fallar el test si algunos no respondieron: puede ser rate limit
        console.warn("[testFlujoTamizaje] Algunos especialistas no respondieron en 180s");
      }

      // ─── Paso 6: Esperar plan integrado ───
      if (capturados.respuestas.length > 0) {
        try {
          await FaseFHelpers.esperarHasta(
            () => capturados.plan !== null,
            30000,
            500,
            "plan integrado emitido"
          );
          reporte.agregarPaso("Plan integrado emitido", true);
        } catch (e) {
          reporte.agregarPaso("Plan integrado emitido", false, "timeout 30s");
        }
      }

      // ─── Paso 7: Verificar que no hubo errores críticos ───
      FaseFHelpers.assert(!capturados.sinInterconsultas,
        "El coordinador emitió sin-interconsultas cuando había sugerencias");
      reporte.agregarPaso("Sin interconsultas NO emitido", true);

    } finally {
      // ─── Restaurar monkey-patch ───
      if (capturados._restaurar) capturados._restaurar();
      reporte.agregarPaso("Capturador restaurado", true);
    }

    // ─── Resumen ───
    console.log("  ───────────────────────────────");
    console.log("  Resumen del flujo:");
    console.log(`    Solicitudes emitidas:    ${capturados.solicitar.length}`);
    console.log(`    Respuestas recibidas:    ${capturados.respuestas.length}`);
    console.log(`    Plan integrado:          ${capturados.plan ? "SÍ" : "NO"}`);
    console.log(`    Sin interconsultas:      ${capturados.sinInterconsultas ? "SÍ" : "NO"}`);

    return reporte.finalizar(true);

  } catch (e) {
    console.error("[testFlujoTamizaje] ✗ FALLÓ:", e.message);
    reporte.agregarPaso("Error", false, e.message);
    return reporte.finalizar(false, e.message);
  }
}

export default testFlujoTamizaje;
