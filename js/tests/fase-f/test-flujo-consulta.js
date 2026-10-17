// js/tests/fase-f/test-flujo-consulta.js
// Test 3: Flujo de consulta SOAP → interconsultas sugeridas → plan integrado
// No llama a Kimi: usa el JSON ya estructurado y dispara la UI directamente

import FaseFHelpers from "./_helpers.js";

export async function testFlujoConsulta() {
  const reporte = FaseFHelpers.crearReporte("Test 3 — Flujo de consulta SOAP");

  try {
    // ─── Paso 1: Dependencias ───
    FaseFHelpers.assert(window.SAVIA, "window.SAVIA no existe");
    FaseFHelpers.assert(typeof window.sugerirInterconsultasDesdeConsulta === "function",
      "sugerirInterconsultasDesdeConsulta no está expuesta");
    FaseFHelpers.assert(typeof window.consultaEjecutarInterconsultas === "function",
      "consultaEjecutarInterconsultas no está expuesta");
    reporte.agregarPaso("Funciones de Fase D disponibles", true);

    // ─── Paso 2: Verificar sección UI ───
    const sec = document.getElementById("sec-consulta-interconsultas");
    FaseFHelpers.assert(sec, "Sección #sec-consulta-interconsultas no existe en el DOM");
    reporte.agregarPaso("Sección UI presente", true);

    // ─── Paso 3: Simular JSON de análisis ───
    const jsonSimulado = {
      impresion_clinica: "Paciente con síndrome metabólico y resistencia a la insulina.",
      diagnosticos: [
        { cie10: "E88.81", descripcion: "Síndrome metabólico", tipo: "principal", certeza: "clinico" }
      ],
      interconsultas_sugeridas: [
        {
          especialista: "nutricionista",
          prioridad: "alta",
          justificacion: "IMC 31.2 con resistencia a insulina (HOMA-IR 3.1)"
        },
        {
          especialista: "endocrinologo",
          prioridad: "alta",
          justificacion: "HbA1c 5.9% en rango prediabetes"
        },
        {
          especialista: "cardiologo",
          prioridad: "media",
          justificacion: "PA 135/85 mmHg con LDL 145 mg/dL"
        }
      ]
    };

    // ─── Paso 4: Disparar sugerencias ───
    console.log("  Disparando sugerirInterconsultasDesdeConsulta...");
    const lista = window.sugerirInterconsultasDesdeConsulta(jsonSimulado, {
      caseId: `CONS-TEST-FASEF-${Date.now()}`,
      contextoId: `SAV-RAIZ-CONS-FASEF-${Date.now()}`
    });

    FaseFHelpers.assert(Array.isArray(lista), "La función no devolvió un array");
    FaseFHelpers.assertEqual(lista.length, 3, "Deben ser 3 sugerencias");
    reporte.agregarPaso("Sugerencias renderizadas", true, `${lista.length} interconsultas`);

    // ─── Paso 5: Verificar que la UI se mostró ───
    await FaseFHelpers.esperar(300);
    FaseFHelpers.assertEqual(sec.style.display, "", "La sección debe estar visible");
    reporte.agregarPaso("Sección visible", true);

    const items = document.querySelectorAll("#consulta-ic-lista .ic-item");
    FaseFHelpers.assertEqual(items.length, 3, `Deben renderizarse 3 items (actual ${items.length})`);
    reporte.agregarPaso("Items renderizados", true, `${items.length} items`);

    // ─── Paso 6: Verificar badge ───
    const badge = document.getElementById("consulta-ic-badge");
    FaseFHelpers.assert(badge, "Badge no existe");
    FaseFHelpers.assertEqual(badge.textContent, "3", "Badge debe mostrar '3'");
    reporte.agregarPaso("Badge actualizado", true);

    // ─── Paso 7: Verificar contador de resumen ───
    const count = document.getElementById("consulta-ic-count");
    FaseFHelpers.assert(count, "Contador de resumen no existe");
    console.log("  Resumen:", count.textContent);
    reporte.agregarPaso("Resumen de selección", true, count.textContent);

    // ─── Paso 8: Instalar capturador de eventos ───
    const capturados = FaseFHelpers.instalarCapturadorEventos();
    reporte.agregarPaso("Capturador instalado", true);

    try {
      // ─── Paso 9: Ejecutar interconsultas (sin Kimi real, timeout corto) ───
      // Este paso emite la decisión al coordinador; el coordinador puede
      // no tener el contexto (test sintético), así que esperamos al timeout
      // de 6s y verificamos que la UI se libere correctamente.
      console.log("  Ejecutando interconsultas (timeout esperado 6s)...");

      const promesaEjecucion = window.consultaEjecutarInterconsultas();

      await FaseFHelpers.esperarHasta(
        () => capturados.decision !== null,
        5000,
        200,
        "medico:decision-interconsultas"
      );

      FaseFHelpers.assert(capturados.decision, "No se emitió la decisión");
      FaseFHelpers.assert(Array.isArray(capturados.decision.interconsultas),
        "La decisión no tiene interconsultas");
      FaseFHelpers.assertMayorQue(capturados.decision.interconsultas.length, 0,
        "La decisión no tiene interconsultas autorizadas");

      reporte.agregarPaso(
        "Decisión emitida al coordinador",
        true,
        `${capturados.decision.interconsultas.length} interconsultas`
      );

      // Esperar a que la UI se libere (por timeout de seguridad de 6s)
      await FaseFHelpers.esperar(7000);

      const btnEjecutar = document.getElementById("btn-ejecutar-interconsultas-consulta");
      if (btnEjecutar) {
        FaseFHelpers.assert(!btnEjecutar.disabled,
          "El botón debería estar habilitado después del timeout");
        reporte.agregarPaso("Botón rehabilitado tras timeout", true);
      }

      // Esperar que la promesa termine
      try { await promesaEjecucion; } catch (e) { /* ignorar */ }

    } finally {
      if (capturados._restaurar) capturados._restaurar();
      reporte.agregarPaso("Capturador restaurado", true);
    }

    // ─── Paso 10: Verificar que la sección de plan integrado existe ───
    const planCard = document.getElementById("consulta-ic-plan-card");
    FaseFHelpers.assert(planCard, "Card de plan integrado no existe");
    reporte.agregarPaso("Card de plan integrado presente", true);

    // ─── Paso 11: Limpieza ───
    // Ocultar la sección para no dejar basura visual
    sec.style.display = "none";
    reporte.agregarPaso("Limpieza", true, "sección ocultada");

    return reporte.finalizar(true);

  } catch (e) {
    console.error("[testFlujoConsulta] ✗ FALLÓ:", e.message);
    reporte.agregarPaso("Error", false, e.message);
    return reporte.finalizar(false, e.message);
  }
}

export default testFlujoConsulta;
