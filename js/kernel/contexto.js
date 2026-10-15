/**
 * Contexto compartido entre agentes.
 * 
 * Provee un espacio de estado global donde los agentes pueden leer/escribir
 * información contextual sin acoplarse entre sí.
 */

class Contexto {
  constructor() {
    this.data = new Map();
    this.listeners = new Map();
  }
  
  /**
   * Establece un valor de contexto.
   * @param {string} clave - Ruta tipo "paciente.nombre" o "caso.riesgo"
   * @param {any} valor
   * @param {object} opciones - { silent: false }
   */
  set(clave, valor, opciones = {}) {
    const anterior = this.data.get(clave);
    this.data.set(clave, valor);
    
    if (!opciones.silent) {
      // Notificar a listeners suscritos a esta clave
      const callbacks = this.listeners.get(clave) || [];
      callbacks.forEach(cb => {
        try { cb(valor, anterior); }
        catch (e) { console.warn("[Contexto] Error en listener:", e); }
      });
      
      // Notificar a listeners wildcard
      const wildcards = this.listeners.get("*") || [];
      wildcards.forEach(cb => {
        try { cb(clave, valor, anterior); }
        catch (e) { console.warn("[Contexto] Error en wildcard listener:", e); }
      });
    }
  }
  
  /**
   * Obtiene un valor de contexto.
   */
  get(clave, defaultValor = null) {
    return this.data.has(clave) ? this.data.get(clave) : defaultValor;
  }
  
  /**
   * Suscribe a cambios en una clave específica.
   * @returns {function} Función para desuscribirse
   */
  on(clave, callback) {
    if (!this.listeners.has(clave)) {
      this.listeners.set(clave, []);
    }
    this.listeners.get(clave).push(callback);
    
    return () => {
      const cbs = this.listeners.get(clave) || [];
      const idx = cbs.indexOf(callback);
      if (idx >= 0) cbs.splice(idx, 1);
    };
  }
  
  /**
   * Limpia todo el contexto (útil al cerrar sesión).
   */
  clear() {
    this.data.clear();
    this.listeners.clear();
  }
  
  /**
   * Serializa el contexto actual (para debug o persistencia).
   */
  toJSON() {
    const obj = {};
    this.data.forEach((v, k) => { obj[k] = v; });
    return obj;
  }
  
  /**
   * Restaura contexto desde un objeto.
   */
  fromJSON(obj) {
    Object.entries(obj || {}).forEach(([k, v]) => this.data.set(k, v));
  }
}

export const contexto = new Contexto();
export default contexto;
