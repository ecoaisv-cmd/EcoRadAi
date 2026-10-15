/**
 * MEMORIA — Aprendizaje colectivo del ecosistema.
 * 
 * Guarda patrones detectados en casos previos para mejorar
 * futuras decisiones de los agentes.
 */

import SAVIA from "./savia.js";

class Memoria {
  constructor() {
    this.patrones = new Map();  // dominio → [patrones]
    this.cache = new Map();     // cache local
  }
  
  /**
   * Inicializa la memoria cargando patrones desde Supabase.
   */
  async init() {
    if (!window.supabaseClient) {
      console.warn("[Memoria] Sin Supabase, funcionando en modo local");
      return;
    }
    
    try {
      const { data, error } = await window.supabaseClient
        .from("memoria_colectiva")
        .select("*")
        .gte("confianza", 0.6)
        .order("confianza", { ascending: false })
        .limit(500);
      
      if (error) throw error;
      
      (data || []).forEach(m => {
        if (!this.patrones.has(m.dominio)) {
          this.patrones.set(m.dominio, []);
        }
        this.patrones.get(m.dominio).push(m);
      });
      
      console.log(`[Memoria] ✓ ${data?.length || 0} patrones cargados de ${this.patrones.size} dominios`);
    } catch (e) {
      console.warn("[Memoria] Error al cargar:", e);
    }
  }
  
  /**
   * Consulta patrones relevantes para un dominio y contexto.
   * 
   * @param {string} dominio - ej: "endocrinologia", "nutricion"
   * @param {object} contexto - contexto del caso actual
   * @returns {Array} patrones ordenados por relevancia
   */
  consultar(dominio, contexto = {}) {
    const patrones = this.patrones.get(dominio) || [];
    
    return patrones
      .filter(p => this._aplicaA(p, contexto))
      .sort((a, b) => {
        // Ordenar por confianza y frecuencia de éxito
        const scoreA = (a.confianza || 0.5) * (1 + (a.exitos || 0) / 100);
        const scoreB = (b.confianza || 0.5) * (1 + (b.exitos || 0) / 100);
        return scoreB - scoreA;
      });
  }
  
  /**
   * Verifica si un patrón aplica al contexto actual.
   */
  _aplicaA(patron, contexto) {
    if (!patron.contexto) return true;
    
    // Verificar condiciones simples
    const condiciones = patron.contexto;
    for (const [key, valor] of Object.entries(condiciones)) {
      const valorActual = this._getRuta(contexto, key);
      if (Array.isArray(valor)) {
        if (!valor.includes(valorActual)) return false;
      } else if (valor !== valorActual) {
        return false;
      }
    }
    return true;
  }
  
  _getRuta(obj, ruta) {
    return ruta.split(".").reduce((acc, k) => acc?.[k], obj);
  }
  
  /**
   * Registra un patrón nuevo o refuerza uno existente.
   */
  async registrar(datos) {
    const { dominio, patron, contexto, resultado } = datos;
    
    if (!dominio || !patron) {
      console.warn("[Memoria] Datos incompletos:", datos);
      return null;
    }
    
    // Clave del patrón (para detectar duplicados)
    const key = `${dominio}:${JSON.stringify(patron)}`;
    
    // Verificar si ya existe en cache
    if (this.cache.has(key)) {
      const existente = this.cache.get(key);
      if (resultado === "exito") existente.exitos++;
      else if (resultado === "fallo") existente.fallos++;
      
      existente.confianza = existente.exitos / (existente.exitos + existente.fallos + 1);
      existente.ultima_actualizacion = new Date().toISOString();
      
      // Persistir cambios
      await this._persistir(existente);
      return existente;
    }
    
    // Nuevo patrón
    const nuevo = {
      dominio,
      patron,
      contexto: contexto || {},
      exitos: resultado === "exito" ? 1 : 0,
      fallos: resultado === "fallo" ? 1 : 0,
      confianza: 0.5,
      ultima_actualizacion: new Date().toISOString()
    };
    
    this.cache.set(key, nuevo);
    
    // Agregar a memoria local
    if (!this.patrones.has(dominio)) {
      this.patrones.set(dominio, []);
    }
    this.patrones.get(dominio).push(nuevo);
    
    // Persistir
    await this._persistir(nuevo);
    
    // Notificar a otros agentes (circular)
    SAVIA.propagar({
      de: "memoria",
      tipo: "PATRON_APRENDIDO",
      payload: { dominio, patron, contexto, exitos: nuevo.exitos }
    }).catch(() => {});
    
    return nuevo;
  }
  
  async _persistir(patron) {
    if (!window.supabaseClient) return;
    
    try {
      // Upsert por dominio + patron
      const { data: existente } = await window.supabaseClient
        .from("memoria_colectiva")
        .select("id")
        .eq("dominio", patron.dominio)
        .eq("patron", patron.patron)
        .maybeSingle();
      
      if (existente?.id) {
        await window.supabaseClient
          .from("memoria_colectiva")
          .update({
            exitos: patron.exitos,
            fallos: patron.fallos,
            confianza: patron.confianza,
            ultima_actualizacion: patron.ultima_actualizacion
          })
          .eq("id", existente.id);
      } else {
        await window.supabaseClient
          .from("memoria_colectiva")
          .insert(patron);
      }
    } catch (e) {
      console.warn("[Memoria] Error persistiendo:", e);
    }
  }
  
  /**
   * Aprende de un caso completado (éxito o fallo).
   */
  async aprenderDeCaso(caso, resultado) {
    const dominio = caso.encounter?.estudio || caso.tipo || "general";
    
    // Extraer patrón del caso
    const patron = this._extraerPatron(caso);
    const contexto = {
      rango_edad: this._rangoEdad(caso.subject?.edad),
      sexo: caso.subject?.sexo,
      zona: caso.subject?.zona_geografica
    };
    
    return this.registrar({
      dominio,
      patron,
      contexto,
      resultado  // "exito" | "fallo"
    });
  }
  
  _extraerPatron(caso) {
    // Extraer características clave
    return {
      hallazgos: caso.findings || {},
      riesgo: caso.riesgo_global?.nivel,
      diagn_principal: caso.diagnostico_diferencial?.[0]?.dx
    };
  }
  
  _rangoEdad(edad) {
    const e = parseInt(edad) || 0;
    if (e < 12) return "pediatrico";
    if (e < 18) return "adolescente";
    if (e < 60) return "adulto";
    return "adulto_mayor";
  }
  
  /**
   * Estadísticas de aprendizaje.
   */
  stats() {
    let totalPatrones = 0;
    const porDominio = {};
    
    this.patrones.forEach((patrones, dominio) => {
      totalPatrones += patrones.length;
      porDominio[dominio] = {
        cantidad: patrones.length,
        confianza_promedio: patrones.reduce((s, p) => s + (p.confianza || 0), 0) / patrones.length
      };
    });
    
    return { totalPatrones, porDominio };
  }
}

export const MEMORIA = new Memoria();
export default MEMORIA;
