// src/components/mesapartes/constantes.js
// Constantes para Mesa de Partes HRPA
export const COLOR_PRIMARIO = '#3D9972';

export const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', color: '#B45309', bg: '#FFFBEB', icon: 'Clock', dot: '#F59E0B' },
  ENTREGADO: { label: 'Derivado', color: '#1D4ED8', bg: '#EFF6FF', icon: 'Send', dot: '#3B82F6' },
  RESUELTO: { label: 'Resuelto', color: '#047857', bg: '#ECFDF5', icon: 'CheckCircle2', dot: '#10B981' }
};

// Abreviar tipo de documento para mobile
export const abbreviateTipo = (tipo, maxLen = 18) => {
  if (!tipo) return '';
  if (tipo.length <= maxLen) return tipo;
  return tipo.substring(0, maxLen) + '…';
};

// Backend API endpoints
export const API_ENDPOINTS = {
  documentos: '/mesa-partes',
  opciones: '/mesa-partes/opciones',
  documento: (id) => `/mesa-partes/${id}`,
  entregar: (id) => `/mesa-partes/${id}/entregar`,
  descargar: (id) => `/mesa-partes/${id}/descargar`,
};
