/**
 * KERNEL — Registro y orquestación de agentes.
 * 
 * Cada agente se registra aquí con un manifiesto.
 * El kernel se encarga de:
 * - Validar manifiestos
 * - Verificar dependencias
 * - Orquestar ciclos de vida (init/mount/unmount)
 * - Exponer servicios compartidos
 * 
 * v1.1 — Sprint 2 fix:
 * - emit() envuelve el evento en formato canónico { de, tipo, payload, flujo, timestamp }
 * - on() recibe el evento envuelto (consistente con SAVIA)
 */

import SAVIA from "./savia.js";
import MEMORIA from "./memoria.js";
import contexto from "./contexto.js";

class Kernel {
  constructor() {
    this.agentes = new Map();       // id → manifiesto
    this.activos = new Set();       // ids activos
    this.servicios = new Map();     // servicios compartidos
    this.entidades = new Map();     // entidades base
    this._listeners = new Map();    // eventos → [callbacks]
    this._inicializado = false;
  }
  
  /**
   * Registra un agente con su manifiesto.
   */
  async registrar(manifiesto) {
    const err = this._validarManifiesto(manifiesto);
    if (err) throw new Error(`Manifiesto inválido: ${err}`);
    
    if (this.agentes.has(manifiesto.id)) {
      console.warn(`[Kernel] Agente ${manifiesto.id} ya registrado`);
      return;
    }
    
    if (!this._tienePermiso(manifiesto)) {
      console.log(`[Kernel] ${manifiesto.id} no permitido para rol actual`);
      return;
    }
    
    this.agentes.set(manifiesto.id, manifiesto);
    SAVIA.registrar(manifiesto.id, manifiesto);
    
    console.log(`[Kernel] ✓ Registrado: ${manifiesto.id} (${manifiesto.capa})`);
  }
  
  /**
   * Activa un agente (init).
   */
  async activar(agenteId) {
    if (this.activos.has(agenteId)) return;
    
    const agente = this.agentes.get(agenteId);
    if (!agente) throw new Error(`Agente ${agenteId} no registrado`);
    
    if (typeof agente.init === "function") {
      try {
        await agente.init(this);
      } catch (e) {
        console.error(`[Kernel] Error en init de ${agenteId}:`, e);
        throw e;
      }
    }
    
    this.activos.add(agenteId);
    
    SAVIA.enviar({
      de: "kernel",
      tipo: "AGENTE_ACTIVADO",
      payload: { id: agenteId, manifiesto: agente.id },
      flujo: "circular"
    }).catch(() => {});
    
    console.log(`[Kernel] ✓ Activado: ${agenteId}`);
  }
  
  /**
   * Activa todos los agentes registrados.
   */
  async activarTodos() {
    for (const [id] of this.agentes.entries()) {
      try {
        await this.activar(id);
      } catch (e) {
        console.error(`[Kernel] Error activando ${id}:`, e);
      }
    }
  }
  
  /**
   * Monta un agente (renderiza UI).
   */
  async montar(agenteId, contenedor, params = {}) {
    const agente = this.agentes.get(agenteId);
    if (!agente) throw new Error(`Agente ${agenteId} no registrado`);
    
    if (!this.activos.has(agenteId)) {
      await this.activar(agenteId);
    }
    
    if (typeof agente.mount !== "function") {
      console.warn(`[Kernel] Agente ${agenteId} no tiene mount()`);
      return;
    }
    
    await agente.mount(contenedor, params);
    console.log(`[Kernel] ✓ Montado: ${agenteId}`);
  }
  
  /**
   * Desmonta un agente.
   */
  async desmontar(agenteId) {
    const agente = this.agentes.get(agenteId);
    if (agente?.unmount) {
      await agente.unmount();
    }
    this.activos.delete(agenteId);
  }
  
  /**
   * Obtiene un agente por ID.
   */
  obtener(agenteId) {
    return this.agentes.get(agenteId);
  }
  
  /**
   * Lista agentes. Acepta filtro como string (capa) u objeto.
   * 
   *   kernel.listar()                    → todos
   *   kernel.listar("raiz")              → por capa
   *   kernel.listar({ dominio: "social" }) → por objeto
   */
  listar(filtro) {
    let lista = Array.from(this.agentes.values());
    
    if (typeof filtro === "string") {
      lista = lista.filter(a => a.capa === filtro);
    } else if (filtro && typeof filtro === "object") {
      if (filtro.capa) lista = lista.filter(a => a.capa === filtro.capa);
      if (filtro.dominio) lista = lista.filter(a => a.dominio === filtro.dominio);
      if (filtro.activos) lista = lista.filter(a => this.activos.has(a.id));
    }
    
    return lista;
  }
  
  /**
   * Registra un servicio compartido (ej: ia, pdf, firma).
   */
  registrarServicio(nombre, implementacion) {
    this.servicios.set(nombre, implementacion);
    console.log(`[Kernel] ✓ Servicio: ${nombre}`);
  }
  
  obtenerServicio(nombre) {
    const s = this.servicios.get(nombre);
    if (!s) throw new Error(`Servicio ${nombre} no registrado`);
    return s;
  }
  
  /**
   * Registra una entidad base (paciente, médico, empresa).
   */
  registrarEntidad(nombre, entidad) {
    this.entidades.set(nombre, entidad);
    console.log(`[Kernel] ✓ Entidad: ${nombre}`);
  }
  
  obtenerEntidad(nombre) {
    return this.entidades.get(nombre);
  }
  
  /**
   * Valida un manifiesto.
   */
  _validarManifiesto(m) {
    if (!m) return "manifiesto vacío";
    if (!m.id) return "falta id";
    if (!m.version) return "falta version";
    if (!m.nombre) return "falta nombre";
    if (!m.capa) return "falta capa";
    if (!["raiz", "tronco", "fruto"].includes(m.capa)) {
      return `capa inválida: ${m.capa}`;
    }
    return null;
  }
  
  /**
   * Verifica permisos del usuario para el agente.
   */
  _tienePermiso(m) {
    if (!m.permisos?.ver) return true;
    
    const usuario = window.usuarioActual;
    if (!usuario) return false;
    
    return m.permisos.ver.includes(usuario.rol) || m.permisos.ver.includes("*");
  }
  
  /**
   * Inicializa el kernel.
   */
  async init() {
    if (this._inicializado) return;
    
    console.log("[Kernel] Inicializando...");
    
    await MEMORIA.init();
    this._escucharLogin();
    
    this._inicializado = true;
    console.log("[Kernel] ✓ Listo. Agentes:", this.agentes.size);
  }
  
  /**
   * Listener de login.
   */
  async _escucharLogin() {
    if (this._escuchandoLogin) return;
    this._escuchandoLogin = true;
    
    console.log("[Kernel] ✓ Listener de login activado");
    
    let usuarioAnterior = null;
    setInterval(async () => {
      const usuarioActual = window.usuarioActual;
      if (usuarioActual?.id !== usuarioAnterior?.id) {
        usuarioAnterior = usuarioActual;
        console.log("[Kernel] Cambio de usuario detectado:", usuarioActual?.email || "anon");
        
        for (const [id, agente] of this.agentes.entries()) {
          if (this._tienePermiso(agente)) {
            if (!this.activos.has(id)) {
              try {
                await this.activar(id);
              } catch (e) {
                console.error(`[Kernel] Error activando ${id}:`, e);
              }
            }
          }
        }
      }
    }, 1000);
  }
  
  /**
   * Suscribirse a un evento.
   * El callback recibe un evento envuelto: { de, tipo, payload, flujo, timestamp }
   * 
   *   kernel.on("paciente:seleccionado", (evt) => {
   *     console.log(evt.payload.subject_id);
   *   });
   * 
   * Retorna una función para desuscribirse.
   */
  on(evento, callback) {
    if (!this._listeners.has(evento)) {
      this._listeners.set(evento, []);
    }
    this._listeners.get(evento).push(callback);
    
    console.log(`[Kernel] ✓ Listener registrado: ${evento}`);
    
    return () => {
      const cbs = this._listeners.get(evento) || [];
      const idx = cbs.indexOf(callback);
      if (idx >= 0) cbs.splice(idx, 1);
    };
  }
  
  /**
   * Emite un evento al bus local Y a SAVIA.
   * 
   * v1.1 — Ahora envuelve el evento en formato canónico:
   *   { de, tipo, payload, flujo, timestamp }
   * Los listeners locales reciben el evento envuelto (consistente con SAVIA).
   */
  emit(evento, data = {}) {
    // 1. Construir el evento canónico
    const eventoCanonico = {
      de: "kernel",
      tipo: evento,
      payload: data || {},
      flujo: "circular",
      timestamp: new Date().toISOString()
    };
    
    // 2. Notificar listeners locales con el evento envuelto
    const callbacks = this._listeners.get(evento) || [];
    callbacks.forEach(cb => {
      try {
        cb(eventoCanonico);
      } catch (e) {
        console.error(`[Kernel] Error en listener ${evento}:`, e);
      }
    });
    
    // 3. Propagar a SAVIA (broadcast a agentes suscritos)
    return SAVIA.enviar(eventoCanonico).catch(() => {});
  }
  
  /**
   * Estadísticas del kernel.
   */
  stats() {
    return {
      agentes_registrados: this.agentes.size,
      agentes_activos: this.activos.size,
      servicios: this.servicios.size,
      entidades: this.entidades.size,
      savia: SAVIA.stats(),
      memoria: MEMORIA.stats ? MEMORIA.stats() : {}
    };
  }
}

export const kernel = new Kernel();
export default kernel;

// Exponer globalmente para debug
if (typeof window !== "undefined") {
  window.kernel = kernel;
  window.SAVIA = SAVIA;
  window.MEMORIA = MEMORIA;
  window.contexto = contexto;
}
