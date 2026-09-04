// mobil/src/services/sheets.js
// Servicio de datos - Comunica con FastAPI Backend + Apps Script (fallback)
import { apiClient } from './apiClient';
import { DEFAULT_GOOGLE_CONFIG } from '../constants/config';

// ============================================
// UTILIDADES
// ============================================

export const mesCanonico = (hoja) => {
  if (!hoja) return '';
  return String(hoja).trim().replace(/\s+\d{4}$/, '').toUpperCase();
};

export const mismoMes = (valor, nombreMes) => {
  if (!valor || !nombreMes) return false;
  const v = String(valor).trim().toUpperCase();
  const m = String(nombreMes).trim().toUpperCase();
  return v.includes(m) || mesCanonico(v) === m;
};

const MAPA_MES = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };

// ============================================
// POST a Apps Script (solo para funciones sin backend)
// ============================================
async function postAppsScript(accion, datos = {}) {
  const url = DEFAULT_GOOGLE_CONFIG.appsScriptUrl;
  if (!url) throw new Error('No hay URL de Apps Script configurada');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion, ...datos }),
  });
  if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { success: true, data: text }; }
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================
export const sheetsService = {
  /**
   * Obtiene el mes activo ( Apps Script - no hay backend endpoint)
   */
  async obtenerMesActivo() {
    try {
      const result = await postAppsScript('obtenerMesActivo');
      return result.mes || result.data || null;
    } catch { return null; }
  },

  /**
   * Obtiene la lista de hojas ( Apps Script - no hay backend endpoint)
   */
  async obtenerHojas() {
    try {
      const result = await postAppsScript('obtenerHojas');
      return result.hojas || result.data || [];
    } catch { return []; }
  },

  /**
   * Carga el personal y sus turnos - USA BACKEND
   * @param {string} hoja - Nombre de la hoja
   * @param {number} mes - Numero de mes (1-12)
   * @param {number} anio - Anio
   * @param {string} area - Nombre del area (opcional)
   */
  async cargarPersonal(hoja, mes, anio, area = '') {
    try {
      const resultado = await apiClient.getRoles(mes, anio, area);
      return resultado.personal || resultado.data || [];
    } catch (error) {
      console.error('Error cargando personal desde backend:', error);
      throw error;
    }
  },

  /**
   * Carga personal con datos completos (para Parte Diario)
   */
  async cargarPersonalConDatos(hoja, mes, anio) {
    return this.cargarPersonal(hoja, mes, anio);
  },

  /**
   * Guarda un lote de celdas - USA BACKEND
   */
  async guardarLote(hoja, area, responsable, filas) {
    try {
      const mes = MAPA_MES[mesCanonico(hoja)] || new Date().getMonth() + 1;
      const anio = new Date().getFullYear();
      const datos = filas.map(f => ({
        fila: f.fila,
        valores: f.valores,
      }));
      return await apiClient.syncRoles({ mes, anio, area, datos });
    } catch (error) {
      console.error('Error guardando lote:', error);
      throw error;
    }
  },

  /**
   * Guarda una sola celda - USA BACKEND
   */
  async guardarCelda(hoja, fila, dia, turno, metadata = {}) {
    try {
      const mes = MAPA_MES[mesCanonico(hoja)] || new Date().getMonth() + 1;
      const anio = new Date().getFullYear();
      return await apiClient.updateCelda({
        mes, anio,
        area: metadata.area || '',
        persona: metadata.persona || '',
        dia,
        turno,
      });
    } catch (error) {
      console.error('Error guardando celda:', error);
      throw error;
    }
  },

  /**
   * Verifica si un area esta bloqueada - USA BACKEND
   */
  async verificarBloqueo(area, mes) {
    try {
      const mesNum = MAPA_MES[mesCanonico(mes)] || MAPA_MES[mes] || new Date().getMonth() + 1;
      const anio = new Date().getFullYear();
      const result = await apiClient.isAreaLocked(area, mesNum, anio);
      return result.bloqueado || false;
    } catch { return false; }
  },

  /**
   * Marca un area como finalizada - USA BACKEND
   */
  async marcarFinalizado(area, mes) {
    try {
      const mesNum = MAPA_MES[mesCanonico(mes)] || MAPA_MES[mes] || new Date().getMonth() + 1;
      const anio = new Date().getFullYear();
      // Necesitamos el ID del area, no solo el nombre
      const areas = await apiClient.getAreas();
      const areaObj = areas.find(a => a.nombre === area || a.codigo === area);
      if (areaObj) {
        return await apiClient.lockArea(areaObj.id, { mes: mesNum, anio });
      }
      throw new Error(`Area no encontrada: ${area}`);
    } catch (error) {
      console.error('Error marcando finalizado:', error);
      throw error;
    }
  },

  /**
   * Desmarca un area - USA BACKEND
   */
  async desmarcarFinalizado(area, mes) {
    try {
      const areas = await apiClient.getAreas();
      const areaObj = areas.find(a => a.nombre === area || a.codigo === area);
      if (areaObj) {
        return await apiClient.unlockArea(areaObj.id);
      }
      throw new Error(`Area no encontrada: ${area}`);
    } catch (error) {
      console.error('Error desmarcando finalizado:', error);
      throw error;
    }
  },

  /**
   * Registra un descanso medico - USA BACKEND
   */
  async registrarDescansoMedico(data) {
    try {
      return await apiClient.registrarDescanso(data);
    } catch (error) {
      console.error('Error registrando descanso:', error);
      throw error;
    }
  },

  /**
   * Registra vacaciones - USA BACKEND
   */
  async registrarVacaciones(data) {
    try {
      return await apiClient.registrarVacacion(data);
    } catch (error) {
      console.error('Error registrando vacaciones:', error);
      throw error;
    }
  },

  /**
   * Lee datos directamente de Google Sheets (solo admin)
   */
  async leerRange(range) {
    const { sheetId, apiKey } = DEFAULT_GOOGLE_CONFIG;
    if (!sheetId || !apiKey) throw new Error('No hay sheetId o apiKey configurado');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google Sheets API error: ${response.status}`);
    const data = await response.json();
    return data.values || [];
  },
};

export default sheetsService;
