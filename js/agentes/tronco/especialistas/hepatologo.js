import SAVIA from "../../../kernel/savia.js";
import { runInterconsultaDesdeSavia } from "../_motor-interconsultas.js";

export const agenteEspecialistaHepatologo = {
  id: "especialista-hepatologo",
  nombre: "IA-Hepatólogo",
  capa: "tronco",
  tipo: "especialista",
  dominio: "hepatologia",
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
    if (!payload || payload.especialista !== "hepatologo") return null;
    return await this._ejecutarAnalisis(payload);
  },

  async _ejecutarAnalisis(payload) {
    const contextoId = payload.contexto_id;
    try {
      const savia = payload.savia_raw || payload.savia;
      if (!savia) throw new Error("No hay savia en el payload");
      const resultado = await runInterconsultaDesdeSavia(savia, "hepatologo");
      await SAVIA.emitirContexto(contextoId, "especialista:respuesta", {
        contexto_id: contextoId, especialista: "hepatologo",
        nombre: this.nombre, rol: "Hepatología", resultado,
        timestamp: new Date().toISOString()
      }, { de: this.id });
      return resultado;
    } catch (e) {
      await SAVIA.emitirContexto(contextoId, "especialista:respuesta", {
        contexto_id: contextoId, especialista: "hepatologo",
        nombre: this.nombre, rol: "Hepatología", error: e.message,
        timestamp: new Date().toISOString()
      }, { de: this.id }).catch(() => {});
      return null;
    }
  }
};

export default agenteEspecialistaHepatologo;
