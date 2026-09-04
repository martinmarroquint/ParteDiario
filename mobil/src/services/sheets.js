// mobil/src/services/sheets.js
// Servicio de Google Sheets - Comunica con Apps Script Web App y Google Sheets API
import { DEFAULT_GOOGLE_CONFIG } from '../constants/config';

// ============================================
// UTILIDADES
// ============================================

/**
 * Obtiene el nombre canonico de una hoja (sin anio ni espacios extra)
 * "AGOSTO 2025" -> "AGOSTO"
 */
export const mesCanonico = (hoja) => {
  if (!hoja) return '';
  return String(hoja).trim().replace(/\s+\d{4}$/, '').toUpperCase();
};

/**
 * Compara si dos valores pertenecen al mismo mes
 */
export const mismoMes = (valor, nombreMes) => {
  if (!valor || !nombreMes) return false;
  const v = String(valor).trim().toUpperCase();
  const m = String(nombreMes).trim().toUpperCase();
  return v.includes(m) || mesCanonico(v) === m;
};

// ============================================
// SERVICIO PRINCIPAL DE GOOGLE SHEETS
// ============================================
export const sheetsService = {
  /**
   * Configuracion actual de Google Sheets
   */
  config: { ...DEFAULT_GOOGLE_CONFIG },

  /**
   * URL base de Apps Script Web App
   */
  get appsScriptUrl() {
    return this.config.appsScriptUrl;
  },

  /**
   * Ejecuta una accion en Apps Script via POST
   */
  async _postAppsScript(accion, datos = {}) {
    const url = this.appsScriptUrl;
    if (!url) throw new Error('No hay URL de Apps Script configurada');

    const body = { accion, ...datos };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: true, data: text };
      }
    } catch (error) {
      console.error(`Error en Apps Script (${accion}):`, error);
      throw error;
    }
  },

  /**
   * Obtiene el mes activo actual
   */
  async obtenerMesActivo() {
    try {
      const result = await this._postAppsScript('obtenerMesActivo');
      return result.mes || result.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Obtiene la lista de hojas disponibles
   */
  async obtenerHojas() {
    try {
      const result = await this._postAppsScript('obtenerHojas');
      return result.hojas || result.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Carga el personal de una hoja/mes/año especifico
   * @param {string} hoja - Nombre de la hoja (ej: "AGOSTO")
   * @param {number} mes - Numero de mes (1-12)
   * @param {number} anio - Anio
   * @returns {Array} Lista de personal con sus turnos
   */
  async cargarPersonal(hoja, mes, anio) {
    try {
      const result = await this._postAppsScript('cargarPersonal', {
        hoja,
        mes,
        anio,
      });
      return result.personal || result.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Carga personal con datos completos (para Parte Diario)
   */
  async cargarPersonalConDatos(hoja, mes, anio) {
    try {
      const result = await this._postAppsScript('cargarPersonalConDatos', {
        hoja,
        mes,
        anio,
      });
      return result.personal || result.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Guarda un lote de celdas modificadas
   * @param {Array} cambios - Lista de cambios [{fila, dia, turno, area, responsable}]
   */
  async guardarLote(cambios) {
    try {
      const result = await this._postAppsScript('guardarLoteCeldas', {
        cambios,
      });
      return result;
    } catch (error) {
      console.error('Error guardando lote:', error);
      throw error;
    }
  },

  /**
   * Guarda una sola celda
   * @param {Object} cambio - {fila, dia, turno, area, responsable, hoja}
   */
  async guardarCelda(cambio) {
    try {
      const result = await this._postAppsScript('guardarCelda', cambio);
      return result;
    } catch (error) {
      console.error('Error guardando celda:', error);
      throw error;
    }
  },

  /**
   * Verifica si un area esta bloqueada (finalizada)
   * @param {string} area - Nombre del area
   * @param {string} mes - Nombre del mes
   * @returns {boolean} true si esta bloqueada
   */
  async verificarBloqueo(area, mes) {
    try {
      const result = await this._postAppsScript('verificarBloqueo', {
        area,
        mes,
      });
      return result.bloqueado || false;
    } catch {
      return false;
    }
  },

  /**
   * Marca un area como finalizada (bloqueada)
   * @param {string} area - Nombre del area
   * @param {string} mes - Nombre del mes
   */
  async marcarFinalizado(area, mes) {
    try {
      const result = await this._postAppsScript('marcarFinalizado', {
        area,
        mes,
      });
      return result;
    } catch (error) {
      console.error('Error marcando finalizado:', error);
      throw error;
    }
  },

  /**
   * Desmarca un area (la desbloquea)
   * @param {string} area - Nombre del area
   * @param {string} mes - Nombre del mes
   */
  async desmarcarFinalizado(area, mes) {
    try {
      const result = await this._postAppsScript('desmarcarFinalizado', {
        area,
        mes,
      });
      return result;
    } catch (error) {
      console.error('Error desmarcando finalizado:', error);
      throw error;
    }
  },

  /**
   * Registra un descanso medico
   * @param {Object} data - Datos del descanso
   */
  async registrarDescansoMedico(data) {
    try {
      const result = await this._postAppsScript('registrarDescansoMedico', data);
      return result;
    } catch (error) {
      console.error('Error registrando descanso medico:', error);
      throw error;
    }
  },

  /**
   * Registra vacaciones o PCV
   * @param {Object} data - Datos de vacaciones
   */
  async registrarVacaciones(data) {
    try {
      const result = await this._postAppsScript('registrarVacaciones', data);
      return result;
    } catch (error) {
      console.error('Error registrando vacaciones:', error);
      throw error;
    }
  },

  /**
   * Obtiene datos directamente de Google Sheets API (lectura)
   * Usado por el admin para leer la hoja de ESTADOS
   * @param {string} range - Rango en notacion A1 (ej: "ESTADOS!A1:Z100")
   */
  async leerRange(range) {
    const { sheetId, apiKey } = this.config;
    if (!sheetId || !apiKey) {
      throw new Error('No hay sheetId o apiKey configurado');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.status}`);
      }
      const data = await response.json();
      return data.values || [];
    } catch (error) {
      console.error('Error leyendo range:', error);
      throw error;
    }
  },

  /**
   * Escribe datos en Google Sheets API
   * @param {string} range - Rango en notacion A1
   * @param {Array} values - Valores a escribir
   */
  async escribirRange(range, values) {
    const { sheetId, apiKey } = this.config;
    if (!sheetId || !apiKey) {
      throw new Error('No hay sheetId o apiKey configurado');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED&key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });
      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error escribiendo range:', error);
      throw error;
    }
  },
};

export default sheetsService;
