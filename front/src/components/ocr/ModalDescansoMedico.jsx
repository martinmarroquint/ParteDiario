// src/components/ocr/ModalDescansoMedico.jsx
// VERSION OPTIMIZADA - IGUAL DE RAPIDO QUE VACACIONES
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  X, User, Stethoscope, Clock, 
  FileText, AlertCircle, CheckCircle2, Loader2,
  ChevronLeft, ChevronRight, RotateCcw
} from 'lucide-react';
import { COLOR_PRIMARIO, MESES } from './constantes';
import SelectorCIE10 from '../hojaReferencia/SelectorCIE10';

const crearFechaLocal = (anio, mes, dia) => {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

const formatearFechaLegible = (fechaStr) => {
  if (!fechaStr) return '';
  const [a, m, d] = fechaStr.split('-');
  return `${d}/${m}/${a}`;
};

const ModalDescansoMedico = ({ 
  isOpen, onClose, personal = [], medicos = [], onGuardarDescanso, onSuccess 
}) => {
  const [personalId, setPersonalId] = useState('');
  const [medicoId, setMedicoId] = useState('');
  const [diagnosticosCIE10, setDiagnosticosCIE10] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const hoy = useMemo(() => new Date(), []);
  const [mesCalendario, setMesCalendario] = useState(hoy.getMonth());
  const [anioCalendario, setAnioCalendario] = useState(hoy.getFullYear());
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [seleccionando, setSeleccionando] = useState('inicio');

  const [busquedaPersonal, setBusquedaPersonal] = useState('');
  const [busquedaPersonalInput, setBusquedaPersonalInput] = useState('');
  const [mostrarDropdownPersonal, setMostrarDropdownPersonal] = useState(false);
  const dropdownPersonalRef = useRef(null);

  const [busquedaMedico, setBusquedaMedico] = useState('');
  const [busquedaMedicoInput, setBusquedaMedicoInput] = useState('');
  const [mostrarDropdownMedico, setMostrarDropdownMedico] = useState(false);
  const dropdownMedicoRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (dropdownPersonalRef.current && !dropdownPersonalRef.current.contains(e.target)) {
        setMostrarDropdownPersonal(false);
      }
      if (dropdownMedicoRef.current && !dropdownMedicoRef.current.contains(e.target)) {
        setMostrarDropdownMedico(false);
      }
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { 
      document.removeEventListener('mousedown', h); 
      document.removeEventListener('touchstart', h); 
    };
  }, []);

  const resetForm = useCallback(() => {
    setPersonalId(''); 
    setMedicoId(''); 
    setFechaInicio(null); 
    setFechaFin(null);
    setDiagnosticosCIE10([]); 
    setObservaciones(''); 
    setBusquedaPersonal(''); 
    setBusquedaPersonalInput('');
    setBusquedaMedico(''); 
    setBusquedaMedicoInput(''); 
    setError('');
    setMostrarDropdownPersonal(false); 
    setMostrarDropdownMedico(false);
    setSeleccionando('inicio');
    setMesCalendario(hoy.getMonth());
    setAnioCalendario(hoy.getFullYear());
  }, [hoy]);

  const totalDias = useMemo(() => new Date(anioCalendario, mesCalendario + 1, 0).getDate(), [mesCalendario, anioCalendario]);
  const primerDiaSemana = useMemo(() => new Date(anioCalendario, mesCalendario, 1).getDay(), [mesCalendario, anioCalendario]);
  const hoyStr = crearFechaLocal(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const mesAnterior = () => {
    if (mesCalendario === 0) { setMesCalendario(11); setAnioCalendario(a => a - 1); }
    else { setMesCalendario(m => m - 1); }
  };

  const mesSiguiente = () => {
    if (mesCalendario === 11) { setMesCalendario(0); setAnioCalendario(a => a + 1); }
    else { setMesCalendario(m => m + 1); }
  };

  const diaEnRango = (dia) => {
    if (!fechaInicio || !fechaFin) return false;
    const fechaDia = crearFechaLocal(anioCalendario, mesCalendario, dia);
    return fechaDia >= fechaInicio && fechaDia <= fechaFin;
  };

  const esDiaExtremo = (dia) => {
    const fechaDia = crearFechaLocal(anioCalendario, mesCalendario, dia);
    return fechaDia === fechaInicio || fechaDia === fechaFin;
  };

  const handleClickDia = (dia) => {
    const fechaDia = crearFechaLocal(anioCalendario, mesCalendario, dia);
    setError('');
    
    if (seleccionando === 'inicio') {
      setFechaInicio(fechaDia);
      setFechaFin(null);
      setSeleccionando('fin');
    } else {
      if (fechaInicio && fechaDia < fechaInicio) {
        setFechaFin(fechaInicio);
        setFechaInicio(fechaDia);
      } else {
        setFechaFin(fechaDia);
      }
      setSeleccionando('inicio');
    }
  };

  const limpiarFechas = () => {
    setFechaInicio(null);
    setFechaFin(null);
    setSeleccionando('inicio');
    setError('');
  };

  const diasDescanso = useMemo(() => {
    if (!fechaInicio || !fechaFin) return 0;
    const [ai, mi, di] = fechaInicio.split('-').map(Number);
    const [af, mf, df] = fechaFin.split('-').map(Number);
    const inicio = new Date(ai, mi - 1, di);
    const fin = new Date(af, mf - 1, df);
    const diasCalendario = Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diasCalendario - 1);
  }, [fechaInicio, fechaFin]);

  const personalFiltrado = useMemo(() => {
    if (!busquedaPersonalInput.trim()) return personal.slice(0, 20);
    const t = busquedaPersonalInput.toLowerCase().trim();
    return personal.filter(p => 
      (p.nombre||'').toLowerCase().includes(t) || 
      (p.grado||'').toLowerCase().includes(t) || 
      (p.dni||'').includes(t)
    ).slice(0, 20);
  }, [personal, busquedaPersonalInput]);

  const medicosFiltrados = useMemo(() => {
    if (!busquedaMedicoInput.trim()) return medicos.slice(0, 20);
    const t = busquedaMedicoInput.toLowerCase().trim();
    return medicos.filter(m => 
      (m.medico_nombre||m.nombre||'').toLowerCase().includes(t)
    ).slice(0, 20);
  }, [medicos, busquedaMedicoInput]);

  const personalSeleccionado = useMemo(() => 
    personalId ? personal.find(p => String(p.id) === String(personalId)) : null, 
    [personal, personalId]
  );
  
  const medicoSeleccionado = useMemo(() => 
    medicoId ? medicos.find(m => String(m.medico_dni||m.id) === String(medicoId)) : null, 
    [medicos, medicoId]
  );
  
  const esValido = personalId && medicoId && fechaInicio && fechaFin && diasDescanso > 0;

  const seleccionarPersonal = (p) => { 
    setPersonalId(String(p.id)); 
    setBusquedaPersonal(`${p.grado||''} ${p.nombre}`); 
    setBusquedaPersonalInput(''); 
    setMostrarDropdownPersonal(false); 
    setError(''); 
  };
  
  const limpiarPersonal = () => { 
    setPersonalId(''); 
    setBusquedaPersonal(''); 
    setBusquedaPersonalInput(''); 
    setError(''); 
  };
  
  const seleccionarMedico = (m) => { 
    setMedicoId(String(m.medico_dni||m.id)); 
    setBusquedaMedico(`Dr(a). ${m.medico_nombre||m.nombre}`); 
    setBusquedaMedicoInput(''); 
    setMostrarDropdownMedico(false); 
    setError(''); 
  };
  
  const limpiarMedico = () => { 
    setMedicoId(''); 
    setBusquedaMedico(''); 
    setBusquedaMedicoInput(''); 
    setError(''); 
  };

  const handleGuardar = () => {
    if (!personalId) { setError('Seleccione el personal'); return; }
    if (!medicoId) { setError('Seleccione el medico'); return; }
    if (!fechaInicio || !fechaFin) { setError('Seleccione las fechas en el calendario'); return; }
    if (diasDescanso <= 0) { setError('La fecha de fin debe ser posterior a la de inicio'); return; }
    
    setGuardando(true); 
    setError('');
    
    const diagnosticoTexto = diagnosticosCIE10.length > 0 
      ? diagnosticosCIE10.map(d => `${d.codigo} - ${d.descripcion}`).join(' | ')
      : 'No especificado';
    
    const descanso = {
      personal_id: personalId, 
      personal_nombre: personalSeleccionado?.nombre || '',
      personal_grado: personalSeleccionado?.grado || '', 
      personal_dni: personalSeleccionado?.dni || '',
      personal_area: personalSeleccionado?.area || '', 
      medico_id: medicoId,
      medico_nombre: medicoSeleccionado?.medico_nombre || medicoSeleccionado?.nombre || '',
      medico_especialidad: medicoSeleccionado?.especialidad || 'Medicina General',
      fecha_inicio: fechaInicio, 
      fecha_fin: fechaFin, 
      dias_descanso: diasDescanso,
      diagnostico: diagnosticoTexto,
      diagnosticos_cie10: diagnosticosCIE10,
      observaciones: observaciones || 'Sin observaciones',
      fecha_registro: new Date().toISOString(), 
      registrado_por: 'Sistema PNP'
    };
    
    if (onGuardarDescanso) {
      onGuardarDescanso(descanso);
    }
    
    if (onSuccess) {
      onSuccess({
        titulo: 'Descanso Medico Registrado',
        mensaje: `${personalSeleccionado?.grado || ''} ${personalSeleccionado?.nombre || ''} - ${diasDescanso} dia(s) de descanso`,
        tipo: 'success'
      });
    }
    
    resetForm();
    onClose();
    setGuardando(false);
  };

  useEffect(() => {
    const h = (e) => { 
      if (e.key === 'Escape' && isOpen) { 
        resetForm(); 
        onClose(); 
      } 
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, resetForm, onClose]);

  if (!isOpen) return null;

  const renderCalendario = () => {
    const celdas = [];
    
    for (let i = 0; i < primerDiaSemana; i++) {
      celdas.push(<div key={`v-${i}`} className="w-10 h-10 sm:w-11 sm:h-11" />);
    }
    
    for (let dia = 1; dia <= totalDias; dia++) {
      const fechaDia = crearFechaLocal(anioCalendario, mesCalendario, dia);
      const esHoy = fechaDia === hoyStr;
      const enRango = diaEnRango(dia);
      const esExtremo = esDiaExtremo(dia);
      const esPasado = fechaDia < hoyStr;
      
      let clases = 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-sm font-medium flex items-center justify-center transition-all ';
      
      if (esExtremo) {
        clases += 'bg-emerald-500 text-white shadow-md scale-110 font-bold ';
      } else if (enRango) {
        clases += 'bg-emerald-100 text-emerald-700 ';
      } else if (esHoy) {
        clases += 'bg-white text-emerald-600 ring-2 ring-emerald-400 ring-offset-1 ';
      } else if (esPasado) {
        clases += 'text-gray-400 hover:bg-gray-100 active:bg-amber-100 ';
      } else {
        clases += 'text-gray-600 hover:bg-gray-100 active:bg-emerald-100 active:text-emerald-700 ';
      }
      
      celdas.push(
        <button
          key={dia}
          onClick={() => handleClickDia(dia)}
          className={clases}
          style={{ 
            touchAction: 'manipulation', 
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {dia}
        </button>
      );
    }
    
    return celdas;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[250] p-2 sm:p-4" 
      onClick={() => { resetForm(); onClose(); }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        
        <div className="px-4 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between" style={{ backgroundColor: COLOR_PRIMARIO }}>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Registrar Descanso Medico</h3>
              <p className="text-[10px] sm:text-xs text-white/70">Sistema de Registro PNP</p>
            </div>
          </div>
          <button 
            onClick={() => { resetForm(); onClose(); }} 
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Personal PNP
              </label>
              <div className="relative" ref={dropdownPersonalRef}>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={personalId ? busquedaPersonal : busquedaPersonalInput}
                    onChange={(e) => { 
                      setBusquedaPersonalInput(e.target.value); 
                      if (personalId) limpiarPersonal(); 
                      setMostrarDropdownPersonal(true); 
                      setError(''); 
                    }}
                    onFocus={() => { 
                      setMostrarDropdownPersonal(true); 
                      if (personalId) { setBusquedaPersonalInput(''); limpiarPersonal(); } 
                    }}
                    placeholder="Buscar personal..." 
                    autoComplete="off"
                    className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white" 
                  />
                  {(busquedaPersonalInput || personalId) && (
                    <button onClick={limpiarPersonal} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {mostrarDropdownPersonal && !personalId && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-44 overflow-hidden">
                    <div className="px-3 py-1.5 bg-gray-50 border-b text-[10px] text-gray-500">{personalFiltrado.length} resultados</div>
                    <div className="overflow-y-auto max-h-32">
                      {personalFiltrado.length > 0 ? personalFiltrado.map(p => (
                        <button key={p.id} onClick={() => seleccionarPersonal(p)}
                          className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-gray-50 border-b border-gray-50 last:border-b-0 touch-manipulation transition-colors">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">{p.grado} {p.nombre}</p>
                            <p className="text-[10px] text-gray-400 truncate">{p.dni} - {p.area}</p>
                          </div>
                        </button>
                      )) : <div className="px-3 py-4 text-center text-xs text-gray-400">No se encontraron resultados</div>}
                    </div>
                  </div>
                )}
              </div>
              {personalSeleccionado && (
                <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p className="text-xs font-bold text-emerald-700 truncate">{personalSeleccionado.grado} {personalSeleccionado.nombre}</p>
                  <button onClick={limpiarPersonal} className="ml-auto text-emerald-600 hover:text-red-600 p-1 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Medico Tratante
              </label>
              <div className="relative" ref={dropdownMedicoRef}>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={medicoId ? busquedaMedico : busquedaMedicoInput}
                    onChange={(e) => { 
                      setBusquedaMedicoInput(e.target.value); 
                      if (medicoId) limpiarMedico(); 
                      setMostrarDropdownMedico(true); 
                      setError(''); 
                    }}
                    onFocus={() => { 
                      setMostrarDropdownMedico(true); 
                      if (medicoId) { setBusquedaMedicoInput(''); limpiarMedico(); } 
                    }}
                    placeholder="Buscar medico..." 
                    autoComplete="off"
                    className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white" 
                  />
                  {(busquedaMedicoInput || medicoId) && (
                    <button onClick={limpiarMedico} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {mostrarDropdownMedico && !medicoId && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-44 overflow-hidden">
                    <div className="px-3 py-1.5 bg-gray-50 border-b text-[10px] text-gray-500">{medicosFiltrados.length} resultados</div>
                    <div className="overflow-y-auto max-h-32">
                      {medicosFiltrados.length > 0 ? medicosFiltrados.map(m => (
                        <button key={m.medico_dni||m.id} onClick={() => seleccionarMedico(m)}
                          className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-gray-50 border-b border-gray-50 last:border-b-0 touch-manipulation transition-colors">
                          <Stethoscope className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <p className="text-xs font-medium text-gray-700 truncate">Dr(a). {m.medico_nombre||m.nombre}</p>
                        </button>
                      )) : <div className="px-3 py-4 text-center text-xs text-gray-400">No se encontraron resultados</div>}
                    </div>
                  </div>
                )}
              </div>
              {medicoSeleccionado && (
                <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <p className="text-xs font-bold text-blue-700 truncate">Dr(a). {medicoSeleccionado.medico_nombre||medicoSeleccionado.nombre}</p>
                  <button onClick={limpiarMedico} className="ml-auto text-blue-600 hover:text-red-600 p-1 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Diagnostico (CIE-10)
              </label>
              <SelectorCIE10 
                onSelect={setDiagnosticosCIE10}
                seleccionados={diagnosticosCIE10}
                maxSelecciones={5}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Observaciones
              </label>
              <textarea 
                value={observaciones} 
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones adicionales, recomendaciones, tratamiento..."
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white resize-none" 
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {seleccionando === 'inicio' ? 'Seleccione FECHA INICIO' : 'Seleccione FECHA FIN'}
              </span>
              <button onClick={limpiarFechas}
                className="text-[10px] text-gray-400 hover:text-red-500 font-medium flex items-center gap-1 transition-colors">
                <RotateCcw className="w-3 h-3" /> Limpiar
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-center text-sm font-medium transition-all
                ${fechaInicio ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-400 bg-gray-50'}`}>
                {fechaInicio ? formatearFechaLegible(fechaInicio) : 'Inicio'}
              </div>
              <span className="text-gray-300 text-lg">-</span>
              <div className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-center text-sm font-medium transition-all
                ${fechaFin ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 text-gray-400 bg-gray-50'}`}>
                {fechaFin ? formatearFechaLegible(fechaFin) : 'Fin'}
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-2 bg-gray-50 rounded-xl p-2">
              <button onClick={mesAnterior} className="p-2 hover:bg-white rounded-lg transition-colors touch-manipulation active:scale-95">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm font-semibold text-gray-700 select-none">{MESES[mesCalendario]} {anioCalendario}</span>
              <button onClick={mesSiguiente} className="p-2 hover:bg-white rounded-lg transition-colors touch-manipulation active:scale-95">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['D','L','M','M','J','V','S'].map((d, i) => (
                <div key={i} className={`w-10 h-7 sm:w-11 sm:h-7 flex items-center justify-center text-[10px] sm:text-xs font-semibold ${i === 0 ? 'text-red-400' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-0.5">
              {renderCalendario()}
            </div>
            
            <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Seleccion</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-100 border border-emerald-300"></span> Rango</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white border-2 border-emerald-400"></span> Hoy</span>
            </div>
            
            {diasDescanso > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-700">
                      <strong>{diasDescanso} dia(s)</strong> de descanso medico
                    </p>
                    {fechaInicio && fechaFin && (
                      <p className="text-[10px] text-amber-500 mt-0.5">
                        Del {formatearFechaLegible(fechaInicio)} al {formatearFechaLegible(fechaFin)} - Retorna el {formatearFechaLegible(fechaFin)}
                        {fechaInicio < hoyStr ? ' (Registro retroactivo)' : fechaInicio > hoyStr ? ' (Programado)' : ' (Incluye hoy)'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 sm:gap-3">
          <button 
            onClick={() => { resetForm(); onClose(); }}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 touch-manipulation transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleGuardar} 
            disabled={!esValido || guardando}
            className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg flex items-center gap-2 touch-manipulation active:scale-95"
            style={{ backgroundColor: esValido ? COLOR_PRIMARIO : '#9CA3AF' }}
          >
            {guardando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Registrar Descanso</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDescansoMedico;