/**
 * ═══════════════════════════════════════════════════════════════
 * GENERADOR DE ESPECIALISTAS — Sprint 3 Fase E
 * ═══════════════════════════════════════════════════════════════
 * 
 * Genera los 30 archivos de agentes especialistas en:
 *   js/agentes/tronco/especialistas/
 * 
 * Uso:
 *   node scripts/generar-especialistas.js
 * 
 * Cada especialista:
 *   - Escucha savia:solicitar-analisis filtrado por su key
 *   - Llama a Kimi con runInterconsultaDesdeSavia()
 *   - Emite especialista:respuesta al coordinador
 *   - Se suscribe a SAVIA en su init()
 * ═══════════════════════════════════════════════════════════════
 */

const fs = require("fs");
const path = require("path");

// ═══════════════════════════════════════════════════════════════
// LOS 30 ESPECIALISTAS
// ═══════════════════════════════════════════════════════════════
const ESPECIALISTAS = [
  { key: "nutricionista",           nombre: "IA-Nutricionista",           rol: "Nutrición",              dominio: "nutricion" },
  { key: "fisico",                  nombre: "IA-Físico",                  rol: "Medicina Deportiva",     dominio: "deporte" },
  { key: "psicologo",               nombre: "IA-Psicólogo",               rol: "Psicología",             dominio: "psicologia" },
  { key: "cardiologo",              nombre: "IA-Cardiólogo",              rol: "Cardiología",            dominio: "cardiologia" },
  { key: "endocrinologo",           nombre: "IA-Endocrinólogo",           rol: "Endocrinología",         dominio: "endocrinologia" },
  { key: "nefrologo",               nombre: "IA-Nefrólogo",               rol: "Nefrología",             dominio: "nefrologia" },
  { key: "hepatologo",              nombre: "IA-Hepatólogo",              rol: "Hepatología",            dominio: "hepatologia" },
  { key: "ginecologo",              nombre: "IA-Ginecólogo",              rol: "Ginecología",            dominio: "ginecologia" },
  { key: "mastologo",               nombre: "IA-Mastólogo",               rol: "Mastología",             dominio: "mastologia" },
  { key: "pediatra",                nombre: "IA-Pediatra",                rol: "Pediatría",              dominio: "pediatria" },
  { key: "internista",              nombre: "IA-Internista",              rol: "Medicina Interna",       dominio: "medicina_interna" },
  { key: "radiologo",               nombre: "IA-Radiólogo",               rol: "Radiología",             dominio: "radiologia" },
  { key: "neurologo",               nombre: "IA-Neurólogo",               rol: "Neurología",             dominio: "neurologia" },
  { key: "neurologo_pediatrico",    nombre: "IA-Neurólogo Pediátrico",    rol: "Neurología Pediátrica",  dominio: "neurologia_pediatrica" },
  { key: "psiquiatra_infantil",     nombre: "IA-Psiquiatra Infantil",     rol: "Psiquiatría Infantil",   dominio: "psiquiatria_infantil" },
  { key: "fonoaudiologo",           nombre: "IA-Fonoaudiólogo",           rol: "Fonoaudiología",         dominio: "fonoaudiologia" },
  { key: "terapista_ocupacional",   nombre: "IA-Terapista Ocupacional",   rol: "Terapia Ocupacional",    dominio: "terapia_ocupacional" },
  { key: "neuropsicologo",          nombre: "IA-Neuropsicólogo",          rol: "Neuropsicología",        dominio: "neuropsicologia" },
  { key: "psiquiatra",              nombre: "IA-Psiquiatra",              rol: "Psiquiatría",            dominio: "psiquiatria" },
  { key: "neumologo",               nombre: "IA-Neumólogo",               rol: "Neumología",             dominio: "neumologia" },
  { key: "alergologo",              nombre: "IA-Alergólogo",              rol: "Alergología",            dominio: "alergologia" },
  { key: "terapista_respiratorio",  nombre: "IA-Terapista Respiratorio",  rol: "Terapia Respiratoria",   dominio: "terapia_respiratoria" },
  { key: "traumatologo",            nombre: "IA-Traumatólogo",            rol: "Traumatología",          dominio: "traumatologia" },
  { key: "reumatologo",             nombre: "IA-Reumatólogo",             rol: "Reumatología",           dominio: "reumatologia" },
  { key: "fisioterapeuta",          nombre: "IA-Fisioterapeuta",          rol: "Fisioterapia",           dominio: "fisioterapia" },
  { key: "dermatologo",             nombre: "IA-Dermatólogo",             rol: "Dermatología",           dominio: "dermatologia" },
  { key: "ocupacional",             nombre: "IA-Médico Ocupacional",      rol: "Medicina Ocupacional",   dominio: "medicina_ocupacional" },
  { key: "urologo",                 nombre: "IA-Urólogo",                 rol: "Urología",               dominio: "urologia" },
  { key: "oncologo",                nombre: "IA-Oncólogo",                rol: "Oncología",              dominio: "oncologia" },
  { key: "oftalmologo",             nombre: "IA-Oftalmólogo",             rol: "Oftalmología",           dominio: "oftalmologia" }
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Convierte "nutricionista" → "Nutricionista"
 * Convierte "neurologo_pediatrico" → "NeurologoPediatrico"
 */
function pascalCase(str) {
  return str
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

// ═══════════════════════════════════════════════════════════════
// PLANTILLA DEL ARCHIVO DE ESPECIALISTA
// ═══════════════════════════════════════════════════════════════

function generarPlantilla(esp) {
  const nombreExport = `agenteEspecialista${pascalCase(esp.key)}`;

  return `/**
 * ═══════════════════════════════════════════════════════════════
 * Agente Especialista: ${esp.nombre}
 * ═══════════════════════════════════════════════════════════════
 * 
 * Sprint 3 — Fase E
 * Capa: TRONCO
 * Dominio: ${esp.dominio}
 * 
 * Responsabilidades:
 *   - Escucha savia:solicitar-analisis filtrado por su key ("${esp.key}")
 *   - Llama a Kimi con el prompt PROMPTS_INTERCONSULTA["${esp.key}"]
 *   - Emite especialista:respuesta al coordinador
 * 
 * Método obligatorio: recibir(evento) — SAVIA lo invoca en broadcast
 * Suscripción: en su propio init() con SAVIA.suscribir(id, tipos)
 * ═══════════════════════════════════════════════════════════════
 */

import SAVIA from "../../../kernel/savia.js";
import { runInterconsultaDesdeSavia } from "../_motor-interconsultas.js";

export const ${nombreExport} = {
  // ─── Identidad ───
  id: "especialista-${esp.key}",
  nombre: "${esp.nombre}",
  capa: "tronco",
  tipo: "especialista",
  dominio: "${esp.dominio}",
  version: "1.0.0",
  activo: true,

  // ─── Suscripciones a SAVIA ───
  suscripciones: ["savia:solicitar-analisis"],

  // ─── Inicialización ───
  async init() {
    console.log(\`[\${this.id}] Inicializando especialista...\`);

    // Suscripción automática a SAVIA
    // SAVIA.suscribir(agenteId, tipos) — el agente debe estar registrado antes
    if (typeof SAVIA.suscribir === "function") {
      try {
        SAVIA.suscribir(this.id, this.suscripciones);
        console.log(\`[\${this.id}] ✓ Suscrito a:\`, this.suscripciones);
      } catch (e) {
        console.warn(\`[\${this.id}] Error en suscripción:\`, e.message);
      }
    } else {
      console.warn(\`[\${this.id}] SAVIA.suscribir no disponible\`);
    }

    return true;
  },

  async activar() {
    console.log(\`[\${this.id}] Activado\`);
    return true;
  },

  // ─── Recepción de eventos (método OBLIGATORIO) ───
  async recibir(evento) {
    const { tipo, payload } = evento || {};

    // Filtrar por tipo
    if (tipo !== "savia:solicitar-analisis") return null;

    // Filtrar por especialista (solo responder a solicitudes para mí)
    if (!payload || payload.especialista !== "${esp.key}") return null;

    console.log(\`[\${this.id}] ▶ Solicitud recibida para contexto:\`, payload.contexto_id);

    return await this._ejecutarAnalisis(payload);
  },

  // ─── Ejecución interna ───
  async _ejecutarAnalisis(payload) {
    const contextoId = payload.contexto_id;

    try {
      // 1. Recuperar la savia normalizada del payload
      const savia = payload.savia_raw || payload.savia || null;
      if (!savia) {
        throw new Error("No hay savia en el payload");
      }

      // 2. Ejecutar interconsulta con Kimi
      console.log(\`[\${this.id}] → Ejecutando análisis con Kimi...\`);
      const resultado = await runInterconsultaDesdeSavia(savia, "${esp.key}");
      console.log(\`[\${this.id}] ✓ Análisis completado\`);

      // 3. Emitir respuesta al coordinador
      await SAVIA.emitirContexto(
        contextoId,
        "especialista:respuesta",
        {
          contexto_id: contextoId,
          especialista: "${esp.key}",
          nombre: this.nombre,
          rol: "${esp.rol}",
          resultado: resultado,
          timestamp: new Date().toISOString()
        },
        { de: this.id }
      );
      console.log(\`[\${this.id}] ✓ Respuesta emitida\`);

      return resultado;

    } catch (e) {
      console.error(\`[\${this.id}] ✗ Error:\`, e.message);

      // Emitir respuesta con error (para que el coordinador no espere)
      try {
        await SAVIA.emitirContexto(
          contextoId,
          "especialista:respuesta",
          {
            contexto_id: contextoId,
            especialista: "${esp.key}",
            nombre: this.nombre,
            rol: "${esp.rol}",
            error: e.message || "Error desconocido",
            timestamp: new Date().toISOString()
          },
          { de: this.id }
        );
      } catch (e2) {
        console.error(\`[\${this.id}] ✗ Error emitiendo error:\`, e2.message);
      }

      return null;
    }
  }
};

export default ${nombreExport};
`;
}

// ═══════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════

// Crear directorio destino si no existe
const directorio = path.join(__dirname, "..", "js", "agentes", "tronco", "especialistas");

if (!fs.existsSync(directorio)) {
  fs.mkdirSync(directorio, { recursive: true });
  console.log(`✓ Directorio creado: ${directorio}`);
} else {
  console.log(`✓ Directorio existe: ${directorio}`);
}

// Generar cada archivo
let generados = 0;
let errores = 0;

ESPECIALISTAS.forEach(esp => {
  try {
    const archivo = path.join(directorio, `${esp.key}.js`);
    const contenido = generarPlantilla(esp);
    fs.writeFileSync(archivo, contenido, "utf8");
    generados++;
    console.log(`  ✓ ${esp.key}.js — ${esp.nombre}`);
  } catch (e) {
    errores++;
    console.error(`  ✗ Error generando ${esp.key}.js:`, e.message);
  }
});

console.log("");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`✅ ${generados}/${ESPECIALISTAS.length} especialistas generados`);
if (errores > 0) console.log(`⚠️  ${errores} errores`);
console.log(`📁 Directorio: ${directorio}`);
console.log("═══════════════════════════════════════════════════════════════");
console.log("");
console.log("📋 PRÓXIMO PASO:");
console.log("   1. Modificar js/kernel/init.js para registrar los 30 especialistas");
console.log("   2. Añadir los 30 imports y el bucle de registro");
console.log("   3. Verificar en consola:");
console.log("      const agentes = [...window.kernel.entidades.keys()];");
console.log("      const esp = agentes.filter(id => id.startsWith('especialista-'));");
console.log("      console.log('Especialistas:', esp.length + '/30');");
console.log("");
