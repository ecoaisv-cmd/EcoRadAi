/**
 * agente-imagen.js
 * Capa: RAÍZ
 * Dominio: imagen
 * Versión: 1.0.0
 * 
 * Envuelve:
 *   - TAMIZAJES_REGISTRY (protocolos)
 *   - renderPaginasImagenes()
 *   - capturedImages[], capturedImageTags[]
 *   - handleFiles(), removeImage(), renderGallery()
 *   - verImagenes(), ampliarImagen()
 */

export const agenteImagen = {
  id: "agente-imagen",
  version: "1.0.0",
  nombre: "Agente Imagen",
  icono: "🖼️",
  capa: "raiz",
  dominio: "imagen",
  categoria: "clinico",

  permisos: {
    ver: ["operador", "medico", "admin"],
    editar: ["operador", "medico", "admin"]
  },

  requiere: {
    entidades: ["paciente", "caso"],
    servicios: ["supabase"]
  },

  eventos_emitidos: [
    "imagen:capturada",
    "imagen:eliminada",
    "imagen:galeria-actualizada",
    "imagen:protocolo-completado"
  ],

  eventos_suscritos: [
    "tamizaje:seleccionado",
    "paciente:seleccionado"
  ],

  async init(kernel) {
    console.log("[agente-imagen] Inicializando...");

    kernel.on("tamizaje:seleccionado", (evt) => {
      console.log("[agente-imagen] Tamizaje seleccionado:", evt.payload?.tamizaje_id);
    });

    console.log("[agente-imagen] ✓ Listo");
  },

  async recibir(evt) {
    console.log("[agente-imagen] Evento recibido:", evt.tipo);
  },

  async mount(container, params) {
    console.log("[agente-imagen] mount() — pendiente de UI propia");
  },

  api: {
    /**
     * Lista los tamizajes disponibles.
     */
    listarTamizajes() {
      if (window.TAMIZAJES_REGISTRY?.listar) {
        return window.TAMIZAJES_REGISTRY.listar();
      }
      return [];
    },

    /**
     * Obtiene un tamizaje específico.
     */
    obtenerTamizaje(tamizajeId) {
      if (window.TAMIZAJES_REGISTRY?.obtener) {
        return window.TAMIZAJES_REGISTRY.obtener(tamizajeId);
      }
      return null;
    },

    /**
     * Obtiene el protocolo de imagen del tamizaje actual.
     */
    protocoloActual() {
      const t = this.obtenerTamizaje(window.estudioActual || "corporativo_metabolico");
      return t?.protocolo || null;
    },

    /**
     * Cuenta las imágenes capturadas actualmente.
     */
    contarCapturadas() {
      return (window.capturedImages || []).length;
    },

    /**
     * Devuelve las imágenes capturadas actualmente.
     */
    capturadas() {
      const imgs = window.capturedImages || [];
      const tags = window.capturedImageTags || [];
      return imgs.map((dataUrl, i) => ({
        id: "img_" + String(i + 1).padStart(2, "0"),
        tag: tags[i] || "Vista " + (i + 1),
        dataUrl
      }));
    },

    /**
     * Añade una imagen manualmente (dataURL).
     */
    agregar(dataUrl, tag) {
      if (!window.capturedImages) window.capturedImages = [];
      if (!window.capturedImageTags) window.capturedImageTags = [];
      window.capturedImages.push(dataUrl);
      window.capturedImageTags.push(tag || "Vista " + window.capturedImages.length);
      if (typeof window.renderGallery === "function") window.renderGallery();
    },

    /**
     * Elimina una imagen por índice.
     */
    eliminar(indice) {
      if (typeof window.removeImage === "function") {
        window.removeImage(indice);
      }
    },

    /**
     * Limpia todas las imágenes capturadas.
     */
    limpiar() {
      window.capturedImages = [];
      window.capturedImageTags = [];
      if (typeof window.renderGallery === "function") window.renderGallery();
    },

    /**
     * Renderiza las páginas de imágenes para el informe.
     */
    renderPaginas(googleFonts, fecha, caseId, caso) {
      if (typeof window.renderPaginasImagenes === "function") {
        return window.renderPaginasImagenes(googleFonts, fecha, caseId, caso);
      }
      return "";
    },

    /**
     * Abre el visor de imágenes de un caso.
     */
    async ver(caseId) {
      if (typeof window.verImagenes === "function") {
        return await window.verImagenes(caseId);
      }
    },

    /**
     * Aporta el contexto de imágenes para interconsultas.
     */
    async aportar() {
      return {
        total: this.contarCapturadas(),
        imagenes: this.capturadas(),
        protocolo: this.protocoloActual()
      };
    }
  }
};

export default agenteImagen;
