// src/components/mesapartes/FormularioDocumento.jsx
// Formulario ETAPA 1: RECEPCIÓN - Layout mobile-first, 1-2 columnas
import React, { useState, useRef, useEffect } from 'react';
import { Save, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Dropdown from '../ui/Dropdown';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];
const ANIOS_DISPONIBLES = [2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030];

// ============================================
// SELECTOR DE FECHA
// ============================================
const SelectorFecha = ({ value, onChange, placeholder = 'Seleccionar fecha' }) => {
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(() => {
    if (value && value.includes('-')) { const [a,m,d]=value.split('-'); return {dia:parseInt(d),mes:parseInt(m),anio:parseInt(a)}; }
    const hoy=new Date(); return {dia:hoy.getDate(),mes:hoy.getMonth()+1,anio:hoy.getFullYear()};
  });
  const [vistaMes, setVistaMes] = useState(fecha.mes);
  const [vistaAnio, setVistaAnio] = useState(fecha.anio);
  const [mostrarSelectorAnio, setMostrarSelectorAnio] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (value && value.includes('-')) { const [a,m,d]=value.split('-'); setFecha({dia:parseInt(d),mes:parseInt(m),anio:parseInt(a)}); setVistaMes(parseInt(m)); setVistaAnio(parseInt(a)); }
  }, [value]);

  useEffect(() => { const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setAbierto(false);}; document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h); }, []);

  const diasEnMes = new Date(vistaAnio,vistaMes,0).getDate();
  const primerDiaSemana = new Date(vistaAnio,vistaMes-1,1).getDay();
  const cambiarMes = (d) => { let nm=vistaMes+d, na=vistaAnio; if(nm>12){nm=1;na++;} if(nm<1){nm=12;na--;} setVistaMes(nm); setVistaAnio(na); };
  const cambiarAnio = (d) => setVistaAnio(p=>p+d);
  const seleccionarDia = (dia) => { onChange(`${vistaAnio}-${String(vistaMes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`); setAbierto(false); };
  const esHoy = (d) => { const h=new Date(); return d===h.getDate()&&vistaMes===h.getMonth()+1&&vistaAnio===h.getFullYear(); };
  const esSel = (d) => d===fecha.dia&&vistaMes===fecha.mes&&vistaAnio===fecha.anio;
  const fechaMostrada = value&&value.includes('-') ? (()=>{const[a,m,d]=value.split('-');return`${d}/${m}/${a}`;})() : '';

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{placeholder}</label>
      <button type="button" onClick={()=>setAbierto(!abierto)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-left outline-none transition-all bg-white hover:border-gray-300 focus:border-gray-400 flex items-center justify-between gap-2">
        <span className={fechaMostrada?'text-gray-700':'text-gray-400'}>{fechaMostrada||placeholder}</span>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${abierto?'rotate-90':''}`} strokeWidth={1.5} />
      </button>
      {abierto&&(
        <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] p-3 w-64">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={()=>cambiarMes(-1)} className="p-0.5 hover:bg-gray-100 rounded text-gray-400"><ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5}/></button>
              <span className="text-sm font-medium text-gray-700 w-14 text-center">{MESES[vistaMes-1].substring(0,3)}</span>
              <button type="button" onClick={()=>cambiarMes(1)} className="p-0.5 hover:bg-gray-100 rounded text-gray-400"><ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5}/></button>
            </div>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={()=>cambiarAnio(-1)} className="p-0.5 hover:bg-gray-100 rounded text-gray-400"><ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5}/></button>
              <button type="button" onClick={()=>setMostrarSelectorAnio(!mostrarSelectorAnio)} className="text-sm font-medium text-gray-700 hover:bg-gray-100 px-1 rounded w-12 text-center">{vistaAnio}</button>
              <button type="button" onClick={()=>cambiarAnio(1)} className="p-0.5 hover:bg-gray-100 rounded text-gray-400"><ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5}/></button>
            </div>
          </div>
          {mostrarSelectorAnio&&(
            <div className="mb-3 p-2 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-4 gap-1">{ANIOS_DISPONIBLES.map(a=><button key={a} type="button" onClick={()=>{setVistaAnio(a);setMostrarSelectorAnio(false);}} className={`py-1.5 text-xs rounded-lg transition-colors ${a===vistaAnio?'bg-gray-900 text-white font-medium':'text-gray-600 hover:bg-gray-100'}`}>{a}</button>)}</div>
            </div>
          )}
          <div className="grid grid-cols-7 mb-1">{DIAS_SEMANA.map(d=><div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({length:primerDiaSemana}).map((_,i)=><div key={`e-${i}`} className="aspect-square"/>)}
            {Array.from({length:diasEnMes},(_,i)=>i+1).map(dia=>{const hoy=esHoy(dia),sel=esSel(dia),finde=(primerDiaSemana+dia-1)%7===0||(primerDiaSemana+dia-1)%7===6;return(<button key={dia} type="button" onClick={()=>seleccionarDia(dia)} className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${sel?'bg-gray-900 text-white font-medium':hoy?'bg-gray-100 text-gray-900 font-medium':finde?'text-gray-400 hover:bg-gray-50':'text-gray-600 hover:bg-gray-50'}`}>{dia}</button>);})}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100"><button type="button" onClick={()=>{const h=new Date();onChange(`${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`);setAbierto(false);}} className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors">Hoy</button></div>
        </div>
      )}
    </div>
  );
};

// ============================================
// FORMULARIO ETAPA 1: RECEPCIÓN
// ============================================
const FormularioDocumento = ({ form, onChange, onSubmit, guardando, modo = 'registro', opcionesBD = { tiposDoc: [] } }) => {
  const handleChange = (field, value) => onChange?.({ ...form, [field]: value });
  const inputStyle = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all bg-white focus:border-gray-400 focus:bg-gray-50/50";

  // Convertir array de strings a formato {value, label} para Dropdown
  const tipoDocOptions = (opcionesBD.tiposDoc || []).map(t => ({ value: t, label: t }));

  return (
    <form onSubmit={e=>{e.preventDefault();onSubmit?.();}} className="space-y-4">
      
      {/* Campo único: Fecha */}
      <SelectorFecha value={form.fecha} onChange={v=>handleChange('fecha',v)} placeholder="Fecha"/>

      {/* Fila: Tipo de Doc. | N Doc. Origen */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipo de Doc.</label>
          <Dropdown
            options={tipoDocOptions}
            value={form.tipoDoc || ''}
            onChange={v => handleChange('tipoDoc', v)}
            placeholder="Tipo de documento"
            searchable
            clearable
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">N° Doc. Origen</label>
          <input type="text" value={form.nDocOrigen||''} onChange={e=>handleChange('nDocOrigen',e.target.value)} placeholder="Ej: 12345" className={inputStyle}/>
        </div>
      </div>

      {/* Fila: Fecha Doc. | Procedencia */}
      <div className="grid grid-cols-2 gap-3">
        <SelectorFecha value={form.fechaDoc} onChange={v=>handleChange('fechaDoc',v)} placeholder="Fecha documento"/>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Procedencia</label>
          <input type="text" value={form.procedencia||''} onChange={e=>handleChange('procedencia',e.target.value)} placeholder="Procedencia" className={inputStyle}/>
        </div>
      </div>

      {/* Contenido */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Contenido</label>
        <textarea 
          value={form.contenido||''} 
          onChange={e=>handleChange('contenido',e.target.value)} 
          placeholder="Describa el contenido del documento..."
          rows={3}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all bg-white focus:border-gray-400 focus:bg-gray-50/50 resize-none"
        />
      </div>

      <button type="submit" disabled={guardando}
        className="w-full py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-gray-900 hover:bg-gray-800">
        {guardando?<><Loader2 className="w-4 h-4 animate-spin"/>Guardando...</>:<><Save className="w-4 h-4"/>{modo==='registro'?'Registrar Documento':'Guardar Cambios'}</>}
      </button>
    </form>
  );
};

export default FormularioDocumento;
