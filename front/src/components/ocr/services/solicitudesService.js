// src/components/ocr/services/solicitudesService.js
// Servicio de solicitudes de cambio de turno - FastAPI Backend

import { apiClient } from './apiClient';

export const ESTADOS = {
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  DESAPROBADO: 'DESAPROBADO',
  CANCELADO: 'CANCELADO',
};

export const ESTADOS_META = {
  [ESTADOS.PENDIENTE]:   { etiqueta: 'Pendiente',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  [ESTADOS.APROBADO]:    { etiqueta: 'Aprobado',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  [ESTADOS.DESAPROBADO]: { etiqueta: 'Desaprobado',  cls: 'bg-red-50 text-red-700 border-red-200' },
  [ESTADOS.CANCELADO]:   { etiqueta: 'Cancelado',    cls: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const NIVEL_LABELS = {
  1: 'Jefe de Area',
  2: 'Jefe de Departamento',
  3: 'Jefe de Division',
  4: 'Administrador',
};

export const getNivelLabel = (nivel) => NIVEL_LABELS[nivel] || `Nivel ${nivel}`;

export const TIPOS_CAMBIO = [
  { value: 'INTERCAMBIO CON COMPAÑERO', label: 'Intercambio con companero' },
  { value: 'DESCANSO MEDICO', label: 'Descanso medico' },
  { value: 'COMISION', label: 'Comision' },
  { value: 'EMERGENCIA', label: 'Emergencia' },
  { value: 'COORDINACION', label: 'Coordinacion' },
  { value: 'OTRO', label: 'Otro' },
];

export const solicitudesService = {
  async getMisSolicitudes() {
    try {
      const result = await apiClient.getSolicitudesMias();
      return { success: true, data: result.solicitudes || [], total: result.total || 0 };
    } catch (error) {
      return { success: false, error: error.message || 'Error al obtener solicitudes' };
    }
  },

  async getBandeja() {
    try {
      const result = await apiClient.getBandejaSolicitudes();
      return { success: true, data: result.solicitudes || [], total: result.total || 0 };
    } catch (error) {
      return { success: false, error: error.message || 'Error al obtener bandeja' };
    }
  },

  async getSolicitud(id) {
    try {
      const result = await apiClient.getSolicitud(id);
      return { success: true, data: result.solicitud };
    } catch (error) {
      return { success: false, error: error.message || 'Error al obtener solicitud' };
    }
  },

  async crearSolicitud(data) {
    try {
      const result = await apiClient.crearSolicitud(data);
      return { success: true, data: result.solicitud };
    } catch (error) {
      return { success: false, error: error.message || 'Error al crear solicitud' };
    }
  },

  async aprobarSolicitud(id, observaciones = '') {
    try {
      const result = await apiClient.aprobarSolicitud(id, { observaciones });
      return { success: true, data: result.solicitud };
    } catch (error) {
      return { success: false, error: error.message || 'Error al aprobar solicitud' };
    }
  },

  async rechazarSolicitud(id, motivoRechazo) {
    try {
      const result = await apiClient.rechazarSolicitud(id, { motivo_rechazo: motivoRechazo });
      return { success: true, data: result.solicitud };
    } catch (error) {
      return { success: false, error: error.message || 'Error al rechazar solicitud' };
    }
  },

  async cancelarSolicitud(id, motivo = '') {
    try {
      const result = await apiClient.cancelarSolicitud(id, { motivo });
      return { success: true, data: result.solicitud };
    } catch (error) {
      return { success: false, error: error.message || 'Error al cancelar solicitud' };
    }
  },

  async getEstadisticas() {
    try {
      const result = await apiClient.getEstadisticasSolicitudes();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Error al obtener estadisticas' };
    }
  },

  getEstadoLabel(estado) {
    return ESTADOS_META[estado]?.etiqueta || estado;
  },

  getEstadoColor(estado) {
    return ESTADOS_META[estado]?.cls || 'bg-gray-100 text-gray-800';
  },
};

export default solicitudesService;
