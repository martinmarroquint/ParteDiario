// src/components/ocr/services/solicitudesService.js
// Solicitudes service - thin wrapper around apiClient
// Follows mesa_de_partes pattern: call apiClient directly, let component handle errors

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
  // All methods delegate directly to apiClient and let errors propagate
  // The calling component handles errors (like mesa_de_partes does)
  getMisSolicitudes: () => apiClient.getSolicitudes(),
  getBandeja: () => apiClient.getBandejaSolicitudes(),
  getSolicitud: (id) => apiClient.getSolicitud(id),
  crearSolicitud: (data) => apiClient.crearSolicitud(data),
  aprobarSolicitud: (id, data) => apiClient.aprobarSolicitud(id, data),
  rechazarSolicitud: (id, data) => apiClient.rechazarSolicitud(id, data),
  cancelarSolicitud: (id, data) => apiClient.cancelarSolicitud(id, data),
  getEstadisticas: () => apiClient.getEstadisticasSolicitudes(),

  getEstadoLabel(estado) {
    return ESTADOS_META[estado]?.etiqueta || estado;
  },

  getEstadoColor(estado) {
    return ESTADOS_META[estado]?.cls || 'bg-gray-100 text-gray-800';
  },
};

export default solicitudesService;
