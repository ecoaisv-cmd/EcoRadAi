/**
 * SAVIA — Bus de eventos del ecosistema de agentes.
 * 
 * 4 flujos:
 * - Ascendente: raíz → tronco → fruto
 * - Descendente: fruto → tronco → raíz
 * - Lateral: mismo nivel
 * - Circular: todos ↔ todos
 * 
 * v1.1 — Sprint 2 fix:
 * - registrar() auto-suscribe usando agente.eventos_suscritos
 * - propagar() busca en ambas fuentes (suscritoA y eventos_suscritos)
 * - enviar() acepta evento con o sin para_agente
 */

import contexto from "./contexto.js";

const WORKER_URL = window.WORKER_URL || "https://ecokimi2.emazzini2020.workers.dev";

class Savia {
  constructor() {
    this.agentes = new Map();      // id → agente
    this.conexiones = new Map();   // agente_id → [{destino, tipos}]
    this.suscripciones = new Map(); // agente_id → Set(tipos)
    this.pendientes = [];          // cola de eventos si el destino no existe
    this.metricas = {
      enviados: 0,
      errores: 0,
      reintentos: 0
    };
  }
  
  /**
   * Registra un agente en el bus.
   * Auto-suscribe el agente a sus eventos declarados.
   */
  registrar(agenteId, agente) {
    if (this.agentes.has(agenteId)) {
      console.warn(`[Savia] Agente ${agenteId} ya registrado, sobreescribiendo`);
    }
    this.agentes.set(agenteId, agente);
    
    // ═══ AUTO-SUSCRIPCIÓN ═══
    const tipos = agente.eventos_suscritos || agente.suscritoA || [];
    if (!this.suscripciones.has(agenteId)) {
      this.suscripciones.set(agenteId, new Set());
    }
    tipos.forEach(t => this.suscripciones.get(agenteId).add(t));
    
    console.log(`[Savia] ✓ Agente registrado: ${agenteId} (suscrito a ${tipos.length} eventos)`);
    
    // Procesar eventos pendientes para este agente
    this._procesarPendientes(agenteId);
  }
  
  /**
   * Conecta dos agentes con tipos de eventos específicos.
   */
  conectar(origen, destino, tipos = ["*"]) {
    if (!this.conexiones.has(origen)) {
      this.conexiones.set(origen, []);
    }
    this.conexiones.get(origen).push({ destino, tipos });
    console.log(`[Savia] ✓ Conexión: ${origen} → ${destino}`);
  }
  
  /**
   * Suscribe un agente a tipos de eventos (alternativa a registrar).
   */
  suscribir(agenteId, tipos) {
    const agente = this.agentes.get(agenteId);
    if (!agente) {
      console.warn(`[Savia] No se puede suscribir ${agenteId}, no existe`);
      return;
    }
    if (!this.suscripciones.has(agenteId)) {
      this.suscripciones.set(agenteId, new Set());
    }
    tipos.forEach(t => this.suscripciones.get(agenteId).add(t));
    console.log(`[Savia] ✓ ${agenteId} suscrito a:`, tipos);
  }
  
  /**
   * Envía un evento a un agente específico o broadcast.
   * 
   * @param {object} evt - { de, para, tipo, payload, flujo, urgente }
   * @returns {Promise<any>} Respuesta del destinatario o resultado del broadcast
   */
  async enviar(evt) {
    const t0 = Date.now();
    const { de, para, tipo, payload = {}, flujo = "ascendente", urgente = false } = evt;
    
    if (!de || !tipo) {
      console.error("[Savia] Evento inválido (falta de o tipo):", evt);
      return null;
    }
    
    console.log(`[Savia] ${de} → ${para || "broadcast"} · ${tipo}`);
    this.metricas.enviados++;
    
    // Contexto
    contexto.set(`savia.ultimo_evento.${tipo}`, {
      de, para, payload, t: new Date().toISOString()
    });
    
    // Broadcast si no hay destino
    if (!para || para === "*") {
      return this.propagar({ de, tipo, payload, flujo });
    }
    
    // Buscar destinatario
    const destinatario = this.agentes.get(para);
    if (!destinatario) {
      console.warn(`[Savia] Destinatario ${para} no registrado, encolando`);
      this.pendientes.push({ evt, t: Date.now() });
      return null;
    }
    
    if (typeof destinatario.recibir !== "function") {
      console.warn(`[Savia] Agente ${para} no tiene método recibir()`);
      return null;
    }
    
    // Ejecutar
    let respuesta = null;
    let error = null;
    try {
      respuesta = await destinatario.recibir({ de, tipo, payload, urgente, flujo });
    } catch (e) {
      error = e.message;
      console.error(`[Savia] Error en ${de} → ${para}:`, e);
      this.metricas.errores++;
      
      if (urgente) {
        await this.escalarAHumano({ de, para, tipo, error: e.message, payload });
      }
    }
    
    const duracionMs = Date.now() - t0;
    
    // Auditoría (no bloqueante)
    this._registrarEnBD({
      de, para, tipo, flujo,
      payload: this._sanitizarPayload(payload),
      error,
      duracion_ms: duracionMs
    }).catch(e => console.warn("[Savia] Error en auditoría:", e));
    
    return respuesta;
  }
  
  /**
   * Propaga un evento a todos los agentes suscritos.
   */
  async propagar(evt) {
    const { de, tipo, payload = {}, flujo = "circular" } = evt;
    
    const interesados = Array.from(this.agentes.entries())
      .filter(([id]) => {
        if (id === de) return false;
        
        // ═══ Buscar suscripciones en AMBAS fuentes ═══
        const suscripcionesSet = this.suscripciones.get(id);
        if (suscripcionesSet && (suscripcionesSet.has("*") || suscripcionesSet.has(tipo))) {
          return true;
        }
        
        const agente = this.agentes.get(id);
        const suscripcionesArr = agente?.eventos_suscritos || agente?.suscritoA || [];
        return suscripcionesArr.includes("*") || suscripcionesArr.includes(tipo);
      });
    
    console.log(`[Savia] Broadcast ${de} → ${interesados.length} agentes (${tipo})`);
    
    const resultados = await Promise.allSettled(
      interesados.map(([id, agente]) =>
        Promise.resolve()
          .then(() => agente.recibir({ de, tipo, payload, flujo }))
          .catch(e => {
            console.warn(`[Savia] Error en ${id}:`, e);
            return null;
          })
      )
    );
    
    return resultados.map((r, i) => ({
      agente: interesados[i][0],
      resultado: r.status === "fulfilled" ? r.value : null,
      error: r.status === "rejected" ? r.reason : null
    }));
  }
  
  /**
   * Escala un error a humano (crea notificación).
   */
  async escalarAHumano({ de, para, tipo, error, payload }) {
    try {
      if (window.supabaseClient) {
        await window.supabaseClient.from("notificaciones_medicas").insert({
          tipo: "error_agente",
          prioridad: "alta",
          mensaje: `Error en ${de} → ${para} (${tipo}): ${error}`,
          payload: { de, para, tipo, error }
        });
      }
    } catch (e) {
      console.warn("[Savia] Error al escalar:", e);
    }
  }
  
  /**
   * Sanitiza el payload para evitar guardar datos sensibles masivos.
   */
  _sanitizarPayload(payload) {
    if (!payload || typeof payload !== "object") return payload;
    
    const MAX_SIZE = 5000;
    const json = JSON.stringify(payload);
    if (json.length > MAX_SIZE) {
      return { _truncado: true, _tamaño_original: json.length, _preview: json.substring(0, 500) };
    }
    return payload;
  }
  
  /**
   * Guarda el evento en Supabase (auditoría).
   */
  async _registrarEnBD(datos) {
    if (!window.supabaseClient) return;
    try {
      await window.supabaseClient.from("savia_eventos").insert({
        de_agente: datos.de,
        para_agente: datos.para || null,
        tipo: datos.tipo,
        flujo: datos.flujo,
        payload: datos.payload,
        error: datos.error || null,
        duracion_ms: datos.duracion_ms,
        user_id: window.usuarioActual?.id || null
      });
    } catch (e) {
      console.warn("[Savia] Insert falló:", e.message);
    }
  }
  
  /**
   * Procesa eventos pendientes para un agente recién registrado.
   */
  _procesarPendientes(agenteId) {
    const pendientesParaEste = this.pendientes.filter(p => p.evt.para === agenteId);
    if (pendientesParaEste.length === 0) return;
    
    console.log(`[Savia] Procesando ${pendientesParaEste.length} eventos pendientes para ${agenteId}`);
    this.pendientes = this.pendientes.filter(p => p.evt.para !== agenteId);
    
    pendientesParaEste.forEach(p => {
      this.enviar(p.evt).catch(e => console.warn("[Savia] Error en pendiente:", e));
    });
  }
  
  /**
   * Estadísticas del bus.
   */
  stats() {
    return {
      agentes_registrados: this.agentes.size,
      conexiones: this.conexiones.size,
      eventos_pendientes: this.pendientes.length,
      ...this.metricas
    };
  }
  
  /**
   * Lista todos los agentes registrados.
   */
  listar() {
    return Array.from(this.agentes.keys());
  }
  
  /**
   * Devuelve las suscripciones de un agente.
   */
  suscripcionesDe(agenteId) {
    const set = this.suscripciones.get(agenteId);
    return set ? Array.from(set) : [];
  }
}

export const SAVIA = new Savia();
export default SAVIA;
