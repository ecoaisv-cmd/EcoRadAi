/**
 * BOOTSTRAP — Inicialización del kernel y agentes.
 * 
 * Este archivo se carga al final del HTML, después del monolito.
 */

import kernel from "./kernel.js";
import SAVIA from "./savia.js";
import MEMORIA from "./memoria.js";
import contexto from "./contexto.js";

// Adapters
import { agenteTamizaje } from "../adapters/tamizaje-adapter.js";
import { agenteConsulta } from "../adapters/consulta-adapter.js";
import { agenteSuscripciones } from "../adapters/suscripciones-adapter.js";
import { agenteEpisodios } from "../adapters/episodios-adapter.js";
import { agenteEspecialidad } from "../adapters/especialidad-adapter.js";
import { agentePortal } from "../adapters/portal-adapter.js";

/**
 * Inicializa el kernel y registra todos los agentes.
 */
async function bootstrap() {
  console.log("═══════════════════════════════════════════════════");
  console.log("🚀 KERNEL — Inicializando sistema de agentes");
  console.log("═══════════════════════════════════════════════════");
  
  // 1. Esperar a que Supabase esté listo
  let intentos = 0;
  while (!window.supabaseClient && intentos < 30) {
    await new Promise(r => setTimeout(r, 200));
    intentos++;
  }
  
  if (!window.supabaseClient) {
    console.warn("[Kernel] Supabase no disponible, modo degradado");
  }
  
  // 2. Inicializar kernel
  await kernel.init();
  
  // 3. Registrar servicios compartidos
  kernel.registrarServicio("ia", {
    async llamarKimi(prompt) {
      if (typeof window.llamarKimiConsulta === "function") {
        return window.llamarKimiConsulta(prompt);
      }
      throw new Error("Servicio IA no disponible");
    }
  });
  
  kernel.registrarServicio("pdf", {
    descargar: (tipo) => window.descargarPDF?.(tipo),
    descargarLite: () => window.descargarPDFLite?.()
  });
  
  kernel.registrarServicio("firma", {
    generarHash: (t) => window.generarHash?.(t)
  });
  
  // 4. Registrar entidades base
  kernel.registrarEntidad("paciente", {
    async buscar(query) {
      return window.supabaseClient?.rpc("buscar_pacientes", { query });
    },
    async obtener(subjectId) {
      const { data } = await window.supabaseClient
        .from("patients").select("*").eq("subject_id", subjectId).single();
      return data;
    }
  });
  
  kernel.registrarEntidad("medico", {
    async obtener(id) {
      const { data } = await window.supabaseClient
        .from("medicos").select("*").eq("id", id).single();
      return data;
    }
  });
  
  kernel.registrarEntidad("empresa", {
    async listar() {
      const { data } = await window.supabaseClient
        .from("empresas_instituciones").select("*").eq("activo", true);
      return data || [];
    }
  });
  
  // 5. Registrar agentes (adapters)
  await kernel.registrar(agenteTamizaje);
  await kernel.registrar(agenteConsulta);
  await kernel.registrar(agenteSuscripciones);
  await kernel.registrar(agenteEpisodios);
  await kernel.registrar(agenteEspecialidad);
  await kernel.registrar(agentePortal);
  
  // 6. Activar todos los agentes
  await kernel.activarTodos();
  
  // 7. Log final
  console.log("═══════════════════════════════════════════════════");
  console.log("✅ KERNEL listo");
  console.log("   Agentes registrados:", kernel.agentes.size);
  console.log("   Agentes activos:", kernel.activos.size);
  console.log("   Servicios:", kernel.servicios.size);
  console.log("   Entidades:", kernel.entidades.size);
  console.log("═══════════════════════════════════════════════════");
  
  // 8. Exponer API global para debug
  window.EcoRadAi = {
    kernel,
    savia: SAVIA,
    memoria: MEMORIA,
    contexto,
    stats: () => kernel.stats(),
    listar: () => kernel.listar()
  };
  
  console.log("[Kernel] API global: window.EcoRadAi");
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

export default bootstrap;
