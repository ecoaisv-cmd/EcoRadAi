import SAVIA from "../../../kernel/savia.js";
import { runInterconsultaDesdeSavia } from "../_motor-interconsultas.js";

export const agenteEspecialistaDermatologo = {
  id: "especialista-dermatologo",
  nombre: "IA-Dermatólogo",
  capa: "tronco",
  tipo: "especialista",
  dominio: "dermatologia",
  version: "1.0.0",
  activo: true,
  suscripciones: ["savia:solicitar-analisis"],

  async init() {
    if (typeof SAVIA.suscribir === "function") {
      SAVIA.suscribir(this.id, this.suscripciones);
    }
    return true;
  },

  async activar() { return true; },

  async recibir(evento) {
    const { tipo, payload } = evento || {};
    if (tipo !== "savia:solicitar-analisis") return null;
    if (!payload || payload.especialista !== "dermatologo") return null;
    return await this._ejecutarAnalisis(payload);
  },

  async _ejecutarAnalisis(payload) {
    const contextoId = payload.contexto_id;
    try {
      const savia = payload.savia_raw || payload.savia;
      if (!savia) throw new Error("No hay savia en el payload");
      const resultado = await runInterconsultaDesdeSavia(savia, "dermatologo");
      await SAVIA.emitirContexto(contextoId, "especialista:respuesta", {
        contexto_id: contextoId, especialista: "dermatologo",
        nombre: this.nombre, rol: "Dermatología", resultado,
        timestamp: new Date().toISOString()
      }, { de: this.id });
      return resultado;
    } catch (e) {
      await SAVIA.emitirContexto(contextoId, "especialista:respuesta", {
        contexto_id: contextoId, especialista: "dermatologo",
        nombre: this.nombre, rol: "Dermatología", error: e.message,
        timestamp: new Date().toISOString()
      }, { de: this.id }).catch(() => {});
      return null;
    }
  }
};

export default agenteEspecialistaDermatologo;
