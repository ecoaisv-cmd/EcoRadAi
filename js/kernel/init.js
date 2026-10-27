/**
 * ═══════════════════════════════════════════════════════════════════
 * BOOTSTRAP — Inicialización del kernel y agentes
 * Versión: 2.0.0 — Sprint 3 Fase F (Árbol de Agentes v25.0)
 * ═══════════════════════════════════════════════════════════════════
 */

import kernel from "./kernel.js";
import SAVIA from "./savia.js";
import MEMORIA from "./memoria.js";
import contexto from "./contexto.js";

// ─── Adapters del Sprint 1 ───
import { agenteTamizaje } from "../adapters/tamizaje-adapter.js";
import { agenteConsulta } from "../adapters/consulta-adapter.js";
import { agenteSuscripciones } from "../adapters/suscripciones-adapter.js";
import { agenteEpisodios } from "../adapters/episodios-adapter.js";
import { agenteEspecialidad } from "../adapters/especialidad-adapter.js";
import { agentePortal } from "../adapters/portal-adapter.js";

// ─── Agentes de RAÍZ (Sprint 2) ───
import { agentePaciente } from "../agentes/raiz/paciente.js";
import { agenteClinica } from "../agentes/raiz/clinica.js";
import { agenteLaboratorio } from "../agentes/raiz/laboratorio.js";
import { agenteImagen } from "../agentes/raiz/imagen.js";
import { agenteTrabajoSocial } from "../agentes/raiz/trabajo-social.js";

// ═══════════════════════════════════════════════════════════════════
// SPRINT 3 FASE F — Las 2 consolidadoras + guardián
// ═══════════════════════════════════════════════════════════════════
import { agenteConsolidadoraTamizaje } from "../agentes/raiz/savia-consolidadora-tamizaje.js";
import { agenteConsolidadoraConsulta } from "../agentes/raiz/savia-consolidadora-consulta.js";
import { agenteGuardian } from "../agentes/raiz/guardian.js";

// ─── Motor de interconsultas ───
import "../agentes/tronco/_motor-interconsultas.js";

// ─── Agentes maestros del TRONCO ───
import { agenteCoordinador } from "../agentes/tronco/coordinador.js";
import { agenteInvestigador } from "../agentes/tronco/investigador.js";
import { agenteAdministrador } from "../agentes/tronco/administrador.js";

// ═══════════════════════════════════════════════════════════════════
// SPRINT 3 FASE E — 30 especialistas
// ═══════════════════════════════════════════════════════════════════
import { agenteEspecialistaNutricionista }          from "../agentes/tronco/especialistas/nutricionista.js";
import { agenteEspecialistaFisico }                 from "../agentes/tronco/especialistas/fisico.js";
import { agenteEspecialistaPsicologo }              from "../agentes/tronco/especialistas/psicologo.js";
import { agenteEspecialistaCardiologo }             from "../agentes/tronco/especialistas/cardiologo.js";
import { agenteEspecialistaEndocrinologo }          from "../agentes/tronco/especialistas/endocrinologo.js";
import { agenteEspecialistaNefrologo }              from "../agentes/tronco/especialistas/nefrologo.js";
import { agenteEspecialistaHepatologo }             from "../agentes/tronco/especialistas/hepatologo.js";
import { agenteEspecialistaGinecologo }             from "../agentes/tronco/especialistas/ginecologo.js";
import { agenteEspecialistaMastologo }              from "../agentes/tronco/especialistas/mastologo.js";
import { agenteEspecialistaPediatra }               from "../agentes/tronco/especialistas/pediatra.js";
import { agenteEspecialistaInternista }             from "../agentes/tronco/especialistas/internista.js";
import { agenteEspecialistaRadiologo }              from "../agentes/tronco/especialistas/radiologo.js";
import { agenteEspecialistaNeurologo }              from "../agentes/tronco/especialistas/neurologo.js";
import { agenteEspecialistaNeurologoPediatrico }    from "../agentes/tronco/especialistas/neurologo_pediatrico.js";
import { agenteEspecialistaPsiquiatraInfantil }     from "../agentes/tronco/especialistas/psiquiatra_infantil.js";
import { agenteEspecialistaFonoaudiologo }          from "../agentes/tronco/especialistas/fonoaudiologo.js";
import { agenteEspecialistaTerapistaOcupacional }   from "../agentes/tronco/especialistas/terapista_ocupacional.js";
import { agenteEspecialistaNeuropsicologo }         from "../agentes/tronco/especialistas/neuropsicologo.js";
import { agenteEspecialistaPsiquiatra }             from "../agentes/tronco/especialistas/psiquiatra.js";
import { agenteEspecialistaNeumologo }              from "../agentes/tronco/especialistas/neumologo.js";
import { agenteEspecialistaAlergologo }             from "../agentes/tronco/especialistas/alergologo.js";
import { agenteEspecialistaTerapistaRespiratorio }  from "../agentes/tronco/especialistas/terapista_respiratorio.js";
import { agenteEspecialistaTraumatologo }           from "../agentes/tronco/especialistas/traumatologo.js";
import { agenteEspecialistaReumatologo }            from "../agentes/tronco/especialistas/reumatologo.js";
import { agenteEspecialistaFisioterapeuta }         from "../agentes/tronco/especialistas/fisioterapeuta.js";
import { agenteEspecialistaDermatologo }            from "../agentes/tronco/especialistas/dermatologo.js";
import { agenteEspecialistaOcupacional }            from "../agentes/tronco/especialistas/ocupacional.js";
import { agenteEspecialistaUrologo }                from "../agentes/tronco/especialistas/urologo.js";
import { agenteEspecialistaOncologo }               from "../agentes/tronco/especialistas/oncologo.js";
import { agenteEspecialistaOftalmologo }            from "../agentes/tronco/especialistas/oftalmologo.js";

const especialistasFaseE = [
  agenteEspecialistaNutricionista, agenteEspecialistaFisico, agenteEspecialistaPsicologo,
  agenteEspecialistaCardiologo, agenteEspecialistaEndocrinologo, agenteEspecialistaNefrologo,
  agenteEspecialistaHepatologo, agenteEspecialistaGinecologo, agenteEspecialistaMastologo,
  agenteEspecialistaPediatra, agenteEspecialistaInternista, agenteEspecialistaRadiologo,
  agenteEspecialistaNeurologo, agenteEspecialistaNeurologoPediatrico, agenteEspecialistaPsiquiatraInfantil,
  agenteEspecialistaFonoaudiologo, agenteEspecialistaTerapistaOcupacional, agenteEspecialistaNeuropsicologo,
  agenteEspecialistaPsiquiatra, agenteEspecialistaNeumologo, agenteEspecialistaAlergologo,
  agenteEspecialistaTerapistaRespiratorio, agenteEspecialistaTraumatologo, agenteEspecialistaReumatologo,
  agenteEspecialistaFisioterapeuta, agenteEspecialistaDermatologo, agenteEspecialistaOcupacional,
  agenteEspecialistaUrologo, agenteEspecialistaOncologo, agenteEspecialistaOftalmologo
];

// ─── Registro masivo de especialistas ───
console.log(`[Kernel] Registrando ${especialistasFaseE.length} especialistas...`);
let especialistasRegistrados = 0;
for (const esp of especialistasFaseE) {
  try {
    await kernel.registrar(esp);
    especialistasRegistrados++;
  } catch (e) {
    console.error(`[Kernel] Error registrando ${esp.id}:`, e.message);
  }
}
console.log(`[Kernel] ✓ ${especialistasRegistrados}/${especialistasFaseE.length} especialistas registrados`);

// ═══════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════
async function bootstrap() {
  console.log("═══════════════════════════════════════════════════");
  console.log("🚀 KERNEL v2.0.0 — Árbol de Agentes v25.0");
  console.log("═══════════════════════════════════════════════════");

  // ─── Esperar Supabase ───
  console.log("[Kernel] Esperando Supabase...");
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
    console.warn("[Kernel] ⚠️ Supabase no disponible tras 20s");
  } else {
    console.log("[Kernel] ✓ Supabase disponible tras", intentos * 200, "ms");
  }

  // ─── Esperar usuario ───
  console.log("[Kernel] Esperando usuario autenticado...");
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
    console.warn("[Kernel] ⚠️ Usuario no autenticado tras 30s");
  } else {
    console.log("[Kernel] ✓ Usuario:", window.usuarioActual.email, "| Rol:", window.usuarioActual.rol);
  }

  // ─── Init kernel ───
  await kernel.init();

  // ─── Servicios ───
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

  // ─── Entidades ───
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

  // ─── Adaptadores ───
  console.log("[Kernel] Registrando adapters...");
  await kernel.registrar(agenteTamizaje);
  await kernel.registrar(agenteConsulta);
  await kernel.registrar(agenteSuscripciones);
  await kernel.registrar(agenteEpisodios);
  await kernel.registrar(agenteEspecialidad);
  await kernel.registrar(agentePortal);

  // ─── Agentes RAÍZ ───
  console.log("[Kernel] Registrando agentes RAÍZ (8)...");
  await kernel.registrar(agentePaciente);
  await kernel.registrar(agenteClinica);
  await kernel.registrar(agenteLaboratorio);
  await kernel.registrar(agenteImagen);
  await kernel.registrar(agenteTrabajoSocial);

  // ═══ FASE F: los 3 nuevos ═══
  await kernel.registrar(agenteConsolidadoraTamizaje);
  await kernel.registrar(agenteConsolidadoraConsulta);
  await kernel.registrar(agenteGuardian);

  console.log("[Kernel] ✓ 8 agentes RAÍZ registrados (5 base + 2 consolidadoras + guardián)");

  // ─── Agentes TRONCO maestros ───
  console.log("[Kernel] Registrando agentes TRONCO maestros...");
  await kernel.registrar(agenteCoordinador);
  await kernel.registrar(agenteInvestigador);
  await kernel.registrar(agenteAdministrador);

  // ─── Activar todos ───
  await kernel.activarTodos();

  // ─── Log final ───
  const stats = kernel.stats();
  console.log("═══════════════════════════════════════════════════");
  console.log("✅ KERNEL listo");
  console.log("   Agentes registrados:", stats.agentes_registrados);
  console.log("   Agentes activos:", stats.agentes_activos);
  console.log("   Servicios:", stats.servicios);
  console.log("   Entidades:", stats.entidades);
  console.log("═══════════════════════════════════════════════════");

  // ─── API global ───
  window.EcoRadAi = {
    kernel,
    savia: SAVIA,
    memoria: MEMORIA,
    contexto,

    stats: () => kernel.stats(),
    health: () => {
      const s = kernel.stats();
      const agentes = kernel.listar();
      return {
        ...s,
        por_capa: {
          raiz: agentes.filter(a => a.capa === "raiz").length,
          tronco: agentes.filter(a => a.capa === "tronco").length,
          fruto: agentes.filter(a => a.capa === "fruto").length
        },
        version: "v25.0-faseF"
      };
    },

    listar: () => kernel.listar().map(a => a.id),
    listarFull: () => kernel.listar(),
    obtener: (id) => kernel.obtener(id),
    porCapa: (capa) => kernel.listar(capa).map(a => a.id),
    porDominio: (dominio) => kernel.listar({ dominio }).map(a => a.id),

    emit: (evt, data) => kernel.emit(evt, data),
    on: (evt, cb) => kernel.on(evt, cb),

    saviaStats: () => SAVIA.stats(),
    saviaListar: () => SAVIA.listar(),
    suscriptoresDe: (tipo) => SAVIA.suscriptoresDe(tipo),
    historialDeContexto: (contexto_id) => SAVIA.historialDeContexto(contexto_id)
  };

  console.log("[Kernel] API global: window.EcoRadAi");
  console.log("[Kernel] Prueba: window.EcoRadAi.health()");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

export default bootstrap;
