// js/tests/fase-f/test-kernel-45.js
// Test 1: Verifica que el kernel tenga los 45 agentes registrados y activos

import FaseFHelpers from "./_helpers.js";

export async function testKernel45() {
  const reporte = FaseFHelpers.crearReporte("Test 1 — Kernel con 45 agentes");

  try {
    // ─── Paso 1: Kernel disponible ───
    FaseFHelpers.assert(window.kernel, "window.kernel no existe");
    reporte.agregarPaso("window.kernel disponible", true);

    // ─── Paso 2: Entidades registradas ───
    FaseFHelpers.assert(window.kernel.entidades, "window.kernel.entidades no existe");
    const conteo = FaseFHelpers.contarAgentes();

    console.log("  Conteo de agentes:", conteo);

    FaseFHelpers.assertEqual(conteo.total, 45, `Total de agentes (esperado 45, actual ${conteo.total})`);
    reporte.agregarPaso("45 agentes registrados", true, `total=${conteo.total}`);

    FaseFHelpers.assertEqual(conteo.especialistas, 30, `Especialistas (esperado 30, actual ${conteo.especialistas})`);
    reporte.agregarPaso("30 especialistas registrados", true, `especialistas=${conteo.especialistas}`);

    FaseFHelpers.assertEqual(conteo.maestros, 3, `Maestros TRONCO (esperado 3, actual ${conteo.maestros})`);
    reporte.agregarPaso("3 agentes maestros TRONCO", true, `maestros=${conteo.maestros}`);

    // ─── Paso 3: Los 30 especialistas están suscritos ───
    FaseFHelpers.assert(window.SAVIA, "window.SAVIA no existe");
    FaseFHelpers.assert(typeof window.SAVIA.suscriptoresDe === "function",
      "SAVIA.suscriptoresDe no existe");

    const suscritos = window.SAVIA.suscriptoresDe("savia:solicitar-analisis");
    const especialistasSuscritos = (suscritos || []).filter(id => id.startsWith("especialista-"));

    FaseFHelpers.assertEqual(especialistasSuscritos.length, 30,
      `Especialistas suscritos a savia:solicitar-analisis (esperado 30, actual ${especialistasSuscritos.length})`);
    reporte.agregarPaso("30 especialistas suscritos", true, `suscritos=${especialistasSuscritos.length}`);

    // ─── Paso 4: Todos los servicios críticos ───
    if (window.kernel.servicios) {
      const servicios = [...window.kernel.servicios.keys()];
      FaseFHelpers.assert(servicios.length >= 3,
        `Servicios registrados (esperado ≥3, actual ${servicios.length})`);
      reporte.agregarPaso("Servicios inicializados", true, servicios.join(", "));
    }

    // ─── Paso 5: Verificar que SAVIA está en kernel.entidades (Fix) ───
    if (window.kernel.entidades.has("savia")) {
      reporte.agregarPaso("SAVIA en kernel.entidades", true, "fix aplicado");
    } else {
      reporte.agregarPaso("SAVIA en kernel.entidades", false, "fix NO aplicado (no crítico)");
    }

    // ─── Paso 6: Listado completo de especialistas ───
    console.log("  Especialistas registrados:");
    conteo.detalle.especialistas.sort().forEach(id => console.log(`    • ${id}`));

    return reporte.finalizar(true);

  } catch (e) {
    console.error("[testKernel45] ✗ FALLÓ:", e.message);
    reporte.agregarPaso("Error", false, e.message);
    return reporte.finalizar(false, e.message);
  }
}

export default testKernel45;
