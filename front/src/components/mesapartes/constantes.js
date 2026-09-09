// src/components/mesapartes/constantes.js
export const COLOR_PRIMARIO = '#3D9972';

export const ESTADOS = {
  TODOS: { label: 'Todos', color: '#6B7280', bg: '#F3F4F6', dot: '#6B7280' },
  REGISTRADO: { label: 'Registrado', color: '#B45309', bg: '#FFFBEB', dot: '#F59E0B' },
  DERIVADO: { label: 'Derivado', color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6' },
  TRAMITADO: { label: 'Tramitado', color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6' },
  CERRADO: { label: 'Cerrado', color: '#047857', bg: '#ECFDF5', dot: '#10B981' }
};

export const ESTADOS_DERIVACION = {
  DERIVADO: { label: 'Derivado', color: '#1D4ED8', bg: '#EFF6FF' },
  RECIBIDO: { label: 'Recibido', color: '#B45309', bg: '#FFFBEB' },
  DEVUELTO: { label: 'Devuelto', color: '#047857', bg: '#ECFDF5' }
};

export const API_ENDPOINTS = {
  documentos: '/mesa-partes',
  opciones: '/mesa-partes/opciones',
  documento: (id) => `/mesa-partes/${id}`,
  historial: (id) => `/mesa-partes/${id}/historial`,
  derivar: '/mesa-partes/derivar',
  recibir: '/mesa-partes/recibir',
  devolver: '/mesa-partes/devolver',
  tramitar: '/mesa-partes/tramitar',
  cerrar: '/mesa-partes/cerrar',
  eliminar: (id) => `/mesa-partes/${id}`,
};

export const FUENTES = [
  { value: 'digital', label: 'Digital (Correo)' },
  { value: 'fisico', label: 'Físico (Papel)' }
];
