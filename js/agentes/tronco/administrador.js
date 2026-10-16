/**
 * ═══════════════════════════════════════════════════════════════════════
 * AGENTE ADMINISTRADOR — Gestor Operativo del TRONCO
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Sprint 3 — Fase C
 * 
 * RESPONSABILIDADES:
 *   1. Escuchar eventos de suscripción (solicitud, cancelación, upgrade)
 *   2. Escuchar eventos de servicios extra (add-ons)
 *   3. Consumir cuotas cuando se completa un caso clínico
 *   4. Detectar cuotas agotadas y emitir notificación
 *   5. Registrar operaciones administrativas para auditoría
 * 
 * @module agentes/tronco/administrador
 * @version 1.0.0
 */

import SAVIA from "../../kernel/savia.js";

const TIPOS_ESCUCHAR = [
  "suscripcion:solicitada",
  "suscripcion:cancelada",
  "suscripcion:upgrade",
  "servicio:extra-solicitado",
  "savia:tronco:plan-integrado",
  "savia:tronco:sin-interconsultas",
  "consulta:firmada"
];

const TIPOS_EMITIR = {
  OPERACION: "savia:admin:operacion-registrada",
  CUOTA_AGOTADA: "savia:admin:cuota-agotada",
  SUSCRIPCION_EXPIRADA: "savia:admin:suscripcion-expirada"
};

const CUOTAS_POR_PLAN = {
  basico:  { consultas: 1, tamizajes: 1, interconsultas: 0, constancias: 1 },
  plus:    { consultas: 3, tamizajes: 1, interconsultas: 2, constancias: 3 },
  premium: { consultas: 5, tamizajes: 2, interconsultas: 5, constancias: 99 }
};

const ESTADO = {
  operacionesRegistradas: 0,
  ultimaOperacion: null,
  suscripcionesActivas: 0,
  cuotasAgotadasEsteMes: 0,
  operacionesPorTipo: {},
  iniciado_at: null
};

export const agenteAdministrador = {
  /* ─── METADATOS ─── */
  id: "agente-administrador",
  nombre: "Administrador de Suscripciones",
  capa: "tronco",
  tipo: "tronco",
  dominio: "operaciones",
  version: "1.0.0",
  descripcion: "Gestor operativo de suscripciones, cuotas y auditoría",

  suscripciones: TIPOS_ESCUCHAR,

  /* ─── INICIALIZACIÓN ─── */
  async init() {
    console.log("[Administrador] ▶ Inicializando agente...");
    ESTADO.iniciado_at = new Date().toISOString();
    ESTADO.operacionesRegistradas = 0;
    ESTADO.operacionesPorTipo = {};
    await this._cargarMetricas();
    console.log("[Administrador] ✓ Agente listo. Suscripciones activas:", ESTADO.suscripcionesActivas);
    return true;
  },

  /* ─── MANEJADOR ─── */
  async onEvento(evento) {
    const { tipo, payload } = evento;
    try {
      switch (tipo) {
        case "suscripcion:solicitada": return await this._registrarSolicitud(payload);
        case "suscripcion:cancelada": return await this._registrarCancelacion(payload);
        case "suscripcion:upgrade": return await this._registrarUpgrade(payload);
        case "servicio:extra-solicitado": return await this._registrarServicioExtra(payload);
        case "savia:tronco:plan-integrado":
        case "savia:tronco:sin-interconsultas":
        case "consulta:firmada":
          return await this._consumirCuota(payload);
        default: return null;
      }
    } catch (e) {
      console.error(`[Administrador] ✗ Error procesando ${tipo}:`, e);
      return null;
    }
  },

  async _registrarSolicitud(payload) {
    console.log(`[Administrador] ▶ Nueva solicitud: ${payload.subject_id} → ${payload.plan}`);
    const operacion = {
      tipo: "solicitud_suscripcion",
      subject_id: payload.subject_id,
      plan: payload.plan,
      origen: payload.origen || "app",
      estado: "pendiente_pago",
      timestamp: new Date().toISOString()
    };
    await this._persistirOperacion(operacion);
    await this._emitirOperacionRegistrada(operacion);
    this._incrementarContador("solicitud");
    return { registrado: true, operacion: "solicitud" };
  },

  async _registrarCancelacion(payload) {
    console.log(`[Administrador] ▶ Cancelación: ${payload.subject_id}`);
    const operacion = {
      tipo: "cancelacion_suscripcion",
      subject_id: payload.subject_id,
      motivo: payload.motivo || "no_especificado",
      timestamp: new Date().toISOString()
    };
    await this._persistirOperacion(operacion);
    await this._emitirOperacionRegistrada(operacion);
    this._incrementarContador("cancelacion");
    return { registrado: true, operacion: "cancelacion" };
  },

  async _registrarUpgrade(payload) {
    console.log(`[Administrador] ▶ Upgrade: ${payload.subject_id}`);
    const operacion = {
      tipo: "upgrade_suscripcion",
      subject_id: payload.subject_id,
      plan_anterior: payload.plan_anterior,
      plan_nuevo: payload.plan_nuevo,
      timestamp: new Date().toISOString()
    };
    await this._persistirOperacion(operacion);
    await this._emitirOperacionRegistrada(operacion);
    this._incrementarContador("upgrade");
    return { registrado: true, operacion: "upgrade" };
  },

  async _registrarServicioExtra(payload) {
    console.log(`[Administrador] ▶ Servicio extra: ${payload.subject_id}`);
    const operacion = {
      tipo: "servicio_extra",
      subject_id: payload.subject_id,
      servicio: payload.servicio,
      cantidad: payload.cantidad || 1,
      monto: payload.monto || 0,
      timestamp: new Date().toISOString()
    };
    await this._persistirOperacion(operacion);
    await this._emitirOperacionRegistrada(operacion);
    this._incrementarContador("servicio_extra");
    return { registrado: true, operacion: "servicio_extra" };
  },

  /* ─── CONSUMO DE CUOTA ─── */
  async _consumirCuota(payload) {
    const { subject_id, case_id, origen } = payload;
    if (!subject_id) {
      console.warn("[Administrador] Sin subject_id, no se puede consumir cuota");
      return null;
    }

    console.log(`[Administrador] ▶ Consumiendo cuota para ${subject_id} (origen: ${origen})`);

    try {
      const suscripcion = await this._obtenerSuscripcion(subject_id);
      if (!suscripcion) {
        console.log("[Administrador] Sin suscripción activa");
        return { consumido: false, razon: "sin_suscripcion" };
      }

      const tipoServicio = this._determinarTipoServicio(payload);
      if (!tipoServicio) {
        return { consumido: false, razon: "tipo_desconocido" };
      }

      const cuotaActual = this._obtenerCuotaActual(suscripcion, tipoServicio);
      const cuotaMax = CUOTAS_POR_PLAN[suscripcion.plan]?.[tipoServicio] || 0;

      if (cuotaActual >= cuotaMax) {
        console.warn(`[Administrador] Cuota agotada: ${subject_id} → ${tipoServicio}`);
        await this._emitirCuotaAgotada(subject_id, tipoServicio, suscripcion);
        return { consumido: false, razon: "cuota_agotada" };
      }

      const campo = `cuota_${tipoServicio}_usada`;
      const nuevoValor = cuotaActual + 1;

      if (window.supabaseClient) {
        await window.supabaseClient
          .from("suscripciones")
          .update({ [campo]: nuevoValor, updated_at: new Date().toISOString() })
          .eq("subject_id", subject_id);
      }

      console.log(`[Administrador] ✓ Cuota consumida: ${tipoServicio} ${nuevoValor}/${cuotaMax}`);

      await this._persistirOperacion({
        tipo: "cuota_consumida",
        subject_id,
        servicio: tipoServicio,
        cuota_anterior: cuotaActual,
        cuota_nueva: nuevoValor,
        cuota_max: cuotaMax,
        case_id,
        timestamp: new Date().toISOString()
      });
      this._incrementarContador("cuota_consumida");

      if (nuevoValor >= cuotaMax) {
        await this._emitirCuotaAgotada(subject_id, tipoServicio, suscripcion);
      }

      return {
        consumido: true,
        tipo_servicio: tipoServicio,
        cuota_actual: nuevoValor,
        cuota_max: cuotaMax
      };
    } catch (e) {
      console.error("[Administrador] Error consumiendo cuota:", e);
      return { consumido: false, razon: "error", mensaje: e.message };
    }
  },

  _determinarTipoServicio(payload) {
    if (payload.tipo_servicio) return payload.tipo_servicio;
    const caseId = payload.case_id || "";
    if (caseId.startsWith("CONS-")) return "consulta";
    if (caseId.startsWith("ECO-")) return "tamizaje";
    if (payload.tipo === "consulta") return "consulta";
    if (payload.tipo === "tamizaje") return "tamizaje";
    return null;
  },

  _obtenerCuotaActual(suscripcion, tipoServicio) {
    const campo = `cuota_${tipoServicio}_usada`;
    return suscripcion[campo] || 0;
  },

  async _obtenerSuscripcion(subjectId) {
    try {
      if (!window.supabaseClient) return null;
      const { data } = await window.supabaseClient
        .from("suscripciones")
        .select("*")
        .eq("subject_id", subjectId)
        .in("estado", ["activa", "pausada"])
        .maybeSingle();
      return data;
    } catch (e) {
      console.warn("[Administrador] Error obteniendo suscripción:", e);
      return null;
    }
  },

  /* ─── EMISIÓN DE EVENTOS ─── */
  async _emitirOperacionRegistrada(operacion) {
    try {
      await SAVIA.enviar({
        de: this.id,
        tipo: TIPOS_EMITIR.OPERACION,
        flujo: "lateral",
        payload: operacion
      });
    } catch (e) {
      console.warn("[Administrador] Error emitiendo operación:", e);
    }
  },

  async _emitirCuotaAgotada(subjectId, tipoServicio, suscripcion) {
    try {
      const plan = suscripcion.plan;
      const cuotaMax = CUOTAS_POR_PLAN[plan]?.[tipoServicio] || 0;
      const preciosAddon = { consulta: 12, tamizaje: 15, interconsulta: 4, constancia: 5 };

      await SAVIA.enviar({
        de: this.id,
        tipo: TIPOS_EMITIR.CUOTA_AGOTADA,
        flujo: "lateral",
        payload: {
          subject_id: subjectId,
          tipo_servicio: tipoServicio,
          plan,
          cuota_max: cuotaMax,
          cuota_usada: cuotaMax,
          opciones: [
            { tipo: "addon", precio: preciosAddon[tipoServicio] || 0 },
            { tipo: "upgrade", plan_sugerido: plan === "basico" ? "plus" : "premium" }
          ],
          timestamp: new Date().toISOString()
        }
      });

      ESTADO.cuotasAgotadasEsteMes++;
      console.log(`[Administrador] ⚠️ Cuota agotada: ${subjectId}`);
    } catch (e) {
      console.warn("[Administrador] Error emitiendo cuota agotada:", e);
    }
  },

  /* ─── PERSISTENCIA ─── */
  async _persistirOperacion(operacion) {
    try {
      ESTADO.operacionesRegistradas++;
      ESTADO.ultimaOperacion = operacion;
      if (window.supabaseClient) {
        try {
          await window.supabaseClient.from("operaciones_admin").insert(operacion);
        } catch (e) { /* silencioso */ }
      }
    } catch (e) {
      console.warn("[Administrador] Error persistiendo operación:", e);
    }
  },

  _incrementarContador(tipo) {
    ESTADO.operacionesPorTipo[tipo] = (ESTADO.operacionesPorTipo[tipo] || 0) + 1;
  },

  async _cargarMetricas() {
    try {
      if (!window.supabaseClient) return;
      const { count } = await window.supabaseClient
        .from("suscripciones")
        .select("*", { count: "exact", head: true })
        .eq("estado", "activa");
      ESTADO.suscripcionesActivas = count || 0;
    } catch (e) {
      console.warn("[Administrador] No se pudieron cargar métricas:", e);
    }
  },

  /* ─── API PÚBLICA ─── */
  getEstado() {
    return {
      id: this.id,
      version: this.version,
      operacionesRegistradas: ESTADO.operacionesRegistradas,
      ultimaOperacion: ESTADO.ultimaOperacion,
      suscripcionesActivas: ESTADO.suscripcionesActivas,
      cuotasAgotadasEsteMes: ESTADO.cuotasAgotadasEsteMes,
      operacionesPorTipo: { ...ESTADO.operacionesPorTipo },
      iniciado_at: ESTADO.iniciado_at
    };
  },

  async renovarSuscripcion(subjectId, meses = 1) {
    console.log(`[Administrador] ▶ Renovando: ${subjectId} por ${meses} mes(es)`);
    try {
      if (!window.supabaseClient) throw new Error("Sin conexión a Supabase");
      const suscripcion = await this._obtenerSuscripcion(subjectId);
      if (!suscripcion) throw new Error("Suscripción no encontrada");

      const nuevaFecha = new Date(suscripcion.fecha_proximo_cobro || new Date());
      nuevaFecha.setMonth(nuevaFecha.getMonth() + meses);

      await window.supabaseClient
        .from("suscripciones")
        .update({
          cuota_consultas_usada: 0,
          cuota_tamizajes_usada: 0,
          cuota_interconsultas_usada: 0,
          cuota_constancias_usada: 0,
          fecha_proximo_cobro: nuevaFecha.toISOString().slice(0, 10),
          estado: "activa",
          updated_at: new Date().toISOString()
        })
        .eq("subject_id", subjectId);

      await this._persistirOperacion({
        tipo: "renovacion_suscripcion",
        subject_id: subjectId,
        meses,
        timestamp: new Date().toISOString()
      });

      console.log(`[Administrador] ✓ Renovado hasta ${nuevaFecha.toISOString().slice(0, 10)}`);
      return { renovado: true, nueva_fecha: nuevaFecha.toISOString().slice(0, 10) };
    } catch (e) {
      console.error("[Administrador] Error renovando:", e);
      return { renovado: false, error: e.message };
    }
  }
};

export default agenteAdministrador;
