// src/components/hojaReferencia/constantes.js
export const COLOR_PRIMARIO_REF = '#188C5D';

export const DEFAULT_CONFIG_REFERENCIAS = {
  sheetId: import.meta.env.VITE_REFERENCIAS_SHEETS_ID || '',
  sheetName: "Hoja de Referencias",
  sheetCIE10: "CIE10",
  sheetCPT: "CPT",
  apiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '',
  appsScriptUrl: import.meta.env.VITE_REFERENCIAS_APPS_SCRIPT_URL || ''
};

// Serializa un objeto a JSON 100% ASCII escapando los caracteres no-ASCII
// como \uXXXX. El proxy de Google Apps Script rechaza bytes crudos no-ASCII
// en el body del POST devolviendo una pagina HTML de bloqueo.
export const bodyAsciiJsonRef = (obj) => JSON.stringify(obj).replace(/[\u007F-\uFFFF]/g, (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));

export const ESTABLECIMIENTOS = [
  "HOSPITAL REGIONAL PNP AREQUIPA",
  "SERMEDIAL",
  "HOSPITAL CENTRAL PNP",
  "CLÍNICA PNP",
];

export const SERVICIOS = [
  "HOSPITALIZACIÓN MEDICINA",
  "HOSPITALIZACIÓN CIRUGÍA",
  "CONSULTA EXTERNA",
  "EMERGENCIA",
  "UCI",
  "AYUDA AL DIAGNÓSTICO",
];

export const AREAS_ORIGEN = [
  { id: 'c_externa', nombre: 'CONSULTA EXTERNA' },
  { id: 'hospitalizacion', nombre: 'HOSPITALIZACIÓN' },
  { id: 'emergencia', nombre: 'EMERGENCIA' },
  { id: 'ayuda_dx', nombre: 'AYUDA AL DIAGNÓSTICO' },
];

export const TIPOS_AMBULANCIA = [
  "Tipo I - Básica",
  "Tipo II - Medicalizada",
  "Tipo III - UCI Móvil",
];

export const SITUACIONES_PACIENTE = [
  "ELECTIVO",
  "URGENCIA",
  "EMERGENCIA",
];

// ¡ESTO FALTABA!
export const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];