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
  
  // ESPERAR A QUE SUPABASE ESTÉ LISTO
  console.log("[Kernel] Esperando a que Supabase esté listo...");
  
  let intentos = 0;
  const MAX_INTENTOS = 100;
  
  while (!window.supabaseClient && intentos < MAX_INTENTOS) {
    await new Promise(r => setTimeout(r, 200));
    intentos++;
    if (intentos % 10 === 0) {
      console.log(`[Kernel] Esperando Supabase... (${intentos * 200}ms)`);
    }
  }
  
  if (!window.supabaseClient) {
    console.warn("[Kernel] Supabase no disponible tras 20s, modo degradado");
  } else {
    console.log("[Kernel] ✓ Supabase disponible tras", intentos * 200, "ms");
  }
  
  // ESPERAR A QUE EL USUARIO ESTÉ AUTENTICADO
  console.log("[Kernel] Esperando a que el usuario esté autenticado...");
  
  let intentosUser = 0;
  const MAX_INTENTOS_USER = 150;
  
  while (!window.usuarioActual && intentosUser < MAX_INTENTOS_USER) {
    await new Promise(r => setTimeout(r, 200));
    intentosUser++;
    if (intentosUser % 15 === 0) {
      console.log(`[Kernel] Esperando usuario... (${intentosUser * 200}ms)`);
    }
  }
  
  if (!window.usuarioActual) {
    console.warn("[Kernel] Usuario no autenticado tras 30s. Registrando solo agentes públicos.");
  } else {
    console.log("[Kernel] ✓ Usuario autenticado:", window.usuarioActual.email, "| Rol:", window.usuarioActual.rol);
  }
  
  // INICIALIZAR KERNEL
  await kernel.init();
  
  // REGISTRAR SERVICIOS COMPARTIDOS
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
  
  // REGISTRAR ENTIDADES BASE
  kernel.registrarEntidad("paciente", {
    async buscar(query) {
      if (!window.supabaseClient) return null;
      return window.supabaseClient.rpc("buscar_pacientes", { query });
    },
    async obtener(subjectId) {
      if (!window.supabaseClient) return null;
      const { data } = await window.supabaseClient
        .from("patients").select("*").eq("subject_id", subjectId).single();
      return data;
    }
  });
  
  kernel.registrarEntidad("medico", {
    async obtener(id) {
      if (!window.supabaseClient) return null;
      const { data } = await window.supabaseClient
        .from("medicos").select("*").eq("id", id).single();
      return data;
    }
  });
  
  kernel.registrarEntidad("empresa", {
    async listar() {
      if (!window.supabaseClient) return [];
      const { data } = await window.supabaseClient
        .from("empresas_instituciones").select("*").eq("activo", true);
      return data || [];
    }
  });
  
  // REGISTRAR AGENTES (ADAPTERS)
  await kernel.registrar(agenteTamizaje);
  await kernel.registrar(agenteConsulta);
  await kernel.registrar(agenteSuscripciones);
  await kernel.registrar(agenteEpisodios);
  await kernel.registrar(agenteEspecialidad);
  await kernel.registrar(agentePortal);
  
  // ACTIVAR TODOS LOS AGENTES
  await kernel.activarTodos();
  
  // LOG FINAL
  console.log("═══════════════════════════════════════════════════");
  console.log("✅ KERNEL listo");
  console.log("   Agentes registrados:", kernel.agentes.size);
  console.log("   Agentes activos:", kernel.activos.size);
  console.log("   Servicios:", kernel.servicios.size);
  console.log("   Entidades:", kernel.entidades.size);
  console.log("═══════════════════════════════════════════════════");
  
  // EXPONER API GLOBAL
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
