// src/components/ocr/ImpresionRol.jsx
// VERSIÓN FINAL - DESCARGA DIRECTA SIN VISTA PREVIA
import React, { useState, useMemo } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { X, Loader2, FileDown, Printer } from 'lucide-react';
import { obtenerCodigoArea, COLOR_PRIMARIO, TURNO_MAP, MESES, ordenarPersonalPorGrado } from './constantes';
import RolPDFDocument from './RolPDFDocument';

const generarCodigoVerificacion = (area, mes, anio, responsable, totalPersonal, totalDias) => {
  const datos = `${area}|${mes}|${anio}|${responsable}|${totalPersonal}|${totalDias}|HRPA-PNP`;
  let hash = 0;
  for (let i = 0; i < datos.length; i++) {
    const char = datos.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hashAbs = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0');
  return `HRPA-${hashAbs}-${anio}`;
};

const ImpresionRol = ({ 
  isOpen, onClose, area, mes, anio, 
  personal = [], turnos = {}, responsable = ''
}) => {
  const [mostrarLeyenda, setMostrarLeyenda] = useState(true);

  const codigoArea = useMemo(() => obtenerCodigoArea(area), [area]);

  const DIAS = useMemo(() => {
    const diasReales = new Date(anio, mes, 0).getDate();
    return Array.from({ length: diasReales }, (_, i) => i + 1);
  }, [mes, anio]);

  const personalOrdenado = useMemo(() => ordenarPersonalPorGrado(personal), [personal]);

  const calcularHoras = (empId) => {
    let horas = 0;
    DIAS.forEach(dia => {
      const t = TURNO_MAP[turnos[empId]?.[dia] || ''];
      if (t?.horas) horas += t.horas;
    });
    return horas;
  };

  const turnosUsados = useMemo(() => {
    const usados = new Set();
    Object.values(turnos).forEach(emp => 
      Object.values(emp).forEach(codigo => { if (codigo && TURNO_MAP[codigo]) usados.add(codigo); })
    );
    return Array.from(usados).sort();
  }, [turnos]);

  const codigoVerificacion = useMemo(() => 
    generarCodigoVerificacion(area, mes, anio, responsable, personal.length, DIAS.length),
    [area, mes, anio, responsable, personal.length, DIAS.length]
  );

  if (!isOpen) return null;

  const hoy = new Date();
  const fechaStr = `${hoy.getDate()} de ${MESES[hoy.getMonth()]} del ${hoy.getFullYear()}`;
  const horaStr = hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

  const propsPDF = {
    area, mes, anio, 
    personal: personalOrdenado, 
    turnos, 
    DIAS,
    codigoArea, 
    responsable, 
    codigoVerificacion,
    mostrarLeyenda, 
    turnosUsados, 
    calcularHoras,
    fechaStr, 
    horaStr
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ backgroundColor: 'rgba(15, 26, 20, 0.95)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 text-white flex items-center justify-between" style={{ backgroundColor: COLOR_PRIMARIO }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Descargar Rol de Servicio</h3>
              <p className="text-xs text-white/70">{area} · {MESES[mes-1]} {anio}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {/* Información del rol */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400 text-xs">Área</p>
                <p className="font-semibold text-gray-700">{area}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Mes / Año</p>
                <p className="font-semibold text-gray-700">{MESES[mes-1]} {anio}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Responsable</p>
                <p className="font-semibold text-gray-700">{responsable}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Personal</p>
                <p className="font-semibold text-gray-700">{personal.length} empleados</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Días del mes</p>
                <p className="font-semibold text-gray-700">{DIAS.length} días</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Código Área</p>
                <p className="font-semibold text-gray-700">{codigoArea || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Opciones */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarLeyenda}
                onChange={(e) => setMostrarLeyenda(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-600">Incluir leyenda de turnos</span>
            </label>
          </div>

          {/* Código de verificación */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Código de verificación</p>
            <p className="font-mono text-sm font-semibold text-gray-700">{codigoVerificacion}</p>
          </div>

          {/* Botón de descarga */}
          <PDFDownloadLink
            document={<RolPDFDocument {...propsPDF} />}
            fileName={`Rol de Servicio - ${area || 'Sin Area'} - ${new Date().toLocaleDateString('es-PE').replace(/\//g, '-')}.pdf`}
            style={{ textDecoration: 'none' }}
          >
            {({ loading, error }) => {
              if (error) {
                return (
                  <div className="w-full py-3 rounded-xl text-sm font-semibold bg-red-100 text-red-700 text-center">
                    Error al generar el PDF. Intente nuevamente.
                  </div>
                );
              }
              return (
                <div className={`w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${loading ? 'bg-gray-400 text-white' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg'}`}>
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-5 h-5" />
                      Descargar PDF
                    </>
                  )}
                </div>
              );
            }}
          </PDFDownloadLink>

          <p className="text-xs text-gray-400 text-center mt-3">
            El documento se descargará en formato PDF profesional
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImpresionRol;