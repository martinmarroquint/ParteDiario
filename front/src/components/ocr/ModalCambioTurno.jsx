// src/components/ocr/ModalCambioTurno.jsx
// VERSIÓN CORREGIDA - GUARDADO INMEDIATO

import React, { useState } from 'react';
import { X, GitCompare, Loader2, CheckCircle2 } from 'lucide-react';
import { COLOR_PRIMARIO, TURNOS, TURNO_MAP, MESES } from './constantes';

const ModalCambioTurno = ({ 
  isOpen, 
  onClose, 
  trabajador, 
  turnos, 
  mes, 
  anio, 
  onRegistrarCambio,
  onGuardarCelda
}) => {
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [turnoNuevo, setTurnoNuevo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [cambiosPendientes, setCambiosPendientes] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  if (!isOpen || !trabajador) return null;

  const DIAS = Array.from({ length: new Date(anio, mes, 0).getDate() }, (_, i) => i + 1);

  const agregarCambio = () => {
    if (!diaSeleccionado || !turnoNuevo) return;
    
    const turnoActualCodigo = turnos[trabajador.id]?.[diaSeleccionado] || '';
    const turnoActualNombre = turnoActualCodigo ? TURNO_MAP[turnoActualCodigo]?.nombre || turnoActualCodigo : 'SIN ASIGNAR';
    const turnoNuevoNombre = TURNO_MAP[turnoNuevo]?.nombre || turnoNuevo;
    
    setCambiosPendientes(prev => [
      ...prev.filter(c => c.dia !== diaSeleccionado),
      {
        dia: diaSeleccionado,
        turnoAnterior: turnoActualNombre,
        turnoNuevo: turnoNuevoNombre,
        turnoNuevoCodigo: turnoNuevo,
        motivo: motivo.trim() || 'Cambio de turno'
      }
    ]);
    setDiaSeleccionado(null);
    setTurnoNuevo('');
    setMotivo('');
  };

  const aplicarCambios = async () => {
    if (cambiosPendientes.length === 0) return;
    
    setGuardando(true);
    setGuardadoExitoso(false);
    
    try {
      onRegistrarCambio(trabajador.id, cambiosPendientes);
      
      if (onGuardarCelda && trabajador.fila) {
        for (const cambio of cambiosPendientes) {
          try {
            await onGuardarCelda(trabajador.fila, cambio.dia, cambio.turnoNuevoCodigo);
          } catch (error) {
            console.error(`Error guardando día ${cambio.dia}:`, error);
          }
        }
      }
      
      setGuardadoExitoso(true);
      
      setTimeout(() => {
        setCambiosPendientes([]);
        setGuardadoExitoso(false);
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Error al aplicar cambios:', error);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCambio = (index) => {
    setCambiosPendientes(prev => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 text-white flex items-center justify-between" style={{ backgroundColor: COLOR_PRIMARIO }}>
          <div className="flex items-center gap-3">
            <GitCompare className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base">Cambio de Turno (Admin)</h3>
              <p className="text-xs text-white/70">{trabajador.grado} {trabajador.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Horario Actual - {MESES[mes - 1]} {anio}</h4>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {DIAS.map(dia => {
                const turnoActual = turnos[trabajador.id]?.[dia] || '';
                const t = TURNO_MAP[turnoActual];
                const cambiado = cambiosPendientes.find(c => c.dia === dia);
                const codigoMostrar = cambiado ? cambiado.turnoNuevoCodigo : turnoActual;
                const bg = cambiado ? TURNO_MAP[cambiado.turnoNuevoCodigo]?.color : (turnoActual ? t?.color : 'white');
                const color = cambiado ? TURNO_MAP[cambiado.turnoNuevoCodigo]?.texto : (turnoActual ? t?.texto : '#D1D5DB');
                
                return (
                  <div key={dia} 
                    className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-medium border transition-all ${
                      cambiado ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-300' : 'border-gray-100'
                    }`} 
                    style={{ backgroundColor: bg }}
                  >
                    <span className="text-gray-500 leading-none">{dia}</span>
                    <span className="font-bold leading-none" style={{ color }}>{codigoMostrar || '-'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Nuevo Cambio</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Día</label>
                <select 
                  value={diaSeleccionado || ''} 
                  onChange={(e) => setDiaSeleccionado(e.target.value ? parseInt(e.target.value) : null)} 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seleccionar día</option>
                  {DIAS.map(d => <option key={d} value={d}>Día {d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nuevo Turno</label>
                <select 
                  value={turnoNuevo} 
                  onChange={(e) => setTurnoNuevo(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seleccionar turno</option>
                  {TURNOS.map(t => (
                    <option key={t.codigo} value={t.codigo}>{t.codigo} - {t.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Motivo</label>
                <input 
                  value={motivo} 
                  onChange={(e) => setMotivo(e.target.value)} 
                  placeholder="Opcional" 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
            </div>
            <button 
              onClick={agregarCambio} 
              disabled={!diaSeleccionado || !turnoNuevo} 
              className="mt-3 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-all"
              style={{ backgroundColor: COLOR_PRIMARIO }}
            >
              + Agregar Cambio
            </button>
          </div>

          {cambiosPendientes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Cambios Pendientes ({cambiosPendientes.length})
              </h4>
              <div className="space-y-2">
                {cambiosPendientes.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-xs font-bold text-gray-600 w-12">Día {c.dia}</span>
                    <span className="text-xs line-through text-gray-400">{c.turnoAnterior}</span>
                    <span className="text-xs">→</span>
                    <span className="text-xs font-bold" style={{ color: TURNO_MAP[c.turnoNuevoCodigo]?.texto }}>
                      {c.turnoNuevo} ({c.turnoNuevoCodigo})
                    </span>
                    <span className="text-xs text-gray-400 ml-auto truncate max-w-[120px]">{c.motivo}</span>
                    <button 
                      onClick={() => eliminarCambio(i)} 
                      className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">
            Cancelar
          </button>
          <button 
            onClick={aplicarCambios} 
            disabled={cambiosPendientes.length === 0 || guardando}
            className={`px-6 py-2 text-sm font-bold text-white rounded-lg shadow-sm disabled:opacity-50 transition-all flex items-center gap-2 ${
              guardadoExitoso ? 'bg-green-500' : ''
            }`}
            style={!guardadoExitoso ? { backgroundColor: COLOR_PRIMARIO } : {}}
          >
            {guardando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando en Sheets...</>
            ) : guardadoExitoso ? (
              <><CheckCircle2 className="w-4 h-4" /> ¡Guardado exitoso!</>
            ) : (
              <>Aplicar {cambiosPendientes.length} Cambios</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCambioTurno;