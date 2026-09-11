// src/components/ocr/services/turnosService.js
// Dynamic turno loading from BD sheet via API
import apiClient from './apiClient';

let turnosCache = null;
let turnosPromise = null;

// Color mapping by code (matching existing constantes.js colors)
const COLORES_POR_CODIGO = {
  'M':   { color: '#C6F6D5', texto: '#22543D' },
  'T':   { color: '#FEFCBF', texto: '#744210' },
  'F':   { color: '#FED7D7', texto: '#9B2C2C' },
  'MT':  { color: '#BEE3F8', texto: '#2A4365' },
  'N':   { color: '#C3D9FF', texto: '#1A365D' },
  'FE':  { color: '#FED7D7', texto: '#44337A' },
  'V':   { color: '#FF0000', texto: '#FFFFFF' },
  'FS':  { color: '#FEEBC8', texto: '#7B341E' },
  'LG':  { color: '#FED7E2', texto: '#702459' },
  'DM':  { color: '#D08AFF', texto: '#FFFFFF' },
  'L12': { color: '#C6F6D5', texto: '#22543D' },
  'H':   { color: '#FEEBC8', texto: '#7B341E' },
  'C':   { color: '#BEE3F8', texto: '#2A4365' },
  'PR':  { color: '#E9D8FD', texto: '#44337A' },
  'AVC': { color: '#FED7E2', texto: '#702459' },
  'LEGF':{ color: '#FECACA', texto: '#991B1B' },
  'PCV': { color: '#BEE3F8', texto: '#2A4365' },
  'RL':  { color: '#E9D8FD', texto: '#44337A' },
  'SL':  { color: '#FED7D7', texto: '#9B2C2C' },
  '24':  { color: '#C3D9FF', texto: '#1A365D' },
  'SC':  { color: '#FFD129', texto: '#22543D' },
  'EXT': { color: '#E2E8F0', texto: '#2D3748' },
  '🎂': { color: '#FF6B6B', texto: '#FFFFFF' },
  'R':   { color: '#FEEBC8', texto: '#7B341E' },
  'S':   { color: '#C3D9FF', texto: '#1A365D' },
  'M/N': { color: '#BEE3F8', texto: '#2A4365' },
  'T/N': { color: '#FEFCBF', texto: '#744210' },
  'ADM': { color: '#E2E8F0', texto: '#2D3748' },
  'LFC': { color: '#FED7D7', texto: '#9B2C2C' },
  'PP':  { color: '#C6F6D5', texto: '#22543D' },
  'COU': { color: '#E2E8F0', texto: '#2D3748' },
  '24M': { color: '#C3D9FF', texto: '#1A365D' },
  'LP':  { color: '#BEE3F8', texto: '#2A4365' },
  'PD':  { color: '#C6F6D5', texto: '#22543D' },
  'PN':  { color: '#C3D9FF', texto: '#1A365D' },
  'PM':  { color: '#C6F6D5', texto: '#22543D' },
  'PT':  { color: '#FEFCBF', texto: '#744210' },
  'CD':  { color: '#BEE3F8', texto: '#2A4365' },
};

const FALLBACK_TURNOS = [
  { codigo: 'M',   nombre: 'MAÑANA',                             horas: 6,  color: '#C6F6D5', texto: '#22543D' },
  { codigo: 'T',   nombre: 'TARDE',                              horas: 6,  color: '#FEFCBF', texto: '#744210' },
  { codigo: 'F',   nombre: 'FRANCO',                             horas: 0,  color: '#FED7D7', texto: '#9B2C2C' },
  { codigo: 'MT',  nombre: '12 HRS M',                           horas: 12, color: '#BEE3F8', texto: '#2A4365' },
  { codigo: 'N',   nombre: '12 HRS N',                           horas: 12, color: '#C3D9FF', texto: '#1A365D' },
  { codigo: 'FE',  nombre: 'FERIADO',                            horas: 0,  color: '#FED7D7', texto: '#44337A' },
  { codigo: 'V',   nombre: 'VACACIONES',                         horas: 0,  color: '#FF0000', texto: '#FFFFFF' },
  { codigo: 'FS',  nombre: 'FALTO AL SERVICIO',                  horas: 0,  color: '#FEEBC8', texto: '#7B341E' },
  { codigo: 'LG',  nombre: 'LICENCIA DE GRAVIDEZ',               horas: 0,  color: '#FED7E2', texto: '#702459' },
  { codigo: 'DM',  nombre: 'DESCANSO MEDICO',                    horas: 0,  color: '#D08AFF', texto: '#FFFFFF' },
  { codigo: 'L12', nombre: 'LEY 12633',                          horas: 0,  color: '#C6F6D5', texto: '#22543D' },
  { codigo: 'H',   nombre: 'HOSPITALIZADO',                      horas: 0,  color: '#FEEBC8', texto: '#7B341E' },
  { codigo: 'C',   nombre: 'COMISION',                           horas: 0,  color: '#BEE3F8', texto: '#2A4365' },
  { codigo: 'PR',  nombre: 'PERMISO DE RADIACION',               horas: 0,  color: '#E9D8FD', texto: '#44337A' },
  { codigo: 'AVC', nombre: 'ADAPTACION A LA VIDA CIVIL',         horas: 0,  color: '#FED7E2', texto: '#702459' },
  { codigo: 'LEGF',nombre: 'LICENCIA ENFERMEDAD GRAVE FAMILIAR', horas: 0,  color: '#FECACA', texto: '#991B1B' },
  { codigo: 'PCV', nombre: 'PERMISO A CUENTA DE VACACIONES',     horas: 0,  color: '#BEE3F8', texto: '#2A4365' },
  { codigo: 'RL',  nombre: 'REFERIDO A LIMA',                    horas: 0,  color: '#E9D8FD', texto: '#44337A' },
  { codigo: 'SL',  nombre: 'SOMETIDO A LEY',                     horas: 0,  color: '#FED7D7', texto: '#9B2C2C' },
  { codigo: '24',  nombre: '24 X 48',                            horas: 24, color: '#C3D9FF', texto: '#1A365D' },
  { codigo: 'SC',  nombre: 'SERVICIO CONTINUO',                  horas: 24, color: '#FFD129', texto: '#22543D' },
  { codigo: 'EXT', nombre: 'EXTERNO',                            horas: 0,  color: '#E2E8F0', texto: '#2D3748' },
  { codigo: '🎂', nombre: 'CUMPLEAÑOS 🥳🥳🥳🥳',                     horas: 1,  color: '#FF6B6B', texto: '#FFFFFF' },
  { codigo: 'R',   nombre: 'RETEN',                              horas: 6,  color: '#FEEBC8', texto: '#7B341E' },
  { codigo: 'S',   nombre: 'SERVICIO',                           horas: 24, color: '#C3D9FF', texto: '#1A365D' },
  { codigo: 'M/N', nombre: 'MAÑANA - 12 HRS N',                  horas: 18, color: '#BEE3F8', texto: '#2A4365' },
  { codigo: 'T/N', nombre: 'TARDE - 12 HRS N',                   horas: 18, color: '#FEFCBF', texto: '#744210' },
  { codigo: 'ADM', nombre: 'ADMINISTRATIVO',                     horas: 8,  color: '#E2E8F0', texto: '#2D3748' },
  { codigo: 'LFC', nombre: 'LICENCIA FALLECIMIENTO CONYUGUE',    horas: 0,  color: '#FED7D7', texto: '#9B2C2C' },
  { codigo: 'PP',  nombre: 'PAPELETA DE PERMISO',                horas: 0,  color: '#C6F6D5', texto: '#22543D' },
  { codigo: 'COU', nombre: 'CAMBIADO OTRA UNIDAD',               horas: 0,  color: '#E2E8F0', texto: '#2D3748' },
  { codigo: '24M', nombre: '24 HRS MTN',                         horas: 24, color: '#C3D9FF', texto: '#1A365D' },
  { codigo: 'LP',  nombre: 'LICENCIA POR PATERNIDAD',            horas: 0,  color: '#BEE3F8', texto: '#2A4365' },
  { codigo: 'PD',  nombre: 'OFICIAL DE PERMANENCIA (DIURNO)',    horas: 12, color: '#C6F6D5', texto: '#22543D' },
  { codigo: 'PN',  nombre: 'OFICIAL DE PERMANENCIA (NOCTURNO)',  horas: 12, color: '#C3D9FF', texto: '#1A365D' },
  { codigo: 'PM',  nombre: 'OFICIAL DE PERMANENCIA (MAÑANA)',    horas: 6,  color: '#C6F6D5', texto: '#22543D' },
  { codigo: 'PT',  nombre: 'OFICIAL DE PERMANENCIA (TARDE)',     horas: 6,  color: '#FEFCBF', texto: '#744210' },
];

/**
 * Load turnos from API (with cache). Falls back to hardcoded if API fails.
 */
export async function loadTurnos() {
  if (turnosCache) return turnosCache;
  if (turnosPromise) return turnosPromise;
  
  turnosPromise = _fetchTurnos();
  turnosCache = await turnosPromise;
  turnosPromise = null;
  return turnosCache;
}

async function _fetchTurnos() {
  try {
    const result = await apiClient.get('/roles/turnos');
    const turnos = (result.turnos || []).map(t => {
      const col = COLORES_POR_CODIGO[t.codigo] || { color: '#E2E8F0', texto: '#2D3748' };
      return { codigo: t.codigo, nombre: t.nombre, horas: t.horas, color: col.color, texto: col.texto };
    });
    return turnos.length > 0 ? turnos : FALLBACK_TURNOS;
  } catch (e) {
    console.warn('Error loading turnos from API, using fallback:', e);
    return FALLBACK_TURNOS;
  }
}

/**
 * Build TURNO_MAP (codigo -> turno) from turno list.
 */
export function buildTurnoMap(turnos) {
  const map = {};
  turnos.forEach(t => { map[t.codigo] = t; });
  return map;
}

/**
 * Build NOMBRE_A_CODIGO map from turno list.
 */
export function buildNombreACodigo(turnos) {
  const map = {};
  turnos.forEach(t => { map[t.nombre] = t.codigo; });
  return map;
}

/**
 * Invalidate cache.
 */
export function invalidateTurnosCache() {
  turnosCache = null;
  turnosPromise = null;
}
