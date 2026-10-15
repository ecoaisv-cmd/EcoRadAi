/**
 * KERNEL — Registro y orquestación de agentes.
 * 
 * Cada agente se registra aquí con un manifiesto.
 * El kernel se encarga de:
 * - Validar manifiestos
 * - Verificar dependencias
 * - Orquestar ciclos de vida (init/mount/unmount)
 * - Exponer servicios compartidos
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
    this._inicializado = false;
  }
  
  /**
   * Registra un agente con su manifiesto.
   */
  async registrar(manifiesto) {
    // Validar
    const err = this._validarManifiesto(manifiesto);
    if (err) throw new Error(`Manifiesto inválido: ${err}`);
    
    if (this.agentes.has(manifiesto.id)) {
      console.warn(`[Kernel] Agente ${manifiesto.id} ya registrado`);
      return;
    }
    
    // Verificar permisos del usuario
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
      payload: { id: agenteId, manifiesto: agente },
      flujo: "circular"
    }).catch(() => {});
    
    console.log(`[Kernel] ✓ Activado: ${agenteId}`);
  }
  
  /**
   * Activa todos los agentes registrados.
   */
  async activarTodos() {
    for (const [id, agente] of this.agentes.entries()) {
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
   * Obtiene un agente.
   */
  obtener(agenteId) {
    return this.agentes.get(agenteId);
  }
  
  /**
   * Lista agentes.
   */
  listar(filtro = {}) {
    let lista = Array.from(this.agentes.values());
    
    if (filtro.capa) lista = lista.filter(a => a.capa === filtro.capa);
    if (filtro.dominio) lista = lista.filter(a => a.dominio === filtro.dominio);
    if (filtro.activos) lista = lista.filter(a => this.activos.has(a.id));
    
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
    
    this._inicializado = true;
    console.log("[Kernel] ✓ Listo. Agentes:", this.agentes.size);
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
      memoria: MEMORIA.stats()
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
