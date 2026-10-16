/**
 * _motor-interconsultas.js
 * Capa: TRONCO
 * Rol: Motor unificado de interconsultas con IA
 * Versión: 1.1.0 (Sprint 3 Fase B - con streaming)
 * 
 * Responsabilidad:
 *   Ejecutar una interconsulta con IA a partir de una SAVIA RAÍZ.
 *   Acepta SAVIA de tamizaje o de consulta sin distinción.
 *   Usa los prompts de PROMPTS_INTERCONSULTA sin modificarlos.
 * 
 * Estrategia de contexto (Opción C):
 *   1. Usar primero savia.* normalizado (aportes de los agentes RAÍZ)
 *   2. Fallback a savia.raw.* (payload original del monolito)
 * 
 * v1.1.0:
 *   - Stream + timeout de inactividad (90s sin recibir datos)
 *   - Modelo default: kimi-k3
 *   - max_tokens: 16384
 */

console.log("[_motor-interconsultas] Cargando motor unificado...");

/* ═══════════════════════════════════════════════════════════
   FUNCIÓN PRINCIPAL
   ═══════════════════════════════════════════════════════════ */

/**
 * Ejecuta una interconsulta con IA a partir de una SAVIA unificada.
 * 
 * @param {object} savia - SAVIA RAÍZ (contexto unificado)
 * @param {string} key - Especialista (ej: "nutricionista", "hepatologo")
 * @returns {Promise<object>} Resultado de la interconsulta
 */
export async function runInterconsultaDesdeSavia(savia, key) {
  // ═══ 1. VALIDACIONES ═══
  if (!savia) throw new Error("[motor] Falta savia");
  if (!key) throw new Error("[motor] Falta key del especialista");
  
  console.log(`[motor] ▶ Ejecutando interconsulta: ${key} (origen: ${savia.origen})`);
  
  // ═══ 2. VERIFICAR PROMPT ═══
  const promptBase = window.PROMPTS_INTERCONSULTA?.[key];
  if (!promptBase) {
    throw new Error(`[motor] No existe prompt para ${key}`);
  }
  
  // ═══ 3. VERIFICAR ESPECIALISTA EN REGISTRO ═══
  const especialistaInfo = window.ESPECIALISTAS?.[key];
  if (!especialistaInfo) {
    console.warn(`[motor] Especialista ${key} no está en ESPECIALISTAS, se usará key como nombre`);
  }
  
  // ═══ 4. CONSTRUIR CONTEXTO COMPATIBLE ═══
  const contexto = construirContextoParaPrompt(savia);
  console.log(`[motor] Contexto construido (${JSON.stringify(contexto).length} caracteres)`);
  
  // ═══ 5. REEMPLAZAR {CONTEXTO_JSON} EN EL PROMPT ═══
  const promptFinal = promptBase.replace(
    /{CONTEXTO_JSON}/g,
    JSON.stringify(contexto, null, 2)
  );
  
  // ═══ 6. LLAMAR A KIMI (CON STREAM) ═══
  const t0 = Date.now();
  let respuestaRaw;
  try {
    respuestaRaw = await llamarKimiParaInterconsulta(promptFinal);
  } catch (e) {
    console.error(`[motor] Error llamando a Kimi para ${key}:`, e);
    throw new Error(`Error llamando a Kimi: ${e.message}`);
  }
  const duracion_ms = Date.now() - t0;
  
  // ═══ 7. PARSEAR RESPUESTA ═══
  let parsed;
  try {
    parsed = parsearRespuestaInterconsulta(respuestaRaw);
  } catch (e) {
    console.error(`[motor] Respuesta de Kimi no es JSON válido para ${key}`);
    console.error("Respuesta raw:", respuestaRaw?.substring(0, 500));
    throw new Error(`Respuesta de Kimi no es JSON válido: ${e.message}`);
  }
  
  // ═══ 8. CONSTRUIR RESULTADO ESTÁNDAR ═══
  const resultado = {
    especialista: key,
    nombre: especialistaInfo?.nombre || `IA-${key}`,
    rol: especialistaInfo?.rol || key,
    timestamp: new Date().toISOString(),
    _meta: {
      origen: savia.origen,
      contexto_id: savia.contexto_id,
      case_id: savia.case_id,
      duracion_ms,
      motor: "unificado_v1.1"
    },
    ...parsed
  };
  
  console.log(`[motor] ✓ Interconsulta ${key} completada en ${duracion_ms}ms`);
  
  return resultado;
}

/* ═══════════════════════════════════════════════════════════
   CONSTRUCCIÓN DE CONTEXTO (Opción C: savia.* + fallback a raw)
   ═══════════════════════════════════════════════════════════ */

/**
 * Construye el contexto que los prompts de especialista esperan.
 * Compatible con SAVIA de tamizaje Y de consulta.
 * 
 * Estrategia:
 *   1. Usar savia.* normalizado (aportes de agentes RAÍZ)
 *   2. Fallback a savia.raw.* (payload original)
 */
export function construirContextoParaPrompt(savia) {
  const raw = savia.raw || {};
  const isConsulta = savia.origen === "consulta";
  const isTamizaje = savia.origen === "tamizaje";
  
  // ═══ SUBJECT ═══
  const subject = {
    edad: savia.subject?.edad || raw.subject?.edad || raw.paciente?.edad,
    sexo: savia.subject?.sexo || raw.subject?.sexo || raw.paciente?.sexo,
    area: savia.subject?.empresa || raw.subject?.empresa || raw.subject?.area || null,
    dui: savia.subject?.dui || raw.subject?.dui || null,
    departamento: savia.subject?.departamento || raw.subject?.departamento || null,
    municipio: savia.subject?.municipio || raw.subject?.municipio || null,
    zona_geografica: savia.subject?.zona_geografica || raw.subject?.zona_geografica || null
  };
  
  // ═══ ENCOUNTER ═══
  const encounter = {
    estudio: isTamizaje
      ? (raw.encounter?.estudio || "tamizaje")
      : (raw.tipo || raw.tipo_consulta || "consulta"),
    fecha: raw.encounter?.fecha || new Date().toISOString().slice(0, 10),
    origen: savia.origen
  };
  
  // ═══ LABS ═══
  const labs = Object.keys(savia.labs || {}).length > 0
    ? savia.labs
    : (raw.labs || raw.O_objetivo?.labs_resultados || {});
  
  // ═══ SIGNOS VITALES + CLÍNICA ═══
  const signosVitalesNorm = savia.signos_vitales || {};
  const signosVitalesRaw = raw.clinica || raw.O_objetivo?.signos_vitales || {};
  
  const clinica = {
    peso_kg: signosVitalesNorm.peso_kg || signosVitalesRaw.peso_kg || null,
    talla_cm: signosVitalesNorm.talla_cm || signosVitalesRaw.talla_cm || null,
    imc: signosVitalesNorm.imc || signosVitalesRaw.imc || signosVitalesRaw.imc_calc || null,
    circunferencia_cintura_cm: signosVitalesNorm.circunferencia_cintura_cm || signosVitalesRaw.circunferencia_cintura_cm || null,
    presion_sistolica_mmhg: signosVitalesNorm.presion_sistolica || signosVitalesRaw.presion_sistolica_mmhg || signosVitalesRaw.ta_sistolica || null,
    presion_diastolica_mmhg: signosVitalesNorm.presion_diastolica || signosVitalesRaw.presion_diastolica_mmhg || signosVitalesRaw.ta_diastolica || null,
    frecuencia_cardiaca_lpm: signosVitalesNorm.frecuencia_cardiaca || signosVitalesRaw.frecuencia_cardiaca_lpm || signosVitalesRaw.fc || null,
    temperatura: signosVitalesNorm.temperatura || signosVitalesRaw.temperatura || null,
    saturacion_o2_pct: signosVitalesNorm.saturacion_o2 || signosVitalesRaw.saturacion_o2_pct || signosVitalesRaw.sato2 || null
  };
  
  // ═══ HALLAZGOS IMAGEN ═══
  const findings = Object.keys(savia.hallazgos_imagen || {}).length > 0
    ? savia.hallazgos_imagen
    : (raw.findings || {});
  
  // ═══ MÉTRICAS ═══
  const metrics = raw.metrics || [];
  
  // ═══ DIAGNÓSTICO ═══
  const diagnostico = isTamizaje
    ? (raw.diagnostico_diferencial || [])
    : (raw.A_analisis?.diagnosticos || []);
  
  // ═══ RIESGO GLOBAL ═══
  const riesgoGlobal = isTamizaje
    ? (raw.riesgo_global || null)
    : (raw.A_analisis?.nivel_riesgo ? { nivel: raw.A_analisis.nivel_riesgo, score: null } : null);
  
  // ═══ CONTEXTO SOCIAL ═══
  const contextoSocial = savia.contexto_social || null;
  
  // ═══ ESPECÍFICO DE CONSULTA ═══
  const consultaSOAP = isConsulta ? {
    motivo: raw.S_subjetivo?.motivo_consulta || null,
    enfermedad_actual: raw.S_subjetivo?.enfermedad_actual || null,
    eva_dolor: raw.S_subjetivo?.eva_dolor || null,
    evolucion: raw.S_subjetivo?.evolucion || null,
    antecedentes: raw.S_subjetivo?.antecedentes || null,
    alergias: raw.S_subjetivo?.alergias || null,
    medicamentos: raw.S_subjetivo?.medicamentos || null,
    habitos: raw.S_subjetivo?.habitos || {},
    examen_fisico: raw.O_objetivo?.examen_fisico || {},
    impresion_clinica: raw.A_analisis?.impresion_clinica || null,
    banderas_rojas: raw.A_analisis?.banderas_rojas || [],
    interacciones: raw.A_analisis?.interacciones || [],
    plan_actual: raw.P_plan || null
  } : null;
  
  // ═══ ESPECÍFICO DE TAMIZAJE ═══
  const tamizajeInfo = isTamizaje ? {
    motivo: raw.encounter?.motivo || null,
    antecedentes: raw.encounter?.antecedentes || null,
    factores_riesgo: raw.encounter?.factores_riesgo || [],
    medicacion_actual: raw.encounter?.medicacion_actual || null,
    esteatosis_grado: raw.findings?.higado?.esteatosis_grado || null,
    carotidas_imt: raw.findings?.carotidas?.imt_mm || null,
    tiroides_tirads: raw.findings?.tiroides?.tirads || null
  } : null;
  
  // ═══ CONTEXTO FINAL ═══
  const contexto = {
    _motor_info: {
      origen: savia.origen,
      case_id: savia.case_id,
      contexto_id: savia.contexto_id,
      construido_at: new Date().toISOString()
    },
    
    subject,
    encounter,
    
    labs,
    clinica,
    findings,
    metrics,
    
    diagnostico,
    riesgo_global: riesgoGlobal,
    
    contexto_social: contextoSocial,
    
    consulta_soap: consultaSOAP,
    tamizaje_info: tamizajeInfo,
    
    alteraciones_labs: savia.alteraciones_labs || [],
    severidad_labs: savia.severidad_labs || "normal"
  };
  
  return contexto;
}

/* ═══════════════════════════════════════════════════════════
   LLAMADA A KIMI CON STREAM + TIMEOUT DE INACTIVIDAD
   ═══════════════════════════════════════════════════════════ */

async function llamarKimiParaInterconsulta(prompt) {
  const proxyUrl = `${window.WORKER_URL || "https://ecokimi2.emazzini2020.workers.dev"}/proxy-kimi`;
  const model = document.getElementById("kimi-model")?.value || "kimi-k3";
  
  const ctrl = new AbortController();
  
  // ═══ TIMEOUT DE INACTIVIDAD (90s sin recibir NADA) ═══
  // Se resetea cada vez que llega un chunk nuevo. Si Kimi sigue
  // enviando tokens, la conexión vive indefinidamente.
  let inactivityTimer = setTimeout(() => ctrl.abort(), 90000);
  const resetInactivity = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => ctrl.abort(), 90000);
  };
  
  let resp;
  try {
    resp = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Devuelves SIEMPRE JSON válido con ortografía española correcta. Sin markdown."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 16384,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        stream: true  // ═══ CLAVE: activar streaming ═══
      }),
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(inactivityTimer);
    if (e.name === "AbortError") {
      throw new Error("Timeout 90s sin recibir datos de Kimi. Reintenta.");
    }
    throw new Error("Error de red: " + e.message);
  }
  
  // ═══ VALIDAR RESPUESTA ═══
  if (!resp.ok) {
    clearTimeout(inactivityTimer);
    const txt = await resp.text();
    if (resp.status === 402) throw new Error("Sin saldo en Moonshot. Recarga crédito.");
    if (resp.status === 429) throw new Error("Rate limit de Moonshot. Espera 1 minuto.");
    if (resp.status === 401) throw new Error("API key inválida. Revisa KIMI_API_KEY en el Worker.");
    if (resp.status === 404) throw new Error(`Modelo no encontrado: ${model}. Prueba con kimi-k3.`);
    if (resp.status === 524) throw new Error("Cloudflare cortó la conexión. Verifica que el Worker tenga 'stream: true'.");
    throw new Error(`HTTP ${resp.status}: ${txt.substring(0, 200)}`);
  }
  
  // ═══ LEER EL STREAM SSE ═══
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  let buffer = "";
  let chunkCount = 0;
  
  while (true) {
    let chunk;
    try {
      chunk = await reader.read();
    } catch (e) {
      clearTimeout(inactivityTimer);
      throw new Error("Error leyendo stream: " + e.message);
    }
    
    if (chunk.done) break;
    
    // ═══ RESETEAR TIMEOUT EN CADA CHUNK ═══
    resetInactivity();
    
    buffer += decoder.decode(chunk.value, { stream: true });
    
    // El SSE separa por líneas; cada evento es "data: {...}\n\n"
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]" || !payload) continue;
      
      try {
        const json = JSON.parse(payload);
        
        if (json.error) {
          throw new Error("Kimi: " + (json.error.message || JSON.stringify(json.error)));
        }
        
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          content += delta;
          chunkCount++;
        }
      } catch (e) {
        // Ignorar líneas malformadas
        if (e.message?.startsWith("Kimi:")) throw e;
      }
    }
  }
  
  clearTimeout(inactivityTimer);
  
  console.log(`[motor] Stream recibido: ${content.length} caracteres en ${chunkCount} chunks`);
  
  if (!content || content.trim().length < 20) {
    throw new Error(`Respuesta de Kimi muy corta (${content.length} caracteres)`);
  }
  
  return content;
}

/* ═══════════════════════════════════════════════════════════
   PARSEO DE RESPUESTA
   ═══════════════════════════════════════════════════════════ */

function parsearRespuestaInterconsulta(respuestaRaw) {
  // Limpiar bloques de código markdown
  let content = respuestaRaw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();
  
  // Intento 1: parsear directo
  try {
    return JSON.parse(content);
  } catch (e) {
    // Intento 2: extraer el primer bloque JSON válido
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        throw new Error("JSON inválido incluso tras extracción");
      }
    }
    throw new Error("No se encontró JSON en la respuesta");
  }
}

/* ═══════════════════════════════════════════════════════════
   EXPOSICIÓN GLOBAL
   ═══════════════════════════════════════════════════════════ */

if (typeof window !== "undefined") {
  window.runInterconsultaDesdeSavia = runInterconsultaDesdeSavia;
  window.construirContextoParaPrompt = construirContextoParaPrompt;
  console.log("[_motor-interconsultas] ✓ Expuesto globalmente");
}

export default {
  runInterconsultaDesdeSavia,
  construirContextoParaPrompt
};
