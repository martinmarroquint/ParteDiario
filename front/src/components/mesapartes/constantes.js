// src/components/mesapartes/constantes.js
export const COLOR_PRIMARIO = '#3D9972';

// Estados del documento (DOCUMENTOS sheet)
export const ESTADOS = {
  TODOS: { label: 'Todos', color: '#6B7280', bg: '#F3F4F6', dot: '#6B7280' },
  REGISTRADO: { label: 'Registrado', color: '#B45309', bg: '#FFFBEB', dot: '#F59E0B' },
  DERIVADO: { label: 'Derivado', color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6' },
  CERRADO: { label: 'Cerrado', color: '#047857', bg: '#ECFDF5', dot: '#10B981' }
};

// Estados de la derivación (DERIVACIONES sheet)
export const ESTADOS_DERIVACION = {
  DERIVADO: { label: 'Pendiente', color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6' },
  RECIBIDO: { label: 'Recibido', color: '#B45309', bg: '#FFFBEB', dot: '#F59E0B' },
  DEVUELTO: { label: 'Devuelto', color: '#047857', bg: '#ECFDF5', dot: '#10B981' }
};

// Tipos de movimiento (BD Col B)
export const TIPOS_MOV_DEFAULT = ['PASE', 'DECRETO', 'MEMORANDUM', 'ELEVACION', 'OFICIO'];

// Fuentes
export const FUENTES = [
  { value: 'digital', label: 'Digital (Correo)' },
  { value: 'fisico', label: 'Fisico (Papel)' }
];

// API Endpoints
export const API_ENDPOINTS = {
  documentos: '/mesa-partes',
  opciones: '/mesa-partes/opciones',
  bandeja: (area) => `/mesa-partes/bandeja?area=${encodeURIComponent(area)}`,
  documento: (id) => `/mesa-partes/${id}`,
  historial: (id) => `/mesa-partes/${id}/historial`,
  derivar: '/mesa-partes/derivar',
  recibir: '/mesa-partes/recibir',
  devolver: '/mesa-partes/devolver',
  cerrar: '/mesa-partes/cerrar',
  eliminar: (id) => `/mesa-partes/${id}`,
};
