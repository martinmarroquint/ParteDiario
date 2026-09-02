// src/components/ocr/ModalHistorial.jsx
// Historial de cambios cargado desde la hoja CAMBIOS (registro de Apps Script)
import React from 'react';
import { X, History } from 'lucide-react';
import { COLOR_PRIMARIO, TURNO_MAP } from './constantes';

const ModalHistorial = ({ isOpen, onClose, historialCambios }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 text-white flex items-center justify-between" style={{ backgroundColor: COLOR_PRIMARIO }}>
          <div className="flex items-center gap-3"><History className="w-5 h-5" /><h3 className="font-bold text-base">Historial de Cambios</h3></div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {historialCambios.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay cambios registrados</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">Fecha/Hora</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">Responsable</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">Trabajador</th>
                  <th className="px-4 py-2 text-center text-xs text-gray-500">Dia</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">Anterior</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">Nuevo</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">Tipo</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-500">Area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historialCambios.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-600">{c.fecha} {c.hora}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{c.responsable}</td>
                    <td className="px-4 py-2 text-xs font-medium">{c.trabajador}</td>
                    <td className="px-4 py-2 text-xs text-center">{c.dia}</td>
                    <td className="px-4 py-2 text-xs text-gray-400">{c.turnoAnterior}</td>
                    <td className="px-4 py-2 text-xs font-bold" style={{ color: TURNO_MAP[c.turnoNuevoCodigo]?.texto || '#334155' }}>{c.turnoNuevo}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{c.tipo}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{c.area}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalHistorial;